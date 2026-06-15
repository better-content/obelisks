#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const defaultInstance = '/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft'
const instance = process.env.BTM_INSTANCE || defaultInstance
const configDir = path.join(instance, 'kubejs/config')
const dumpDir = path.join(instance, 'dump/data_raw')
const catalogPath = path.join(repo, 'kubejs/config/btm_expert_graph_catalog.json')
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

const tierIndex = Object.fromEntries(catalog.tierOrder.map((id, i) => [id, i]))
const casingToTier = Object.fromEntries(catalog.machineTiers.map(t => [t.casing, t.id]))
const slateToBloodTier = Object.fromEntries(catalog.bloodMagicTiers.map((t, i) => [t.gate, { id: t.id, index: i + 1 }]))
const coinItems = new Set(catalog.coinTiers.map(t => t.item))
const coinByItem = Object.fromEntries(catalog.coinTiers.map(t => [t.item, t]))

const machineNamespaceTier = {
  tconstruct: 'tcon_seared',
  create: 'create_andesite',
  railways: 'create_brass',
  create_connected: 'create_brass',
  createadditionallogistics: 'create_brass',
  createadvlogistics: 'create_brass',
  createdieselgenerators: 'create_brass',
  powergrid: 'power_grid',
  oc2r: 'oc2r',
  creatingspace: 'space',
  ae2: 'ae2',
  ae2additions: 'ae2',
  advanced_ae: 'ae2',
  expatternprovider: 'ae2',
  merequester: 'ae2',
  createappliedkinetics: 'ae2',
  theurgy: 'power_grid',
  occultengineering: 'create_brass'
}

const magicNamespaceBloodTier = {}
for (const t of catalog.bloodMagicTiers) {
  for (const mod of t.mods) magicNamespaceBloodTier[mod] = t.id
}

const valuableNeedles = [
  'minecraft:iron_ingot', 'minecraft:copper_ingot', 'minecraft:gold_ingot', 'minecraft:redstone',
  'minecraft:lapis_lazuli', 'minecraft:diamond', 'minecraft:emerald', 'minecraft:amethyst_shard',
  '#forge:ingots/iron', '#forge:ingots/copper', '#forge:ingots/gold', '#forge:dusts/redstone',
  '#forge:gems/lapis', '#forge:gems/diamond', '#forge:gems/emerald', '#forge:gems/amethyst'
]

const riskyWords = [
  'machine', 'controller', 'generator', 'motor', 'battery', 'drive', 'interface', 'assembler', 'crafter',
  'processor', 'terminal', 'import', 'export', 'bus', 'cell', 'storage', 'chamber', 'vat', 'centrifuge',
  'transmitter', 'receiver', 'wireless', 'teleport', 'chunk_loader', 'loader', 'builder', 'gadget', 'quarry',
  'miner', 'computer', 'monitor', 'server', 'router', 'network', 'pipe', 'pump', 'conduit', 'synthesizer',
  'liquefier', 'incubator', 'altar', 'ritual', 'focus', 'programmer'
]

function exists(p) { return fs.existsSync(p) }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }) }
function ns(id) { return String(id).includes(':') ? String(id).split(':')[0] : 'minecraft' }
function local(id) { return String(id).includes(':') ? String(id).split(':').slice(1).join(':') : String(id) }
function maxTier(a, b) { return tierIndex[a] >= tierIndex[b] ? a : b }
function tierAtLeast(a, b) { return tierIndex[a] >= tierIndex[b] }
function table(rows) {
  if (!rows.length) return '_None._\n'
  const widths = []
  for (const row of rows) row.forEach((cell, i) => { widths[i] = Math.max(widths[i] || 0, String(cell).length) })
  const line = row => '| ' + row.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ') + ' |'
  return [line(rows[0]), line(rows[0].map((_, i) => '-'.repeat(Math.max(3, widths[i])))), ...rows.slice(1).map(line)].join('\n') + '\n'
}

function recipeChunks() {
  const manifest = path.join(configDir, 'full_recipe_index_manifest.json')
  if (!exists(manifest)) return []
  const m = readJson(manifest)
  const out = []
  for (let i = 0; i < m.chunkCount; i++) {
    const padded = String(i).padStart(4, '0')
    const p = path.join(configDir, `full_recipe_index_${padded}.json`)
    if (exists(p)) out.push(...readJson(p).recipes)
  }
  return out
}

function extractItems(value, out = []) {
  if (!value) return out
  if (Array.isArray(value)) {
    for (const v of value) extractItems(v, out)
    return out
  }
  if (typeof value === 'object') {
    if (typeof value.item === 'string') out.push(value.item)
    if (typeof value.id === 'string' && value.id.includes(':')) out.push(value.id)
    if (typeof value.name === 'string' && value.name.includes(':')) out.push(value.name)
    if (typeof value.tag === 'string') out.push('#' + value.tag)
    for (const v of Object.values(value)) extractItems(v, out)
  }
  return out
}

function extractOutputs(json) {
  const outputs = []
  function add(id) { if (id && typeof id === 'string' && id.includes(':')) outputs.push(id) }
  if (json.result) {
    if (typeof json.result === 'string') add(json.result)
    if (json.result.item) add(json.result.item)
    if (json.result.id) add(json.result.id)
  }
  if (json.results) {
    const arr = Array.isArray(json.results) ? json.results : [json.results]
    for (const r of arr) {
      if (typeof r === 'string') add(r)
      if (r && r.item) add(r.item)
      if (r && r.id) add(r.id)
    }
  }
  if (json.output) {
    if (typeof json.output === 'string') add(json.output)
    if (json.output.item) add(json.output.item)
    if (json.output.id) add(json.output.id)
  }
  if (json.outputs) {
    const arr = Array.isArray(json.outputs) ? json.outputs : [json.outputs]
    for (const r of arr) {
      if (typeof r === 'string') add(r)
      if (r && r.item) add(r.item)
      if (r && r.id) add(r.id)
    }
  }
  return [...new Set(outputs)]
}

function parseRecipeJson(record) {
  try { return JSON.parse(record.json) } catch { return null }
}

function inferIngredientTier(items) {
  let tier = 'survival'
  let blood = 0
  const hits = []
  for (const item of items) {
    if (casingToTier[item]) {
      tier = maxTier(tier, casingToTier[item])
      hits.push(item)
    }
    if (slateToBloodTier[item]) {
      blood = Math.max(blood, slateToBloodTier[item].index)
      hits.push(item)
    }
    if (item === 'create:brass_casing' || item === 'create:precision_mechanism') tier = maxTier(tier, 'create_brass')
    if (item === 'powergrid:conductive_casing' || item.startsWith('powergrid:')) tier = maxTier(tier, 'power_grid')
    if (item.startsWith('oc2r:')) tier = maxTier(tier, 'power_grid')
    if (item.startsWith('creatingspace:')) tier = maxTier(tier, 'space')
    if (item.startsWith('ae2:') || item.startsWith('advanced_ae:') || item.startsWith('ae2additions:')) tier = maxTier(tier, 'ae2')
  }
  return { tier, blood, hits }
}

function isMachineLike(output, type) {
  const name = local(output)
  if (type && (type.includes('crafting') || type.includes('mechanical') || type.includes('deploying'))) {
    for (const w of riskyWords) if (name.includes(w)) return true
  }
  return false
}

function intendedTier(output) {
  const n = ns(output)
  const name = local(output)
  if (casingToTier[output]) return casingToTier[output]
  if (machineNamespaceTier[n]) return machineNamespaceTier[n]
  if (name.includes('wireless') || name.includes('spatial')) return 'ae2'
  if (name.includes('teleport') || name.includes('chunk_loader')) return 'power_grid'
  return 'survival'
}

function intendedBlood(output) {
  const bt = magicNamespaceBloodTier[ns(output)]
  if (!bt) return 0
  return Number(bt.split('_')[1] || 0)
}

const recipes = recipeChunks()
const recipeStats = { total: recipes.length, outputs: 0, risky: [], materialHits: [], byNamespace: {}, byType: {} }
const itemSources = new Map()

function addSource(item, source) {
  if (!itemSources.has(item)) itemSources.set(item, [])
  itemSources.get(item).push(source)
}

for (const r of recipes) {
  recipeStats.byNamespace[r.namespace] = (recipeStats.byNamespace[r.namespace] || 0) + 1
  recipeStats.byType[r.type] = (recipeStats.byType[r.type] || 0) + 1
  const j = parseRecipeJson(r)
  if (!j) continue
  const outputs = extractOutputs(j)
  const ingredients = extractItems(j)
  const ing = inferIngredientTier(ingredients)
  const jsonText = r.json || ''
  const materialHits = valuableNeedles.filter(v => jsonText.includes(v))
  for (const out of outputs) {
    recipeStats.outputs++
    const intended = intendedTier(out)
    const machine = isMachineLike(out, r.type)
    const intendedB = machine ? intendedBlood(out) : 0
    addSource(out, { system: 'recipe', id: r.id, type: r.type, tier: ing.tier, blood: ing.blood })
    if (materialHits.length) recipeStats.materialHits.push({ output: out, recipe: r.id, type: r.type, hits: materialHits.slice(0, 6) })
    if ((machine && !tierAtLeast(ing.tier, intended)) || (intendedB && ing.blood < intendedB)) {
      recipeStats.risky.push({ output: out, recipe: r.id, type: r.type, intended, actual: ing.tier, intendedBlood: intendedB, actualBlood: ing.blood, ingredientHits: ing.hits.slice(0, 6) })
    }
  }
}

function walkFiles(root, pred, out = []) {
  if (!exists(root)) return out
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name)
    if (ent.isDirectory()) walkFiles(p, pred, out)
    else if (pred(p)) out.push(p)
  }
  return out
}

const lootFiles = walkFiles(path.join(dumpDir, 'loot_tables'), p => p.endsWith('.json'))
const lootStats = { files: lootFiles.length, coinSources: [], emeraldSources: [], valuableSources: [], highRisk: [] }
for (const file of lootFiles) {
  let j
  try { j = readJson(file) } catch { continue }
  const rel = path.relative(path.join(dumpDir, 'loot_tables'), file).replace(/\.json$/, '').replaceAll(path.sep, '/')
  const items = extractItems(j).filter(x => !x.startsWith('#'))
  for (const item of items) {
    addSource(item, { system: 'loot', id: rel })
    if (coinItems.has(item)) lootStats.coinSources.push({ table: rel, coin: item, tier: coinByItem[item].id })
    if (item === 'minecraft:emerald') lootStats.emeraldSources.push(rel)
    if (valuableNeedles.includes(item)) lootStats.valuableSources.push({ table: rel, item })
    if ((item.includes('netherite') || item.includes('elytra') || item.includes('teleport') || item.includes('creative')) && !rel.includes('end_city') && !rel.includes('bastion')) {
      lootStats.highRisk.push({ table: rel, item })
    }
  }
}

const questFiles = walkFiles(path.join(repo, 'config/ftbquests/quests/chapters'), p => p.endsWith('.snbt'))
const questStats = { files: questFiles.length, rewards: [], tasks: [], coinRewards: [] }
for (const file of questFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const chapter = path.basename(file)
  for (const m of text.matchAll(/rewards:\[([^\]]*)\]/g)) {
    const body = m[1]
    for (const im of body.matchAll(/item:"([^"]+)"(?:\s+count:([0-9]+))?/g)) {
      const item = im[1]
      const count = im[2] || '1'
      questStats.rewards.push({ chapter, item, count })
      addSource(item, { system: 'quest_reward', id: chapter })
      if (coinItems.has(item)) questStats.coinRewards.push({ chapter, coin: item, count })
    }
  }
  for (const im of text.matchAll(/tasks:\[([^\]]*)\]/g)) {
    for (const itemMatch of im[1].matchAll(/item:"([^"]+)"/g)) questStats.tasks.push({ chapter, item: itemMatch[1] })
  }
}

const tradeScript = path.join(repo, 'kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js')
const tradeStats = { rows: 0, emeraldMentions: 0, highTierResults: [] }
if (exists(tradeScript)) {
  const text = fs.readFileSync(tradeScript, 'utf8')
  tradeStats.emeraldMentions = (text.match(/minecraft:emerald/g) || []).length
  const rowRe = /\[\s*(\d+)\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'([^']+)'/g
  for (const m of text.matchAll(rowRe)) {
    tradeStats.rows++
    const result = m[4]
    addSource(result, { system: 'villager_trade', id: `${m[2]}_coin_level_${m[1]}` })
    if (result.includes('netherite') || result.includes('diamond') || result.includes('etherealslate')) tradeStats.highTierResults.push({ level: m[1], coin: m[2], result })
  }
}

const multiSource = [...itemSources.entries()].filter(([, sources]) => sources.length > 1)
  .map(([item, sources]) => ({ item, systems: [...new Set(sources.map(s => s.system))], count: sources.length }))
  .filter(r => r.systems.length > 1)
  .sort((a, b) => b.count - a.count)

function top(obj, n = 20) { return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n) }
const outDir = process.env.OUT_DIR || path.join(repo, 'generated', 'validation', 'expert_graph')
function writeDoc(name, content) { fs.writeFileSync(path.join(outDir, name), content) }
ensureDir(outDir)

writeDoc('expert_item_graph.md', `# Expert Item Graph\n\nGenerated: ${new Date().toISOString()}\n\nThis is the current source-of-truth graph model used by the offline audit. It treats recipes, loot, villager trades, Wares contracts, quest rewards, mob drops, and worldgen as material-conversion systems.\n\n## Tier Order\n\n${catalog.tierOrder.map((t, i) => `${i}. ${t}`).join('\n')}\n\n## Machine Tiers\n\n${table([['Tier', 'Casing', 'Authority', 'Requires Previous'], ...catalog.machineTiers.map(t => [t.id, t.casing, t.authority, t.requiresPrevious || 'none'])])}\n## Blood Magic Authority\n\n${table([['Tier', 'Gate', 'Mods'], ...catalog.bloodMagicTiers.map(t => [t.id, t.gate, t.mods.join(', ')])])}\n## Coin Tiers\n\n${table([['Index', 'Tier', 'Item', 'Intended Sources'], ...catalog.coinTiers.map(t => [t.index, t.id, t.item, t.intendedSources.join(', ')])])}\n## Critical Rules\n\n${catalog.criticalRules.map(r => `- ${r}`).join('\n')}\n`)

writeDoc('full_item_graph_audit.md', `# Full Item Graph Audit\n\nGenerated: ${new Date().toISOString()}\n\nInstance: \`${instance}\`\n\n## Recipe Graph\n\n- Recipes scanned: ${recipeStats.total}\n- Recipe outputs extracted: ${recipeStats.outputs}\n- Loot tables scanned: ${lootStats.files}\n- Quest chapter files scanned: ${questStats.files}\n- Villager trade rows parsed: ${tradeStats.rows}\n\n## Top Recipe Namespaces\n\n${table([['Namespace', 'Count'], ...top(recipeStats.byNamespace, 24)])}\n## Top Recipe Types\n\n${table([['Type', 'Count'], ...top(recipeStats.byType, 24)])}\n## Highest-Risk Ungated Or Undertiered Outputs\n\n${table([['Output', 'Recipe', 'Type', 'Intended Tier', 'Actual Tier', 'Blood Need/Actual'], ...recipeStats.risky.slice(0, 120).map(r => [r.output, r.recipe, r.type, r.intended, r.actual, `${r.intendedBlood}/${r.actualBlood}`])])}\n## Valuable Vanilla Material Recipe Hits\n\nThese are not automatically wrong. They are review targets where plain vanilla valuables may still be powering strong crafts.\n\n${table([['Output', 'Recipe', 'Hits'], ...recipeStats.materialHits.slice(0, 120).map(r => [r.output, r.recipe, r.hits.join(', ')])])}\n`)

writeDoc('cross_system_source_report.md', `# Cross-System Source Report\n\nGenerated: ${new Date().toISOString()}\n\nThis report lists item sources outside normal recipes and items produced by multiple material-conversion systems.\n\n## Coin Loot Sources\n\n${table([['Loot Table', 'Coin', 'Tier'], ...lootStats.coinSources.slice(0, 200).map(r => [r.table, r.coin, r.tier])])}\n## Quest Coin Rewards\n\n${table([['Chapter', 'Coin', 'Count'], ...questStats.coinRewards.slice(0, 200).map(r => [r.chapter, r.coin, r.count])])}\n## Villager Trade High-Tier Results\n\n${table([['Level', 'Coin', 'Result'], ...tradeStats.highTierResults.slice(0, 120).map(r => [r.level, r.coin, r.result])])}\n## Items With Multiple Source Systems\n\n${table([['Item', 'Systems', 'Source Count'], ...multiSource.slice(0, 160).map(r => [r.item, r.systems.join(', '), r.count])])}\n## Emerald Loot Sources\n\n${table([['Loot Table'], ...[...new Set(lootStats.emeraldSources)].slice(0, 160).map(t => [t])])}\n`)

writeDoc('no_bypass_report.md', `# No-Bypass Report\n\nGenerated: ${new Date().toISOString()}\n\nThis is an audit report, not a proof. The current KubeJS recipe dump is pre-addition for KubeJS-added recipes, so this report is best used to identify likely misses and non-recipe bypass surfaces.\n\n## Current Risk Counts\n\n${table([
  ['Class', 'Count'],
  ['Recipe outputs below inferred tier or Blood gate', recipeStats.risky.length],
  ['Loot tables containing emerald', new Set(lootStats.emeraldSources).size],
  ['Loot high-risk table/item pairs', lootStats.highRisk.length],
  ['Villager script emerald mentions', tradeStats.emeraldMentions],
  ['Items with multiple source systems', multiSource.length]
])}\n## MUST DO\n\n- Convert the top risky recipe outputs into explicit tiered recipes or remove them if they violate bounded matter/distance.\n- Replace or justify remaining emerald loot tables, especially where they interact with village/trade economy.\n- Extend loot coin tiering into modded structures deliberately, not by broad random injection.\n- Replace the KubeJS recipe-event dump with a final recipe-manager dump when possible.\n\n## Top Recipe Risks\n\n${table([['Output', 'Recipe', 'Intended', 'Actual'], ...recipeStats.risky.slice(0, 80).map(r => [r.output, r.recipe, r.intended, r.actual])])}\n## Top Loot Risks\n\n${table([['Loot Table', 'Item'], ...lootStats.highRisk.slice(0, 80).map(r => [r.table, r.item])])}\n`)

const summary = {
  generatedAt: new Date().toISOString(),
  instance,
  recipes: recipeStats.total,
  recipeOutputs: recipeStats.outputs,
  riskyRecipeOutputs: recipeStats.risky.length,
  lootTables: lootStats.files,
  emeraldLootTables: new Set(lootStats.emeraldSources).size,
  coinLootSources: lootStats.coinSources.length,
  questFiles: questStats.files,
  questCoinRewards: questStats.coinRewards.length,
  villagerTradeRows: tradeStats.rows,
  multiSourceItems: multiSource.length
}
fs.writeFileSync(path.join(outDir, 'expert_item_graph_summary.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))
