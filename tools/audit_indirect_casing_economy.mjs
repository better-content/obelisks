#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const repo = process.cwd()
const scriptRoot = path.join(repo, 'kubejs/server_scripts')
const dumpDir = path.join(repo, 'generated/runtime-dumps/kubejs-config')
const outDir = process.env.OUT_DIR || path.join(repo, 'generated', 'validation')
const outJson = path.join(outDir, 'indirect_casing_economy_audit.json')

const CRAFTING_TYPES = new Set([
  'minecraft:crafting_shaped',
  'minecraft:crafting_shapeless',
  'minecraft:smelting',
  'minecraft:blasting',
  'minecraft:smoking',
  'minecraft:campfire_cooking'
])

const CASINGS = [
  'kubejs:seared_machine_casing',
  'kubejs:andesite_machine_casing',
  'kubejs:brass_machine_casing',
  'kubejs:airtight_machine_casing',
  'kubejs:electrical_machine_casing',
  'kubejs:space_machine_casing',
  'kubejs:raw_impossible_casing',
  'kubejs:impossible_machine_casing'
]

const CRAFT_SURFACE_TIERS = [
  [/^create:(pressing|mixing|compacting|crushing|milling|cutting|filling|emptying|splashing|haunting)$/, 'create andesite machine surfaces', 'kubejs:andesite_machine_casing'],
  [/^create:sequenced_assembly$/, 'Create staged assembly line', 'kubejs:brass_machine_casing'],
  [/^create:mechanical_crafting$/, 'Create mechanical crafters', 'kubejs:andesite_machine_casing'],
  [/^pneumaticcraft:(pressure_chamber|thermo_plant|fluid_mixer|assembly_laser|assembly_drill|refinery)$/, 'PNCR pressure/sealed processing', 'kubejs:airtight_machine_casing'],
  [/^tconstruct:(melting|alloying|casting_table|casting_basin|table_casting|basin_casting|table_casting_composite)$/, 'TCon molten/casting work', 'kubejs:seared_machine_casing'],
  [/^bloodmagic:/, 'Blood Magic LP/will processing', 'MAGIC:Blood Magic'],
  [/^ars_nouveau:/, 'Ars purified source processing', 'MAGIC:Ars Nouveau']
]

const VALUE_PATTERNS = [
  /(^|:).*(plate|sheet|ingot|alloy|circuit|processor|transistor|wafer|core|coil|wire|gauge|relay|seal|gear|mechanism|casing|cell|housing|dust|oxide|nitrate|sulfate|chloride|carbonate|hydroxide|acid|sulfide|phosphate|phosphoric|ammonium|polyvinyl|pvc|silicon|sodium|uranium|thorium|titanium|tungsten|platinum|palladium|rhodium|ruthenium|osmium|iridium).*/i,
  /^chemlib:/,
  /^kubejs:.*(grinding_ball|sky_steel|impossible|source|binding)/,
  /^powergrid:/,
  /^oc2r:/,
  /^ae2:.*(processor|cell|housing|interface|pattern|assembler|drive|storage)/,
  /^latent_chemlib:/
]

const BENIGN_SIMPLE_BYPASS_RULES = [
  {
    reason: 'raw metal form',
    test(output) {
      return /(^minecraft:.*_ingot$|_ingot$|_nugget$|_metal_block$|_block$)/.test(output)
    }
  },
  {
    reason: 'decorative pressure plate',
    test(output) {
      return /pressure_plate$/.test(output)
    }
  },
  {
    reason: 'decorative weathered plate',
    test(output) {
      return output === 'quark:rusty_iron_plate'
    }
  },
  {
    reason: 'reversible orientation conversion',
    test(output, bypass) {
      if (output !== 'powergrid:generator_commutator') return false
      return bypass.simpleDumpProducers
        .concat(bypass.authoredSimpleProducers)
        .some(recipe => recipe.inputs.includes('powergrid:generator_vertical_commutator'))
    }
  }
]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file, out)
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(file)
  }
  return out
}

function rel(file) {
  return path.relative(repo, file)
}

function normalizeId(id) {
  if (!id || typeof id !== 'string') return ''
  const trimmed = id.trim()
  const match = trimmed.match(/(?:\d+x\s*)?([a-z0-9_.-]+:[a-z0-9_./-]+)/i)
  return match ? match[1] : ''
}

function idsFromValue(value, out = new Set()) {
  if (!value) return out
  if (typeof value === 'string') {
    const id = normalizeId(value)
    if (id) out.add(id)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) idsFromValue(item, out)
    return out
  }
  if (typeof value === 'object') {
    if (value.item) out.add(normalizeId(value.item))
    if (value.id) out.add(normalizeId(value.id))
    if (value.output) idsFromValue(value.output, out)
    if (value.result) idsFromValue(value.result, out)
    if (value.results) idsFromValue(value.results, out)
    if (value.ingredients) idsFromValue(value.ingredients, out)
    if (value.inputs) idsFromValue(value.inputs, out)
    if (value.input) idsFromValue(value.input, out)
    if (value.item_input) idsFromValue(value.item_input, out)
    return out
  }
  return out
}

function idsFromRecipeOutput(type, recipe) {
  const out = new Set()
  if (!recipe || typeof recipe !== 'object') return out
  idsFromValue(recipe.results, out)
  idsFromValue(recipe.result, out)
  idsFromValue(recipe.output, out)
  idsFromValue(recipe.outputs, out)
  if (type === 'pneumaticcraft:thermo_plant') idsFromValue(recipe.item_output, out)
  return [...out].filter(Boolean)
}

function idsFromRecipeInputs(recipe) {
  const out = new Set()
  if (!recipe || typeof recipe !== 'object') return []
  idsFromValue(recipe.ingredients, out)
  idsFromValue(recipe.inputs, out)
  idsFromValue(recipe.input, out)
  idsFromValue(recipe.item_input, out)
  idsFromValue(recipe.reagent, out)
  idsFromValue(recipe.pedestalItems, out)
  idsFromValue(recipe.key, out)
  return [...out].filter(Boolean)
}

function makeChain(onId) {
  const chain = {}
  for (const method of ['id', 'xp', 'cookingTime', 'upgradeLevel', 'altarSyphon', 'consumptionRate', 'drainRate', 'syphon', 'ticks', 'drain', 'minimumDrain', 'consumeIngredient', 'texture', 'heated', 'superheated', 'processingTime', 'keepHeldItem', 'loops', 'transitionalItem']) {
    chain[method] = (...args) => {
      if (method === 'id' && args[0]) onId(String(args[0]))
      return chain
    }
  }
  return chain
}

const DIRECT_COMPONENT_PATTERNS = [
  /(^|:)(brass_funnel|brass_tunnel|smart_chute|display_link|display_board|portable_storage_interface|portable_fluid_interface|stock_link|stock_ticker|engine_piston)$/,
  /(^|:)(reinforced_pressure_tube|advanced_pressure_tube)$/,
  /(^|:)(portable_battery|relay|relay_dpdt|current_gauge|voltage_gauge|power_gauge|device_connector|heavy_wire_connector)$/,
  /(^|:)(block_operations_module|inventory_operations_module|network_interface_card|redstone_interface_card|cpu_tier_2|hard_drive_large|memory_large)$/,
  /(^|:)(engine_blueprint|power_pack|exhaust_pack|copper_oxygen_backtank|netherite_oxygen_backtank|advanced_spacesuit_fabric)$/
]

function isAestheticComponentOutput(id) {
  return DIRECT_COMPONENT_PATTERNS.some(pattern => pattern.test(id))
}

function createRecorder(file, records, removes, replaces, nextSeq) {
  function addRecipe(type, outputs, inputs, defaultId) {
    const rec = {
      seq: nextSeq(),
      file: rel(file),
      type,
      id: defaultId || '',
      outputs: [...new Set(outputs.map(normalizeId).filter(Boolean))],
      inputs: [...new Set(inputs.map(normalizeId).filter(Boolean))]
    }
    records.push(rec)
    return makeChain(id => { rec.id = id })
  }

  const event = {
    custom(recipe) {
      const type = recipe?.type || 'custom:unknown'
      return addRecipe(type, idsFromRecipeOutput(type, recipe), idsFromRecipeInputs(recipe), '')
    },
    shaped(output, pattern, keys) {
      return addRecipe('minecraft:crafting_shaped', [...idsFromValue(output)], [...idsFromValue(keys)], '')
    },
    shapeless(output, inputs) {
      return addRecipe('minecraft:crafting_shapeless', [...idsFromValue(output)], [...idsFromValue(inputs)], '')
    },
    smelting(output, input) {
      return addRecipe('minecraft:smelting', [...idsFromValue(output)], [...idsFromValue(input)], '')
    },
    blasting(output, input) {
      return addRecipe('minecraft:blasting', [...idsFromValue(output)], [...idsFromValue(input)], '')
    },
    remove(filter) {
      removes.push({ seq: nextSeq(), file: rel(file), filter: filter || {}, outputs: [...idsFromValue(filter?.output)], id: filter?.id || '', type: filter?.type || '' })
    },
    forEachRecipe() {},
    replaceInput(filter, oldInput, newInput) {
      replaces.push({ seq: nextSeq(), file: rel(file), filter: filter || {}, outputs: [...idsFromValue(filter?.output)], oldInputs: [...idsFromValue(oldInput)], newInputs: [...idsFromValue(newInput)] })
    },
    replaceOutput() {},
    recipes: {}
  }

  event.recipes.bloodmagic = {
    altar: (output, input) => addRecipe('bloodmagic:altar', [...idsFromValue(output)], [...idsFromValue(input)], ''),
    alchemytable: (output, inputs) => addRecipe('bloodmagic:alchemytable', [...idsFromValue(output)], [...idsFromValue(inputs)], ''),
    array: (output, baseInput, addedInput) => addRecipe('bloodmagic:array', [...idsFromValue(output)], [...idsFromValue([baseInput, addedInput])], ''),
    soulforge: (output, inputs) => addRecipe('bloodmagic:soulforge', [...idsFromValue(output)], [...idsFromValue(inputs)], ''),
    arc: (output, input, tool) => addRecipe('bloodmagic:arc', [...idsFromValue(output)], [...idsFromValue([input, tool])], '')
  }
  event.recipes.ars_nouveau = new Proxy({}, {
    get(_target, prop) {
      return (...args) => {
        const output = args[0]
        const inputs = args.slice(1)
        return addRecipe(`ars_nouveau:${String(prop)}`, [...idsFromValue(output)], [...idsFromValue(inputs)], '')
      }
    }
  })
  event.recipes.create = new Proxy({}, {
    get(_target, prop) {
      return (...args) => {
        const output = args[0]
        const inputs = args.slice(1)
        return addRecipe(`create:${String(prop)}`, [...idsFromValue(output)], [...idsFromValue(inputs)], '')
      }
    }
  })
  return event
}

function runKubeJsSource() {
  const records = []
  const removes = []
  const replaces = []
  const errors = []
  let seq = 0
  const nextSeq = () => ++seq
  const context = {
    console: { log() {}, info() {}, warn() {}, error() {} },
    Item: {
      exists: () => true,
      of: (id, countOrNbt) => ({ item: normalizeId(id) || String(id), count: typeof countOrNbt === 'number' ? countOrNbt : undefined, isEmpty: () => false })
    },
    Fluid: { of: (id, amount) => ({ fluid: normalizeId(id) || String(id), amount }) },
    Ingredient: { of: value => ({ value, itemIds: [], isEmpty: () => false }) },
    Platform: { isLoaded: () => true },
    ServerEvents: {
      recipes(fn) {
        const event = createRecorder(context.__currentFile, records, removes, replaces, nextSeq)
        fn(event)
      },
      tags() {}
    },
    MoreJSEvents: undefined,
    LootJS: { modifiers() {} },
    PlayerEvents: { respawned() {} },
    JsonIO: {
      read(file) {
        const abs = path.join(repo, file)
        if (!fs.existsSync(abs)) return {}
        return JSON.parse(fs.readFileSync(abs, 'utf8'))
      },
      write() {}
    },
    Java: {
      loadClass(name) {
        if (name === 'com.google.gson.Gson') return function Gson() {
          this.toJson = value => JSON.stringify(value)
        }
        if (name === 'net.minecraft.core.registries.BuiltInRegistries') {
          return {
            ITEM: {
              keySet: () => ({
                iterator: () => ({
                  hasNext: () => false,
                  next: () => ''
                })
              })
            }
          }
        }
        return function StubJavaClass() {}
      }
    },
    global: null
  }
  context.global = context
  const vmContext = vm.createContext(context)
  const files = walk(scriptRoot)
    .filter(file => !rel(file).includes('/90_dev_debug/'))
    .filter(file => !rel(file).includes('/50_loot/'))
    .filter(file => !rel(file).includes('/70_spawn/'))
    .sort()

  for (const file of files) {
    context.__currentFile = file
    try {
      vm.runInContext(fs.readFileSync(file, 'utf8'), vmContext, { filename: file, timeout: 1000 })
    } catch (error) {
      errors.push({ file: rel(file), message: error.message })
    }
  }
  return { records, removes, replaces, errors }
}

function surfaceFor(type) {
  for (const [pattern, surface, gate] of CRAFT_SURFACE_TIERS) {
    if (pattern.test(type)) return { surface, gate }
  }
  return null
}

function isValuable(id) {
  return VALUE_PATTERNS.some(pattern => pattern.test(id))
}

function loadDumpRecipes() {
  if (!fs.existsSync(dumpDir)) return []
  const out = []
  for (const file of fs.readdirSync(dumpDir).filter(f => /^full_recipe_index_\d+\.json$/.test(f)).sort()) {
    const chunk = JSON.parse(fs.readFileSync(path.join(dumpDir, file), 'utf8'))
    for (const recipe of chunk.recipes || []) {
      let json = {}
      try { json = JSON.parse(recipe.json) } catch {}
      out.push({
        id: recipe.id,
        type: recipe.type,
        outputs: idsFromRecipeOutput(recipe.type, json),
        inputs: idsFromRecipeInputs(json)
      })
    }
  }
  return out
}

function wasRemoved(recipe, removes) {
  return removes.some(remove => {
    if (recipe.origin === 'kubejs-source' && typeof recipe.seq === 'number' && typeof remove.seq === 'number' && remove.seq < recipe.seq) return false
    if (remove.id && remove.id === recipe.id) return true
    if (remove.type && remove.type !== recipe.type) return false
    return recipe.outputs.some(output => remove.outputs.includes(output))
  })
}

const { records, removes, replaces, errors } = runKubeJsSource()
const dumpRecipes = loadDumpRecipes()
const dumpMachineRecords = dumpRecipes
  .filter(recipe => !wasRemoved(recipe, removes))
  .map(recipe => ({
    ...recipe,
    file: 'generated/runtime-dumps/kubejs-config',
    origin: 'runtime-dump',
    inputs: recipe.inputs || [],
    outputs: recipe.outputs || []
  }))
const authoredRecords = records.map(record => ({ ...record, origin: 'kubejs-source' }))
const activeAuthoredRecords = authoredRecords.filter(recipe => !wasRemoved(recipe, removes))
const recipeRecords = [...activeAuthoredRecords, ...dumpMachineRecords]

const casedSurfaceRecipes = recipeRecords
  .map(record => ({ ...record, ...surfaceFor(record.type) }))
  .filter(record => record.surface && record.outputs.length)

const indirect = []
const direct = []
for (const recipe of casedSurfaceRecipes) {
  const hasDirectCasingInput = recipe.inputs.some(input => CASINGS.includes(input))
  const target = hasDirectCasingInput ? direct : indirect
  for (const output of recipe.outputs) {
    if (recipe.inputs.includes(output)) continue
    if (!output || output.startsWith('minecraft:') && !isValuable(output)) continue
    if (!isValuable(output) && !output.startsWith('kubejs:')) continue
    target.push({ output, type: recipe.type, id: recipe.id, file: recipe.file, origin: recipe.origin, surface: recipe.surface, gate: recipe.gate, inputs: recipe.inputs })
  }
}

const indirectByOutput = new Map()
for (const row of indirect) {
  if (!indirectByOutput.has(row.output)) indirectByOutput.set(row.output, [])
  indirectByOutput.get(row.output).push(row)
}

const bypasses = []
for (const [output, producers] of indirectByOutput) {
  const simpleDumpProducers = dumpRecipes
    .filter(recipe => recipe.outputs.includes(output) && CRAFTING_TYPES.has(recipe.type) && !wasRemoved(recipe, removes))
    .map(recipe => ({ id: recipe.id, type: recipe.type, inputs: recipe.inputs }))
  const authoredSimpleProducers = records
    .filter(recipe => recipe.outputs.includes(output) && CRAFTING_TYPES.has(recipe.type) && !wasRemoved(recipe, removes))
    .map(recipe => ({ id: recipe.id, type: recipe.type, file: recipe.file, inputs: recipe.inputs }))
  if (simpleDumpProducers.length || authoredSimpleProducers.length) {
    bypasses.push({ output, casedProducers: producers, simpleDumpProducers, authoredSimpleProducers })
  }
}

function classifySimpleBypass(bypass) {
  for (const rule of BENIGN_SIMPLE_BYPASS_RULES) {
    if (rule.test(bypass.output, bypass)) return { ...bypass, benign: true, reason: rule.reason }
  }
  return { ...bypass, benign: false, reason: 'component-like simple recipe' }
}

const classifiedBypasses = bypasses.map(classifySimpleBypass)
const benignBypasses = classifiedBypasses.filter(bypass => bypass.benign)

function isActionableBypass(bypass) {
  const output = bypass.output
  if (bypass.benign) return false
  if (!/(plate|sheet|circuit|processor|transistor|wafer|core|coil|relay|mechanism|seal|housing|cell|gear|gauge|wire|casing|catalyst|binding|acid|chloride|nitrate|sulfate|phosphate|polyvinyl|silicon_dioxide|sky_steel)/.test(output)) return false
  return true
}

const actionableBypasses = classifiedBypasses.filter(isActionableBypass)
const bypassReasonCounts = {}
for (const bypass of classifiedBypasses) {
  bypassReasonCounts[bypass.reason] = (bypassReasonCounts[bypass.reason] || 0) + 1
}

const directCasingConsumers = activeAuthoredRecords
  .filter(recipe => recipe.inputs.some(input => CASINGS.includes(input)))
  .flatMap(recipe => recipe.outputs.map(output => ({
    output,
    type: recipe.type,
    id: recipe.id,
    file: recipe.file,
    casingInputs: recipe.inputs.filter(input => CASINGS.includes(input))
  })))
  .filter(row => row.output && !CASINGS.includes(row.output))

const aestheticDirectCasingConsumers = directCasingConsumers
  .filter(row => isAestheticComponentOutput(row.output))
  .sort((a, b) => a.output.localeCompare(b.output))

const byGate = {}
for (const row of indirect) {
  const gate = row.gate
  if (!byGate[gate]) byGate[gate] = new Set()
  byGate[gate].add(row.output)
}

const report = {
  generatedAt: new Date().toISOString(),
  note: 'Hybrid audit. KubeJS source is used for authored recipes/removes; runtime recipe dumps are used for base mod machine-surface outputs and simple recipe bypass candidates. Current dumps still lack KubeJS recipes.',
  sourceRecipeCount: records.length,
  dumpRecipeCount: dumpRecipes.length,
  dumpMachineSurfaceRecipeCount: dumpMachineRecords.filter(recipe => surfaceFor(recipe.type)).length,
  casedSurfaceRecipeCount: casedSurfaceRecipes.length,
  indirectOutputCount: indirectByOutput.size,
  directCasingOutputCount: new Set(direct.map(row => row.output)).size,
  directCasingConsumerCount: new Set(directCasingConsumers.map(row => row.output)).size,
  aestheticDirectCasingConsumerCount: new Set(aestheticDirectCasingConsumers.map(row => row.output)).size,
  directCasingConsumers,
  aestheticDirectCasingConsumers,
  byGate: Object.fromEntries(Object.entries(byGate).map(([gate, set]) => [gate, [...set].sort()])),
  bypasses,
  classifiedBypasses,
  benignBypasses,
  bypassReasonCounts,
  actionableBypasses,
  errors
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n')

console.log(`source recipes: ${records.length}`)
console.log(`cased-surface recipes: ${casedSurfaceRecipes.length}`)
console.log(`indirect valuable outputs: ${indirectByOutput.size}`)
console.log(`direct casing-input outputs: ${new Set(direct.map(row => row.output)).size}`)
console.log(`active direct casing consumers: ${new Set(directCasingConsumers.map(row => row.output)).size}`)
console.log(`aesthetic direct casing consumers: ${new Set(aestheticDirectCasingConsumers.map(row => row.output)).size}`)
console.log(`potential simple bypasses: ${bypasses.length}`)
console.log(`benign classified bypasses: ${benignBypasses.length}`)
console.log(`actionable component bypasses: ${actionableBypasses.length}`)
for (const [reason, count] of Object.entries(bypassReasonCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${reason}: ${count}`)
}
console.log(`source eval warnings: ${errors.length}`)
console.log(`wrote ${path.relative(repo, outJson)}`)
if (actionableBypasses.length) {
  for (const bypass of actionableBypasses.slice(0, 20)) console.log(`ACTIONABLE? ${bypass.output}`)
}
