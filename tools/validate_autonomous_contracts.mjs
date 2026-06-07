#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const repo = process.cwd()
const instance = process.env.BTM_INSTANCE || ''
const failures = []
const passes = []

function full(relPath) { return path.join(repo, relPath) }
function exists(relPath) { return fs.existsSync(full(relPath)) }
function read(relPath) { return fs.readFileSync(full(relPath), 'utf8') }
function readJson(relPath) { return JSON.parse(read(relPath)) }
function readAbs(absPath) { return fs.readFileSync(absPath, 'utf8') }
function ok(name, detail = '') {
  passes.push({ name, detail })
  console.log(`ok - ${name}${detail ? ` (${detail})` : ''}`)
}
function fail(name, detail) {
  failures.push({ name, detail })
  console.error(`FAIL - ${name}: ${detail}`)
}
function walk(relRoot, pred = () => true, out = []) {
  if (!exists(relRoot)) return out
  for (const entry of fs.readdirSync(full(relRoot), { withFileTypes: true })) {
    const relFile = path.join(relRoot, entry.name).replaceAll(path.sep, '/')
    if (entry.isDirectory()) walk(relFile, pred, out)
    else if (pred(relFile)) out.push(relFile)
  }
  return out
}
function sha256(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(full(relPath))).digest('hex')
}
function newestMtime(relPaths) {
  let newest = 0
  for (const relPath of relPaths) {
    const p = full(relPath)
    if (fs.existsSync(p)) newest = Math.max(newest, fs.statSync(p).mtimeMs)
  }
  return newest
}
function foodDumpCandidates() {
  if (instance) return [path.join(instance, 'kubejs/config/food_effect_index.json')]
  return [full('generated/runtime-dumps/kubejs-config/food_effect_index.json')]
}
function foodSummaryForIndex(indexPath) {
  const dir = path.dirname(indexPath)
  const sibling = path.join(dir, 'food_effect_summary.json')
  if (fs.existsSync(sibling)) return sibling
  if (indexPath === full('generated/runtime-dumps/kubejs-config/food_effect_index.json')) {
    return full('generated/runtime-dumps/kubejs-config/food_effect_summary.json')
  }
  return sibling
}
function newestExistingFile(paths) {
  let best = null
  for (const p of paths) {
    if (!fs.existsSync(p)) continue
    const stat = fs.statSync(p)
    if (!best || stat.mtimeMs > best.mtimeMs) best = { file: p, mtimeMs: stat.mtimeMs }
  }
  return best
}
function firstExistingFile(paths) {
  for (const p of paths) {
    if (!fs.existsSync(p)) continue
    const stat = fs.statSync(p)
    return { file: p, mtimeMs: stat.mtimeMs }
  }
  return null
}
function instanceLatestLog() {
  return instance ? path.join(instance, 'logs/latest.log') : ''
}
function extractCallArrays(text, callName) {
  const arrays = []
  let cursor = 0
  while (true) {
    const call = text.indexOf(`${callName}(`, cursor)
    if (call < 0) break
    if (text.slice(Math.max(0, call - 12), call).includes('function ')) {
      cursor = call + callName.length
      continue
    }
    const start = text.indexOf('[', call)
    if (start < 0) break
    let depth = 0
    let quote = null
    let end = -1
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      const prev = text[i - 1]
      if (quote) {
        if (ch === quote && prev !== '\\') quote = null
        continue
      }
      if (ch === "'" || ch === '"') {
        quote = ch
        continue
      }
      if (ch === '[') depth++
      if (ch === ']') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
    if (end < 0) break
    const literal = text.slice(start, end)
    try {
      arrays.push(vm.runInNewContext(`(${literal})`, {}, { timeout: 1000 }))
    } catch (error) {
      fail(`parse ${callName} rows`, error.message)
    }
    cursor = end
  }
  return arrays
}

function validateEconomy() {
  const tradeFile = 'kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js'
  const text = read(tradeFile)
  const context = { console: { warn() {}, info() {} } }
  vm.createContext(context)
  vm.runInContext(text, context, { filename: tradeFile, timeout: 1000 })

  const coinOrder = ['copper', 'zinc', 'iron', 'industrial_iron', 'brass', 'gold', 'platinum']
  const coinItems = new Set(Object.values(context.BTM_COIN || {}))
  const missingCoinTiers = coinOrder.filter(tier => !context.BTM_COIN?.[tier])
  missingCoinTiers.length ? fail('economy coin tier map is complete', missingCoinTiers.join(', ')) : ok('economy coin tier map is complete', `${coinOrder.length} tiers`)

  const exchangeRows = extractCallArrays(text, 'btmAddCoinExchangeTrades').flat()
  const exchangeEdges = exchangeRows.map(row => ({
    from: row[1],
    to: row[3],
    input: Number(row[2]),
    output: Number(row[4]),
    rate: Number(row[4]) / Number(row[2])
  }))

  const invalidExchange = exchangeEdges.filter(edge => !coinOrder.includes(edge.from) || !coinOrder.includes(edge.to) || !(edge.input > 0) || !(edge.output > 0))
  invalidExchange.length ? fail('coin exchange rows are well-formed', JSON.stringify(invalidExchange)) : ok('coin exchange rows are well-formed', `${exchangeEdges.length} rows`)

  const index = Object.fromEntries(coinOrder.map((tier, i) => [tier, i]))
  const distances = Object.fromEntries(coinOrder.map(tier => [tier, 0]))
  let improved = false
  for (let i = 0; i < coinOrder.length; i++) {
    improved = false
    for (const edge of exchangeEdges) {
      const weight = -Math.log(edge.rate)
      if (distances[edge.to] > distances[edge.from] + weight + 1e-12) {
        distances[edge.to] = distances[edge.from] + weight
        improved = true
      }
    }
  }
  improved ? fail('coin exchange graph has no profitable conversion cycle', 'negative log cycle detected') : ok('coin exchange graph has no profitable conversion cycle')

  const copperCost = Object.fromEntries(coinOrder.map(tier => [tier, Infinity]))
  copperCost.copper = 1
  for (let i = 0; i < coinOrder.length; i++) {
    for (const edge of exchangeEdges) {
      if (Number.isFinite(copperCost[edge.from])) {
        copperCost[edge.to] = Math.min(copperCost[edge.to], copperCost[edge.from] * edge.input / edge.output)
      }
    }
  }

  const buys = []
  function blockedBuyResult(item) {
    try {
      return typeof context.btmIsNonGrownInfiniteBuyResult === 'function' && context.btmIsNonGrownInfiniteBuyResult(item)
    } catch {
      return false
    }
  }
  function addBuy(tier, cost, item, count, source) {
    if (blockedBuyResult(item)) return
    buys.push({ tier, cost: Number(cost), item, count: Number(count), source })
  }
  ;(context.BTM_30_ITEMS || []).forEach((row, i) => {
    addBuy('copper', 2 + Math.floor(i / 10), row[0], row[1], 'BTM_30 copper')
    addBuy('zinc', 3 + Math.floor(i / 10), row[0], row[1], 'BTM_30 zinc')
    addBuy('iron', 4 + Math.floor(i / 10), row[0], row[1], 'BTM_30 iron')
  })
  for (const [tier, arrayName] of [
    ['industrial_iron', 'BTM_INDUSTRIAL_IRON_MARKET'],
    ['gold', 'BTM_GOLD_MARKET'],
    ['platinum', 'BTM_PLATINUM_MARKET']
  ]) {
    for (const row of context[arrayName] || []) addBuy(tier, row[2], row[3], row[4], arrayName)
  }
  for (const row of context.BTM_WANDERER_MARKET || []) addBuy(row[1], row[2], row[3], row[4], 'BTM_WANDERER_MARKET')
  for (const rows of extractCallArrays(text, 'btmAddTrades')) {
    for (const row of rows) addBuy(row[1], row[2], row[3], row[4], 'btmAddTrades')
  }

  const sells = []
  for (const rows of extractCallArrays(text, 'btmAddSellTrades')) {
    for (const row of rows) sells.push({ item: row[1], input: Number(row[2]), copper: Number(row[3]) })
  }

  const sellByItem = new Map()
  for (const sell of sells) {
    if (coinItems.has(sell.item)) fail('coin items are not sell-trade inputs', sell.item)
    const rate = sell.copper / sell.input
    sellByItem.set(sell.item, Math.max(sellByItem.get(sell.item) || 0, rate))
  }

  const profitable = []
  for (const buy of buys) {
    const tierCost = copperCost[buy.tier]
    const sellRate = sellByItem.get(buy.item)
    if (!Number.isFinite(tierCost) || !sellRate) continue
    const buyCostPerItem = tierCost * buy.cost / buy.count
    if (sellRate > buyCostPerItem + 1e-9) {
      profitable.push(`${buy.item}: buy ${buy.cost} ${buy.tier} for ${buy.count} (${buyCostPerItem.toFixed(3)} copper/item), sell ${sellRate.toFixed(3)} copper/item via ${buy.source}`)
    }
  }
  profitable.length ? fail('villager buy/sell trades have no direct profitable item loop', profitable.slice(0, 40).join('\n')) : ok('villager buy/sell trades have no direct profitable item loop', `${buys.length} buys, ${sells.length} sells`)

  const wares = walk('kubejs/data/wares', file => file.endsWith('.json'))
  const waresText = wares.map(read).join('\n')
  waresText.includes('minecraft:emerald') ? fail('Wares economy has no emerald currency', 'minecraft:emerald still present') : ok('Wares economy has no emerald currency', `${wares.length} tables`)
  ;[...coinItems].some(coin => waresText.includes(coin)) ? ok('Wares economy uses coin currency') : fail('Wares economy uses coin currency', 'no Create Deco coin IDs found')
}

function validateMagicBody() {
  const candidates = readJson('kubejs/config/food_effect_progression_candidates.json')
  const categories = candidates.categories || {}
  const thresholds = {
    combat_supply: 50,
    route_survival: 10,
    movement_supply: 20,
    utility_supply: 10,
    strong_nutrition: 5
  }
  const categoryFailures = []
  for (const [category, min] of Object.entries(thresholds)) {
    const count = (categories[category] || []).length
    if (count < min) categoryFailures.push(`${category}: ${count} < ${min}`)
  }
  categoryFailures.length ? fail('food effect graph has required route/body categories', categoryFailures.join(', ')) : ok('food effect graph has required route/body categories', `${candidates.foodCount} foods, ${candidates.candidateCount} candidates`)

  const dumpFile = firstExistingFile(foodDumpCandidates())
  if (dumpFile) {
    const dump = JSON.parse(fs.readFileSync(dumpFile.file, 'utf8'))
    const provenanceProblems = []
    if (dump.schema !== 'btm.food_effect_audit.v2') provenanceProblems.push(`schema=${dump.schema || '<missing>'}`)
    if (dump.generatedBy !== 'kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js') provenanceProblems.push(`generatedBy=${dump.generatedBy || '<missing>'}`)
    if (!dump.generatedAt) provenanceProblems.push('generatedAt=<missing>')
    if (provenanceProblems.length) {
      fail('runtime food effect dump has provenance metadata', `${path.relative(repo, dumpFile.file) || dumpFile.file}: ${provenanceProblems.join(', ')}`)
    } else {
      ok('runtime food effect dump has provenance metadata', `${dump.schema}, ${dump.generatedAt}`)
    }
    if (Number(dump.errorCount || 0) !== 0) fail('runtime food effect dump has no extraction errors', `${dump.errorCount} errors`)
    else ok('runtime food effect dump has no extraction errors', `${dump.foodCount} foods from ${path.relative(repo, dumpFile.file) || dumpFile.file}`)

    const summaryPath = foodSummaryForIndex(dumpFile.file)
    if (!fs.existsSync(summaryPath)) {
      fail('runtime food effect summary exists', path.relative(repo, summaryPath) || summaryPath)
    } else {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
      const summaryProblems = []
      if (summary.schema !== dump.schema) summaryProblems.push(`schema=${summary.schema || '<missing>'}`)
      if (summary.generatedBy !== dump.generatedBy) summaryProblems.push(`generatedBy=${summary.generatedBy || '<missing>'}`)
      if (summary.generatedAt !== dump.generatedAt) summaryProblems.push(`generatedAt=${summary.generatedAt || '<missing>'}`)
      if (summary.source !== dump.source) summaryProblems.push('source mismatch')
      if (summary.foodCount !== dump.foodCount) summaryProblems.push(`foodCount=${summary.foodCount}, index=${dump.foodCount}`)
      if (summary.errorCount !== dump.errorCount) summaryProblems.push(`errorCount=${summary.errorCount}, index=${dump.errorCount}`)
      if (summaryProblems.length) {
        fail('runtime food effect summary matches index', `${path.relative(repo, summaryPath) || summaryPath}: ${summaryProblems.join(', ')}`)
      } else {
        ok('runtime food effect summary matches index', `${summary.foodCount} foods`)
      }
      const logPath = instanceLatestLog()
      if (logPath && fs.existsSync(logPath)) {
        const logText = readAbs(logPath)
        const expectedLine = `[BTM-FOOD-AUDIT] foods=${summary.foodCount} withEffects=${summary.foodsWithEffectCount} errors=${summary.errorCount}`
        if (logText.includes(expectedLine)) {
          ok('latest log confirms food effect dump emission', expectedLine)
        } else {
          fail('latest log confirms food effect dump emission', `missing ${expectedLine} in ${logPath}`)
        }
      } else if (instance) {
        fail('latest log exists for food effect dump correlation', path.join(instance, 'logs/latest.log'))
      }
    }

    const newestSourceMtime = newestMtime([
      'kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js',
      'kubejs/config/audit_dumps.json',
      'kubejs/config/food_effect_progression_candidates.json'
    ])
    if (newestSourceMtime && dumpFile.mtimeMs + 1000 < newestSourceMtime) {
      fail('runtime food effect dump is fresh enough for source inputs', `${path.relative(repo, dumpFile.file) || dumpFile.file} is older than food audit sources; rerun a dump-enabled runtime`)
    } else {
      ok('runtime food effect dump is fresh enough for source inputs')
    }
  } else {
    fail('runtime food effect dump exists', instance ? path.join(instance, 'kubejs/config/food_effect_index.json') : 'generated/runtime-dumps/kubejs-config/food_effect_index.json')
  }

  const heartText = read('kubejs/server_scripts/40_recipe_add/40_blood_orbs_from_still_beating_hearts.js')
  const recipes = [...heartText.matchAll(/addTypedHeartOrbRecipe\(event, '[^']+', '([^']+)', '([^']+)', (\d+), (\d+), (\d+), (\d+)\)/g)]
    .map(match => ({ output: match[1], input: match[2], tier: Number(match[3]), syphon: Number(match[4]), rate: Number(match[5]), drain: Number(match[6]) }))
  const expectedOutputs = ['bloodmagic:weakbloodorb', 'bloodmagic:apprenticebloodorb', 'bloodmagic:magicianbloodorb', 'bloodmagic:masterbloodorb', 'bloodmagic:archmagebloodorb']
  const heartFailures = []
  if (recipes.length !== expectedOutputs.length) heartFailures.push(`expected ${expectedOutputs.length} heart-orb recipes, found ${recipes.length}`)
  for (let i = 0; i < recipes.length; i++) {
    if (recipes[i].output !== expectedOutputs[i]) heartFailures.push(`unexpected orb at ${i}: ${recipes[i].output}`)
    if (!recipes[i].input.startsWith('kubejs:') || !recipes[i].input.endsWith('_blood_heart')) heartFailures.push(`non typed-heart input: ${recipes[i].input}`)
    if (i > 0 && !(recipes[i].tier > recipes[i - 1].tier && recipes[i].syphon > recipes[i - 1].syphon && recipes[i].rate > recipes[i - 1].rate && recipes[i].drain > recipes[i - 1].drain)) {
      heartFailures.push(`non-monotonic Blood Orb escalation at ${recipes[i].output}`)
    }
  }
  heartFailures.length ? fail('Blood Orb heart bridge escalates monotonically', heartFailures.join('\n')) : ok('Blood Orb heart bridge escalates monotonically', `${recipes.length} orb tiers`)

  const lifeforce = read('kubejs/server_scripts/30_recipe_replace/82_blood_magic_lifeforce_rework.js')
  const lifeforceMarkers = ['bloodmagic:altar', 'bloodmagic:daggerofsacrifice', 'upgradeLevel(4)', 'altarSyphon(60000)', 'bloodmagic:etherealslate']
  const missingMarkers = lifeforceMarkers.filter(marker => !lifeforce.includes(marker))
  missingMarkers.length ? fail('Blood Magic lifeforce escalation markers exist', missingMarkers.join(', ')) : ok('Blood Magic lifeforce escalation markers exist')

  const deathConfig = read('defaultconfigs/configurabledeath-server.toml')
  const noMovingSpawn = read('kubejs/startup_scripts/20_globals/10_immobile_spawn.js')
  const contract = readJson('tools/pack_contract.json')
  const sourceRoot = process.env.BTM_CUSTOM_MODS_DIR || contract.customMods.sourceRoot
  const rpgEventsPath = path.join(sourceRoot, 'rpg-stats/src/main/kotlin/com/example/rpgstats/common/event/CommonForgeEvents.kt')
  const rpgPointsPath = path.join(sourceRoot, 'rpg-stats/src/main/kotlin/com/example/rpgstats/common/points/PointAwarder.kt')
  const rpgHeartPath = path.join(sourceRoot, 'rpg-stats/src/main/kotlin/com/example/rpgstats/common/item/StillBeatingHeartData.kt')
  const classRespawnPath = path.join(sourceRoot, 'class-selector/src/main/kotlin/com/example/classselector/respawn/PersonalRespawnSystem.kt')
  const deathSourceText = [
    deathConfig,
    noMovingSpawn,
    fs.existsSync(rpgEventsPath) ? readAbs(rpgEventsPath) : '',
    fs.existsSync(rpgPointsPath) ? readAbs(rpgPointsPath) : '',
    fs.existsSync(rpgHeartPath) ? readAbs(rpgHeartPath) : '',
    fs.existsSync(classRespawnPath) ? readAbs(classRespawnPath) : ''
  ].join('\n')
  const deathSourceMarkers = [
    'keepInventory = true',
    'keepArmor = true',
    'keepHotbar = true',
    'newStats.unspentPoints = 0',
    'newStats.allocations.clear()',
    'StillBeatingHeartData.create',
    'root.putInt("level", player.experienceLevel)',
    'classselector:respawn_dim',
    'PlayerSetSpawnEvent',
    'event.setCanceled(true)',
    'Bed respawn changes are disabled while class spawn is locked.',
    'playRespawnSoundForPlayer',
    'spawnRespawnParticlesForPlayer'
  ]
  const missingDeathSourceMarkers = deathSourceMarkers.filter(marker => !deathSourceText.includes(marker))
  missingDeathSourceMarkers.length
    ? fail('death overhaul source contract keeps items, resets RPG power, and locks respawn', missingDeathSourceMarkers.join(', '))
    : ok('death overhaul source contract keeps items, resets RPG power, and locks respawn')

  const deathDocs = [read('docs/README.md'), read('docs/content_systems.md'), read('docs/progression.md')].join('\n')
  const deathDocMarkers = [
    'death/respawn life-length loop',
    'life-length and location penalty',
    'rpgstats:still_beating_heart',
    'lifePeakLevel',
    'classselector:respawn_*',
    'sound and particle FX',
    'very-late-game exception'
  ]
  const missingDeathDocMarkers = deathDocMarkers.filter(marker => !deathDocs.includes(marker))
  missingDeathDocMarkers.length
    ? fail('death overhaul is covered in living docs', missingDeathDocMarkers.join(', '))
    : ok('death overhaul is covered in living docs')

  const starterSources = []
  const kits = readJson('config/classselector/kits.json')
  for (const kit of kits) {
    for (const entry of kit.items || []) starterSources.push({ source: `kit:${kit.id}`, item: entry.item || '' })
  }

  const embark = readJson('config/classselector/embark.json')
  for (const entry of embark.items || []) starterSources.push({ source: `embark:${entry.id}`, item: entry.item || '' })

  const forbiddenStarterItems = []
  const forbiddenPrefixes = [
    'ae2:',
    'advanced_ae:',
    'pneumaticcraft:',
    'bloodmagic:',
    'creatingspace:',
    'wares:',
    'protection_pixel:',
    'sophisticatedbackpacks:',
    'sophisticatedstorage:'
  ]
  const forbiddenExact = new Set([
    'create:track',
    'create:track_station',
    'create:controller_rail',
    'create:precision_mechanism',
    'minecraft:tnt',
    'minecraft:flint_and_steel',
    'minecraft:gunpowder',
    'minecraft:fire_charge',
    'farmersdelight:flint_knife',
    'tconstruct:hand_axe',
    'quark:seed_pouch'
  ])
  const forbiddenPatterns = [
    /(^|:).*(^|_)(log|wood|planks)$/,
    /(^|:).*(pickaxe|_axe|shovel|hoe|sword|knife|hammer|saw|mattock|excavator)$/,
    /(^|:).*(chest|barrel|crate|basket|backpack|pouch|sack)$/
  ]

  for (const { source, item } of starterSources) {
    if (
      forbiddenPrefixes.some(prefix => item.startsWith(prefix)) ||
      forbiddenExact.has(item) ||
      forbiddenPatterns.some(pattern => pattern.test(item))
    ) {
      forbiddenStarterItems.push(`${source}: ${item}`)
    }
  }
  forbiddenStarterItems.length
    ? fail('starting options avoid tools, storage, logs, and missing-logistics progression items', forbiddenStarterItems.join('\n'))
    : ok('starting options avoid tools, storage, logs, and missing-logistics progression items', `${kits.length} kits, ${embark.items?.length || 0} embark items`)
}

function validateClientQuestIntent() {
  const liveQuestFiles = walk('config/ftbquests', file => file.endsWith('.snbt'))
  const liveQuestContent = liveQuestFiles.filter(file => !file.endsWith('client-config.snbt'))
  liveQuestContent.length ? fail('live FTB quest content is intentionally empty', liveQuestContent.join(', ')) : ok('live FTB quest content is intentionally empty', `${liveQuestFiles.length} config file(s)`)

  const generatedQuestFiles = walk('generated/ftbquests', file => file.endsWith('.snbt'))
  generatedQuestFiles.length >= 4 ? ok('generated quest output remains available for regeneration audits', `${generatedQuestFiles.length} generated files`) : fail('generated quest output remains available for regeneration audits', `${generatedQuestFiles.length} files`)

  const hidden = read('kubejs/client_scripts/40_hide_quarantined_systems.js')
  const remove = read('kubejs/server_scripts/20_recipe_remove/30_remove_items.js')
  const requiredHidden = [
    'alchemistry:dissolver',
    'alchemistry:fusion_chamber_controller',
    'occultism:miner_foliot_unspecialized',
    'sophisticatedbackpacks:stack_upgrade_omega_tier',
    'pneumaticcraft:creative_compressor'
  ]
  const missing = requiredHidden.filter(item => !hidden.includes(item) || !remove.includes(item))
  if (!hidden.includes('JEIEvents.hideItems') || !hidden.includes('EMIEvents.hideItems')) missing.push('JEI/EMI dual hide hooks')
  missing.length ? fail('quarantined items are removed and hidden from JEI/EMI source hooks', missing.join(', ')) : ok('quarantined items are removed and hidden from JEI/EMI source hooks', `${requiredHidden.length} anchors`)
}

function validateVanillaStyleToolSuppression() {
  const serverPath = 'kubejs/server_scripts/30_recipe_replace/60_vanilla_tools_to_tcon_heads.js'
  const clientPath = 'kubejs/client_scripts/20_hide_vanilla_tools.js'
  const server = read(serverPath)
  const client = read(clientPath)

  const requiredToolMarkers = [
    'minecraft:',
    'ae2',
    'aether',
    'blue_skies',
    'botania',
    'deeperdarker',
    'everythingcopper',
    'forbidden_arcanus',
    'goety',
    'iceandfire',
    'malum',
    'occultism:iesnium_pickaxe',
    'the_finley_dimension_remastered',
    'undergarden',
    'twilightforest:ironwood_pickaxe',
    'ars_nouveau:enchanters_sword',
    'blue_skies:maple_spear',
    'create:cardboard_sword',
    'farmersdelight:flint_knife',
    'notreepunching:flint_pickaxe',
    'notreepunching:iron_saw',
    'rpgstats:iron_ritual_dagger',
    'undergarden:forgotten_battleaxe'
  ]
  const missingToolMarkers = requiredToolMarkers.filter(marker => !server.includes(marker) || !client.includes(marker))
  missingToolMarkers.length
    ? fail('vanilla-style tool suppression covers audited mod families', missingToolMarkers.join(', '))
    : ok('vanilla-style tool suppression covers audited mod families', `${requiredToolMarkers.length} markers`)

  const serverNeedles = [
    'event.remove({ output: tool })',
    'event.remove({ id: tool })',
    'event.remove({ type: tool })',
    "event.remove({ type: 'minecraft:smithing_transform', output: tool })",
    'BTM_VANILLA_STYLE_TOOL_RECIPE_IDS',
    'occultism:ritual/craft_infused_pickaxe',
    "event.add('c:hidden_from_recipe_viewers'",
    'btmItemExists'
  ]
  const missingServerNeedles = serverNeedles.filter(marker => !server.includes(marker))
  missingServerNeedles.length
    ? fail('vanilla-style tools are blocked from crafting and recipe viewers server-side', missingServerNeedles.join(', '))
    : ok('vanilla-style tools are blocked from crafting and recipe viewers server-side', `${serverNeedles.length} hooks`)

  const clientNeedles = ['JEIEvents.hideItems', 'EMIEvents.hideItems']
  const missingClientNeedles = clientNeedles.filter(marker => !client.includes(marker))
  missingClientNeedles.length
    ? fail('vanilla-style tools are hidden from JEI and EMI', missingClientNeedles.join(', '))
    : ok('vanilla-style tools are hidden from JEI and EMI')

  const forbiddenFamilies = ["['tconstruct'", '"tconstruct"']
  const forbiddenHits = forbiddenFamilies.filter(marker => server.includes(marker) || client.includes(marker))
  forbiddenHits.length
    ? fail('vanilla-style tool suppression avoids TConstruct tool-building entries', forbiddenHits.join(', '))
    : ok('vanilla-style tool suppression avoids TConstruct tool-building entries')

  const skippedRemovalNeedles = [
    'if (!btmItemExists(tool)) continue',
    'if (btmItemExists(tool)) event.remove'
  ].filter(marker => server.includes(marker))
  skippedRemovalNeedles.length
    ? fail('vanilla-style tool recipe removals are unconditional', skippedRemovalNeedles.join(', '))
    : ok('vanilla-style tool recipe removals are unconditional')
}

function validateNoTreePunchingReplacement() {
  const hook = read('kubejs/startup_scripts/20_blocks/20_no_tree_punching_replacement.js')
  const assignments = read('kubejs/startup_scripts/99_ntp_audit_assignments.js')
  const handBreakable = readJson('kubejs/data/kubejs/tags/blocks/hand_breakable.json')

  const assignmentsContainGravel = /"hand"\s*:\s*\[[\s\S]*"minecraft:gravel"/.test(assignments)
  assignmentsContainGravel
    ? ok('NTP audited assignments keep gravel hand-breakable')
    : fail('NTP audited assignments keep gravel hand-breakable', 'minecraft:gravel missing from blocks.hand')

  const handTagText = JSON.stringify(handBreakable)
  handTagText.includes('minecraft:gravel') && handTagText.includes('#forge:gravel')
    ? ok('NTP hand-breakable tag covers vanilla and forge gravel')
    : fail('NTP hand-breakable tag covers vanilla and forge gravel', 'missing minecraft:gravel or #forge:gravel')

  hook.includes('function btmNtprRefreshAssignments()') && /function btmNtprShouldDeny[\s\S]*btmNtprRefreshAssignments\(\)/.test(hook)
    ? ok('NTP hook refreshes audited assignments after startup load ordering')
    : fail('NTP hook refreshes audited assignments after startup load ordering', 'hook must not snapshot global.BTM_NTPR_AUDIT_ASSIGNMENTS before 99_ntp_audit_assignments.js loads')
}

function validatePrimitiveMiningRegressionContracts() {
  const assignmentText = read('kubejs/startup_scripts/99_ntp_audit_assignments.js')
  const assignmentMatch = assignmentText.match(/global\.BTM_NTPR_AUDIT_ASSIGNMENTS\s*=\s*({[\s\S]*})\s*$/)
  const assignments = assignmentMatch ? JSON.parse(assignmentMatch[1]) : null
  const blockSets = Object.fromEntries(Object.entries(assignments?.blocks || {}).map(([key, values]) => [key, new Set(values)]))

  function blocksIn(group, ids) {
    return ids.filter(id => !blockSets[group]?.has(id))
  }

  const handSoftBlocks = [
    'minecraft:sand',
    'minecraft:red_sand',
    'minecraft:gravel',
    'minecraft:dirt',
    'minecraft:coarse_dirt',
    'minecraft:rooted_dirt',
    'minecraft:mud',
    'minecraft:grass_block',
    'immersive_weathering:loam',
    'immersive_weathering:silt',
    'dynamictrees:rooty_gravel'
  ]
  const missingHandSoft = blocksIn('hand', handSoftBlocks)
  missingHandSoft.length
    ? fail('primitive soft ground blocks remain hand-mineable', missingHandSoft.join(', '))
    : ok('primitive soft ground blocks remain hand-mineable', `${handSoftBlocks.length} representative blocks`)

  const pickStoneBlocks = [
    'minecraft:stone',
    'minecraft:cobblestone',
    'minecraft:deepslate',
    'minecraft:tuff',
    'minecraft:calcite',
    'minecraft:granite',
    'minecraft:diorite',
    'minecraft:andesite',
    'minecraft:basalt'
  ]
  const missingPickStone = blocksIn('pickaxe', pickStoneBlocks)
  missingPickStone.length
    ? fail('stone-like blocks remain pickaxe-mineable', missingPickStone.join(', '))
    : ok('stone-like blocks remain pickaxe-mineable', `${pickStoneBlocks.length} representative blocks`)

  const axeWoodBlocks = [
    'minecraft:oak_log',
    'minecraft:oak_wood',
    'minecraft:stripped_oak_log',
    'minecraft:oak_planks',
    'malum:runewood_log',
    'hexerei:willow_log',
    'dynamictrees:oak_branch'
  ]
  const missingAxeWood = blocksIn('axe', axeWoodBlocks)
  missingAxeWood.length
    ? fail('wood-like blocks remain axe-mineable', missingAxeWood.join(', '))
    : ok('wood-like blocks remain axe-mineable', `${axeWoodBlocks.length} representative blocks`)

  const shovelSoftBlocks = [
    'minecraft:sand',
    'minecraft:gravel',
    'minecraft:dirt',
    'minecraft:coarse_dirt',
    'minecraft:rooted_dirt',
    'minecraft:mud',
    'minecraft:grass_block',
    'immersive_weathering:grassy_silt'
  ]
  const missingShovelSoft = shovelSoftBlocks.filter(id => !blockSets.hand?.has(id) && !blockSets.shovel?.has(id))
  missingShovelSoft.length
    ? fail('soft ground blocks remain shovel-usable through hand or shovel gates', missingShovelSoft.join(', '))
    : ok('soft ground blocks remain shovel-usable through hand or shovel gates', `${shovelSoftBlocks.length} representative blocks`)

  const grassPickBlocks = [
    'unearthed:beige_limestone_grassy_regolith',
    'unearthed:conglomerate_grassy_regolith',
    'unearthed:limestone_grassy_regolith',
    'unearthed:stone_grassy_regolith'
  ]
  const missingGrassPick = blocksIn('pickaxe', grassPickBlocks)
  missingGrassPick.length
    ? fail('grass-over-stone blocks remain pickaxe-mineable', missingGrassPick.join(', '))
    : ok('grass-over-stone blocks remain pickaxe-mineable', `${grassPickBlocks.length} representative blocks`)

  const butcherKnife = readJson('kubejs/data/kubejs/recipes/primitive/flint_butcher_knife.json')
  const handAxe = readJson('kubejs/data/kubejs/recipes/primitive/flint_hand_axe.json')
  function ingredientCount(recipe, item) {
    return (recipe.ingredients || []).filter(ingredient => ingredient.item === item).length
  }
  const knifeNbt = String(butcherKnife.result?.nbt || '')
  const knifeProblems = []
  if (butcherKnife.result?.item !== 'additionalweaponry:butcher_knife') knifeProblems.push(`result=${butcherKnife.result?.item}`)
  if (ingredientCount(butcherKnife, 'minecraft:flint') !== 3) knifeProblems.push('flint count')
  if (ingredientCount(butcherKnife, 'minecraft:stick') !== 1) knifeProblems.push('stick count')
  if (!knifeNbt.includes('tconstruct:flint') || !knifeNbt.includes('tconstruct:wood')) knifeProblems.push('TConstruct flint/wood NBT')
  knifeProblems.length
    ? fail('flint/wood butcher knife primitive recipe remains craftable', knifeProblems.join(', '))
    : ok('flint/wood butcher knife primitive recipe remains craftable')

  const axeNbt = String(handAxe.result?.nbt || '')
  const axeProblems = []
  if (handAxe.result?.item !== 'tconstruct:hand_axe') axeProblems.push(`result=${handAxe.result?.item}`)
  if (ingredientCount(handAxe, 'minecraft:flint') !== 2) axeProblems.push('flint count')
  if (ingredientCount(handAxe, 'farmersdelight:straw') !== 1) axeProblems.push('straw count')
  if (ingredientCount(handAxe, 'minecraft:stick') !== 1) axeProblems.push('stick count')
  if (!axeNbt.includes('tconstruct:flint') || !axeNbt.includes('tconstruct:wood')) axeProblems.push('TConstruct flint/wood NBT')
  axeProblems.length
    ? fail('straw/flint/stick hand axe primitive recipe remains craftable', axeProblems.join(', '))
    : ok('straw/flint/stick hand axe primitive recipe remains craftable')

  const fdKnives = readJson('kubejs/data/farmersdelight/tags/items/tools/knives.json')
  const fdStrawHarvesters = readJson('kubejs/data/farmersdelight/tags/items/straw_harvesters.json')
  const knifeTagProblems = []
  if (!fdKnives.values?.includes('additionalweaponry:butcher_knife')) knifeTagProblems.push('farmersdelight:tools/knives')
  if (!fdStrawHarvesters.values?.includes('additionalweaponry:butcher_knife')) knifeTagProblems.push('farmersdelight:straw_harvesters')
  knifeTagProblems.length
    ? fail('flint butcher knife remains a Farmer Delight straw harvester', knifeTagProblems.join(', '))
    : ok('flint butcher knife remains a Farmer Delight straw harvester')

  const ntprHook = read('kubejs/startup_scripts/20_blocks/20_no_tree_punching_replacement.js')
  const knifeDurabilityMarkers = [
    'function btmNtprDamageMainHandKnife',
    "btmNtprBlockIn('knife', blockId)",
    "btmNtprItemIn('knife', itemId)",
    "['isDamageableItem', 'm_41763_']",
    "['setDamageValue', 'm_41721_']",
    "['shrink', 'm_41774_']",
    'btmNtprDamageMainHandKnife(event.getPlayer(), event.getState())'
  ]
  const missingKnifeDurabilityMarkers = knifeDurabilityMarkers.filter(marker => !ntprHook.includes(marker))
  missingKnifeDurabilityMarkers.length
    ? fail('knife-gated plant cutting consumes knife durability', missingKnifeDurabilityMarkers.join(', '))
    : ok('knife-gated plant cutting consumes knife durability')

  const tconPatternRoutes = read('kubejs/server_scripts/30_recipe_replace/98_starting_progression_bypasses.js')
  const tconPatternMarkers = [
    "event.remove({ id: 'tconstruct:common/pattern' })",
    "event.remove({ id: 'tconstruct:tables/pattern' })",
    "event.remove({ id: 'tconstruct:pattern' })",
    "event.remove({ type: 'minecraft:crafting_shaped', output: 'tconstruct:pattern' })",
    "event.remove({ type: 'minecraft:crafting_shapeless', output: 'tconstruct:pattern' })",
    "event.shaped(Item.of('tconstruct:pattern', 4)",
    "C: 'farmersdelight:canvas'",
    "type: 'create:pressing'",
    "{ item: 'minecraft:paper' }",
    "{ item: 'tconstruct:pattern' }"
  ]
  const missingTconPatternMarkers = tconPatternMarkers.filter(marker => !tconPatternRoutes.includes(marker))
  missingTconPatternMarkers.length
    ? fail('TConstruct pattern routes use canvas grid and Create paper pressing', missingTconPatternMarkers.join(', '))
    : ok('TConstruct pattern routes use canvas grid and Create paper pressing')

  const startingBypasses = read('kubejs/server_scripts/30_recipe_replace/98_starting_progression_bypasses.js')
  const flintBypassMarkers = [
    "event.remove({ id: 'tconstruct:common/materials/flint_from_gravel' })",
    "event.remove({ id: 'tconstruct:materials/flint_from_gravel' })",
    "event.remove({ id: 'tconstruct:flint_from_gravel' })",
    "event.remove({ type: 'minecraft:crafting_shapeless', input: 'minecraft:gravel', output: 'minecraft:flint' })",
    "kubejs:create/milling/gravel_to_flint_and_gunpowder"
  ]
  const missingFlintBypassMarkers = flintBypassMarkers.filter(marker => !startingBypasses.includes(marker))
  missingFlintBypassMarkers.length
    ? fail('TConstruct shapeless gravel-to-flint shortcut stays removed', missingFlintBypassMarkers.join(', '))
    : ok('TConstruct shapeless gravel-to-flint shortcut stays removed')

  const gravelBlockDrops = read('kubejs/server_scripts/50_loot/10_overworld_block_drops.js')
  startingBypasses.includes("{ item: 'minecraft:gunpowder', chance: 0.06 }") && gravelBlockDrops.includes('m.addLoot("minecraft:gunpowder").randomChance(0.125)')
    ? ok('gunpowder from gravel stays at reduced chance')
    : fail('gunpowder from gravel stays at reduced chance', 'expected Create milling 0.06 and gravel block loot 0.125')

  const hardnessProbe = readJson('kubejs/config/block_hardness_probe.json')
  const hardnessIds = new Set(hardnessProbe.blockIds || [])
  const orePairs = ['coal', 'copper', 'iron', 'gold', 'redstone', 'lapis', 'diamond', 'emerald']
  const missingOreProbeIds = []
  for (const ore of orePairs) {
    if (!hardnessIds.has(`minecraft:${ore}_ore`)) missingOreProbeIds.push(`minecraft:${ore}_ore`)
    if (!hardnessIds.has(`minecraft:deepslate_${ore}_ore`)) missingOreProbeIds.push(`minecraft:deepslate_${ore}_ore`)
  }
  missingOreProbeIds.length
    ? fail('hardness probe covers ore tier and deepslate representative pairs', missingOreProbeIds.join(', '))
    : ok('hardness probe covers ore tier and deepslate representative pairs', `${orePairs.length} ore families`)

  const hardnessDump = firstExistingFile([full('generated/runtime-dumps/block_hardness_probe.json')])
  if (hardnessDump) {
    const dump = JSON.parse(readAbs(hardnessDump.file))
    const rows = [...(dump.allBlocks || []), ...(dump.selectedBlocks || [])]
    const byId = new Map(rows.map(row => [row.id, row]))
    const deepslateProblems = []
    for (const ore of orePairs) {
      const normal = Number(byId.get(`minecraft:${ore}_ore`)?.defaultDestroyTime)
      const deepslate = Number(byId.get(`minecraft:deepslate_${ore}_ore`)?.defaultDestroyTime)
      if (!Number.isFinite(normal) || !Number.isFinite(deepslate) || Math.abs(deepslate - normal - 1) > 0.001) {
        deepslateProblems.push(`${ore}: ${normal}->${deepslate}`)
      }
    }
    deepslateProblems.length
      ? fail('deepslate ore variants add exactly +1 hardness in retained runtime probe', deepslateProblems.join(', '))
      : ok('deepslate ore variants add exactly +1 hardness in retained runtime probe')
  } else {
    ok('deepslate ore hardness runtime check is probe-ready', 'no retained block_hardness_probe.json')
  }
}

function validateVanillishExpertRecipePass() {
  const recipeFile = 'kubejs/server_scripts/30_recipe_replace/145_vanillish_recipe_expert_pass.js'
  if (!exists(recipeFile)) {
    fail('vanillish recipe expert pass exists', recipeFile)
    return
  }

  const text = read(recipeFile)
  const forbiddenConstructors = [
    'event.shaped(',
    'event.shapeless(',
    'event.smelting(',
    'event.blasting('
  ].filter(needle => text.includes(needle))
  forbiddenConstructors.length
    ? fail('vanillish recipe pass does not add grid or furnace recipes', forbiddenConstructors.join(', '))
    : ok('vanillish recipe pass does not add grid or furnace recipes')

  const createMarkers = [
    'create:mechanical_crafting',
    'create:deploying',
    'create:compacting',
    'minecraft:piston',
    'minecraft:hopper',
    'minecraft:observer',
    'minecraft:rail',
    'minecraft:minecart',
    'createbigcannons:cannon_builder',
    'immersive_aircraft:engine',
    'everythingcopper:copper_hopper',
    'chemlibDustIngots',
    "btmVanRemoveCooking(event, 'minecraft:iron_ingot')",
    'ae2:silicon'
  ]
  const missingCreateMarkers = createMarkers.filter(marker => !text.includes(marker))
  missingCreateMarkers.length
    ? fail('vanillish non-magic shortcuts are routed to Create surfaces', missingCreateMarkers.join(', '))
    : ok('vanillish non-magic shortcuts are routed to Create surfaces', `${createMarkers.length} markers`)

  const bloodMarkers = [
    'bloodmagic:alchemytable',
    'minecraft:brewing_stand',
    'minecraft:enchanting_table',
    'minecraft:beacon',
    'bloodmagic:ingot_hellforged',
    'ars_nouveau:scribes_table',
    'ars_nouveau:imbuement_chamber',
    'ars_nouveau:enchanting_apparatus',
    'bloodmagic:reinforcedslate',
    'bloodmagic:infusedslate',
    'bloodmagic:etherealslate'
  ]
  const missingBloodMarkers = bloodMarkers.filter(marker => !text.includes(marker))
  missingBloodMarkers.length
    ? fail('vanillish magic shortcuts are routed to Blood Magic alchemy', missingBloodMarkers.join(', '))
    : ok('vanillish magic shortcuts are routed to Blood Magic alchemy', `${bloodMarkers.length} markers`)
}

function validateNonGrownInfiniteResourceBoundaries() {
  const remove = read('kubejs/server_scripts/20_recipe_remove/30_remove_items.js')
  const hidden = read('kubejs/client_scripts/40_hide_quarantined_systems.js')
  const trades = read('kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js')
  const docs = [read('docs/content_systems.md'), read('docs/progression.md')].join('\n')

  const removeMarkers = [
    "event.remove({ type: 'occultism:miner' })",
    "event.remove({ type: 'bloodmagic:meteor' })",
    "event.remove({ id: 'createdieselgenerators:bulk_fermenting/lava' })",
    "event.remove({ id: 'ars_nouveau:water_essence_to_bucket' })",
    'botania:orechid',
    'botania:conjuration_catalyst',
    'ars_nouveau:glyph_conjure_water',
    'bloodmagic:watersigil',
    'bloodmagic:lavasigil'
  ]
  const missingRemoveMarkers = removeMarkers.filter(marker => !remove.includes(marker))
  missingRemoveMarkers.length
    ? fail('non-grown infinite resource recipe sources are quarantined', missingRemoveMarkers.join(', '))
    : ok('non-grown infinite resource recipe sources are quarantined', `${removeMarkers.length} markers`)

  const hiddenMarkers = [
    'JEIEvents.hideItems',
    'EMIEvents.hideItems',
    'botania:orechid',
    'botania:alchemy_catalyst',
    'ars_nouveau:ritual_conjure_island_plains',
    'ars_nouveau:glyph_conjure_water',
    'bloodmagic:watersigil',
    'bloodmagic:lavasigil'
  ]
  const missingHiddenMarkers = hiddenMarkers.filter(marker => !hidden.includes(marker))
  missingHiddenMarkers.length
    ? fail('non-grown infinite resource shortcuts are hidden from JEI/EMI', missingHiddenMarkers.join(', '))
    : ok('non-grown infinite resource shortcuts are hidden from JEI/EMI', `${hiddenMarkers.length} markers`)

  const create = read('defaultconfigs/create-server.toml')
  const createMarkers = [
    'hosePulleyBlockThreshold = -1',
    'bottomlessFluidMode = "DENY_ALL"',
    'fluidFillPlaceFluidSourceBlocks = false',
    'pipesPlaceFluidSourceBlocks = false'
  ]
  const missingCreateMarkers = createMarkers.filter(marker => !create.includes(marker))
  missingCreateMarkers.length
    ? fail('Create config disables bottomless fluid sources and source placement', missingCreateMarkers.join(', '))
    : ok('Create config disables bottomless fluid sources and source placement')

  const finiteWater = readJson('config/flowing_fluids.json')
  const finiteWaterProblems = []
  ;['rainRefillChance', 'oceanRiverSwampRefillChance', 'infiniteWaterBiomeNonConsumeChance', 'infiniteWaterBiomeDrainSurfaceChance'].forEach(key => {
    if (Number(finiteWater[key]) !== 0) finiteWaterProblems.push(`${key}=${finiteWater[key]}`)
  })
  if (finiteWater.create_infinitePipes !== false) finiteWaterProblems.push(`create_infinitePipes=${finiteWater.create_infinitePipes}`)
  finiteWaterProblems.length
    ? fail('Finite Water config has no infinite biome/refill pipe sources', finiteWaterProblems.join(', '))
    : ok('Finite Water config has no infinite biome/refill pipe sources')

  const tradeMarkers = [
    'BTM_NON_GROWN_TRADE_BUY_BLOCKLIST',
    'btmIsNonGrownInfiniteBuyResult(resultItem)',
    "'minecraft:cobblestone': true",
    "'minecraft:redstone': true",
    "'create:andesite_alloy': true",
    "'bloodmagic:blankslate': true",
    "'ae2:certus_quartz_crystal': true"
  ]
  const missingTradeMarkers = tradeMarkers.filter(marker => !trades.includes(marker))
  missingTradeMarkers.length
    ? fail('restocking trades reject non-grown material buy results', missingTradeMarkers.join(', '))
    : ok('restocking trades reject non-grown material buy results', `${tradeMarkers.length} markers`)

  const docMarkers = [
    'Non-grown infinite matter is not an authored resource source',
    'not from passive ore rituals, bottomless pumps, conjured islands, fluid sigils/glyphs, lava fermentation, or restocking raw-material trades'
  ]
  const missingDocMarkers = docMarkers.filter(marker => !docs.includes(marker))
  missingDocMarkers.length
    ? fail('living docs cover non-grown infinite resource policy', missingDocMarkers.join(', '))
    : ok('living docs cover non-grown infinite resource policy')
}

function validateWorldgenStaticContracts() {
  const rbpOverworld = read('config/rbp/world_definitions/overworld.toml')
  rbpOverworld.includes('DefaultBlockDefinition = ""')
    ? ok('RBP Overworld physics is explicit-definition only')
    : fail('RBP Overworld physics is explicit-definition only', 'DefaultBlockDefinition must be empty to avoid fallback physics on decorative/support-sensitive mod blocks')

  const generatedPackSolid = read('config/rbp/block_definitions/generated_pack_solid_blocks.toml')
  const generatedPackSolidIds = [...generatedPackSolid.matchAll(/"([a-z0-9_.-]+:[a-z0-9_/.-]+)"/g)].map(match => match[1])
  const generatedPackSolidSet = new Set(generatedPackSolidIds)
  generatedPackSolidIds.length >= 9000 && !generatedPackSolidSet.has('minecraft:bedrock')
    ? ok('RBP generated pack-solid definition covers broad solid block surface', `${generatedPackSolidIds.length} explicit ids`)
    : fail('RBP generated pack-solid definition covers broad solid block surface', `${generatedPackSolidIds.length} explicit ids; bedrock included=${generatedPackSolidSet.has('minecraft:bedrock')}`)

  const dynamicTreesManagedRbpPatterns = [
    /^dynamictrees:/,
    /^dynamictreesplus:/,
    /^btmdimtrees:/,
    /^dt[a-z0-9_]*:/
  ]
  const dynamicTreesManagedPackSolidIds = generatedPackSolidIds.filter(id => dynamicTreesManagedRbpPatterns.some(pattern => pattern.test(id)))
  dynamicTreesManagedPackSolidIds.length
    ? fail('RBP generated pack-solid definition excludes Dynamic Trees-managed blocks', dynamicTreesManagedPackSolidIds.slice(0, 20).join(', '))
    : ok('RBP generated pack-solid definition excludes Dynamic Trees-managed blocks')

  const generatedRbpWhitelistFiles = walk('config/rbp/block_definitions', file => path.basename(file).startsWith('generated_modded_') && file.endsWith('.toml'))
  const generatedRbpWhitelistText = generatedRbpWhitelistFiles.map(read).join('\n')
  const generatedRbpWhitelistIds = generatedRbpWhitelistText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('"'))
    .map(line => line.replace(/^"([^"]+)".*$/, '$1'))
  generatedRbpWhitelistFiles.length >= 10 && generatedRbpWhitelistIds.length >= 4000
    ? ok('RBP modded whitelist covers broad explicit block surface', `${generatedRbpWhitelistIds.length} ids in ${generatedRbpWhitelistFiles.length} files`)
    : fail('RBP modded whitelist covers broad explicit block surface', `${generatedRbpWhitelistIds.length} ids in ${generatedRbpWhitelistFiles.length} files`)

  const forbiddenRbpWhitelistPatterns = [
    /(^|:)bedrock$/,
    /sky_stone|skystone/,
    ...dynamicTreesManagedRbpPatterns,
    /^projectvibrantjourneys:/,
    /(^|[_:/])seashell($|[_:/])/,
    /(^|[_:/])shell($|[_:/])/
  ]
  const forbiddenRbpWhitelistIds = generatedRbpWhitelistIds.filter(id => forbiddenRbpWhitelistPatterns.some(pattern => pattern.test(id)))
  forbiddenRbpWhitelistIds.length
    ? fail('RBP generated whitelist excludes lifecycle/progression/decor-sensitive blocks', forbiddenRbpWhitelistIds.slice(0, 20).join(', '))
    : ok('RBP generated whitelist excludes lifecycle/progression/decor-sensitive blocks')

  const tectonic = readJson('config/tectonic.json')
  const terrain = tectonic.global_terrain || {}
  terrain.min_y === -64 && terrain.lava_tunnels === true
    ? ok('Tectonic Overworld exposes lava-depth terrain band', `min_y=${terrain.min_y}, lava_tunnels=${terrain.lava_tunnels}`)
    : fail('Tectonic Overworld exposes lava-depth terrain band', `min_y=${terrain.min_y}, lava_tunnels=${terrain.lava_tunnels}`)

  const adlodDeposits = walk('config/adlods/Deposits', file => file.endsWith('.cfg'))
  adlodDeposits.length >= 28 ? ok('ADLODS deposit surface remains broad', `${adlodDeposits.length} deposits`) : fail('ADLODS deposit surface remains broad', `${adlodDeposits.length} < 28`)
  ;['config/adlods/Deposits/thorium.cfg', 'config/adlods/Deposits/magnetite.cfg'].filter(exists).length
    ? fail('retired Create New Age deposits stay absent', 'thorium or magnetite deposit cfg exists')
    : ok('retired Create New Age deposits stay absent')

  const forageFiles = walk('datapacks/datapack_foraging_everywhere/data', file => file.endsWith('.json'))
  const foragePlacedFeatures = forageFiles.filter(file => file.includes('/worldgen/placed_feature/'))
  const forageBiomeModifiers = forageFiles.filter(file => file.includes('/forge/biome_modifier/'))
  const forageBiomeTags = forageFiles.filter(file => file.includes('/tags/worldgen/biome/undergarden_forage/'))
  const broadOverworldForage = forageFiles.filter(file => {
    const text = read(file)
    return text.includes('minecraft:is_overworld') || text.includes('biome_is_overworld') || text.includes('#minecraft:is_overworld')
  })
  const placedWithoutUndergardenFilter = foragePlacedFeatures.filter(file => {
    const data = readJson(file)
    return !(data.placement || []).some(entry => entry.type === 'farmersdelight:biome_tag' && String(entry.tag || '').startsWith('kubejs:undergarden_forage/'))
  })
  const modifiersWithoutUndergardenTarget = forageBiomeModifiers.filter(file => {
    const data = readJson(file)
    const biomes = Array.isArray(data.biomes) ? data.biomes : [data.biomes]
    return !biomes.every(entry => String(entry || '').startsWith('#kubejs:undergarden_forage/'))
  })
  const tagsOutsideUndergarden = forageBiomeTags.filter(file => {
    const data = readJson(file)
    return !(data.values || []).every(value => String(value).startsWith('undergarden:') || String(value).startsWith('#undergarden:') || String(value).startsWith('#kubejs:undergarden_forage/'))
  })
  const forageFailures = [
    ...broadOverworldForage.map(file => `${file}: broad-overworld-token`),
    ...placedWithoutUndergardenFilter.map(file => `${file}: missing-undergarden-placement-filter`),
    ...modifiersWithoutUndergardenTarget.map(file => `${file}: missing-undergarden-biome-modifier-target`),
    ...tagsOutsideUndergarden.map(file => `${file}: tag-outside-undergarden`)
  ]
  foragePlacedFeatures.length >= 40 && forageBiomeModifiers.length >= 20 && forageBiomeTags.length >= 7 && !forageFailures.length
    ? ok('foraging datapack is Undergarden-only', `${foragePlacedFeatures.length} placed features, ${forageBiomeModifiers.length} biome modifiers, ${forageBiomeTags.length} biome tags`)
    : fail('foraging datapack is Undergarden-only', `placed=${foragePlacedFeatures.length} modifiers=${forageBiomeModifiers.length} tags=${forageBiomeTags.length} bad=${forageFailures.join(', ')}`)

  const meteorEvVariants = read('globalresources/obelisks/excavated_variants/obelisks/variants/meteor_modded_ores.json5')
  meteorEvVariants.includes("id: 'gravel'") && meteorEvVariants.includes("block_id: 'minecraft:gravel'") && meteorEvVariants.includes("types: ['stone']")
    ? ok('Excavated Variants treats gravel as a stone ore substrate')
    : fail('Excavated Variants treats gravel as a stone ore substrate', 'missing gravel provided_stones entry')

  const meteorOreFeatureDir = 'datapacks/meteor_ore_relocation/data/kubejs/worldgen/configured_feature'
  const gravelTargetProblems = []
  const gravelTargetExclusions = new Set(['meteor_blazing_quartz_ore.json', 'meteor_iesnium_ore.json'])
  for (const file of walk(meteorOreFeatureDir, file => file.endsWith('.json')).sort()) {
    const name = path.basename(file)
    const data = readJson(file)
    if (data.type !== 'minecraft:ore' || gravelTargetExclusions.has(name)) continue
    const hasGravelTarget = (data.config?.targets || []).some(target => target.target?.predicate_type === 'minecraft:block_match' && target.target?.block === 'minecraft:gravel')
    if (!hasGravelTarget) gravelTargetProblems.push(name)
  }
  gravelTargetProblems.length
    ? fail('stone-style meteor ores can replace gravel', gravelTargetProblems.join(', '))
    : ok('stone-style meteor ores can replace gravel')

  const ntpAssignments = JSON.parse(read('kubejs/startup_scripts/99_ntp_audit_assignments.js').match(/global\.BTM_NTPR_AUDIT_ASSIGNMENTS\s*=\s*({[\s\S]*})\s*$/)[1])
  const rbpGeneratedSolid = read('config/rbp/block_definitions/generated_pack_solid_blocks.toml')
  const expectedGravelEvOres = [
    'gravel_arcane_crystal_ore',
    'gravel_bauxite_laterite',
    'gravel_cthonic_gold_ore',
    'gravel_ironstone',
    'gravel_mithril_ore',
    'gravel_natural_quartz_ore',
    'gravel_zinc_ore'
  ].map(path => `excavated_variants:${path}`)
  const shovelSet = new Set(ntpAssignments.blocks?.shovel || [])
  const pickaxeSet = new Set(ntpAssignments.blocks?.pickaxe || [])
  const missingGravelShovel = expectedGravelEvOres.filter(id => !shovelSet.has(id))
  const wronglyPickaxeGravel = expectedGravelEvOres.filter(id => pickaxeSet.has(id))
  const missingGravelRbp = expectedGravelEvOres.filter(id => !rbpGeneratedSolid.includes(`"${id}"`))
  missingGravelShovel.length || wronglyPickaxeGravel.length || missingGravelRbp.length
    ? fail('gravel Excavated Variants ore blocks stay shovel-gated and RBP-managed', `shovel=${missingGravelShovel.join(', ')} pickaxe=${wronglyPickaxeGravel.join(', ')} rbp=${missingGravelRbp.join(', ')}`)
    : ok('gravel Excavated Variants ore blocks stay shovel-gated and RBP-managed', `${expectedGravelEvOres.length} representatives`)

  const lavaDepthFiles = [
    'datapacks/realistic_ores_lava_depths/data/realisticores/forge/biome_modifier/add_osmiridium_lava_sulfide_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/forge/biome_modifier/add_thorium_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/forge/biome_modifier/add_uranium_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/configured_feature/osmiridium_lava_sulfide_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/configured_feature/thorium_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/configured_feature/uranium_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/placed_feature/osmiridium_lava_sulfide_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/placed_feature/thorium_ore_deepslate.json',
    'datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/placed_feature/uranium_ore_deepslate.json',
    'datapacks/hyle_deep/data/hyle/worldgen/placed_feature/stone_replacer.json'
  ]
  const missingLava = lavaDepthFiles.filter(file => !exists(file))
  missingLava.length ? fail('deep geology datapacks cover lava-depth and Hyle anchors', missingLava.join(', ')) : ok('deep geology datapacks cover lava-depth and Hyle anchors', `${lavaDepthFiles.length} files`)

  const hyleStoneReplacer = readJson('datapacks/hyle_deep/data/hyle/worldgen/placed_feature/stone_replacer.json')
  const hyleStoneReplacerY = hyleStoneReplacer?.placement?.[0]?.height?.value?.absolute
  hyleStoneReplacerY === -64
    ? ok('Hyle stone replacement starts at world bottom', `y=${hyleStoneReplacerY}`)
    : fail('Hyle stone replacement starts at world bottom', `y=${hyleStoneReplacerY}`)

  const misplacedHyleData = exists('datapacks/hyle_deep/data/hyledata')
    ? walk('datapacks/hyle_deep/data/hyledata', file => file.endsWith('.json'))
    : []
  misplacedHyleData.length
    ? fail('Hyle datapack data uses namespaced loader paths', misplacedHyleData.join(', '))
    : ok('Hyle datapack data uses namespaced loader paths')

  const lavaConfigured = walk('datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/configured_feature', file => file.endsWith('.json'))
  const nonLavaFeatureConfigured = lavaConfigured.filter(file => readJson(file).type !== 'realisticores:lava_exposed_ore')
  nonLavaFeatureConfigured.length
    ? fail('lava-depth configured features use the Realistic Ores lava-exposed feature', nonLavaFeatureConfigured.join(', '))
    : ok('lava-depth configured features use the Realistic Ores lava-exposed feature', `${lavaConfigured.length} configured features`)

  const lavaPlaced = walk('datapacks/realistic_ores_lava_depths/data/realisticores/worldgen/placed_feature', file => file.endsWith('.json'))
  const lavaPlacementFailures = lavaPlaced.filter(file => {
    const text = read(file)
    return !text.includes('minecraft:block_predicate_filter')
      || !text.includes('minecraft:matching_fluids')
      || !text.includes('minecraft:lava')
      || !text.includes('"absolute": -64')
      || !text.includes('"absolute": 0')
  })
  lavaPlacementFailures.length
    ? fail('lava-depth placed features are height-bounded and lava-contact filtered', lavaPlacementFailures.join(', '))
    : ok('lava-depth placed features are height-bounded and lava-contact filtered', `${lavaPlaced.length} placed features`)

  const spawnerText = read('config/incontrol/spawner.json')
  const lavaSpawnerMarkers = ['minecraft:magma_cube', '"inlava": true', '"minheight": -64', '"maxheight": 0']
  const missingLavaSpawnerMarkers = lavaSpawnerMarkers.filter(marker => !spawnerText.includes(marker))
  missingLavaSpawnerMarkers.length
    ? fail('lava-depth danger spawner targets lava diving band', missingLavaSpawnerMarkers.join(', '))
    : ok('lava-depth danger spawner targets lava diving band')

  const contract = readJson('tools/pack_contract.json')
  const sourceRoot = process.env.BTM_CUSTOM_MODS_DIR || contract.customMods.sourceRoot
  const lavaFeaturePath = path.join(sourceRoot, 'realistic-ores/src/main/java/io/github/realisticores/worldgen/LavaExposedOreFeature.java')
  const lavaFeatureText = fs.existsSync(lavaFeaturePath) ? readAbs(lavaFeaturePath) : ''
  const missingLavaFeatureMarkers = ['Feature.checkNeighbors', 'FluidTags.LAVA', 'target.target.test'].filter(marker => !lavaFeatureText.includes(marker))
  missingLavaFeatureMarkers.length
    ? fail('Realistic Ores implements per-block lava-exposed ore placement', `${lavaFeaturePath}: ${missingLavaFeatureMarkers.join(', ')}`)
    : ok('Realistic Ores implements per-block lava-exposed ore placement')

  const osmiridiumDefinitionPath = path.join(sourceRoot, 'realistic-ores/src/main/resources/data/realisticores/realistic_ores/osmiridium_lava_sulfide.json')
  const osmiridiumDefinitionText = fs.existsSync(osmiridiumDefinitionPath) ? readAbs(osmiridiumDefinitionPath) : ''
  const osmiridiumNormalOreTagFiles = [
    path.join(sourceRoot, 'realistic-ores/src/main/resources/data/forge/tags/blocks/ores/osmium.json'),
    path.join(sourceRoot, 'realistic-ores/src/main/resources/data/forge/tags/items/ores/osmium.json'),
    path.join(sourceRoot, 'realistic-ores/src/main/resources/data/forge/tags/blocks/ores/iridium.json'),
    path.join(sourceRoot, 'realistic-ores/src/main/resources/data/forge/tags/items/ores/iridium.json')
  ]
  const leakedOsmiridiumMaterialTags = []
  ;['forge:ores/osmium', 'forge:ores/iridium'].forEach(tag => {
    if (osmiridiumDefinitionText.includes(tag)) leakedOsmiridiumMaterialTags.push(`${osmiridiumDefinitionPath}: ${tag}`)
  })
  osmiridiumNormalOreTagFiles.forEach(file => {
    if (fs.existsSync(file) && readAbs(file).includes('osmiridium_lava_sulfide')) leakedOsmiridiumMaterialTags.push(file)
  })
  leakedOsmiridiumMaterialTags.length
    ? fail('osmiridium avoids normal osmium/iridium ore-source tags', leakedOsmiridiumMaterialTags.join(', '))
    : ok('osmiridium avoids normal osmium/iridium ore-source tags')

  const removeItemsText = read('kubejs/server_scripts/20_recipe_remove/30_remove_items.js')
  const missingLavaBypassRemovals = ["event.remove({ type: 'occultism:miner' })"]
    .filter(marker => !removeItemsText.includes(marker))
  missingLavaBypassRemovals.length
    ? fail('Occultism miner bypass recipes stay removed', missingLavaBypassRemovals.join(', '))
    : ok('Occultism miner bypass recipes stay removed')

  const lavaProgressionText = [
    'kubejs/server_scripts/10_tags/60_realistic_ores_deposit_tags.js',
    'kubejs/server_scripts/40_recipe_add/50_create_deposit_preprocessing.js',
    'kubejs/server_scripts/40_recipe_add/55_realistic_ores_identity_outputs.js',
    'kubejs/server_scripts/30_recipe_replace/110_extreme_y_band_reward_gates.js',
    'kubejs/server_scripts/30_recipe_replace/165_protection_pixel_post_ae2_gates.js',
    'kubejs/client_scripts/15_ore_origin_tooltips.js'
  ].map(read).join('\n')
  const lavaProgressionMarkers = [
    'realisticores:deepslate_osmiridium_lava_sulfide_ore',
    'realisticores:crushed_osmiridium_lava_sulfide_ore',
    'kubejs:deposit_blocks/osmiridium_lava_sulfide',
    'protection_pixel:tosaki_helmet',
    'protection_pixel:tosaki_chestplate',
    'protection_pixel:tosaki_leggings'
  ]
  const missingLavaProgressionMarkers = lavaProgressionMarkers.filter(marker => !lavaProgressionText.includes(marker))
  missingLavaProgressionMarkers.length
    ? fail('osmiridium lava diving route is visible and consumed by post-AE2 progression', missingLavaProgressionMarkers.join(', '))
    : ok('osmiridium lava diving route is visible and consumed by post-AE2 progression')
}

function validateDimensionProofGraphStarts() {
  const recipeFile = 'kubejs/server_scripts/30_recipe_replace/155_dimension_proof_graph_starts.js'
  if (!exists(recipeFile)) {
    fail('dimension proof graph-start recipe pass exists', recipeFile)
    return
  }

  const recipeText = read(recipeFile)
  const progression = read('docs/progression.md')
  const obeliskSection = progression.match(/## Obelisk Dimension Graph Starts\n([\s\S]*?)(?=\n## )/)?.[1] || ''
  const dimensionIds = [...recipeText.matchAll(/['"]kubejs:dimension_graph\/([^/'"]+)\//g)].map(match => match[1])
  const dimensionSet = new Set(dimensionIds)
  const expectedDimensions = ['aether', 'everdawn']
  const missingDimensions = expectedDimensions.filter(dimension => !dimensionSet.has(dimension))
  missingDimensions.length
    ? fail('dimension proof graph-start recipe ids cover mapped route dimensions', missingDimensions.join(', '))
    : ok('dimension proof graph-start recipe ids cover mapped route dimensions', expectedDimensions.join(', '))

  if (recipeText.includes('BTM_DIM_PROOF_ADDED') && recipeText.includes('btmDimProofShaped')) {
    ok('dimension proof graph-start pass uses explicit helper and recipe counter')
  } else {
    fail('dimension proof graph-start pass uses explicit helper and recipe counter', 'missing BTM_DIM_PROOF_ADDED or btmDimProofShaped')
  }

  const requiredRecipeMarkers = [
    'hangglider:glider_wing',
    'immersive_aircraft:hull',
    'cold_sweat:waterskin',
    'brewinandchewin:keg'
  ]
  const missingRecipeMarkers = requiredRecipeMarkers.filter(marker => !recipeText.includes(marker))
  missingRecipeMarkers.length
    ? fail('dimension proof graph-start outputs stay on route-tool surfaces', missingRecipeMarkers.join(', '))
    : ok('dimension proof graph-start outputs stay on route-tool surfaces', `${requiredRecipeMarkers.length} outputs`)

  const forbiddenOutputPrefixes = [
    'create:',
    'ae2:',
    'advanced_ae:',
    'pneumaticcraft:',
    'computerbridge:',
    'oc2r:',
    'bloodmagic:',
    'botania:',
    'ars_nouveau:',
    'hexerei:',
    'malum:',
    'goety:',
    'irons_spellbooks:',
    'aether:',
    'blue_skies:',
    'deeperdarker:',
    'thirst:'
  ]
  const authoredOutputs = [...recipeText.matchAll(/btmDimProofShaped\(event, '([^']+)'/g)].map(match => match[1])
  const forbiddenOutputs = authoredOutputs.filter(output => forbiddenOutputPrefixes.some(prefix => output.startsWith(prefix)))
  forbiddenOutputs.length
    ? fail('dimension proof graph-start recipes avoid self-label and spine reassignment outputs', forbiddenOutputs.join(', '))
    : ok('dimension proof graph-start recipes avoid self-label and spine reassignment outputs', `${authoredOutputs.length} authored outputs`)

  const tableRows = obeliskSection.split(/\r?\n/).filter(line => line.startsWith('|') && !line.includes('---'))
  const forbiddenPositiveMappings = [
    ['Aether', /^Aether$/i],
    ['Everbright', /Blue Skies/i],
    ['Everdawn', /Blue Skies/i],
    ['Otherside', /DeeperDarker/i]
  ].flatMap(([dimension, graphStartPattern]) => {
    const row = tableRows.find(line => line.includes(`| ${dimension} |`)) || ''
    const graphStart = row.split('|')[2]?.trim() || ''
    return graphStartPattern.test(graphStart) ? [`${dimension} -> ${graphStart}`] : []
  })
  forbiddenPositiveMappings.length
    ? fail('obelisk graph starts reject self-label dimension mappings', forbiddenPositiveMappings.join(', '))
    : ok('obelisk graph starts reject self-label dimension mappings')

  const spineTerms = ['Create', 'AE2', 'PneumaticCraft', 'OC2R', 'Botania', 'Ars', 'Hexerei', 'Malum', 'Goety', "Iron's Spells"]
  const positiveTableSpineClaims = tableRows
    .filter(row => !row.includes('| Nether |') && !row.includes('| Undergarden |'))
    .filter(row => {
      const graphStart = row.split('|')[2]?.trim() || ''
      return spineTerms.some(term => graphStart.includes(term))
    })
  positiveTableSpineClaims.length
    ? fail('obelisk graph-start table does not reassign tech or magic spines', positiveTableSpineClaims.join('\n'))
    : ok('obelisk graph-start table does not reassign tech or magic spines')

  const everdawnRow = tableRows.find(line => line.includes('| Everdawn |')) || ''
  const basicWaterOutputs = authoredOutputs.filter(output => output === 'minecraft:water_bucket' || output === 'minecraft:potion' || output.startsWith('thirst:'))
  if (/basic water[^.]{0,80}(gate|gated|open|opens|require|requires)/i.test(everdawnRow) && !/ungated|remain outside|outside this gate/i.test(everdawnRow)) {
    fail('Everdawn route does not claim to gate basic water', everdawnRow)
  } else if (basicWaterOutputs.length) {
    fail('Everdawn route recipes do not gate basic water outputs', basicWaterOutputs.join(', '))
  } else {
    ok('Everdawn route leaves basic water ungated')
  }
}

function validateDimensionTravelRoutes() {
  const routePass = 'kubejs/server_scripts/30_recipe_replace/170_space_dimension_access_gates.js'
  const hiddenPass = 'kubejs/client_scripts/40_hide_quarantined_systems.js'
  const removePass = 'kubejs/server_scripts/20_recipe_remove/30_remove_items.js'
  const routeText = read(routePass)
  const hiddenText = read(hiddenPass)
  const removeText = read(removePass)
  const directRouteItems = [
    'fallout_wastelands_:portal_frame',
    'fallout_wastelands_:wastelands',
    'the_finley_dimension_remastered:finley_dimension',
    'undergarden:catalyst',
    'callfromthedepth_:depth',
    'bloodmagic:simplekey',
    'bloodmagic:minekey',
    'bloodmagic:mineentrancekey',
    'bloodmagic:teleposer',
    'bloodmagic:telepositionsigil',
    'bloodmagic:reagentteleposition',
    'bloodmagic:teleposerfocus',
    'bloodmagic:reinforcedteleposerfocus',
    'bloodmagic:enhancedteleposerfocus',
    'aether:aether_portal_frame',
    'blue_skies:everbright_portal',
    'blue_skies:everdawn_portal',
    'blue_skies:multi_portal_item',
    'blue_skies:portal_activator',
    'deeperdarker:otherside_portal'
  ]
  const missingDirectSuppression = directRouteItems.filter(item => !routeText.includes(item) || !hiddenText.includes(item) || !removeText.includes(item))
  const directRecipeConstructors = /event\.(shaped|shapeless)\s*\(/.test(routeText)
  missingDirectSuppression.length || directRecipeConstructors
    ? fail('direct dimension portal/key routes are suppressed and not re-authored', `${missingDirectSuppression.join(', ')}${directRecipeConstructors ? ' event.shaped/event.shapeless present' : ''}`)
    : ok('direct dimension portal/key routes are suppressed and not re-authored', `${directRouteItems.length} route items`)

  const twilight = read('config/twilightforest-common.toml')
  const twilightProblems = [
    ['disablePortalCreation = true', 'disablePortalCreation'],
    ['shouldReturnPortalBeUsable = false', 'shouldReturnPortalBeUsable'],
    ['portalUnlockedByAdvancement = ""', 'portalUnlockedByAdvancement']
  ].filter(([needle]) => !twilight.includes(needle)).map(([, label]) => label)
  twilightProblems.length
    ? fail('Twilight Forest direct portal config is disabled', twilightProblems.join(', '))
    : ok('Twilight Forest direct portal config is disabled')

  const earthOrbit = readJson('kubejs/data/creatingspace/creatingspace/rocket_accessible_dimension/earth_orbit.json')
  const spaceRoutes = {
    'lostcities:lostcity': 'kubejs/data/lostcities/creatingspace/rocket_accessible_dimension/lostcity.json',
    'twilightforest:twilight_forest': 'kubejs/data/twilightforest/creatingspace/rocket_accessible_dimension/twilight_forest.json',
    'fallout_wastelands_:wastelands': 'kubejs/data/fallout_wastelands_/creatingspace/rocket_accessible_dimension/wastelands.json',
    'the_finley_dimension_remastered:finley_dimension': 'kubejs/data/the_finley_dimension_remastered/creatingspace/rocket_accessible_dimension/finley_dimension.json',
    'callfromthedepth_:depth': 'kubejs/data/callfromthedepth_/creatingspace/rocket_accessible_dimension/depth.json'
  }
  const routeProblems = []
  for (const [dimension, file] of Object.entries(spaceRoutes)) {
    if (!earthOrbit.adjacentDimensions?.[dimension]) routeProblems.push(`earth_orbit missing ${dimension}`)
    if (!exists(file)) {
      routeProblems.push(`missing ${file}`)
      continue
    }
    const data = readJson(file)
    if (!data.adjacentDimensions?.['creatingspace:earth_orbit']) routeProblems.push(`${file} missing creatingspace:earth_orbit`)
  }
  routeProblems.length
    ? fail('Creating Space rocket graph owns non-meteor adventure dimensions', routeProblems.join(', '))
    : ok('Creating Space rocket graph owns non-meteor adventure dimensions', `${Object.keys(spaceRoutes).length} dimensions`)

  const structurify = readJson('config/structurify.json')
  const disabledStructures = new Set((structurify.structures || []).filter(entry => entry.is_disabled).map(entry => entry.name))
  const directPortalStructures = [
    'minecraft:ruined_portal',
    'minecraft:ruined_portal_desert',
    'minecraft:ruined_portal_jungle',
    'minecraft:ruined_portal_mountain',
    'minecraft:ruined_portal_nether',
    'minecraft:ruined_portal_ocean',
    'minecraft:ruined_portal_swamp',
    'minecraft:stronghold',
    'minecraft:ancient_city',
    'ars_additions:ruined_portal',
    'aether:ruined_portal',
    'aether:ruined_portal_aether',
    'aether:ruined_portal_desert',
    'aether:ruined_portal_jungle',
    'aether:ruined_portal_mountain',
    'aether:ruined_portal_swamp',
    'blue_skies:gatekeeper_house_mountain',
    'blue_skies:gatekeeper_house_plains',
    'blue_skies:gatekeeper_house_snowy',
    'callfromthedepth_:ancientportal',
    'deeperdarker:ancient_temple',
    'the_finley_dimension_remastered:constructed_finley_portal_living',
    'the_finley_dimension_remastered:constructed_finley_portal_plains',
    'the_finley_dimension_remastered:constructed_finley_portal_wastes',
    'the_finley_dimension_remastered:ruined_finley_portal'
  ]
  const missingDisabledStructures = directPortalStructures.filter(name => !disabledStructures.has(name))
  missingDisabledStructures.length
    ? fail('portal-bearing structures are disabled', missingDisabledStructures.join(', '))
    : ok('portal-bearing structures are disabled', `${directPortalStructures.length} structures`)

  const aetherObelisk = readJson('config/obelisks/obelisks/aether.json')
  const obeliskProblems = []
  if (aetherObelisk.targetDimension !== 'aether:the_aether' || aetherObelisk.enabled !== true) obeliskProblems.push('aether config')
  obeliskProblems.length
    ? fail('configured font routes include required Aether entry', obeliskProblems.join(', '))
    : ok('configured font routes include required Aether entry')

  const contract = readJson('tools/pack_contract.json')
  const sourceRoot = process.env.BTM_CUSTOM_MODS_DIR || contract.customMods.sourceRoot
  const blockerPath = path.join(sourceRoot, 'meteor-obelisks/src/main/kotlin/dev/yourname/obelisks/runtime/player/VanillaPortalBlocker.kt')
  const blockerText = fs.existsSync(blockerPath) ? readAbs(blockerPath) : ''
  const blockerNeedles = [
    'BlockEvent.PortalSpawnEvent',
    'EntityTravelToDimensionEvent',
    'path.contains("portal")',
    'path.contains("gateway")'
  ]
  const missingBlockerNeedles = blockerNeedles.filter(needle => !blockerText.includes(needle))
  missingBlockerNeedles.length
    ? fail('obelisks runtime blocks vanilla/generic portal travel bypasses', `${blockerPath}: ${missingBlockerNeedles.join(', ')}`)
    : ok('obelisks runtime blocks vanilla/generic portal travel bypasses')
}

function validateCustomModProvenanceSignals() {
  const contract = readJson('tools/pack_contract.json')
  const indexText = read('index.toml')
  const sourceRoot = process.env.BTM_CUSTOM_MODS_DIR || contract.customMods.sourceRoot
  const rows = []
  const problems = []
  for (const mod of contract.customMods.entries || []) {
    const modRoot = path.join(sourceRoot, mod.repo)
    const jar = mod.jar
    if (!fs.existsSync(modRoot)) {
      problems.push(`${mod.id}: missing source ${modRoot}`)
      continue
    }
    if (!exists(jar)) {
      problems.push(`${mod.id}: missing jar ${jar}`)
      continue
    }
    const head = spawnSync('git', ['-C', modRoot, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
    const dirty = Number(spawnSync('git', ['-C', modRoot, 'status', '--porcelain'], { encoding: 'utf8' }).stdout.split(/\r?\n/).filter(Boolean).length)
    const jarHash = sha256(jar)
    if (!indexText.includes(`file = "${jar}"`) || !indexText.includes(`hash = "${jarHash}"`)) problems.push(`${mod.id}: jar hash not current in index.toml`)
    rows.push(`${mod.id}@${head}${dirty ? `+dirty${dirty}` : ''}:${jarHash.slice(0, 12)}`)
  }
  problems.length ? fail('custom mod source/jar provenance signals are current', problems.join('\n')) : ok('custom mod source/jar provenance signals are current', `${rows.length} mods`)
}

if (instance && !fs.existsSync(instance)) {
  fail('explicit BTM_INSTANCE exists', instance)
  fail('runtime food effect dump exists', path.join(instance, 'kubejs/config/food_effect_index.json'))
  console.log(`\nautonomous contract validators: ${passes.length} pass(es), ${failures.length} hard failure(s)`)
  process.exit(1)
}

validateEconomy()
validateMagicBody()
validateClientQuestIntent()
validateVanillaStyleToolSuppression()
validateNoTreePunchingReplacement()
validatePrimitiveMiningRegressionContracts()
validateVanillishExpertRecipePass()
validateNonGrownInfiniteResourceBoundaries()
validateWorldgenStaticContracts()
validateDimensionProofGraphStarts()
validateDimensionTravelRoutes()
validateCustomModProvenanceSignals()

console.log(`\nautonomous contract validators: ${passes.length} pass(es), ${failures.length} hard failure(s)`)
if (failures.length) process.exit(1)
