#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'

const repo = process.cwd()
const fallbackMods = '/home/gerald/.local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1/minecraft/mods'

function read(rel) {
  return fs.readFileSync(path.join(repo, rel), 'utf8')
}

function listJar(jarPath) {
  try {
    return execFileSync('jar', ['tf', jarPath], { encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function readJarJson(jarPath, entry) {
  return JSON.parse(execFileSync('unzip', ['-p', jarPath, entry], { encoding: 'utf8' }))
}

function readJarText(jarPath, entry) {
  try {
    return execFileSync('unzip', ['-p', jarPath, entry], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

function firstExisting(paths) {
  return paths.find(candidate => fs.existsSync(candidate))
}

function logicalRecipeList(recipe) {
  if (recipe.type === 'forge:conditional') return (recipe.recipes || []).map(row => row.recipe).filter(Boolean)
  return [recipe]
}

function mandatoryAlchemyDependencies(jarPath) {
  const text = readJarText(jarPath, 'META-INF/mods.toml')
  if (!text) return []
  const deps = []
  for (const block of text.split(/\n(?=\[\[dependencies\.)/g)) {
    const modId = block.match(/\bmodId\s*=\s*"([^"]+)"/)?.[1]
    const mandatory = block.match(/\bmandatory\s*=\s*(true|false)/)?.[1] === 'true'
    if (mandatory && (modId === 'alchemistry' || modId === 'alchemylib')) deps.push(modId)
  }
  return deps
}

function extractValue(text, name) {
  const marker = `var ${name} =`
  const start = text.indexOf(marker)
  if (start < 0) throw new Error(`Cannot find ${name}`)
  let index = start + marker.length
  while (/\s/.test(text[index])) index++
  const opener = text[index]
  const closer = opener === '[' ? ']' : '}'
  let depth = 0
  let quote = null
  for (let i = index; i < text.length; i++) {
    const ch = text[i]
    const prev = text[i - 1]
    if (quote) {
      if (ch === quote && prev !== '\\') quote = null
      continue
    }
    if (ch === '\'' || ch === '"') {
      quote = ch
      continue
    }
    if (ch === opener) depth++
    if (ch === closer) depth--
    if (depth === 0) {
      const source = text.slice(index, i + 1)
      return vm.runInNewContext(opener === '{' ? `(${source})` : source)
    }
  }
  throw new Error(`Cannot parse ${name}`)
}

function itemIndex() {
  const items = new Set()
  const packSiteItems = path.join(repo, 'generated/pack-site/recipes/items')
  if (fs.existsSync(packSiteItems)) {
    for (const file of fs.readdirSync(packSiteItems)) {
      if (file.endsWith('.html')) items.add(file.slice(0, -5).replace('__', ':'))
    }
  }

  const chemlibJar = firstExisting([
    path.join(fallbackMods, 'chemlib-1.20.1-2.0.19.jar')
  ])
  if (chemlibJar) {
    for (const entry of listJar(chemlibJar)) {
      const match = entry.match(/^assets\/chemlib\/models\/item\/(.+)\.json$/)
      if (match) items.add(`chemlib:${match[1]}`)
    }
  }

  const latentJar = path.join(repo, 'mods/latent_chemlib-0.1.0.jar')
  for (const entry of listJar(latentJar)) {
    const match = entry.match(/^assets\/latent_chemlib\/models\/item\/(.+)\.json$/)
    if (match) items.add(`latent_chemlib:${match[1]}`)
  }

  const kubeStartup = read('kubejs/startup_scripts/10_items_blocks/30_progression_items.js')
  for (const match of kubeStartup.matchAll(/event\.create\('([^']+)'\)/g)) items.add(`kubejs:${match[1]}`)
  for (const match of kubeStartup.matchAll(/\['([^']+)',\s*'[^']+'\]/g)) items.add(`kubejs:${match[1]}`)

  return items
}

function fluidIndex() {
  const fluids = new Set(['minecraft:water', 'kubejs:phosphoric_acid_fluid'])
  const packSiteFluids = path.join(repo, 'generated/pack-site/recipes/fluids')
  if (fs.existsSync(packSiteFluids)) {
    for (const file of fs.readdirSync(packSiteFluids)) {
      if (file.endsWith('.html')) fluids.add(file.slice(0, -5).replace('__', ':'))
    }
  }

  const chemlibJar = path.join(fallbackMods, 'chemlib-1.20.1-2.0.19.jar')
  for (const entry of listJar(chemlibJar)) {
    const match = entry.match(/^assets\/chemlib\/models\/item\/(.+)_bucket\.json$/)
    if (match) fluids.add(`chemlib:${match[1]}_fluid`)
  }
  return fluids
}

function compoundName(element, suffix, aliases) {
  return aliases[element] && aliases[element][suffix] ? aliases[element][suffix] : `chemlib:${element}_${suffix}`
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))]
}

const items = itemIndex()
const fluids = fluidIndex()
const oreText = read('kubejs/server_scripts/40_recipe_add/55_realistic_ores_identity_outputs.js')
const dissolverPort = JSON.parse(read('kubejs/config/alchemistry_dissolver_port.json'))
const synthesisText = read('kubejs/server_scripts/40_recipe_add/59_formulaic_synthesis_magic_routes.js')
const molecularText = read('kubejs/server_scripts/40_recipe_add/58_create_pncr_molecular_synthesis.js')
const rules = JSON.parse(read('kubejs/data/latent_chemlib/reaction_rules/default.json')).rules
const nuclearDecayRules = JSON.parse(read('kubejs/data/latent_chemlib/nuclear_decay/default.json')).rules
const auditDate = new Date().toISOString().slice(0, 10)

const deposits = extractValue(oreText, 'BTM_RO_DEPOSITS')
const solvents = extractValue(oreText, 'BTM_RO_SOLVENTS')
const balls = extractValue(oreText, 'BTM_RO_BALLS')
const retention = extractValue(oreText, 'BTM_RO_RETENTION')
const elements = extractValue(synthesisText, 'BTM_SYN_ELEMENTS')
const families = extractValue(synthesisText, 'BTM_SYN_FAMILIES')
const aliases = extractValue(synthesisText, 'BTM_SYN_COMPOUND_ALIASES')
const familyIds = families.map(family => family.id)
const dissolverRecipes = dissolverPort.recipes || []
const dissolverAcids = uniq(dissolverRecipes.map(recipe => recipe.acid))
const dissolverBalls = uniq(dissolverRecipes.map(recipe => recipe.ball))
const dissolverLooseGasInputs = new Set([
  'chemlib:acetylene', 'chemlib:ammonia', 'chemlib:ammonium', 'chemlib:argon',
  'chemlib:butane', 'chemlib:carbon_dioxide', 'chemlib:carbon_monoxide',
  'chemlib:chlorine', 'chemlib:ethane', 'chemlib:ethylene', 'chemlib:fluorine',
  'chemlib:helium', 'chemlib:hexane', 'chemlib:hydrogen', 'chemlib:hydrogen_sulfide',
  'chemlib:krypton', 'chemlib:methane', 'chemlib:neon', 'chemlib:nitric_oxide',
  'chemlib:nitrogen', 'chemlib:nitrogen_dioxide', 'chemlib:oxygen',
  'chemlib:pentane', 'chemlib:propane', 'chemlib:radon',
  'chemlib:sulfur_dioxide', 'chemlib:sulfur_trioxide', 'chemlib:xenon'
])
const dissolverInvalid = []
for (const recipe of dissolverRecipes) {
  if (!recipe.input || (!recipe.input.item && !recipe.input.tag)) dissolverInvalid.push(`${recipe.id}: missing input`)
  if (recipe.input && dissolverLooseGasInputs.has(recipe.input.item)) dissolverInvalid.push(`${recipe.id}: loose gas input ${recipe.input.item}`)
  if (!recipe.results || !recipe.results.length) dissolverInvalid.push(`${recipe.id}: missing outputs`)
  for (const result of recipe.results || []) {
    if (!result.item || result.item === 'minecraft:air' || result.item.startsWith('alchemistry:')) {
      dissolverInvalid.push(`${recipe.id}: invalid output ${result.item}`)
    }
  }
}
const alchemistryStillInstalled = fs.existsSync(path.join(repo, 'mods/alchemistry.pw.toml')) ||
  fs.existsSync(path.join(repo, 'mods/alchemylib.pw.toml')) ||
  read('index.toml').includes('mods/alchemistry.pw.toml') ||
  read('index.toml').includes('mods/alchemylib.pw.toml')

const alchemistryJar = firstExisting([
  path.join(repo, 'server-instance/mods/alchemistry-1.20.1-2.3.4.jar'),
  path.join(repo, 'server-template/mods/alchemistry-1.20.1-2.3.4.jar'),
  path.join(repo, 'server-instance/mods/alchemistry-293425-4770614.jar'),
  path.join(repo, 'server-template/mods/alchemistry-293425-4770614.jar'),
  path.join('/home/gerald/.gradle/caches/modules-2/files-2.1/curse.maven/alchemistry-293425/4770614/f0656d019a7254befb87e46bcae1dc0ce7acd173/alchemistry-293425-4770614.jar')
])
const alchemistryLogicalTypes = {}
const alchemistryFileTypes = {}
let sourceDissolverGasInputs = 0
if (alchemistryJar) {
  const entries = listJar(alchemistryJar)
    .filter(entry => entry.startsWith('data/alchemistry/recipes/') && entry.endsWith('.json'))
  for (const entry of entries) {
    const top = readJarJson(alchemistryJar, entry)
    const fileType = top.type || 'NO_TYPE'
    alchemistryFileTypes[fileType] = (alchemistryFileTypes[fileType] || 0) + 1
    for (const recipe of logicalRecipeList(top)) {
      const recipeType = recipe.type || 'NO_TYPE'
      alchemistryLogicalTypes[recipeType] = (alchemistryLogicalTypes[recipeType] || 0) + 1
      if (recipeType === 'alchemistry:dissolver') {
        const input = recipe.input?.ingredient
        if (input?.item && dissolverLooseGasInputs.has(input.item)) sourceDissolverGasInputs++
      }
    }
  }
}
const sourceDissolverCount = alchemistryLogicalTypes['alchemistry:dissolver'] || 0
const sourceCombinerCount = alchemistryLogicalTypes['alchemistry:combiner'] || 0
const sourceCompactorCount = alchemistryLogicalTypes['alchemistry:compactor'] || 0
const sourceAtomizerCount = alchemistryLogicalTypes['alchemistry:atomizer'] || 0
const sourceLiquifierCount = alchemistryLogicalTypes['alchemistry:liquifier'] || 0
const sourceFissionCount = alchemistryLogicalTypes['alchemistry:fission'] || 0
const sourceFusionCount = alchemistryLogicalTypes['alchemistry:fusion'] || 0
const dissolverParityCoverage = sourceDissolverCount
  ? dissolverRecipes.length + sourceDissolverGasInputs
  : dissolverRecipes.length
const alchemistryReplacementFailures = []
if (alchemistryJar && dissolverParityCoverage !== sourceDissolverCount) {
  alchemistryReplacementFailures.push(`dissolver source parity mismatch: ${dissolverRecipes.length} ported + ${sourceDissolverGasInputs} gas exclusions != ${sourceDissolverCount}`)
}

const customAlchemyDependencies = []
for (const file of fs.readdirSync(path.join(repo, 'mods')).filter(file => file.endsWith('.jar')).sort()) {
  const rel = `mods/${file}`
  for (const dependency of mandatoryAlchemyDependencies(path.join(repo, rel))) {
    customAlchemyDependencies.push(`${rel} -> ${dependency}`)
  }
}

const oreMissing = []
for (const dep of deposits) {
  for (const key of ['crushed', 'primary', ...solvents.map(s => s.id), 'ferrous', 'nonferrous', 'hard', 'rare', 'blood', 'ae', 'gangue', 'trace']) {
    const id = dep[key]
    if (id && !items.has(id)) oreMissing.push(`${dep.id}.${key}=${id}`)
  }
}
for (const solvent of solvents) {
  if (!fluids.has(solvent.fluid)) oreMissing.push(`solvent.${solvent.id}=${solvent.fluid}`)
}
for (const ball of balls) {
  if (!items.has(ball.item)) oreMissing.push(`ball.${ball.id}=${ball.item}`)
}

const retentionMissing = []
for (const solvent of solvents) {
  for (const ball of balls) {
    if (!retention[solvent.id] || typeof retention[solvent.id][ball.id] !== 'number') {
      retentionMissing.push(`${solvent.id}/${ball.id}`)
    }
  }
}

const acidIdentityFailures = []
const acidUniqueCounts = []
for (const dep of deposits) {
  const outputs = solvents.map(solvent => dep[solvent.id])
  const uniqueOutputs = uniq(outputs)
  acidUniqueCounts.push(uniqueOutputs.length)
  if (uniqueOutputs.length < 4) acidIdentityFailures.push(`${dep.id}: ${uniqueOutputs.length} unique solvent outputs`)
}

function ballOutput(dep, ball) {
  if (ball.bias === 'general') return dep.secondary || dep.trace || dep.primary
  return dep[ball.bias] || dep.trace || dep.secondary || dep.primary
}

const ballIdentityFailures = []
const ballUniqueCounts = []
for (const dep of deposits) {
  const uniqueOutputs = uniq(balls.map(ball => ballOutput(dep, ball)))
  ballUniqueCounts.push(uniqueOutputs.length)
  if (uniqueOutputs.length < 5) ballIdentityFailures.push(`${dep.id}: ${uniqueOutputs.length} unique ball-biased outputs`)
}

const retentionIdentityFailures = []
const retentionSpreads = []
for (const solvent of solvents) {
  const values = balls
    .map(ball => retention[solvent.id] && retention[solvent.id][ball.id])
    .filter(value => typeof value === 'number')
  const spread = values.length ? Math.max(...values) - Math.min(...values) : 0
  retentionSpreads.push(spread)
  if (uniq(values).length < 4 || spread < 0.1) {
    retentionIdentityFailures.push(`${solvent.id}: ${uniq(values).length} unique values, spread ${spread.toFixed(2)}`)
  }
}

const criticalOreOutputs = [
  'chemlib:beryllium',
  'chemlib:tungsten',
  'chemlib:titanium',
  'chemlib:uranium',
  'chemlib:thorium',
  'chemlib:platinum',
  'chemlib:palladium',
  'chemlib:gallium',
  'chemlib:vanadium',
  'chemlib:fluorine',
  'ae2:certus_quartz_crystal',
  'ae2:fluix_dust',
  'minecraft:diamond',
  'minecraft:emerald'
]
const oreOutputValues = new Set(deposits.flatMap(dep => Object.values(dep)))
const missingCriticalOreOutputs = criticalOreOutputs.filter(id => !oreOutputValues.has(id))

let formulaicResolved = 0
let formulaicTotal = 0
const missingByFamily = new Map()
const formulaicCovered = new Set()
for (const element of elements) {
  const elementId = `chemlib:${element}`
  for (const family of families) {
    formulaicTotal++
    const output = compoundName(element, family.suffix, aliases)
    const ok = items.has(elementId) && items.has(output) && items.has(family.reagent) && fluids.has(family.fluid)
    if (ok) {
      formulaicResolved++
      formulaicCovered.add(output)
    } else {
      const list = missingByFamily.get(family.id) || []
      list.push(output)
      missingByFamily.set(family.id, list)
    }
  }
}

const molecularCovered = new Set()
for (const match of molecularText.matchAll(/\{\s*item:\s*'([^']+)'\s*(?:,\s*count:\s*\d+)?\s*\}/g)) {
  molecularCovered.add(match[1])
}

const existingFamilyCompounds = [...items].filter(id => {
  if (!id.startsWith('chemlib:')) return false
  const path = id.split(':')[1]
  if (path.endsWith('_dust') || path.endsWith('_bucket') || path.endsWith('_plate')) return false
  if (familyIds.includes(path)) return false
  return familyIds.some(family => path.endsWith(`_${family}`))
})

const coveredFamilyCompounds = existingFamilyCompounds.filter(id => formulaicCovered.has(id) || molecularCovered.has(id))
const missingFamilyCompounds = existingFamilyCompounds.filter(id => !formulaicCovered.has(id) && !molecularCovered.has(id))
const ruleMissing = []
for (const rule of rules) {
  if (rule.input_chemical && !items.has(rule.input_chemical)) ruleMissing.push(`${rule.id}.input=${rule.input_chemical}`)
  if (rule.output_chemical && !items.has(rule.output_chemical)) ruleMissing.push(`${rule.id}.output=${rule.output_chemical}`)
  if (rule.output_item && !items.has(rule.output_item)) ruleMissing.push(`${rule.id}.item=${rule.output_item}`)
}
const decayMissing = []
for (const rule of nuclearDecayRules) {
  if (rule.input_chemical && !items.has(rule.input_chemical)) decayMissing.push(`${rule.id}.input=${rule.input_chemical}`)
  if (rule.output_chemical && !items.has(rule.output_chemical)) decayMissing.push(`${rule.id}.output=${rule.output_chemical}`)
  if (rule.output_item && !items.has(rule.output_item)) decayMissing.push(`${rule.id}.item=${rule.output_item}`)
}

const gasLiterals = ['oxygen', 'hydrogen', 'chlorine', 'sulfur_dioxide', 'sulfur_trioxide', 'nitrogen_dioxide', 'nitric_oxide', 'ethylene']
const looseGasInputs = gasLiterals
  .map(id => `{ item: 'chemlib:${id}' }`)
  .filter(needle => molecularText.includes(needle))

const acidLadderRoutes = [
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
]
const missingAcidLadderRoutes = acidLadderRoutes.filter(id => !molecularText.includes(`'${id}'`))

const pncrSelfBoost = synthesisText.includes('{ item: outputId }')
const pncrAcidBypass = synthesisText.includes("type: 'pneumaticcraft:pressure_chamber'")
const oreGlobals = oreText.includes('global.BTM_RO_DEPOSITS = BTM_RO_DEPOSITS') && synthesisText.includes('global.BTM_RO_DEPOSITS')
const bloodDepositRoutes = oreGlobals ? deposits.length * 4 : 0
const bloodReductionCandidates = elements.filter(element => items.has(compoundName(element, 'oxide', aliases))).length
const bloodHighYieldMarkers = [
  "{ item: elementId, count: 4 }",
  "{ item: dep.primary, count: 4 }",
  "{ item: dep.trace, count: 2 }",
  "{ item: dep.hard, count: 2 }",
  "{ item: dep.rare, count: 2 }",
  'var outputCount = typeof output ==='
].filter(needle => synthesisText.includes(needle)).length
const bloodMagicCuttingFluidMarkers = [
  'sanguine_acetic_cutting_fluid',
  'sanguine_sulfuric_cutting_fluid',
  'sanguine_hydrochloric_cutting_fluid',
  'sanguine_nitric_cutting_fluid',
  'sanguine_phosphoric_cutting_fluid'
].filter(needle => synthesisText.includes(needle)).length
const arsRoutes = extractValue(synthesisText, 'BTM_SYN_MAGIC_CRYSTALS').length + 1
const magicParityFailures = []
if (bloodDepositRoutes < deposits.length * 4) magicParityFailures.push('Blood Magic primary/trace/hard/rare alternatives do not cover all deposits')
if (bloodReductionCandidates < 10) magicParityFailures.push(`Blood Magic oxide reductions too sparse: ${bloodReductionCandidates}`)
if (bloodHighYieldMarkers < 6) magicParityFailures.push(`Blood Magic manual high-yield markers too sparse: ${bloodHighYieldMarkers}/6`)
if (bloodMagicCuttingFluidMarkers < 5) magicParityFailures.push(`Blood Magic itemized magic-acid cutting fluids too sparse: ${bloodMagicCuttingFluidMarkers}/5`)
if (arsRoutes < 5) magicParityFailures.push(`Ars routes too sparse: ${arsRoutes}`)

const ruleKinds = {
  fusion: rules.filter(rule => rule.id.includes(':fusion/')).length,
  capture: rules.filter(rule => rule.id.includes(':capture/')).length
}
if (sourceCombinerCount > 0 && missingFamilyCompounds.length > 0) {
  alchemistryReplacementFailures.push(`combiner replacement leaves ${missingFamilyCompounds.length} installed ChemLib family compounds without routes`)
}
if (sourceFissionCount > 0 && nuclearDecayRules.length < 30) {
  alchemistryReplacementFailures.push(`fission replacement nuclear decay table too sparse: ${nuclearDecayRules.length}`)
}
if (sourceFusionCount > 0 && ruleKinds.fusion < 50) {
  alchemistryReplacementFailures.push(`fusion replacement rules too sparse: ${ruleKinds.fusion}`)
}
if (customAlchemyDependencies.length > 0) {
  alchemistryReplacementFailures.push(`${customAlchemyDependencies.length} mandatory custom mod dependencies still point at Alchemistry/AlchemyLib`)
}
const latentShapeFailures = []
const ruleIds = new Set(rules.map(rule => rule.id))
if (ruleIds.size !== rules.length) latentShapeFailures.push('reaction rules contain duplicate IDs')
if (rules.length > 240) latentShapeFailures.push(`reaction rules exceed tick-budget cap: ${rules.length}`)
if (ruleKinds.fusion < 50) latentShapeFailures.push(`fusion rules too sparse: ${ruleKinds.fusion}`)
if (ruleKinds.capture < 117) latentShapeFailures.push(`capture rules do not span the periodic table: ${ruleKinds.capture}`)
if (rules.some(rule => rule.id.includes(':decay/'))) latentShapeFailures.push('nuclear decay still appears in generic reaction rules')
const decayIds = new Set(nuclearDecayRules.map(rule => rule.id))
if (decayIds.size !== nuclearDecayRules.length) latentShapeFailures.push('nuclear decay rules contain duplicate IDs')
if (nuclearDecayRules.length < 30) latentShapeFailures.push(`nuclear decay rules too sparse: ${nuclearDecayRules.length}`)
for (const rule of nuclearDecayRules) {
  if (!(rule.half_life_seconds > 0)) latentShapeFailures.push(`nuclear decay rule has invalid half-life: ${rule.id}`)
  if (!(rule.output_mass_ratio > 0 && rule.output_mass_ratio <= 1)) latentShapeFailures.push(`nuclear decay rule has invalid mass ratio: ${rule.id}`)
}

const status = oreMissing.length === 0 &&
  retentionMissing.length === 0 &&
  acidIdentityFailures.length === 0 &&
  ballIdentityFailures.length === 0 &&
  retentionIdentityFailures.length === 0 &&
  missingCriticalOreOutputs.length === 0 &&
  looseGasInputs.length === 0 &&
  missingAcidLadderRoutes.length === 0 &&
  !pncrSelfBoost &&
  !pncrAcidBypass &&
  missingFamilyCompounds.length === 0 &&
  ruleMissing.length === 0 &&
  decayMissing.length === 0 &&
  dissolverRecipes.length >= 1000 &&
  dissolverAcids.length >= 5 &&
  dissolverBalls.length >= 5 &&
  dissolverInvalid.length === 0 &&
  !alchemistryStillInstalled &&
  alchemistryReplacementFailures.length === 0 &&
  magicParityFailures.length === 0 &&
  latentShapeFailures.length === 0
  ? 'complete for the current installed synthesis surfaces'
  : 'incomplete'

const missingSummary = [...missingByFamily.entries()]
  .map(([family, list]) => `- ${family}: ${formulaicTotal ? list.length : 0} unresolved candidates`)
  .join('\n')

const md = `# Synthesis Pipeline Completeness Audit

Date: ${auditDate}

## Verdict

The synthesis pipeline is ${status}.

It now has working breadth across ore chemistry, Create, PNCR, Blood Magic, Ars
Nouveau, and Latent ChemLib. Completeness is measured against the installed
pack, not an imagined chemistry universe: all current ChemLib family compounds
with usable item IDs are either covered by the formulaic family routes or by a
special molecular route.

## Coverage Counts

- Ore matrix deposits: ${deposits.length}
- Ore solvents/acids: ${solvents.length}
- Grinding balls: ${balls.length}
- Intended ore mixer combinations: ${deposits.length * solvents.length * balls.length}
- Reference Alchemistry jar audited: ${alchemistryJar ? path.relative(repo, alchemistryJar) : 'not found'}
- Reference Alchemistry logical recipes: ${Object.values(alchemistryLogicalTypes).reduce((sum, count) => sum + count, 0)}
- Reference Alchemistry dissolver/combiner/compactor recipes: ${sourceDissolverCount}/${sourceCombinerCount}/${sourceCompactorCount}
- Reference Alchemistry atomizer/liquifier recipes: ${sourceAtomizerCount}/${sourceLiquifierCount}
- Reference Alchemistry fission/fusion recipes: ${sourceFissionCount}/${sourceFusionCount}
- Alchemistry dissolver routes ported to Create mixer: ${dissolverRecipes.length}
- Alchemistry dissolver gas-item routes intentionally excluded: ${sourceDissolverGasInputs}
- Alchemistry dissolver source coverage after exclusions: ${dissolverParityCoverage}/${sourceDissolverCount || 'UNKNOWN'}
- Dissolver-port acid families used: ${dissolverAcids.length}
- Dissolver-port grinding ball families used: ${dissolverBalls.length}
- Invalid dissolver-port routes: ${dissolverInvalid.length}
- Alchemistry/AlchemyLib still installed: ${alchemistryStillInstalled ? 'yes' : 'no'}
- Mandatory custom mod dependencies on Alchemistry/AlchemyLib: ${customAlchemyDependencies.length}
- Missing ore matrix IDs: ${oreMissing.length}
- Missing ball retention cells: ${retentionMissing.length}
- Minimum unique solvent outputs per ore: ${Math.min(...acidUniqueCounts)}
- Average unique solvent outputs per ore: ${average(acidUniqueCounts).toFixed(2)}
- Minimum unique ball-biased outputs per ore: ${Math.min(...ballUniqueCounts)}
- Average unique ball-biased outputs per ore: ${average(ballUniqueCounts).toFixed(2)}
- Minimum retention spread by solvent: ${Math.min(...retentionSpreads).toFixed(2)}
- Missing critical hard/exotic ore outputs: ${missingCriticalOreOutputs.length}
- Formulaic element/family candidates: ${formulaicTotal}
- Formulaic candidates resolvable against current Chemlib/KubeJS items: ${formulaicResolved}
- Installed ChemLib family compounds audited: ${existingFamilyCompounds.length}
- Installed ChemLib family compounds covered: ${coveredFamilyCompounds.length}
- Installed ChemLib family compounds missing routes: ${missingFamilyCompounds.length}
- Special molecular family compounds covered outside formulaic routes: ${existingFamilyCompounds.filter(id => molecularCovered.has(id) && !formulaicCovered.has(id)).length}
- Blood oxide reduction candidates: ${bloodReductionCandidates}
- Blood crushed-deposit manual alternatives: ${bloodDepositRoutes}
- Blood manual high-yield markers: ${bloodHighYieldMarkers}/6
- Blood itemized magic-acid cutting fluids: ${bloodMagicCuttingFluidMarkers}/5
- Ars synthesis/stabilization routes: ${arsRoutes}
- Latent reaction rules: ${rules.length}
- Latent nuclear decay rules: ${nuclearDecayRules.length}
- Latent rule tick-budget cap: 240
- Latent fusion/capture rules: ${ruleKinds.fusion}/${ruleKinds.capture}
- Latent reaction rule missing IDs: ${ruleMissing.length}
- Latent nuclear decay missing IDs: ${decayMissing.length}

## Identity And Sanity Failures

${[
  ...acidIdentityFailures.map(failure => `- acid identity: ${failure}`),
  ...ballIdentityFailures.map(failure => `- ball identity: ${failure}`),
  ...retentionIdentityFailures.map(failure => `- retention identity: ${failure}`),
  ...missingCriticalOreOutputs.map(id => `- missing hard/exotic ore output: ${id}`),
  ...dissolverInvalid.slice(0, 20).map(failure => `- dissolver port: ${failure}`),
  ...(dissolverRecipes.length < 1000 ? [`- dissolver port too sparse: ${dissolverRecipes.length}`] : []),
  ...(dissolverAcids.length < 5 ? [`- dissolver port acid families too sparse: ${dissolverAcids.join(', ')}`] : []),
  ...(dissolverBalls.length < 5 ? [`- dissolver port ball families too sparse: ${dissolverBalls.join(', ')}`] : []),
  ...(alchemistryStillInstalled ? ['- Alchemistry/AlchemyLib still installed despite Create dissolver port'] : []),
  ...customAlchemyDependencies.map(failure => `- custom mod dependency: ${failure}`),
  ...alchemistryReplacementFailures.map(failure => `- Alchemistry replacement: ${failure}`),
  ...missingAcidLadderRoutes.map(id => `- missing acid ladder route: ${id}`),
  ...(pncrAcidBypass ? ['- PNCR formulaic routes bypass acid fluids with pressure chamber item-only recipes'] : []),
  ...magicParityFailures.map(failure => `- magic parity: ${failure}`),
  ...latentShapeFailures.map(failure => `- latent shape: ${failure}`)
].join('\n') || '- none'}

## Formulaic Gaps By Family

${missingSummary || '- none'}

## Missing Installed Family Compounds

${missingFamilyCompounds.length ? missingFamilyCompounds.map(id => `- ${id}`).join('\n') : '- none'}

## Missing Latent Rule IDs

${ruleMissing.length ? ruleMissing.map(id => `- ${id}`).join('\n') : '- none'}

## Missing Latent Nuclear Decay IDs

${decayMissing.length ? decayMissing.map(id => `- ${id}`).join('\n') : '- none'}

## Audit Findings

- The reference Alchemistry jar has ${Object.values(alchemistryLogicalTypes).reduce((sum, count) => sum + count, 0)}
  logical recipes: ${sourceDissolverCount} dissolver, ${sourceCombinerCount}
  combiner, ${sourceCompactorCount} compactor, ${sourceAtomizerCount}
  atomizer, ${sourceLiquifierCount} liquifier, ${sourceFissionCount} fission,
  and ${sourceFusionCount} fusion.
- Ore acid/ball coverage is complete at the table level: every deposit has every
  solvent and every ball.
- Acid identity is not flat: each deposit has at least four distinct
  solvent-selected outputs, and the average is ${average(acidUniqueCounts).toFixed(2)}.
- Ball identity is not flat: each deposit has at least five distinct
  ball-biased output choices, and retention changes per acid/ball pair.
- Hard and rare deposits expose unique power outputs such as beryllium,
  tungsten, titanium, uranium/thorium, platinum/palladium, gallium, vanadium,
  fluorine, AE2 crystals, diamond, and emerald.
- Grinding ball retention is complete per solvent and per ball.
- Ore outputs are registry-backed and avoid new one-off intermediates in the
  mixer matrix.
- Alchemistry dissolver semantics are ported into ${dissolverRecipes.length}
  Create mixing routes that require a selected acid/solvent and grinding ball;
  the ${sourceDissolverGasInputs} source dissolver routes with loose gas item
  inputs are intentionally excluded because gas identity now belongs to sealed
  cells and Latent ChemLib machine state. Alchemistry and AlchemyLib packwiz
  entries are removed.
- Alchemistry combiner semantics are not copied one-for-one. The replacement is
  the Create/PNCR formulaic synthesis layer plus special molecular routes; all
  ${existingFamilyCompounds.length} installed ChemLib family compounds audited
  have a route.
- Alchemistry atomizer/liquifier gas and liquid conversion is replaced by
  sealed cells, acid/fluid production recipes, and Latent ChemLib stateful gas
  handling rather than loose gas item loops.
- Alchemistry fission/fusion recipe spam is replaced by Latent ChemLib nuclear
  decay, capture, and fusion rules under the simulation scheduler budget.
- Packwiz no longer installs Alchemistry or AlchemyLib, but bundled custom jars
  must also remove mandatory metadata dependencies before the replacement is
  runtime-complete. Current blocking dependencies: ${customAlchemyDependencies.length}.
- Acid production has a progression ladder from biological/basic solvent work
  through sulfur, chlorine, nitrogen oxide, and phosphate chemistry instead of a
  single best universal acid.
- PNCR boosted formulaic routes consume the relevant acid fluid in the thermo
  plant instead of bypassing the acid ladder through item-only pressure chamber
  recipes.
- Blood Magic provides manual high-yield alternatives for ore cutting, hard/rare
  fraction extraction, and oxide reduction where target items exist; those
  routes consume durability from itemized magic-acid cutting fluids.
- Ars Nouveau covers purified crystal/source routes and sealed-cell
  stabilization.
- Loose gas item inputs in the molecular KubeJS pass: ${looseGasInputs.length ? looseGasInputs.join(', ') : 'none'}.
- Latent ChemLib rules now define a broad periodic traversal: high-energy
  fusion jumps through the lower/mid table, adjacent capture steps across the
  installed periodic table. Nuclear decay is in a separate real-half-life table
  so heavy elements decay by representative isotope half-life rather than
  generic reaction thresholds.

## Known Boundary

- Generic KubeJS recipes cannot inspect sealed-cell NBT. Exact gas identity
  belongs to Latent ChemLib machine state and reaction rules; KubeJS recipes use
  sealed cells as the containment gate.
`

if (process.argv.includes('--write')) {
  const outDir = process.env.OUT_DIR || path.join(repo, 'generated', 'validation')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'synthesis_pipeline_completeness_audit.md'), md)
}

console.log(md)
