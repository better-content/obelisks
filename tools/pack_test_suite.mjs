#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { scanHardFailures } from './log_hard_failure_scan.mjs'

const repo = process.cwd()
const defaultInstance = '/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft'
const instance = process.env.BTM_INSTANCE || defaultInstance
const explicitInstance = Boolean(process.env.BTM_INSTANCE)
const strictRuntime = process.env.BTM_STRICT_RUNTIME === '1' || process.argv.includes('--strict-runtime')
const strictDataDumps = process.env.BTM_STRICT_DATA_DUMPS === '1' || process.argv.includes('--strict-data-dumps')

if (explicitInstance && !fs.existsSync(instance)) {
  console.error(`FAIL - explicit BTM_INSTANCE exists: ${instance}`)
  process.exit(1)
}

const generatedConfigDir = path.join(instance, 'kubejs/config')
const generatedDumpDir = path.join(instance, 'dump/data_raw')
const reportDir = process.env.BTM_REPORT_DIR || path.join(repo, 'generated', 'validation')
fs.mkdirSync(reportDir, { recursive: true })
const validateJobs = validationJobs()

const hardFailures = []
const softFindings = []
const passes = []
const skips = []
const metrics = {}
const performanceResults = []
const performanceBudgetsMs = {
  'JSON and JS syntax validation': { budget: 8000, hard: 24000 },
  'critical progression surfaces': { budget: 750, hard: 3000 },
  'pack contract validation': { budget: 1000, hard: 5000 },
  'contract completeness classification': { budget: 1000, hard: 5000 },
  'autonomous contract validation': { budget: 1500, hard: 6000 },
  'quest book validation': { budget: 250, hard: 1500 },
  'Wares and villager trade validation': { budget: 250, hard: 1500 },
  'repo loot data validation': { budget: 500, hard: 3000 },
  'generated recipe graph validation': { budget: 5000, hard: 20000 },
  'generated loot dump validation': { budget: 2500, hard: 10000 },
  'engine and world performance log analysis': { budget: 250, hard: 1500 },
  'KubeJS asset validation': { budget: 500, hard: 2000 },
  'chemistry identity validation': { budget: 500, hard: 2000 },
  'dev dump health validation': { budget: 50, hard: 500 }
}

function ok(name, detail = '') {
  passes.push({ name, detail })
  console.log(`ok - ${name}${detail ? ` (${detail})` : ''}`)
}

function fail(name, detail) {
  hardFailures.push({ name, detail })
  console.error(`FAIL - ${name}: ${detail}`)
}

function finding(name, detail, severity = 'SHOULD') {
  softFindings.push({ name, detail, severity })
  console.warn(`${severity} - ${name}: ${detail}`)
}

function skip(name, detail) {
  skips.push({ name, detail })
  console.log(`skip - ${name}${detail ? ` (${detail})` : ''}`)
}
function missingRuntimeEvidence(name, detail) {
  if (strictRuntime) fail(name, detail)
  else skip(name, detail)
}
function missingDataDumpEvidence(name, detail) {
  if (strictDataDumps) fail(name, detail)
  else skip(name, detail)
}

function nowMs() { return Number(process.hrtime.bigint()) / 1e6 }
function roundMs(ms) { return Math.round(ms * 100) / 100 }
function runMeasured(name, fn) {
  const start = nowMs()
  try {
    return fn()
  } finally {
    const durationMs = roundMs(nowMs() - start)
    const budget = performanceBudgetsMs[name]
    const result = {
      name,
      durationMs,
      budgetMs: budget?.budget ?? null,
      hardLimitMs: budget?.hard ?? null
    }
    performanceResults.push(result)
    if (!budget) {
      ok(`performance measured: ${name}`, `${durationMs} ms`)
    } else if (durationMs > budget.hard) {
      fail(`performance hard limit: ${name}`, `${durationMs} ms > ${budget.hard} ms`)
    } else if (durationMs > budget.budget) {
      finding(`performance budget exceeded: ${name}`, `${durationMs} ms > ${budget.budget} ms`, 'SHOULD')
    } else {
      ok(`performance budget: ${name}`, `${durationMs} ms <= ${budget.budget} ms`)
    }
  }
}

function exists(p) { return fs.existsSync(p) }
function read(p) { return fs.readFileSync(p, 'utf8') }
function readJson(p) { return JSON.parse(read(p)) }
function latestRuntimeLog() { return path.join(instance, 'logs/latest.log') }
function rel(p) { return path.relative(repo, p) || '.' }
function validationJobs() {
  const raw = process.env.BTM_VALIDATE_JOBS || ''
  if (raw) {
    const parsed = Number(raw)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
    console.error('FAIL - BTM_VALIDATE_JOBS must be a positive integer')
    process.exit(1)
  }
  const result = spawnSync('nproc', { encoding: 'utf8' })
  const parsed = Number((result.stdout || '').trim())
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4
}
function walk(root, pred = () => true, out = []) {
  if (!exists(root)) return out
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name)
    if (ent.isDirectory()) walk(p, pred, out)
    else if (pred(p)) out.push(p)
  }
  return out
}
function unique(xs) { return [...new Set(xs)] }
function namespace(id) { return String(id).includes(':') ? String(id).split(':')[0] : 'minecraft' }
function localName(id) { return String(id).includes(':') ? String(id).split(':').slice(1).join(':') : String(id) }
function table(rows) {
  if (!rows.length) return '_None._\n'
  const widths = []
  for (const row of rows) row.forEach((cell, i) => { widths[i] = Math.max(widths[i] || 0, String(cell).length) })
  const line = row => '| ' + row.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ') + ' |'
  return [line(rows[0]), line(rows[0].map((_, i) => '-'.repeat(Math.max(3, widths[i])))), ...rows.slice(1).map(line)].join('\n') + '\n'
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
    if (typeof value.tag === 'string') out.push(`#${value.tag}`)
    for (const v of Object.values(value)) extractItems(v, out)
  }
  return out
}

function extractRecipeOutputs(json) {
  const outputs = []
  const add = id => { if (typeof id === 'string' && id.includes(':')) outputs.push(id) }
  const scan = v => {
    if (!v) return
    if (typeof v === 'string') add(v)
    else if (Array.isArray(v)) v.forEach(scan)
    else if (typeof v === 'object') {
      if (v.item) add(v.item)
      if (v.id) add(v.id)
    }
  }
  scan(json.result)
  scan(json.results)
  scan(json.output)
  scan(json.outputs)
  return unique(outputs)
}

function countOccurrences(text, needle) {
  return (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
}

const logMonth = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
function parseLogTime(line) {
  const m = line.match(/^\[(\d{2})([A-Za-z]{3})(\d{4}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/)
  if (!m) return null
  return Date.UTC(Number(m[3]), logMonth[m[2]], Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]), Number(m[7]))
}

function newestFile(files) {
  let best = null
  for (const file of files) {
    try {
      const stat = fs.statSync(file)
      if (!best || stat.mtimeMs > best.mtimeMs) best = { file, mtimeMs: stat.mtimeMs }
    } catch {}
  }
  return best
}

function parseQuestFile(file) {
  const text = read(file)
  const quests = []
  const questRe = /\{id:"([^"]+)"[\s\S]*?(?=\n\t\t\{id:"|\n\t\]\n\})/g
  const parseItemList = segment => [...segment.matchAll(/type:"item"\s+item:"([^"]+)"(?:\s+count:([0-9]+)L?)?/g)]
    .map(m => ({ item: m[1], count: Number(m[2] || 1) }))
  for (const m of text.matchAll(questRe)) {
    const block = m[0]
    const icon = block.match(/\sicon:"([^"]+)"/)?.[1] || ''
    const disableJei = block.match(/\sdisable_jei:(true|false)/)?.[1] || ''
    const rewards = parseItemList(block.match(/rewards:\[([\s\S]*?)\]\s+tasks:/)?.[1] || '')
    const tasks = parseItemList(block.match(/tasks:\[([\s\S]*?)\]\}?$/)?.[1] || '')
    quests.push({ id: m[1], block, icon, disableJei, rewards, tasks })
  }
  return quests
}

const catalogPath = path.join(repo, 'kubejs/config/btm_expert_graph_catalog.json')
let catalog = null
try {
  catalog = readJson(catalogPath)
  ok('progression catalog parses', `${catalog.tierOrder.length} tiers`)
} catch (e) {
  fail('progression catalog parses', e.message)
  catalog = { coinTiers: [], machineTiers: [], bloodMagicTiers: [], tierOrder: [] }
}
const coinItems = new Set(catalog.coinTiers.map(t => t.item))
const coinByItem = Object.fromEntries(catalog.coinTiers.map(t => [t.item, t]))
const tierIndex = Object.fromEntries(catalog.tierOrder.map((t, i) => [t, i]))
const casingToTier = Object.fromEntries(catalog.machineTiers.map(t => [t.casing, t.id]))

function tierAtLeast(actual, needed) {
  return (tierIndex[actual] ?? -1) >= (tierIndex[needed] ?? 999)
}

function inferTierFromItems(items) {
  let tier = 'survival'
  const hits = []
  for (const item of items) {
    if (casingToTier[item] && tierAtLeast(casingToTier[item], tier)) {
      tier = casingToTier[item]
      hits.push(item)
    }
    if (item === 'create:brass_casing' || item === 'create:precision_mechanism') tier = 'create_brass'
    if (item.startsWith('powergrid:')) tier = tierAtLeast(tier, 'power_grid') ? tier : 'power_grid'
    if (item.startsWith('oc2r:')) tier = tierAtLeast(tier, 'power_grid') ? tier : 'power_grid'
    if (item.startsWith('creatingspace:')) tier = tierAtLeast(tier, 'space') ? tier : 'space'
    if (item.startsWith('ae2:') || item.startsWith('advanced_ae:') || item.startsWith('ae2additions:')) tier = tierAtLeast(tier, 'ae2') ? tier : 'ae2'
  }
  return { tier, hits }
}

function intendedMachineTier(output) {
  if (casingToTier[output]) return casingToTier[output]
  const ns = namespace(output)
  const name = localName(output)
  if (ns === 'tconstruct') return 'tcon_seared'
  if (ns === 'create') return name.includes('brass') || name.includes('precision') ? 'create_brass' : 'create_andesite'
  if (['railways', 'createdieselgenerators', 'create_connected'].includes(ns)) return 'create_brass'
  if (ns === 'powergrid') return 'power_grid'
  if (ns === 'oc2r') return 'power_grid'
  if (ns === 'creatingspace') return 'space'
  if (['ae2', 'advanced_ae', 'ae2additions', 'expatternprovider', 'merequester', 'createappliedkinetics'].includes(ns)) return 'ae2'
  return null
}

function isMachineLike(output) {
  const name = localName(output)
  if (name === 'activator_rail' || name === 'excavator') return false
  if (namespace(output) === 'tconstruct' && name.startsWith('fake_')) return false
  return /(machine|controller|generator|motor|battery|drive|interface|assembler|crafter|processor|terminal|bus|cell|storage|chamber|centrifuge|router|network|computer|monitor|transmitter|receiver|wireless|loader|quarry|miner|pump|pipe|conduit|reactor|turbine|fission|fusion|engine|gearbox|alternator|housing)/.test(name) || /(^|_)vat($|_)/.test(name)
}

function loadGeneratedRecipes() {
  const manifestPath = path.join(generatedConfigDir, 'full_recipe_index_manifest.json')
  if (!exists(manifestPath)) return null
  const manifest = readJson(manifestPath)
  const recipes = []
  const chunkProblems = []
  for (let i = 0; i < manifest.chunkCount; i++) {
    const chunkPath = path.join(generatedConfigDir, `full_recipe_index_${String(i).padStart(4, '0')}.json`)
    if (!exists(chunkPath)) {
      fail('generated recipe chunk exists', chunkPath)
      continue
    }
    const chunk = readJson(chunkPath)
    if (manifest.schema && chunk.schema !== manifest.schema) chunkProblems.push(`${path.basename(chunkPath)} schema=${chunk.schema || '<missing>'}`)
    if (manifest.generatedBy && chunk.generatedBy !== manifest.generatedBy) chunkProblems.push(`${path.basename(chunkPath)} generatedBy=${chunk.generatedBy || '<missing>'}`)
    if (manifest.generatedAt && chunk.generatedAt !== manifest.generatedAt) chunkProblems.push(`${path.basename(chunkPath)} generatedAt=${chunk.generatedAt || '<missing>'}`)
    if (manifest.recipeEventStage && chunk.recipeEventStage !== manifest.recipeEventStage) chunkProblems.push(`${path.basename(chunkPath)} recipeEventStage=${chunk.recipeEventStage || '<missing>'}`)
    if (chunk.chunk !== i) chunkProblems.push(`${path.basename(chunkPath)} chunk=${chunk.chunk}`)
    if (chunk.start !== recipes.length) chunkProblems.push(`${path.basename(chunkPath)} start=${chunk.start}, expected ${recipes.length}`)
    if (Array.isArray(chunk.recipes) && chunk.count !== chunk.recipes.length) chunkProblems.push(`${path.basename(chunkPath)} count=${chunk.count}, actual ${chunk.recipes.length}`)
    recipes.push(...chunk.recipes)
  }
  return { manifest, recipes, chunkProblems }
}

function testJsonAndSyntax() {
  const jsonFiles = [
    ...walk(path.join(repo, 'kubejs/data'), p => p.endsWith('.json')),
    ...walk(path.join(repo, 'config/classselector'), p => p.endsWith('.json')),
    catalogPath
  ].filter(Boolean)
  const badJson = []
  for (const file of jsonFiles) {
    try { readJson(file) } catch (e) { badJson.push(`${rel(file)}: ${e.message}`) }
  }
  badJson.length ? fail('all repo JSON parses', badJson.slice(0, 20).join('\n')) : ok('all repo JSON parses', `${jsonFiles.length} files`)

  const jsFiles = [...walk(path.join(repo, 'kubejs'), p => p.endsWith('.js')), ...walk(path.join(repo, 'tools'), p => p.endsWith('.mjs') || p.endsWith('.js'))]
  const badJs = []
  const parallel = spawnSync('xargs', ['-0', '-r', '-n', '1', '-P', String(validateJobs), process.execPath, '--check'], {
    input: `${jsFiles.join('\0')}\0`,
    encoding: 'utf8'
  })
  if (parallel.status !== 0) {
    for (const file of jsFiles) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
      if (result.status !== 0) badJs.push(`${rel(file)}\n${result.stderr || result.stdout}`)
    }
  }
  badJs.length ? fail('all KubeJS/tool JS parses with node --check', badJs.slice(0, 10).join('\n')) : ok('all KubeJS/tool JS parses with node --check', `${jsFiles.length} files`)
}

function testCriticalSurfaces() {
  const required = [
    'kubejs/server_scripts/30_recipe_replace/20_expensive_grout.js',
    'kubejs/server_scripts/30_recipe_replace/98_starting_progression_bypasses.js',
	    'kubejs/server_scripts/30_recipe_replace/99_machine_casing_progression.js',
	    'kubejs/server_scripts/30_recipe_replace/136_machine_casing_ecosystem_expansion.js',
	    'kubejs/server_scripts/30_recipe_replace/165_protection_pixel_post_ae2_gates.js',
	    'kubejs/server_scripts/30_recipe_replace/166_tome_of_blood_post_ae2_gates.js',
	    'kubejs/server_scripts/30_recipe_replace/168_hooks_drones_utility_gates.js',
	    'kubejs/server_scripts/30_recipe_replace/169_backpack_post_ae2_utility_gates.js',
	    'kubejs/server_scripts/30_recipe_replace/170_space_dimension_access_gates.js',
	    'kubejs/server_scripts/30_recipe_replace/80_magic_progression_blood_slate_gates.js',
    'kubejs/client_scripts/40_hide_quarantined_systems.js',
    'kubejs/server_scripts/30_recipe_replace/130_manufactured_plate_recipe_pass.js',
    'kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js',
    'kubejs/server_scripts/50_loot/20_world_chest_coin_tiers.js',
    'kubejs/server_scripts/50_loot/40_emerald_loot_coin_replacement.js',
    'kubejs/data/btm/advancements/creating_space_access.json',
    'config/twilightforest-common.toml',
    'kubejs/data/wares/loot_tables/agreement/village/plains_payment_sell.json'
  ]
  const missing = required.filter(f => !exists(path.join(repo, f)))
  missing.length ? fail('critical expert-pack surfaces exist', missing.join(', ')) : ok('critical expert-pack surfaces exist', `${required.length} files`)
  exists(path.join(repo, 'kubejs/server_scripts/40_recipe_add/60_acid_vat_deposit_slurries.js'))
    ? fail('retired Acid Vat deposit slurry script is absent', 'kubejs/server_scripts/40_recipe_add/60_acid_vat_deposit_slurries.js still exists')
    : ok('retired Acid Vat deposit slurry script is absent')

  const pruneTool = path.join(repo, 'tools/prune_runtime_mods.mjs')
  const bootstrapServer = path.join(repo, 'tools/bootstrap_server.sh')
  if (!exists(pruneTool)) {
    fail('server bootstrap stale mod prune tool exists', rel(pruneTool))
  } else {
    const pruneText = read(pruneTool)
    const bootstrapText = exists(bootstrapServer) ? read(bootstrapServer) : ''
    pruneText.includes('btm_client_only_mod_globs') && pruneText.includes('--dry-run') && pruneText.includes('--apply')
      ? ok('server runtime mod pruner uses shared side-exclusion policy')
      : fail('server runtime mod pruner uses shared side-exclusion policy', 'missing client-only glob parsing or dry-run/apply modes')
    bootstrapText.includes('tools/prune_runtime_mods.mjs') && bootstrapText.includes('--side server')
      ? ok('server bootstrap prunes stale cached mods')
      : fail('server bootstrap prunes stale cached mods', 'bootstrap_server.sh does not invoke tools/prune_runtime_mods.mjs for server side')
  }

  const kubejsText = walk(path.join(repo, 'kubejs'), p => p.endsWith('.js') || p.endsWith('.json')).map(read).join('\n')
  for (const tier of catalog.machineTiers) {
    const text = kubejsText
    if (!text.includes(tier.casing)) fail('machine casing appears in scripts/data', tier.casing)
  }
  ok('machine casing IDs are referenced', `${catalog.machineTiers.length} casings`)

	  const casingScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/99_machine_casing_progression.js'))
	  const rawImpossibleRecipe = casingScript.match(/event\.custom\(\{[\s\S]*?id\('kubejs:create\/mechanical_crafting\/machine_casing\/raw_impossible'\)/)?.[0] || ''
	  rawImpossibleRecipe.includes("'ae2:controller'") || rawImpossibleRecipe.includes('"ae2:controller"')
	    ? fail('Raw Impossible casing does not consume AE2 controller', 'controller belongs after the Impossible casing unlock')
	    : ok('Raw Impossible casing does not consume AE2 controller')

  const ticexScriptPath = path.join(repo, 'kubejs/server_scripts/30_recipe_replace/160_ticex_post_ae2_gates.js')
  exists(ticexScriptPath)
    ? fail('retired TiCEX post-AE2 gate script is absent', rel(ticexScriptPath))
    : ok('retired TiCEX post-AE2 gate script is absent')

  const protectionPixelScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/165_protection_pixel_post_ae2_gates.js'))
  const protectionPixelGates = [
    'protection_pixel:armorloadplatform',
    'protection_pixel:alloyarmorplate',
    'kubejs:impossible_machine_casing',
    'kubejs:impossible_circuit',
    'kubejs:sky_steel_sheet',
    'bloodmagic:etherealslate',
    'latent_chemlib:gas_reaction_chamber',
    'chemlib:iridium_plate'
  ].filter(id => !protectionPixelScript.includes(id))
  protectionPixelGates.length
    ? fail('Protection Pixel is hard-gated as post-AE2 armor', protectionPixelGates.join(', '))
    : ok('Protection Pixel is hard-gated as post-AE2 armor')
  protectionPixelScript.includes('protection_pixel:wingsofprismas_chestplate') && protectionPixelScript.includes('protection_pixel:maneuveringwing')
    ? ok('Protection Pixel late armor is displaced into explicit post-AE2 recipes')
    : fail('Protection Pixel late armor is displaced into explicit post-AE2 recipes', 'missing late armor recipe coverage')

  const pncrCreateScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/122_pneumaticcraft_create_pressing_gates.js'))
  const retiredCompressors = [
    'pneumaticcraft:air_compressor',
    'pneumaticcraft:advanced_air_compressor',
    'pneumaticcraft:liquid_compressor',
    'pneumaticcraft:advanced_liquid_compressor',
    'pneumaticcraft:thermal_compressor',
    'pneumaticcraft:manual_compressor',
    'pneumaticcraft:electrostatic_compressor',
    'pneumaticcraft:solar_compressor',
    'pneumaticcraft:flux_compressor',
    'pneumaticcraft:creative_compressor'
  ]
  const missingCompressorRetirements = retiredCompressors.filter(id => !pncrCreateScript.includes(id))
  missingCompressorRetirements.length
    ? fail('compressed air is gated to the SU rotational compressor', missingCompressorRetirements.join(', '))
    : ok('compressed air is gated to the SU rotational compressor')
  pncrCreateScript.includes('compressedcreativity:rotational_compressor') && pncrCreateScript.includes('create:mechanical_crafting')
    ? ok('SU rotational compressor has explicit Create mechanical crafting recipe')
    : fail('SU rotational compressor has explicit Create mechanical crafting recipe', 'missing compressedcreativity:rotational_compressor mechanical crafting recipe')

  const tomeOfBloodScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/166_tome_of_blood_post_ae2_gates.js'))
  const tomeOfBloodGates = [
    'tomeofblood:novice_tome_of_blood',
    'tomeofblood:archmage_tome_of_blood',
    'tomeofblood:glyph_sentient_wrath',
    'tomeofblood:living_mage_robes',
    'kubejs:impossible_machine_casing',
    'kubejs:impossible_circuit',
    'ae2:controller',
    'bloodmagic:etherealslate',
    'ars_nouveau:archmage_spell_book',
    'latent_chemlib:gas_reaction_chamber'
  ].filter(id => !tomeOfBloodScript.includes(id))
  tomeOfBloodGates.length
    ? fail('Tome of Blood is hard-gated as post-AE2 hybrid magic', tomeOfBloodGates.join(', '))
    : ok('Tome of Blood is hard-gated as post-AE2 hybrid magic')
  const magicGateScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/80_magic_progression_blood_slate_gates.js'))
  magicGateScript.includes("tomeofblood:alchemytable/apprentice_tome")
    ? fail('Tome of Blood is no longer gated as an Altar III side mod', 'old apprentice_tome gate remains')
    : ok('Tome of Blood is no longer gated as an Altar III side mod')

  const hookDroneScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/168_hooks_drones_utility_gates.js'))
  const hookDroneNeedles = [
    'rehooked:blaze_hook',
    'rehooked:ender_hook',
    'rehooked:red_hook',
    'create_sa:brass_drone',
    'kubejs:electrical_machine_casing',
    'kubejs:space_machine_casing',
    'kubejs:impossible_machine_casing'
  ].filter(id => !hookDroneScript.includes(id))
  hookDroneNeedles.length
    ? fail('Hooks and Create SA drones are tier-gated', hookDroneNeedles.join(', '))
    : ok('Hooks and Create SA drones are tier-gated')

  const backpackScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/169_backpack_post_ae2_utility_gates.js'))
  const backpackNeedles = [
    'sophisticatedbackpacks:feeding_upgrade',
    'sophisticatedbackpacks:alchemy_upgrade',
    'sophisticatedbackpacks:tool_swapper_upgrade',
    'sophisticatedstorage:alchemy_upgrade',
    'kubejs:impossible_machine_casing',
    'kubejs:impossible_circuit'
  ].filter(id => !backpackScript.includes(id))
  backpackNeedles.length
    ? fail('High-impact backpack upgrades are post-AE2', backpackNeedles.join(', '))
    : ok('High-impact backpack upgrades are post-AE2')

  const hiddenScript = read(path.join(repo, 'kubejs/client_scripts/40_hide_quarantined_systems.js'))
  const removeScript = read(path.join(repo, 'kubejs/server_scripts/20_recipe_remove/30_remove_items.js'))
  const quarantinedNeedles = [
    'alchemistry:dissolver',
    'alchemistry:combiner',
    'alchemistry:fusion_chamber_controller',
    'occultism:miner_foliot_unspecialized',
    'sophisticatedbackpacks:stack_upgrade_omega_tier'
  ].filter(id => !hiddenScript.includes(id) || !removeScript.includes(id))
  quarantinedNeedles.length
    ? fail('Quarantined machines/upgrades are removed and hidden', quarantinedNeedles.join(', '))
    : ok('Quarantined machines/upgrades are removed and hidden')

  const dimensionAccessScript = read(path.join(repo, 'kubejs/server_scripts/30_recipe_replace/170_space_dimension_access_gates.js'))
  const directDimensionRouteItems = [
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
  const missingDirectRouteSuppressions = directDimensionRouteItems.filter(id => !dimensionAccessScript.includes(id) || !hiddenScript.includes(id))
  missingDirectRouteSuppressions.length
    ? fail('Direct dimension portal/key items are removed and hidden', missingDirectRouteSuppressions.join(', '))
    : ok('Direct dimension portal/key items are removed and hidden', `${directDimensionRouteItems.length} items`)

  const directRecipeConstructors = /event\.(shaped|shapeless)\s*\(/.test(dimensionAccessScript)
  directRecipeConstructors
    ? fail('Direct dimension route pass does not re-author portal recipes', 'event.shaped/event.shapeless present')
    : ok('Direct dimension route pass does not re-author portal recipes')

  const twilightConfig = read(path.join(repo, 'config/twilightforest-common.toml'))
  const twilightProblems = [
    ['disablePortalCreation = true', 'portal creation disabled'],
    ['shouldReturnPortalBeUsable = false', 'return portal disabled'],
    ['portalUnlockedByAdvancement = ""', 'portal advancement lock empty']
  ].filter(([needle]) => !twilightConfig.includes(needle)).map(([, label]) => label)
  twilightProblems.length
    ? fail('Twilight Forest direct portal is disabled', twilightProblems.join(', '))
    : ok('Twilight Forest direct portal is disabled')

  const earthOrbitRoute = readJson(path.join(repo, 'kubejs/data/creatingspace/creatingspace/rocket_accessible_dimension/earth_orbit.json'))
  const requiredSpaceRoutes = [
    'lostcities:lostcity',
    'twilightforest:twilight_forest',
    'fallout_wastelands_:wastelands',
    'the_finley_dimension_remastered:finley_dimension',
    'callfromthedepth_:depth'
  ]
  const missingEarthRoutes = requiredSpaceRoutes.filter(dimension => !earthOrbitRoute.adjacentDimensions?.[dimension])
  missingEarthRoutes.length
    ? fail('Creating Space Earth orbit exposes all non-meteor adventure dimensions', missingEarthRoutes.join(', '))
    : ok('Creating Space Earth orbit exposes all non-meteor adventure dimensions', `${requiredSpaceRoutes.length} routes`)

  const missingReturnRoutes = [
    'kubejs/data/lostcities/creatingspace/rocket_accessible_dimension/lostcity.json',
    'kubejs/data/twilightforest/creatingspace/rocket_accessible_dimension/twilight_forest.json',
    'kubejs/data/fallout_wastelands_/creatingspace/rocket_accessible_dimension/wastelands.json',
    'kubejs/data/the_finley_dimension_remastered/creatingspace/rocket_accessible_dimension/finley_dimension.json',
    'kubejs/data/callfromthedepth_/creatingspace/rocket_accessible_dimension/depth.json'
  ].filter(file => {
    const route = path.join(repo, file)
    return !exists(route) || !readJson(route).adjacentDimensions?.['creatingspace:earth_orbit']
  })
  missingReturnRoutes.length
    ? fail('Space-routed adventure dimensions return to Earth orbit', missingReturnRoutes.join(', '))
    : ok('Space-routed adventure dimensions return to Earth orbit')

  const structurify = readJson(path.join(repo, 'config/structurify.json'))
  const disabledStructures = new Set((structurify.structures || []).filter(entry => entry.is_disabled).map(entry => entry.name))
  const directPortalStructures = [
    'minecraft:ruined_portal',
    'minecraft:stronghold',
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
  const enabledPortalStructures = directPortalStructures.filter(name => !disabledStructures.has(name))
  enabledPortalStructures.length
    ? fail('Direct portal structures are disabled', enabledPortalStructures.join(', '))
    : ok('Direct portal structures are disabled', `${directPortalStructures.length} structures`)

  const spaceAccessAdvancement = readJson(path.join(repo, 'kubejs/data/btm/advancements/creating_space_access.json'))
  const advancementText = JSON.stringify(spaceAccessAdvancement)
  advancementText.includes('creatingspace:netherite_oxygen_backtank')
    ? ok('Creating Space access advancement has a concrete space item trigger')
    : fail('Creating Space access advancement has a concrete space item trigger', 'missing netherite oxygen backtank')
}

function testQuestBook() {
  const chapterDir = path.join(repo, 'config/ftbquests/quests/chapters')
  const questFiles = walk(chapterDir, p => p.endsWith('.snbt'))
  metrics.questChapters = questFiles.length

  const groupFile = path.join(repo, 'config/ftbquests/quests/chapter_groups.snbt')
  if (!questFiles.length && !exists(groupFile)) {
    ok('quest book is intentionally empty', '0 chapters and no chapter groups')
    skip('quest dependency validation', 'quest book removed')
    skip('quest reward validation', 'quest book removed')
    skip('quest progression anchor validation', 'quest book removed')
    skip('food and TCon quest showcase validation', 'quest book removed')
    return
  }

  const groupText = read(groupFile)
  const groupIds = new Set([...groupText.matchAll(/\{id:"?([0-9A-Fa-f]{16})"?/g)].map(m => m[1].toUpperCase()))
  const badGroupRefs = []
  const tierTitleLabels = []
  for (const file of questFiles) {
    const text = read(file)
    const group = text.match(/^\s*group:\s*"([^"]*)"/m)?.[1] || ''
    const title = text.match(/^\s*title:\s*"([^"]*)"/m)?.[1] || ''
    if (!group || !groupIds.has(group.toUpperCase())) badGroupRefs.push(`${path.basename(file)} -> ${group || '<empty>'}`)
    if (/^(Copper|Iron|Brass|Gold|Platinum) Tier\b/.test(title)) {
      tierTitleLabels.push(`${path.basename(file)} -> ${title}`)
    }
  }
  badGroupRefs.length ? fail('all chapters are assigned to existing chapter groups', badGroupRefs.join('\n')) : ok('all chapters are assigned to existing chapter groups', `${questFiles.length} chapters`)
  tierTitleLabels.length ? fail('chapter titles do not duplicate chapter group labels', tierTitleLabels.join('\n')) : ok('chapter titles do not duplicate chapter group labels')

  const ids = new Set()
  const deps = []
  for (const file of questFiles) {
    const text = read(file)
    for (const m of text.matchAll(/\{id:"([^"]+)"/g)) ids.add(m[1])
    for (const m of text.matchAll(/dependencies:\[([^\]]*)\]/g)) {
      for (const r of m[1].matchAll(/"([^"]+)"/g)) deps.push({ file: rel(file), id: r[1] })
    }
  }
  const missing = deps.filter(d => !ids.has(d.id))
  missing.length ? fail('quest dependencies resolve', missing.slice(0, 40).map(d => `${d.file}: ${d.id}`).join('\n')) : ok('quest dependencies resolve', `${deps.length} refs`)

  const badRecipeHooks = []
  for (const file of questFiles) {
    for (const q of parseQuestFile(file)) {
      const firstTask = q.tasks[0]?.item || ''
      if (!q.icon || q.icon !== firstTask || q.disableJei !== 'false') {
        badRecipeHooks.push(`${path.basename(file)} ${q.id}: icon=${q.icon || '<missing>'} first_task=${firstTask || '<missing>'} disable_jei=${q.disableJei || '<missing>'}`)
      }
    }
  }
  badRecipeHooks.length ? fail('quest nodes expose stable recipe hooks', badRecipeHooks.slice(0, 80).join('\n')) : ok('quest nodes expose stable recipe hooks')

  const starting = parseQuestFile(path.join(chapterDir, 'starting_out.snbt'))
  const copperCoin = catalog.coinTiers.find(t => t.id === 'copper')?.item || 'createdeco:copper_coin'
  const badStarting = starting.filter(q => q.rewards.length !== 1 || q.rewards[0].item !== copperCoin || q.rewards[0].count !== 4)
  badStarting.length ? fail('Starting Out rewards exactly 4 copper per quest', badStarting.map(q => q.id).join(', ')) : ok('Starting Out rewards exactly 4 copper per quest', `${starting.length} quests`)

  const nonStartingBad = []
  for (const file of questFiles.filter(f => !f.endsWith('starting_out.snbt'))) {
    for (const q of parseQuestFile(file)) {
      if (!q.rewards.length) continue
      for (const r of q.rewards.filter(r => coinItems.has(r.item))) {
        if (r.count !== 4) nonStartingBad.push(`${path.basename(file)} ${q.id} ${r.item} x${r.count}`)
      }
    }
  }
  nonStartingBad.length ? fail('non-Starting quest coin rewards use 4-count tier packets', nonStartingBad.slice(0, 60).join('\n')) : ok('non-Starting quest coin rewards use 4-count tier packets')

  const chapterText = questFiles.map(f => `${path.basename(f)}\n${read(f)}`).join('\n')
  const requiredNodes = [
    'kubejs:seared_machine_casing',
    'kubejs:andesite_machine_casing',
    'kubejs:brass_machine_casing',
    'kubejs:airtight_machine_casing',
    'kubejs:electrical_machine_casing',
    'kubejs:space_machine_casing',
    'kubejs:raw_impossible_casing',
    'kubejs:impossible_machine_casing',
    'latent_chemlib:gas_capture',
    'latent_chemlib:gas_tank',
    'latent_chemlib:gas_reaction_chamber',
    'latent_chemlib:gas_release',
	    'heatsync:coolant_exchanger',
	    'rpgstats:still_beating_heart',
      'protection_pixel:armorloadplatform',
      'protection_pixel:wingsofprismas_chestplate',
      'tomeofblood:novice_tome_of_blood',
      'tomeofblood:glyph_sentient_wrath',
      'starcatcher:starcatcher_rod',
      'starcatcher:waterlogged_satchel',
      'littlelogistics:energy_tug',
      'apotheosis:gem_cutting_table',
      'framedblocks:framed_cube',
      'buildinggadgets2:gadget_building',
      'create_sa:brass_drone',
      'sophisticatedbackpacks:feeding_upgrade',
      'creatingspace:rocket_controls',
      'creatingspace:netherite_oxygen_backtank'
	  ]
  const absent = requiredNodes.filter(n => !chapterText.includes(n))
  absent.length ? finding('quest book is missing important progression nodes', absent.join(', '), 'MUST') : ok('quest book covers major progression nodes', `${requiredNodes.length} anchors`)

  const foodText = [
    'food_i.snbt',
    'food_ii.snbt',
    'brewing.snbt',
    'potion_engineering.snbt',
    'food_catalogue.snbt'
  ].map(file => read(path.join(chapterDir, file))).join('\n')
  const expectedFoodShowcase = [
    'minecraft:apple',
    'farmersdelight:hamburger',
    'farmersrespite:green_tea',
    'brewinandchewin:beer',
    'corn_delight:cornbread',
    'delightful:source_berry_milkshake',
    'ends_delight:dragon_meat_stew',
    'oceansdelight:guardian_soup',
    'undergardendelight:blood_tomato_soup'
  ]
  const missingFood = expectedFoodShowcase.filter(id => !foodText.includes(`item:"${id}"`))
  missingFood.length ? fail('Food chapter exposes food showcase coverage', missingFood.join(', ')) : ok('Food chapter exposes food showcase coverage', `${expectedFoodShowcase.length} representative foods`)

  const tconText = [
    'tinkers_i.snbt',
    'tinkers_ii.snbt',
    'tinkers_arsenal.snbt'
  ].map(file => read(path.join(chapterDir, file))).join('\n')
  const expectedTconShowcase = [
    'tconstruct:cleaver',
    'tconstruct:longbow',
    'tconstruct:plate_chestplate',
    'tinkersweaponry:greatsword',
    'tinkers_battle_spades:battle_spade',
    'tinkers_advanced:matter_manipulator'
  ]
  const missingTcon = expectedTconShowcase.filter(id => !tconText.includes(`item:"${id}"`))
  const nbtStrictTcon = expectedTconShowcase.filter(id => !new RegExp(`item:"${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}" match_nbt:false`).test(tconText))
  missingTcon.length ? fail('TCon chapter exposes weapon and tool showcase coverage', missingTcon.join(', ')) : ok('TCon chapter exposes weapon and tool showcase coverage', `${expectedTconShowcase.length} representative tools`)
  nbtStrictTcon.length ? fail('TCon showcase tasks ignore NBT', nbtStrictTcon.join(', ')) : ok('TCon showcase tasks ignore NBT')
}

function testWaresAndTrades() {
  const waresFiles = walk(path.join(repo, 'kubejs/data/wares/loot_tables'), p => p.endsWith('.json'))
  if (!waresFiles.length) fail('Wares contract loot tables exist', 'no kubejs/data/wares loot tables found')
  const emeraldWares = []
  const coinWares = []
  for (const file of waresFiles) {
    const text = read(file)
    if (text.includes('minecraft:emerald')) emeraldWares.push(rel(file))
    for (const coin of coinItems) if (text.includes(coin)) coinWares.push(`${rel(file)} -> ${coin}`)
  }
  emeraldWares.length ? fail('Wares contracts do not use emerald currency', emeraldWares.join('\n')) : ok('Wares contracts do not use emerald currency', `${waresFiles.length} tables`)
  coinWares.length ? ok('Wares contracts contain Create Deco coin currency', `${unique(coinWares.map(x => x.split(' -> ')[0])).length} tables`) : fail('Wares contracts contain Create Deco coin currency', 'no coin entries found')

  const tradePath = path.join(repo, 'kubejs/server_scripts/35_villager_trades/10_coin_villager_trades.js')
  const text = exists(tradePath) ? read(tradePath) : ''
  if (!text) return fail('villager trade script exists', rel(tradePath))
  const professions = unique([...text.matchAll(/btmAdd(?:Sell)?Trades\(event,\s*'([^']+)'/g)].map(m => m[1]))
  metrics.villagerProfessionsCovered = professions.length
  professions.length >= 13 ? ok('villager trade script covers broad profession set', `${professions.length} professions`) : fail('villager trade script covers broad profession set', `${professions.length} professions`)
  const emeraldMentions = countOccurrences(text, 'minecraft:emerald')
  emeraldMentions ? fail('villager trade script has no emerald currency', `${emeraldMentions} mentions`) : ok('villager trade script has no emerald currency')
  const sellHelper = text.match(/function btmSellTrade[\s\S]*?\n\}/)?.[0] || ''
  const sellUsesOnlyCopper = sellHelper.includes('var coin = BTM_COIN.copper') && sellHelper.includes('Item.of(coin, copperCount)')
  sellUsesOnlyCopper ? ok('sell-trade helper pays copper coins instead of emeralds') : fail('sell-trade helper pays copper coins instead of emeralds', 'unexpected sell output expression')
  for (const tier of catalog.coinTiers.slice(0, 11)) {
    if (!text.includes(`'${tier.id}'`)) finding('villager trades do not mention coin tier', tier.id, tier.index <= 2 ? 'MUST' : 'SHOULD')
  }
}

function testLootData() {
  const repoLoot = walk(path.join(repo, 'kubejs/data'), p => p.includes(`${path.sep}loot_tables${path.sep}`) && p.endsWith('.json'))
  const lootJsonBad = []
  for (const f of repoLoot) {
    try { readJson(f) } catch (e) { lootJsonBad.push(`${rel(f)}: ${e.message}`) }
  }
  lootJsonBad.length ? fail('repo loot table JSON parses', lootJsonBad.slice(0, 40).join('\n')) : ok('repo loot table JSON parses', `${repoLoot.length} tables`)

  const coinTables = []
  const emeraldTables = []
  const riskyTables = []
  for (const f of repoLoot) {
    const text = read(f)
    if ([...coinItems].some(c => text.includes(c))) coinTables.push(rel(f))
    if (text.includes('minecraft:emerald')) emeraldTables.push(rel(f))
    if (/(creative_|elytra|nether_star|netherite_block|teleport|chunk_loader|builder|quarry)/.test(text)) riskyTables.push(rel(f))
  }
  coinTables.length >= 20 ? ok('repo loot tables inject many coin sources', `${coinTables.length} tables`) : fail('repo loot tables inject many coin sources', `${coinTables.length} tables`)
  emeraldTables.length ? finding('repo loot tables still contain emeralds', emeraldTables.slice(0, 40).join('\n'), 'SHOULD') : ok('repo loot tables contain no direct emerald loot')
  riskyTables.length ? finding('repo loot tables contain high-power outputs', unique(riskyTables).slice(0, 40).join('\n'), 'MAYBE') : ok('repo loot tables contain no obvious high-power outputs')
}

function testGeneratedRecipeGraph() {
  let loaded = null
  try { loaded = loadGeneratedRecipes() } catch (e) { return fail('generated recipe index loads', e.message) }
  if (!loaded) return missingRuntimeEvidence('generated recipe graph tests', `missing ${path.join(generatedConfigDir, 'full_recipe_index_manifest.json')}`)
  const { manifest, recipes, chunkProblems } = loaded
  const manifestPath = path.join(generatedConfigDir, 'full_recipe_index_manifest.json')
  const summaryPath = path.join(generatedConfigDir, 'recipe_audit_summary.json')
  const manifestProblems = []
  if (manifest.schema !== 'btm.recipe_audit.v2') manifestProblems.push(`schema=${manifest.schema || '<missing>'}`)
  if (manifest.generatedBy !== 'kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js') manifestProblems.push(`generatedBy=${manifest.generatedBy || '<missing>'}`)
  if (manifest.recipeEventStage !== 'pre_mutation_recipe_event') manifestProblems.push(`recipeEventStage=${manifest.recipeEventStage || '<missing>'}`)
  if (!manifest.generatedAt) manifestProblems.push('generatedAt=<missing>')
  if (manifestProblems.length) {
    const detail = manifestProblems.join(', ')
    strictRuntime ? fail('generated recipe dump has provenance metadata', detail) : finding('generated recipe dump has provenance metadata', detail, 'SHOULD')
  } else {
    ok('generated recipe dump has provenance metadata', `${manifest.schema}, ${manifest.recipeEventStage}, ${manifest.generatedAt}`)
  }
  if (chunkProblems.length) {
    const detail = chunkProblems.slice(0, 40).join('\n')
    strictRuntime ? fail('generated recipe chunks match manifest metadata', detail) : finding('generated recipe chunks match manifest metadata', detail, 'SHOULD')
  } else {
    ok('generated recipe chunks match manifest metadata', `${manifest.chunkCount} chunks`)
  }
  if (exists(summaryPath)) {
    const auditSummary = readJson(summaryPath)
    const summaryProblems = []
    if (auditSummary.schema !== manifest.schema) summaryProblems.push(`schema=${auditSummary.schema || '<missing>'}`)
    if (auditSummary.generatedBy !== manifest.generatedBy) summaryProblems.push(`generatedBy=${auditSummary.generatedBy || '<missing>'}`)
    if (auditSummary.generatedAt !== manifest.generatedAt) summaryProblems.push(`generatedAt=${auditSummary.generatedAt || '<missing>'}`)
    if (auditSummary.recipeEventStage !== manifest.recipeEventStage) summaryProblems.push(`recipeEventStage=${auditSummary.recipeEventStage || '<missing>'}`)
    if (auditSummary.scannedRecipes !== manifest.recipeCount) summaryProblems.push(`scannedRecipes=${auditSummary.scannedRecipes}, recipeCount=${manifest.recipeCount}`)
    if (auditSummary.fullRecipeChunkCount !== manifest.chunkCount) summaryProblems.push(`fullRecipeChunkCount=${auditSummary.fullRecipeChunkCount}, chunkCount=${manifest.chunkCount}`)
    if (summaryProblems.length) {
      const detail = summaryProblems.join(', ')
      strictRuntime ? fail('recipe audit summary matches manifest', detail) : finding('recipe audit summary matches manifest', detail, 'SHOULD')
    } else {
      ok('recipe audit summary matches manifest', `${auditSummary.scannedRecipes} recipes`)
    }
  } else {
    missingRuntimeEvidence('recipe audit summary exists', summaryPath)
  }
  const logPath = latestRuntimeLog()
  if (exists(logPath)) {
    const logText = read(logPath)
    const expectedLine = `[BTM-RECIPE-AUDIT] scanned=${manifest.recipeCount} fullChunks=${manifest.chunkCount}`
    if (logText.includes(expectedLine)) {
      ok('latest log confirms recipe dump emission', expectedLine)
    } else {
      const detail = `missing ${expectedLine} in ${logPath}`
      strictRuntime ? fail('latest log confirms recipe dump emission', detail) : finding('latest log confirms recipe dump emission', detail, 'SHOULD')
    }
  } else {
    missingRuntimeEvidence('latest log exists for recipe dump correlation', logPath)
  }
  const newestRecipeScript = newestFile(walk(path.join(repo, 'kubejs/server_scripts'), p => p.endsWith('.js')))
  const manifestStat = fs.statSync(manifestPath)
  if (newestRecipeScript && manifestStat.mtimeMs + 1000 < newestRecipeScript.mtimeMs) {
    const detail = `${path.basename(newestRecipeScript.file)} is newer than live recipe dump; reload the instance to refresh full_recipe_index_*.json`
    strictRuntime ? fail('generated recipe graph is older than repo recipe scripts', detail) : finding('generated recipe graph is older than repo recipe scripts', detail, 'MUST')
    return
  }
  metrics.generatedRecipes = recipes.length
  recipes.length === manifest.recipeCount ? ok('generated recipe chunks match manifest', `${recipes.length} recipes`) : fail('generated recipe chunks match manifest', `${recipes.length}/${manifest.recipeCount}`)

  const ids = new Set()
  const dupes = []
  const parseFailures = []
  const outputs = new Map()
  const forbiddenOutputs = []
  const undertiered = []
  const materialRisks = []
  const alchemistryPlayerFacing = []
  const finalEffectiveGraph = manifest.recipeEventStage !== 'pre_mutation_recipe_event'

  for (const r of recipes) {
    if (ids.has(r.id)) dupes.push(r.id)
    ids.add(r.id)
    let json
    try { json = JSON.parse(r.json) } catch (e) {
      parseFailures.push(`${r.id}: ${e.message}`)
      continue
    }
    const ingredients = extractItems(json)
    const outs = extractRecipeOutputs(json)
    const inferred = inferTierFromItems(ingredients)
    for (const out of outs) {
      if (!outputs.has(out)) outputs.set(out, [])
      outputs.get(out).push(r.id)
      const forbiddenHard = /(creative|debug|command_block|structure_block)/.test(out)
      const internalRecipe = /(bloodmagic:array|occultism:ritual|reliquary:uncrafting|the_bumblezone:.*spawn_egg|tinkersinnovation:casting\/.*bedrock|mna:components)/.test(r.id)
      if (forbiddenHard && !internalRecipe) forbiddenOutputs.push(`${r.id} -> ${out}`)
      if (!forbiddenHard && /(barrier|bedrock|spawn_egg)/.test(out) && !internalRecipe) {
        finding('recipe outputs internal/special block or spawn egg', `${r.id} -> ${out}`, 'MAYBE')
      }
      if (r.namespace === 'alchemistry' && ['minecraft:crafting_shaped', 'minecraft:crafting_shapeless'].includes(r.type)) alchemistryPlayerFacing.push(`${r.id} -> ${out}`)
      const needed = intendedMachineTier(out)
      if (needed && isMachineLike(out) && !tierAtLeast(inferred.tier, needed)) {
        undertiered.push(`${r.id} -> ${out} needs ${needed}, inferred ${inferred.tier}`)
      }
      const text = r.json
      const rawValuable = ['minecraft:iron_ingot', 'minecraft:copper_ingot', 'minecraft:gold_ingot', 'minecraft:redstone', 'minecraft:lapis_lazuli', 'minecraft:diamond', 'minecraft:emerald', 'minecraft:amethyst_shard']
        .filter(v => text.includes(v))
      if (rawValuable.length && isMachineLike(out)) materialRisks.push(`${r.id} -> ${out}: ${rawValuable.join(', ')}`)
    }
  }

  dupes.length ? fail('generated recipes have unique IDs', dupes.slice(0, 80).join('\n')) : ok('generated recipes have unique IDs')
  parseFailures.length ? fail('generated recipe JSON parses', parseFailures.slice(0, 80).join('\n')) : ok('generated recipe JSON parses')
  forbiddenOutputs.length ? fail('no forbidden creative/debug outputs are craftable', forbiddenOutputs.slice(0, 80).join('\n')) : ok('no forbidden creative/debug outputs are craftable')
  if (finalEffectiveGraph) {
    alchemistryPlayerFacing.length ? finding('Alchemistry has player-facing crafting recipes', alchemistryPlayerFacing.slice(0, 80).join('\n'), 'SHOULD') : ok('Alchemistry has no obvious grid-crafting player-facing recipes')
  } else {
    skip('Alchemistry player-facing recipe check', 'current KubeJS dump is a pre-mutation audit; disabled Alchemistry removals run after this dump')
  }

  const criticalOutputs = [
    'create:andesite_alloy',
    'create:andesite_casing',
    'create:water_wheel',
    'create:windmill_bearing',
    'tconstruct:grout',
    'kubejs:impossible_machine_casing',
    'bloodmagic:weakbloodorb'
  ]
  if (finalEffectiveGraph) {
    undertiered.length ? finding('generated recipe graph has undertiered machine-like outputs', undertiered.slice(0, 120).join('\n'), 'MUST') : ok('generated machine-like outputs appear tier-gated')
    materialRisks.length ? finding('machine recipes still use raw vanilla valuables directly', materialRisks.slice(0, 120).join('\n'), 'SHOULD') : ok('machine recipes avoid direct vanilla valuable shortcuts')
    const missing = criticalOutputs.filter(o => !outputs.has(o))
    missing.length ? finding('critical outputs absent from generated recipe dump', missing.join(', '), 'MUST') : ok('critical outputs appear in generated recipe dump', `${criticalOutputs.length} outputs`)
  } else {
    skip('final effective recipe graph assertions', 'current KubeJS dump is a pre-mutation audit; it does not include kubejs-added recipe IDs')
  }
}

function testGeneratedDumpLoot() {
  const lootRoot = path.join(generatedDumpDir, 'loot_tables')
  if (!exists(lootRoot)) return missingDataDumpEvidence('generated loot dump tests', `missing ${lootRoot}`)
  const files = walk(lootRoot, p => p.endsWith('.json'))
  metrics.generatedLootTables = files.length
  const coinHits = []
  const emeraldHits = []
  const lowWorldLootMissingCoins = []
  const alwaysCoinTargets = [
    'minecraft/chests/abandoned_mineshaft',
    'minecraft/chests/desert_pyramid',
    'minecraft/chests/jungle_temple',
    'minecraft/chests/simple_dungeon',
    'minecraft/chests/shipwreck_treasure',
    'minecraft/chests/village/village_plains_house'
  ]
  for (const file of files) {
    const relTable = path.relative(lootRoot, file).replace(/\.json$/, '').replaceAll(path.sep, '/')
    const text = read(file)
    if ([...coinItems].some(c => text.includes(c))) coinHits.push(relTable)
    if (text.includes('minecraft:emerald')) emeraldHits.push(relTable)
  }
  for (const target of alwaysCoinTargets) {
    const hit = coinHits.some(t => t.endsWith(target) || t.includes(target))
    if (!hit) lowWorldLootMissingCoins.push(target)
  }
  coinHits.length >= 30 ? ok('generated loot contains broad coin coverage', `${coinHits.length} tables`) : finding('generated loot coin coverage is thin', `${coinHits.length} tables`, 'MUST')
  lowWorldLootMissingCoins.length ? finding('common world loot tables missing coin coverage', lowWorldLootMissingCoins.join(', '), 'MUST') : ok('common world loot tables include coin coverage')
  emeraldHits.length ? finding('generated loot still contains emeralds', emeraldHits.slice(0, 80).join('\n'), 'SHOULD') : ok('generated loot contains no emeralds')
}

function testEngineWorldPerformanceLogs() {
  const logPath = path.join(instance, 'logs/latest.log')
  if (!exists(logPath)) return missingRuntimeEvidence('engine/world performance log analysis', `missing ${logPath}`)

  const text = read(logPath)
  const lines = text.split(/\r?\n/)
  const logStat = fs.statSync(logPath)
  const logAgeMinutes = Math.round(((Date.now() - logStat.mtimeMs) / 60000) * 100) / 100
  const logMetrics = {
    latestLog: logPath,
    latestLogAgeMinutes: logAgeMinutes,
    latestLogLines: lines.length,
    reachedIntegratedServer: text.includes('Starting integrated minecraft server'),
    reachedDedicatedServer: /Done \([\d.]+s\)! For help, type "help"/.test(text),
    startedServingLan: text.includes('Started serving on'),
    reachedInGame: text.includes('Started serving on') || text.includes('Time from main menu to in-game was') || /Done \([\d.]+s\)! For help, type "help"/.test(text),
    mainMenuToInGameMs: null,
    totalLoadToWorldMs: null,
    spawnPrepTimeMs: null,
    serverTickBehindWarnings: 0,
    maxTickBehindMs: 0,
    totalTickBehindMs: 0,
    maxTickBehindTicks: 0,
    worldSaveDurationMs: null,
    worldSaveFromSavingWorldsMs: null,
    dimensionSaveCount: 0,
    distantHorizonsIncompleteTasks: 0,
    settlementRoadsRebuilds: 0,
    settlementRoadsMaxDiscoveredStructures: 0,
    settlementRoadsMaxConnections: 0,
    emiTotalReloadMs: null,
    emiSlowestPluginMs: 0,
    emiSlowestPlugin: null,
    kubejsRecipeParseErrors: 0,
    kubejsFailedRecipeCount: 0,
    hardLogFindings: 0,
    newestCrashReport: null,
    newestCrashReportAfterLatestLog: false
  }

  let lastStoppingServerAt = null
  let lastSavingWorldsAt = null
  let saveDimensionCounter = 0
  let countingSaveDimensions = false

  for (const line of lines) {
    const at = parseLogTime(line)
    const spawn = line.match(/Time elapsed: (\d+) ms/)
    if (spawn) logMetrics.spawnPrepTimeMs = Number(spawn[1])
    const inGame = line.match(/Time from main menu to in-game was ([\d.]+) seconds/)
    if (inGame) logMetrics.mainMenuToInGameMs = Math.round(Number(inGame[1]) * 1000)
    const totalLoad = line.match(/Total time to load game and open world was ([\d.]+) seconds/)
    if (totalLoad) logMetrics.totalLoadToWorldMs = Math.round(Number(totalLoad[1]) * 1000)

    const behind = line.match(/Can't keep up!.*Running (\d+)ms or (\d+) ticks behind/)
    if (behind) {
      const ms = Number(behind[1])
      const ticks = Number(behind[2])
      logMetrics.serverTickBehindWarnings++
      logMetrics.maxTickBehindMs = Math.max(logMetrics.maxTickBehindMs, ms)
      logMetrics.totalTickBehindMs += ms
      logMetrics.maxTickBehindTicks = Math.max(logMetrics.maxTickBehindTicks, ticks)
    }

    const dh = line.match(/World generator thread pool shutdown with \[(\d+)\] incomplete tasks/)
    if (dh) logMetrics.distantHorizonsIncompleteTasks = Math.max(logMetrics.distantHorizonsIncompleteTasks, Number(dh[1]))

    const roads = line.match(/Rebuilt world network: (\d+) discovered structures, (\d+) active structures, (\d+) connections/)
    if (roads) {
      logMetrics.settlementRoadsRebuilds++
      logMetrics.settlementRoadsMaxDiscoveredStructures = Math.max(logMetrics.settlementRoadsMaxDiscoveredStructures, Number(roads[1]))
      logMetrics.settlementRoadsMaxConnections = Math.max(logMetrics.settlementRoadsMaxConnections, Number(roads[3]))
    }

    const emiPlugin = line.match(/\[EMI\] Reloaded plugin from ([^ ]+) in (\d+)ms/)
    if (emiPlugin && Number(emiPlugin[2]) > logMetrics.emiSlowestPluginMs) {
      logMetrics.emiSlowestPlugin = emiPlugin[1]
      logMetrics.emiSlowestPluginMs = Number(emiPlugin[2])
    }
    const emiTotal = line.match(/\[EMI\] Reloaded EMI in (\d+)ms/)
    if (emiTotal) logMetrics.emiTotalReloadMs = Number(emiTotal[1])
    if (line.includes('Error parsing recipe')) logMetrics.kubejsRecipeParseErrors++
    const failedRecipes = line.match(/with (\d+) failed recipes/)
    if (failedRecipes) logMetrics.kubejsFailedRecipeCount = Math.max(logMetrics.kubejsFailedRecipeCount, Number(failedRecipes[1]))

    if (line.includes('Stopping server') && at != null) {
      lastStoppingServerAt = at
      lastSavingWorldsAt = null
      saveDimensionCounter = 0
      countingSaveDimensions = true
    }
    if (line.includes('Saving worlds') && at != null) lastSavingWorldsAt = at
    if (countingSaveDimensions && line.includes("Saving chunks for level 'ServerLevel")) saveDimensionCounter++
    if (countingSaveDimensions && line.includes('ThreadedAnvilChunkStorage: All dimensions are saved') && at != null) {
      logMetrics.worldSaveDurationMs = lastStoppingServerAt == null ? null : at - lastStoppingServerAt
      logMetrics.worldSaveFromSavingWorldsMs = lastSavingWorldsAt == null ? null : at - lastSavingWorldsAt
      logMetrics.dimensionSaveCount = saveDimensionCounter
      countingSaveDimensions = false
    }
  }

  const crashFiles = walk(path.join(instance, 'crash-reports'), p => /crash-.*\.txt$/.test(path.basename(p)))
  const newestCrash = newestFile(crashFiles)
  if (newestCrash) {
    logMetrics.newestCrashReport = path.basename(newestCrash.file)
    logMetrics.newestCrashReportAfterLatestLog = newestCrash.mtimeMs > logStat.mtimeMs
  }

  const hardLogScan = scanHardFailures({ logPath, instanceDir: instance })
  logMetrics.kubejsRecipeParseErrors = hardLogScan.parseErrorCount
  logMetrics.kubejsFailedRecipeCount = hardLogScan.failedRecipeCount
  logMetrics.hardLogFindings = hardLogScan.findings.length

  metrics.engineWorld = logMetrics

  logAgeMinutes <= 1440 ? ok('latest engine log is recent', `${logAgeMinutes} minutes old`) : finding('latest engine log is stale', `${logAgeMinutes} minutes old`, 'SHOULD')
  if (logMetrics.reachedIntegratedServer) ok('engine reached integrated server startup')
  else if (logMetrics.reachedDedicatedServer) ok('engine reached dedicated server startup')
  else fail('engine reached server startup', 'missing integrated or dedicated startup marker')
  logMetrics.reachedInGame ? ok('world became playable/servable', logMetrics.reachedDedicatedServer ? 'dedicated server Done marker' : (logMetrics.startedServingLan ? 'LAN serving marker' : 'ModernFix in-game marker')) : finding('world became playable/servable', 'missing "Started serving on", ModernFix in-game, or dedicated server Done marker', 'MUST')

  if (logMetrics.spawnPrepTimeMs == null) {
    finding('spawn preparation time is measurable', 'missing "Time elapsed" marker', 'MUST')
  } else if (logMetrics.spawnPrepTimeMs > 120000) {
    fail('spawn preparation hard limit', `${logMetrics.spawnPrepTimeMs} ms > 120000 ms`)
  } else if (logMetrics.spawnPrepTimeMs > 60000) {
    finding('spawn preparation budget exceeded', `${logMetrics.spawnPrepTimeMs} ms > 60000 ms`, 'SHOULD')
  } else {
    ok('spawn preparation budget', `${logMetrics.spawnPrepTimeMs} ms <= 60000 ms`)
  }

  if (logMetrics.serverTickBehindWarnings > 20 || logMetrics.maxTickBehindMs > 30000) {
    fail('server tick-behind hard limit', `${logMetrics.serverTickBehindWarnings} warnings, max ${logMetrics.maxTickBehindMs} ms`)
  } else if (logMetrics.serverTickBehindWarnings > 5 || logMetrics.maxTickBehindMs > 10000) {
    finding('server tick-behind budget exceeded', `${logMetrics.serverTickBehindWarnings} warnings, max ${logMetrics.maxTickBehindMs} ms`, 'SHOULD')
  } else {
    ok('server tick-behind budget', `${logMetrics.serverTickBehindWarnings} warnings, max ${logMetrics.maxTickBehindMs} ms`)
  }

  if (logMetrics.worldSaveDurationMs == null) {
    finding('world save duration is measurable', 'missing shutdown save markers', 'SHOULD')
  } else if (logMetrics.worldSaveDurationMs > 30000) {
    fail('world save hard limit', `${logMetrics.worldSaveDurationMs} ms > 30000 ms`)
  } else if (logMetrics.worldSaveDurationMs > 10000) {
    finding('world save budget exceeded', `${logMetrics.worldSaveDurationMs} ms > 10000 ms`, 'SHOULD')
  } else {
    ok('world save budget', `${logMetrics.worldSaveDurationMs} ms <= 10000 ms`)
  }

  if (logMetrics.dimensionSaveCount > 40) {
    finding('high dimension save fanout', `${logMetrics.dimensionSaveCount} dimensions`, 'SHOULD')
  } else {
    ok('dimension save fanout', `${logMetrics.dimensionSaveCount} dimensions`)
  }

  if (logMetrics.distantHorizonsIncompleteTasks > 25) {
    fail('Distant Horizons shutdown backlog hard limit', `${logMetrics.distantHorizonsIncompleteTasks} incomplete tasks`)
  } else if (logMetrics.distantHorizonsIncompleteTasks > 5) {
    finding('Distant Horizons shutdown backlog', `${logMetrics.distantHorizonsIncompleteTasks} incomplete tasks`, 'SHOULD')
  } else {
    ok('Distant Horizons shutdown backlog', `${logMetrics.distantHorizonsIncompleteTasks} incomplete tasks`)
  }

  if (logMetrics.emiTotalReloadMs != null) {
    logMetrics.emiTotalReloadMs > 90000
      ? finding('EMI reload is very slow', `${logMetrics.emiTotalReloadMs} ms`, 'SHOULD')
      : ok('EMI reload budget', `${logMetrics.emiTotalReloadMs} ms <= 90000 ms`)
  }

  if (!hardLogScan.ok) {
    fail('hard engine log failure scan', hardLogScan.findings.map(f => `${f.key}:${f.count}`).join(', '))
  } else if (logMetrics.kubejsRecipeParseErrors > 0 || logMetrics.kubejsFailedRecipeCount > 0) {
    fail('KubeJS recipe parse health', `${logMetrics.kubejsRecipeParseErrors} parse errors, ${logMetrics.kubejsFailedRecipeCount} failed recipes`)
  } else {
    ok('KubeJS recipe parse health', '0 parse errors, 0 failed recipes')
  }

  if (logMetrics.newestCrashReportAfterLatestLog) {
    fail('no crash report newer than latest engine log', logMetrics.newestCrashReport)
  } else if (newestCrash && (Date.now() - newestCrash.mtimeMs) < 24 * 60 * 60 * 1000) {
    finding('recent crash report exists', logMetrics.newestCrashReport, 'SHOULD')
  } else {
    ok('no newer crash report than latest engine log')
  }
}

function testDevDumpHealth() {
  const auditPath = path.join(repo, 'kubejs/server_scripts/90_dev_debug/10_recipe_audit_dumps.js')
  const text = exists(auditPath) ? read(auditPath) : ''
  if (!text) return fail('dev recipe dump script exists', rel(auditPath))
  for (const needle of ['full_recipe_index_manifest.json', 'known_bypass_candidate_recipes.json', 'valuable_material_usage_recipes.json', 'progression_recipe_mentions.json']) {
    if (!text.includes(needle)) fail('dev dump script emits expected artifact', needle)
  }
  ok('dev dump script emits expected artifacts')

  const foodAuditPath = path.join(repo, 'kubejs/server_scripts/90_dev_debug/20_food_effect_audit_dumps.js')
  const foodText = exists(foodAuditPath) ? read(foodAuditPath) : ''
  if (!foodText) return fail('dev food effect dump script exists', rel(foodAuditPath))
  for (const needle of ['food_effect_index.json', 'food_effect_summary.json', 'FoodProperties']) {
    if (!foodText.includes(needle)) fail('dev food effect dump script emits expected artifact', needle)
  }
  ok('dev food effect dump script emits expected artifacts')

  const foodGraphTool = path.join(repo, 'tools/analyze_food_effect_graph.mjs')
  const foodGraphText = exists(foodGraphTool) ? read(foodGraphTool) : ''
  if (!foodGraphText) return fail('food effect graph analyzer exists', rel(foodGraphTool))
  for (const needle of ['food_effect_progression_candidates.json', 'Food Effect Graph Audit', 'combat_supply', 'route_survival']) {
    if (!foodGraphText.includes(needle)) fail('food effect graph analyzer emits expected artifact', needle)
  }
  ok('food effect graph analyzer emits expected artifacts')
}

function testChemistryIdentity() {
  const result = spawnSync('node', ['tools/validate_chemistry_identity.mjs'], {
    cwd: repo,
    encoding: 'utf8'
  })
  if (result.status === 0) ok('chemistry identity matrix validates', result.stdout.trim())
  else fail('chemistry identity matrix validates', (result.stdout + result.stderr).trim())
}

function testKubejsAssets() {
  const result = spawnSync('node', ['tools/validate_kubejs_assets.mjs'], {
    cwd: repo,
    encoding: 'utf8'
  })
  if (result.status === 0) ok('KubeJS custom assets validate', result.stdout.trim())
  else fail('KubeJS custom assets validate', (result.stdout + result.stderr).trim())
}

function testPackContract() {
  const result = spawnSync('node', ['tools/validate_pack_contract.mjs'], {
    cwd: repo,
    encoding: 'utf8'
  })
  if (result.status === 0) ok('pack contract validates', (result.stdout + result.stderr).trim())
  else fail('pack contract validates', (result.stdout + result.stderr).trim())
}

function testContractCompleteness() {
  const result = spawnSync('node', ['tools/contract_completeness_report.mjs', '--check', '--no-write'], {
    cwd: repo,
    encoding: 'utf8'
  })
  if (result.status === 0) ok('contract completeness is classified', (result.stdout + result.stderr).trim())
  else fail('contract completeness is classified', (result.stdout + result.stderr).trim())
}

function testAutonomousContracts() {
  const result = spawnSync('node', ['tools/validate_autonomous_contracts.mjs'], {
    cwd: repo,
    encoding: 'utf8'
  })
  if (result.status === 0) ok('autonomous contract validators pass', (result.stdout + result.stderr).trim())
  else fail('autonomous contract validators pass', (result.stdout + result.stderr).trim())
}

runMeasured('JSON and JS syntax validation', testJsonAndSyntax)
runMeasured('critical progression surfaces', testCriticalSurfaces)
runMeasured('pack contract validation', testPackContract)
runMeasured('contract completeness classification', testContractCompleteness)
runMeasured('autonomous contract validation', testAutonomousContracts)
runMeasured('quest book validation', testQuestBook)
runMeasured('Wares and villager trade validation', testWaresAndTrades)
runMeasured('repo loot data validation', testLootData)
runMeasured('generated recipe graph validation', testGeneratedRecipeGraph)
runMeasured('generated loot dump validation', testGeneratedDumpLoot)
runMeasured('engine and world performance log analysis', testEngineWorldPerformanceLogs)
runMeasured('KubeJS asset validation', testKubejsAssets)
runMeasured('chemistry identity validation', testChemistryIdentity)
runMeasured('dev dump health validation', testDevDumpHealth)

metrics.performance = {
  budgetsMs: Object.fromEntries(Object.entries(performanceBudgetsMs).map(([name, budget]) => [name, budget.budget])),
  hardLimitsMs: Object.fromEntries(Object.entries(performanceBudgetsMs).map(([name, budget]) => [name, budget.hard])),
  results: performanceResults
}

const summary = {
  generatedAt: new Date().toISOString(),
  repo,
  instance,
  explicitInstance,
  strictRuntime,
  strictDataDumps,
  runtimeEvidenceClaim: strictRuntime ? 'strict-runtime' : 'opportunistic-runtime',
  dataDumpEvidenceClaim: strictDataDumps ? 'strict-vanilla-dump' : 'opportunistic-vanilla-dump',
  dataDumpEvidenceScope: 'vanilla /dump output under dump/data_raw, separate from KubeJS audit dumps under kubejs/config',
  passes: passes.length,
  hardFailures: hardFailures.length,
  softFindings: softFindings.length,
  skips: skips.length,
  metrics
}

const report = `# Automated Pack Test Report

Generated: ${summary.generatedAt}

Repo: \`${repo}\`

Instance: \`${instance}\`

Runtime evidence mode: \`${strictRuntime ? 'strict' : 'opportunistic'}\`

Data dump evidence mode: \`${strictDataDumps ? 'strict' : 'opportunistic'}\`

Data dump evidence scope: vanilla \`/dump\` output under \`dump/data_raw\`, separate from KubeJS audit dumps under \`kubejs/config\`

Explicit instance: \`${explicitInstance ? 'yes' : 'no'}\`

## Result

${table([
  ['Class', 'Count'],
  ['Passes', passes.length],
  ['Hard failures', hardFailures.length],
  ['Soft findings', softFindings.length],
  ['Skipped', skips.length]
])}
## Hard Failures

${table([['Test', 'Detail'], ...hardFailures.map(f => [f.name, f.detail])])}
## Soft Findings

${table([['Rank', 'Test', 'Detail'], ...softFindings.map(f => [f.severity, f.name, f.detail])])}
## Passes

${table([['Test', 'Detail'], ...passes.map(p => [p.name, p.detail])])}
## Skipped

${table([['Test', 'Detail'], ...skips.map(s => [s.name, s.detail])])}
## Metrics

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`
`

const reportPath = path.join(reportDir, 'automated_test_report.md')
const summaryPath = path.join(reportDir, 'automated_test_summary.json')
fs.writeFileSync(reportPath, report)
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n')

if (hardFailures.length) {
  console.error(`\n${hardFailures.length} hard failure(s). See ${path.relative(repo, reportPath)}`)
  process.exit(1)
}
console.log(`\npack test suite passed with ${softFindings.length} soft finding(s). See ${path.relative(repo, reportPath)}`)
