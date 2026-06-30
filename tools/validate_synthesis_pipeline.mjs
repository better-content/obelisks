#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const failures = []
function fail(message) { failures.push(message) }
function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8') }
function exists(rel) { return fs.existsSync(path.join(repo, rel)) }

const coreFiles = [
  'kubejs/server_scripts/40_recipe_add/55_realistic_ores_identity_outputs.js',
  'kubejs/server_scripts/40_recipe_add/56_alchemistry_dissolver_create_port.js',
  'kubejs/config/alchemistry_dissolver_port.json',
  'kubejs/server_scripts/40_recipe_add/58_create_pncr_molecular_synthesis.js',
  'kubejs/server_scripts/40_recipe_add/59_formulaic_synthesis_magic_routes.js',
  'kubejs/server_scripts/30_recipe_replace/95_acid_and_nether_grout_unification.js',
  'kubejs/server_scripts/30_recipe_replace/140_latent_chemlib_power_gates.js',
  'kubejs/data/latent_chemlib/reaction_rules/default.json',
  'kubejs/data/latent_chemlib/material_coefficients/default.json',
  'kubejs/data/latent_chemlib/nuclear_decay/default.json',
  'kubejs/data/latent_chemlib/scheduler_profiles/default.json'
]

for (const file of coreFiles) {
  if (!exists(file)) fail(`missing synthesis pipeline file: ${file}`)
}

const startupItemsFile = 'kubejs/startup_scripts/10_items_blocks/30_progression_items.js'
const gasItemInputs = new Set([
  'chemlib:acetylene', 'chemlib:ammonia', 'chemlib:ammonium', 'chemlib:argon',
  'chemlib:butane', 'chemlib:carbon_dioxide', 'chemlib:carbon_monoxide',
  'chemlib:chlorine', 'chemlib:ethane', 'chemlib:ethylene', 'chemlib:fluorine',
  'chemlib:helium', 'chemlib:hexane', 'chemlib:hydrogen', 'chemlib:hydrogen_sulfide',
  'chemlib:krypton', 'chemlib:methane', 'chemlib:neon', 'chemlib:nitric_oxide',
  'chemlib:nitrogen', 'chemlib:nitrogen_dioxide', 'chemlib:oxygen',
  'chemlib:pentane', 'chemlib:propane', 'chemlib:radon',
  'chemlib:sulfur_dioxide', 'chemlib:sulfur_trioxide', 'chemlib:xenon'
])

if (exists(coreFiles[0])) {
  const text = read(coreFiles[0])
  for (const loop of [
    'for (var d = 0; d < BTM_RO_DEPOSITS.length; d++)',
    'for (var s = 0; s < BTM_RO_SOLVENTS.length; s++)',
    'for (var b = 0; b < BTM_RO_BALLS.length; b++)'
  ]) {
    if (!text.includes(loop)) fail(`ore acid/ball matrix loop missing: ${loop}`)
  }
  for (const solvent of ['ethanol', 'acetic', 'sulfuric', 'hydrochloric', 'nitric', 'phosphoric']) {
    if (!text.includes(`id: '${solvent}'`)) fail(`ore solvent missing: ${solvent}`)
  }
  for (const ball of ['andesite', 'iron', 'brass', 'steel', 'nickel', 'titanium', 'blood_infused', 'fluix']) {
    if (!text.includes(`id: '${ball}'`)) fail(`grinding ball missing: ${ball}`)
  }
  for (const exported of ['global.BTM_RO_SOLVENTS', 'global.BTM_RO_BALLS', 'global.BTM_RO_DEPOSITS']) {
    if (!text.includes(exported)) fail(`realistic ore table export missing: ${exported}`)
  }
  for (const needle of ['BTM_RO_SOLVENT_GAS_PRODUCTS', 'btmRoAddGasSideProducts', 'chemlib:nitrogen_dioxide']) {
    if (!text.includes(needle)) fail(`ore solvent gas side-product marker missing: ${needle}`)
  }
}

if (exists(coreFiles[1])) {
  const text = read(coreFiles[1])
  for (const needle of [
    'JsonIO.read',
    'create:mixing',
    'btmAdpRetention',
    'btmAdpAddGasSideProduct',
    'kubejs:alchemistry_dissolver_port/'
  ]) {
    if (!text.includes(needle)) fail(`Alchemistry dissolver Create port script missing ${needle}`)
  }
}

if (exists(coreFiles[2])) {
  const table = JSON.parse(read(coreFiles[2]))
  const recipes = table.recipes || []
  if (recipes.length < 1000) fail(`Alchemistry dissolver Create port too sparse: ${recipes.length}`)
  for (const acid of ['acetic', 'sulfuric', 'hydrochloric', 'nitric', 'phosphoric']) {
    if (!recipes.some(recipe => recipe.acid === acid)) fail(`Alchemistry dissolver Create port missing acid family: ${acid}`)
  }
  for (const ball of ['andesite', 'iron', 'brass', 'steel', 'titanium']) {
    if (!recipes.some(recipe => recipe.ball === ball)) fail(`Alchemistry dissolver Create port missing grinding ball family: ${ball}`)
  }
  for (const recipe of recipes) {
    if (!recipe.input || (!recipe.input.item && !recipe.input.tag)) fail(`Alchemistry dissolver port recipe has no input: ${recipe.id}`)
    if (recipe.input && gasItemInputs.has(recipe.input.item)) fail(`Alchemistry dissolver port uses loose gas item input: ${recipe.id} ${recipe.input.item}`)
    if (!Array.isArray(recipe.results) || recipe.results.length === 0) fail(`Alchemistry dissolver port recipe has no outputs: ${recipe.id}`)
    for (const result of recipe.results || []) {
      if (!result.item || result.item === 'minecraft:air' || result.item.startsWith('alchemistry:')) {
        fail(`Alchemistry dissolver port has invalid output in ${recipe.id}: ${result.item}`)
      }
    }
  }
}

if (exists('mods/alchemistry.pw.toml') || exists('mods/alchemylib.pw.toml')) {
  fail('Alchemistry/AlchemyLib packwiz entries must stay removed; dissolver parity is provided by Create mixing')
}
if (exists('index.toml')) {
  const index = read('index.toml')
  if (index.includes('mods/alchemistry.pw.toml') || index.includes('mods/alchemylib.pw.toml')) {
    fail('index.toml still references Alchemistry/AlchemyLib')
  }
}

if (exists(coreFiles[3])) {
  const text = read(coreFiles[3])
  if (!text.includes("var BTM_CHEM_SEALED_CELL = 'latent_chemlib:sealed_chemical_cell'")) {
    fail('molecular synthesis does not define sealed-cell gas bridge')
  }
  for (const looseGas of [
    "{ item: 'chemlib:oxygen' }",
    "{ item: 'chemlib:hydrogen' }",
    "{ item: 'chemlib:chlorine' }",
    "{ item: 'chemlib:nitrogen_dioxide' }",
    "{ item: 'chemlib:sulfur_trioxide' }",
    "{ item: 'chemlib:ethylene' }"
  ]) {
    if (text.includes(looseGas)) fail(`late molecular synthesis still has loose gas item input: ${looseGas}`)
  }
  for (const molecule of ['hydrogen_sulfide', 'nitric_oxide', 'ammonium_chloride', 'diammonium_phosphate', 'arsenic_sulfide', 'mercury_sulfide', 'iron_ii_oxide']) {
    if (!text.includes(`'${molecule}'`)) fail(`special molecular route missing: ${molecule}`)
  }
  for (const route of [
    'ethanol_from_sugar',
    'acetic_acid_from_ethanol',
    'sulfur_dioxide',
    'sulfur_trioxide',
    'sulfuric_acid_from_sulfur_trioxide',
    'hydrochloric_acid_from_chlorine',
    'nitric_oxide',
    'nitrogen_dioxide',
    'nitric_acid_from_nitrogen_dioxide',
    'phosphoric_acid_fluid'
  ]) {
    if (!text.includes(`'${route}'`)) fail(`acid progression route missing: ${route}`)
  }
}

if (exists(coreFiles[4])) {
  const text = read(coreFiles[4])
  for (const needle of [
    'BTM_SYN_ELEMENTS',
    'BTM_SYN_FAMILIES',
    'BTM_SYN_COMPOUND_ALIASES',
    'BTM_SYN_SIDE_GASES',
    'btmSynBloodAlchemy',
    'btmSynBloodArc',
    'btmSynArsImbuement',
    'bloodmagic:alchemytable',
    'bloodmagic:arc',
    'addedoutput',
    'ars_nouveau:imbuement',
    'pneumaticcraft:thermo_plant',
    'create:mixing'
  ]) {
    if (!text.includes(needle)) fail(`formulaic synthesis/magic route missing ${needle}`)
  }
  if (text.includes("type: 'pneumaticcraft:pressure_chamber'")) {
    fail('formulaic PNCR synthesis must not bypass acid fluids with pressure chamber item-only recipes')
  }
  if (text.includes('lower-throughput alternatives')) {
    fail('Blood Magic synthesis is still documented as a lower-throughput tech substitute')
  }
  for (const needle of [
    'var outputCount = typeof output ===',
    'if (outputCount > 1) result.count = outputCount',
    'BTM_SYN_MAGIC_CUTTING_FLUIDS',
    'sanguine_acetic_cutting_fluid',
    'sanguine_sulfuric_cutting_fluid',
    'sanguine_hydrochloric_cutting_fluid',
    'sanguine_nitric_cutting_fluid',
    'sanguine_phosphoric_cutting_fluid',
    'chemlib:carbon_dioxide',
    'chemlib:sulfur_dioxide',
    'chemlib:nitrogen_dioxide',
    'chemlib:hydrogen_sulfide',
    "{ item: elementId, count: 4 }",
    "{ item: dep.primary, count: 4 }",
    "{ item: dep.trace, count: 2 }",
    "{ item: dep.hard, count: 2 }",
    "{ item: dep.rare, count: 2 }"
  ]) {
    if (!text.includes(needle)) fail(`manual high-yield Blood Magic synthesis marker missing: ${needle}`)
  }
  for (const element of ['beryllium', 'tungsten', 'uranium', 'thorium', 'platinum', 'palladium']) {
    if (!text.includes(`'${element}'`)) fail(`formulaic synthesis element missing hard-material identity: ${element}`)
  }
}

if (exists(startupItemsFile)) {
  const text = read(startupItemsFile)
  for (const needle of [
    "['sanguine_acetic_cutting_fluid', 'Sanguine Acetic Cutting Fluid', 64]",
    "['sanguine_sulfuric_cutting_fluid', 'Sanguine Sulfuric Cutting Fluid', 256]",
    "['sanguine_hydrochloric_cutting_fluid', 'Sanguine Hydrochloric Cutting Fluid', 256]",
    "['sanguine_nitric_cutting_fluid', 'Sanguine Nitric Cutting Fluid', 1024]",
    "['sanguine_phosphoric_cutting_fluid', 'Sanguine Phosphoric Cutting Fluid', 1024]",
    '.maxDamage(magicCuttingFluids[m][2])'
  ]) {
    if (!text.includes(needle)) fail(`magic acid cutting fluid durability marker missing: ${needle}`)
  }
} else {
  fail(`missing synthesis startup item file: ${startupItemsFile}`)
}

if (exists(coreFiles[5])) {
  const text = read(coreFiles[5])
  for (const needle of [
    "event.remove({ id: 'powergrid:mixing/acid' })",
    "event.remove({ output: Fluid.of('powergrid:acid', 1) })",
    "id('kubejs:powergrid/sequenced_assembly/battery_sulfuric')",
    "fluid: 'chemlib:sulfuric_acid_fluid'",
    "id('kubejs:powergrid/mixing/etched_circuit_board_hydrochloric')",
    "fluid: 'chemlib:hydrochloric_acid_fluid'"
  ]) {
    if (!text.includes(needle)) fail(`Power Grid acid contextual replacement missing: ${needle}`)
  }
  if (text.includes("replaceOutput({}, Fluid.of('powergrid:acid'")) {
    fail('Power Grid acid must not be blanket-replaced as one universal ChemLib acid')
  }
}

if (exists(coreFiles[6])) {
  const text = read(coreFiles[6])
  if (!text.includes('latent_chemlib:sealed_chemical_cell') || (!text.includes('global.btmFactoryCrafting(') && !text.includes("result: { item: 'latent_chemlib:sealed_chemical_cell'"))) {
    fail('sealed chemical cell recipe is missing from Latent ChemLib gates')
  }
}

if (exists(coreFiles[7])) {
  const rules = JSON.parse(read(coreFiles[7]))
  const list = Array.isArray(rules) ? rules : rules.rules
  if (!Array.isArray(list) || list.length < 20) fail('latent reaction rules must define a usable fusion/capture traversal spine')
  const ids = new Set((list || []).map(rule => rule.id))
  if (ids.size !== (list || []).length) fail('latent reaction rules contain duplicate IDs')
  const fusion = (list || []).filter(rule => rule.id && rule.id.includes(':fusion/')).length
  const capture = (list || []).filter(rule => rule.id && rule.id.includes(':capture/')).length
  if (list.length > 240) fail(`latent reaction rules exceed tick-budget cap: ${list.length}`)
  if (fusion < 50) fail(`latent fusion rules too sparse: ${fusion}`)
  if (capture < 117) fail(`latent capture rules do not span the periodic table: ${capture}`)
  if ((list || []).some(rule => rule.id && rule.id.includes(':decay/'))) {
    fail('latent nuclear decay must live in nuclear_decay data, not generic reaction rules')
  }
  if (!list.some(rule => rule.id === 'latent_chemlib:fusion/hydrogen_to_helium')) {
    fail('latent fusion rules must preserve hydrogen to helium as the light-element fusion entry')
  }
  for (const rule of list || []) {
    for (const key of ['id', 'input_chemical', 'min_mass', 'output_mass_ratio']) {
      if (!(key in rule)) fail(`reaction rule missing ${key}: ${JSON.stringify(rule)}`)
    }
  }
}

if (exists(coreFiles[9])) {
  const decayRules = JSON.parse(read(coreFiles[9]))
  const list = Array.isArray(decayRules) ? decayRules : decayRules.rules
  if (!Array.isArray(list) || list.length < 30) fail('latent nuclear decay rules must define a heavy-element half-life table')
  const ids = new Set((list || []).map(rule => rule.id))
  if (ids.size !== (list || []).length) fail('latent nuclear decay rules contain duplicate IDs')
  for (const rule of list || []) {
    for (const key of ['id', 'input_chemical', 'output_chemical', 'isotope', 'half_life_seconds', 'output_mass_ratio']) {
      if (!(key in rule)) fail(`nuclear decay rule missing ${key}: ${JSON.stringify(rule)}`)
    }
    if (!(rule.half_life_seconds > 0)) fail(`nuclear decay rule has invalid half-life: ${rule.id}`)
    if (!(rule.output_mass_ratio > 0 && rule.output_mass_ratio <= 1)) fail(`nuclear decay rule has invalid mass ratio: ${rule.id}`)
  }
  if (!list.some(rule => rule.id === 'latent_chemlib:nuclear_decay/oganesson_to_livermorium' && rule.half_life_seconds <= 0.001)) {
    fail('nuclear decay table must preserve near-immediate Og-294 decay')
  }
  if (!list.some(rule => rule.id === 'latent_chemlib:nuclear_decay/uranium_to_thorium' && rule.half_life_seconds > 1.0e17)) {
    fail('nuclear decay table must preserve real U-238 geological half-life scale')
  }
}

if (exists(coreFiles[10])) {
  const profile = JSON.parse(read(coreFiles[10]))
  for (const key of [
    'cloud_updates_per_second',
    'neighbor_ops_per_second',
    'escape_scans_per_second',
    'nuclear_surface_scans_per_second',
    'nuclear_stack_evaluations_per_second',
    'nuclear_state_evaluations_per_second',
    'nuclear_mutations_per_second',
    'nuclear_radiation_emissions_per_second',
    'nuclear_heat_emissions_per_second'
  ]) {
    if (!(Number.isInteger(profile[key]) && profile[key] > 0)) fail(`scheduler profile missing positive integer ${key}`)
  }
}

if (exists(coreFiles[8])) {
  const coeffs = JSON.parse(read(coreFiles[8]))
  for (const key of ['moderators', 'absorbers', 'containment']) {
    if (!Array.isArray(coeffs[key]) || coeffs[key].length === 0) fail(`material coefficient group missing or empty: ${key}`)
  }
}

if (failures.length) {
  console.error(failures.map(f => `FAIL - ${f}`).join('\n'))
  process.exit(1)
}

console.log('ok - synthesis pipeline validates')
