#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const sourcePath = 'kubejs/config/progression_reachability_sources.json'
const spinePath = 'kubejs/config/player_progression_regression.json'
const runtimePath = 'generated/runtime-dumps/recipes.json'
const failures = []
const passes = []

function full(relPath) { return path.join(repo, relPath) }
function exists(relPath) { return fs.existsSync(full(relPath)) }
function readJson(relPath) { return JSON.parse(fs.readFileSync(full(relPath), 'utf8')) }
function ok(name, detail = '') {
  passes.push({ name, detail })
  console.log(`ok - ${name}${detail ? ` (${detail})` : ''}`)
}
function fail(name, detail) {
  failures.push({ name, detail })
  console.error(`FAIL - ${name}: ${detail}`)
}
function unique(values) { return [...new Set(values.filter(Boolean))] }

function itemEntry(id) { return { kind: 'item', id, count: 1 } }

function loadRuntimeRecipes() {
  if (!exists(runtimePath)) return []
  const dump = readJson(runtimePath)
  if (dump.schema !== 'obelisks.recipe_graph.v1') {
    fail('runtime recipe graph schema is current', dump.schema || '<missing>')
    return []
  }
  ok('runtime recipe graph loaded for reachability', `${(dump.recipes || []).length} recipes`)
  return dump.recipes || []
}

function normalizeManualEdges(edges) {
  return (edges || []).map(edge => ({
    id: edge.id,
    type: 'btm:manual_progression_edge',
    inputs: (edge.inputs || []).map(itemEntry),
    outputs: (edge.outputs || []).map(itemEntry),
    catalysts: [],
    fluids_in: (edge.fluidsIn || []).map(id => ({ kind: 'fluid', id, amount: 1000 })),
    machines: [],
    manual: true
  }))
}

function expandTagInputs(recipe, tagProviders) {
  const missingTags = []
  const alternatives = []
  for (const input of recipe.inputs || []) {
    if (input.kind === 'item') alternatives.push([input.id])
    else if (input.kind === 'tag') {
      const providers = tagProviders[input.id] || []
      if (providers.length) alternatives.push(providers)
      else missingTags.push(input.id)
    }
  }
  return { alternatives, missingTags }
}

function canSatisfyAlternatives(alternatives, reachable) {
  const chosen = []
  for (const options of alternatives) {
    const item = options.find(option => reachable.has(option))
    if (!item) return null
    chosen.push(item)
  }
  return chosen
}

function recipeMachineRequirement(recipe, source) {
  if ((source.freeRecipeTypes || []).includes(recipe.type)) return null
  return (source.machineUnlocks || {})[recipe.type] || null
}

function outputItems(recipe) {
  return unique((recipe.outputs || []).filter(out => out?.kind === 'item' && out.id).map(out => out.id))
}

function solveReachability(recipes, source) {
  const reachable = new Set(source.seedItems || [])
  const reachableFluids = new Set(source.seedFluids || [])
  const reason = new Map()
  for (const item of reachable) reason.set(item, { kind: 'seed' })
  for (const fluid of reachableFluids) reason.set(`fluid:${fluid}`, { kind: 'seed' })

  let changed = true
  let iterations = 0
  while (changed && iterations < 500) {
    changed = false
    iterations++
    for (const recipe of recipes) {
      const outputs = outputItems(recipe)
      if (!outputs.length || outputs.every(item => reachable.has(item))) continue
      const { alternatives, missingTags } = expandTagInputs(recipe, source.tagProviders || {})
      if (missingTags.length) continue
      const chosenInputs = canSatisfyAlternatives(alternatives, reachable)
      if (!chosenInputs) continue
      const missingFluid = (recipe.fluids_in || []).find(fluid => fluid?.kind === 'fluid' && fluid.id && !reachableFluids.has(fluid.id))
      if (missingFluid) continue
      const machine = recipeMachineRequirement(recipe, source)
      if (machine && !reachable.has(machine)) continue

      for (const item of outputs) {
        if (reachable.has(item)) continue
        reachable.add(item)
        changed = true
        reason.set(item, {
          kind: recipe.manual ? 'manual' : 'recipe',
          recipe: recipe.id || 'UNKNOWN',
          type: recipe.type || 'UNKNOWN',
          inputs: unique(chosenInputs.concat(machine ? [machine] : [])),
          fluids: unique((recipe.fluids_in || []).map(fluid => fluid.id))
        })
      }
    }
  }
  return { reachable, reason, iterations }
}

function explain(item, reason, depth = 0, seen = new Set()) {
  if (seen.has(item)) return [`${'  '.repeat(depth)}${item} (cycle)`]
  seen.add(item)
  const r = reason.get(item)
  if (!r) return [`${'  '.repeat(depth)}${item} (unreached)`]
  if (r.kind === 'seed') return [`${'  '.repeat(depth)}${item} <= source`]
  const lines = [`${'  '.repeat(depth)}${item} <= ${r.recipe} [${r.type}]`]
  for (const dep of r.inputs || []) lines.push(...explain(dep, reason, depth + 1, seen))
  return lines
}

function blockedRecipeHints(target, recipes, source, reachable) {
  const producing = recipes.filter(recipe => outputItems(recipe).includes(target))
  if (!producing.length) return ['no recipe or manual edge produces target']
  const hints = []
  for (const recipe of producing.slice(0, 5)) {
    const { alternatives, missingTags } = expandTagInputs(recipe, source.tagProviders || {})
    const missingInputs = []
    for (const options of alternatives) {
      if (!options.some(option => reachable.has(option))) missingInputs.push(options.join('|'))
    }
    const machine = recipeMachineRequirement(recipe, source)
    if (machine && !reachable.has(machine)) missingInputs.push(`machine:${machine}`)
    for (const fluid of recipe.fluids_in || []) if (fluid?.id && !source.seedFluids?.includes(fluid.id)) missingInputs.push(`fluid:${fluid.id}`)
    if (missingTags.length) missingInputs.push(...missingTags.map(tag => `tag:${tag}`))
    hints.push(`${recipe.id || 'UNKNOWN'} [${recipe.type || 'UNKNOWN'}] missing ${missingInputs.join(', ') || '<none>'}`)
  }
  return hints
}

let source
try {
  source = readJson(sourcePath)
  source.schema === 'btm.progression_reachability_sources.v1'
    ? ok('progression reachability source manifest parses', source.schema)
    : fail('progression reachability source manifest schema is current', source.schema || '<missing>')
} catch (error) {
  fail('progression reachability source manifest parses', error.message)
  source = {}
}

let spine
try {
  spine = readJson(spinePath)
  ok('player progression manifest loaded for reachability targets', `${(spine.milestones || []).length} milestones`)
} catch (error) {
  fail('player progression manifest loaded for reachability targets', error.message)
  spine = {}
}

const runtimeRecipes = loadRuntimeRecipes()
const manualRecipes = normalizeManualEdges(source.manualEdges || [])
const recipes = runtimeRecipes.concat(manualRecipes)
ok('progression solver recipe corpus assembled', `${runtimeRecipes.length} runtime, ${manualRecipes.length} manual`)

const targets = unique([
  ...(source.targets || []),
  ...((spine.milestones || []).flatMap(milestone => milestone.outputs || [])),
  ...((spine.primaryCraftingSpine || {}).runtimeProducedMachineOutputs || [])
])
ok('progression reachability target set assembled', `${targets.length} targets`)

const { reachable, reason, iterations } = solveReachability(recipes, source)
ok('progression reachability fixed point computed', `${reachable.size} items in ${iterations} iteration(s)`)

const missingTargets = targets.filter(item => !reachable.has(item))
if (missingTargets.length) {
  const details = missingTargets.slice(0, 40).map(item => `${item}\n  ${blockedRecipeHints(item, recipes, source, reachable).join('\n  ')}`).join('\n')
  fail('primary progression targets are recursively reachable from accepted sources', details)
} else {
  ok('primary progression targets are recursively reachable from accepted sources', `${targets.length} targets`)
}

const traceTargets = [
  'kubejs:seared_machine_casing',
  'kubejs:andesite_machine_casing',
  'kubejs:brass_machine_casing',
  'kubejs:airtight_machine_casing',
  'pneumaticcraft:printed_circuit_board',
  'bloodmagic:archmagebloodorb'
].filter(item => reachable.has(item))
for (const item of traceTargets) {
  console.log(`\nroute - ${item}`)
  console.log(explain(item, reason).slice(0, 60).join('\n'))
}

console.log(`\nprogression reachability validators: ${passes.length} pass(es), ${failures.length} hard failure(s)`)
if (failures.length) process.exit(1)
