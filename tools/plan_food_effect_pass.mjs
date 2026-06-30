#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const instanceConfig = '/home/gerald/.local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1/minecraft/kubejs/config'
const foodDumpPath = process.argv[2] || path.join(instanceConfig, 'food_effect_index.json')
const recipeManifestPath = process.argv[3] || path.join(instanceConfig, 'full_recipe_index_manifest.json')
const reportPath = process.argv[4] || path.join(repoRoot, 'generated/validation/food_effect_potion_engineering_pass_plan.md')
const catalogPath = process.argv[5] || path.join(repoRoot, 'kubejs/config/food_effect_source_catalog.json')

const coreEffects = [
  'minecraft:haste',
  'minecraft:speed',
  'minecraft:night_vision',
  'minecraft:water_breathing',
  'minecraft:fire_resistance',
  'minecraft:regeneration',
  'minecraft:resistance',
  'minecraft:strength',
  'minecraft:absorption',
  'minecraft:slow_falling',
  'minecraft:jump_boost',
  'minecraft:poison',
  'minecraft:weakness',
  'minecraft:levitation',
  'minecraft:glowing',
  'minecraft:luck',
  'farmersdelight:comfort',
  'farmersdelight:nourishment',
  'farmersrespite:caffeinated',
  'brewinandchewin:intoxication',
  'brewinandchewin:raging',
  'brewinandchewin:sweet_heart',
  'mynethersdelight:b_pungent',
  'ars_nouveau:mana_regen',
  'occultism:third_eye'
]

const preferredSource = {
  'minecraft:haste': ['farmersrespite:green_tea_leaves', 'farmersrespite:coffee_beans'],
  'minecraft:speed': ['farmersrespite:coffee_beans', 'create:bar_of_chocolate', 'minecraft:sugar'],
  'minecraft:night_vision': ['ubesdelight:ube', 'minecraft:golden_carrot', 'collectorsreap:carrot_gummy'],
  'minecraft:water_breathing': ['delightful:salmonberries', 'minecraft:sea_pickle', 'minecraft:pufferfish'],
  'minecraft:fire_resistance': ['delightful:cactus_chili', 'mynethersdelight:hot_spice', 'minecraft:magma_cream'],
  'minecraft:regeneration': ['farmersrespite:rose_hips', 'collectorsreap:strawberry', 'minecraft:ghast_tear'],
  'minecraft:resistance': ['farmersrespite:yellow_tea_leaves', 'delightful:cantaloupe', 'undergarden:ink_mushroom'],
  'minecraft:strength': ['brewinandchewin:red_rum', 'collectorsreap:pomegranate', 'minecraft:blaze_powder'],
  'minecraft:absorption': ['minecraft:golden_apple', 'mynethersdelight:enchanted_golden_egg'],
  'minecraft:slow_falling': ['delightful:marshmallow_stick', 'minecraft:phantom_membrane'],
  'minecraft:jump_boost': ['undergarden:gloomper_leg', 'minecraft:rabbit_foot'],
  'minecraft:poison': ['minecraft:spider_eye', 'minecraft:pufferfish', 'minecraft:poisonous_potato'],
  'minecraft:weakness': ['farmersrespite:purulent_tea', 'minecraft:fermented_spider_eye'],
  'minecraft:levitation': ['ends_delight:shulker_meat', 'minecraft:shulker_shell'],
  'minecraft:glowing': ['minecraft:glow_berries', 'minecraft:glow_ink_sac'],
  'minecraft:luck': ['occultism:otherworld_essence', 'minecraft:rabbit_foot'],
  'farmersdelight:comfort': ['farmersrespite:rose_hips', 'farmersdelight:chicken_soup'],
  'farmersdelight:nourishment': ['farmersdelight:cabbage', 'farmersdelight:ham', 'brewinandchewin:scarlet_pierogi'],
  'farmersrespite:caffeinated': ['farmersrespite:coffee_beans', 'farmersrespite:green_tea_leaves'],
  'brewinandchewin:intoxication': ['brewinandchewin:vodka', 'brewinandchewin:mead'],
  'brewinandchewin:raging': ['brewinandchewin:red_rum', 'collectorsreap:deific_blood'],
  'brewinandchewin:sweet_heart': ['brewinandchewin:mead', 'minecraft:honey_bottle'],
  'mynethersdelight:b_pungent': ['delightful:cactus_chili', 'mynethersdelight:hot_spice'],
  'ars_nouveau:mana_regen': ['ars_nouveau:sourceberry_bush', 'ars_nouveau:source_berry'],
  'occultism:third_eye': ['occultism:datura', 'occultism:demons_dream_essence']
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function seconds(ticks) {
  return Math.round(Number(ticks || 0) / 20)
}

function collectOutputs(value, out = []) {
  if (!value) return out
  if (typeof value === 'string' && value.includes(':')) out.push(value)
  if (Array.isArray(value)) for (const entry of value) collectOutputs(entry, out)
  if (typeof value === 'object') {
    if (typeof value.item === 'string') out.push(value.item)
    if (typeof value.id === 'string') out.push(value.id)
    if (typeof value.fluid === 'string') out.push(value.fluid)
  }
  return out
}

function recipeOutputs(json) {
  return [...new Set([
    ...collectOutputs(json.result),
    ...collectOutputs(json.results),
    ...collectOutputs(json.output),
    ...collectOutputs(json.outputs)
  ])]
}

function loadRecipesByOutput(manifestPath) {
  const recipesByOutput = {}
  const typeCounts = {}
  if (!fs.existsSync(manifestPath)) return { recipesByOutput, typeCounts, recipeCount: 0 }
  const manifest = readJson(manifestPath)
  const dir = path.dirname(manifestPath)
  let recipeCount = 0
  for (let i = 0; i < Number(manifest.chunkCount || 0); i++) {
    const chunk = readJson(path.join(dir, `full_recipe_index_${String(i).padStart(4, '0')}.json`))
    for (const recipe of chunk.recipes || []) {
      recipeCount++
      typeCounts[recipe.type] = (typeCounts[recipe.type] || 0) + 1
      let json
      try { json = JSON.parse(recipe.json) } catch { continue }
      for (const output of recipeOutputs(json)) {
        recipesByOutput[output] ||= []
        recipesByOutput[output].push({ id: recipe.id, type: recipe.type, namespace: recipe.namespace })
      }
    }
  }
  return { recipesByOutput, typeCounts, recipeCount }
}

function topEffectFoods(foods, effectId, count = 12) {
  const rows = []
  for (const food of foods) {
    for (const effect of food.effects || []) {
      if (effect.effect !== effectId) continue
      rows.push({
        id: food.id,
        namespace: food.namespace,
        nutrition: food.nutrition,
        dietGroups: food.dietGroups || [],
        durationSeconds: seconds(effect.durationTicks),
        amplifier: Number(effect.amplifier || 0) + 1,
        probability: Math.max(0, Math.min(1, Number(effect.probability || 1))),
        score: seconds(effect.durationTicks) + (Number(effect.amplifier || 0) + 1) * 30 + Number(food.nutrition || 0) * 3 + (food.dietGroups || []).length * 15
      })
    }
  }
  return rows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, count)
}

function table(rows, columns) {
  if (!rows.length) return '_None found._\n'
  return [
    `| ${columns.map(c => c.label).join(' | ')} |`,
    `| ${columns.map(c => c.align || '---').join(' | ')} |`,
    ...rows.map(row => `| ${columns.map(c => c.format ? c.format(row) : row[c.key]).join(' | ')} |`)
  ].join('\n') + '\n'
}

if (!fs.existsSync(foodDumpPath)) {
  console.error(`Missing food dump: ${foodDumpPath}`)
  process.exit(2)
}

const foodDump = readJson(foodDumpPath)
const foods = foodDump.foods || []
const { recipesByOutput, typeCounts, recipeCount } = loadRecipesByOutput(recipeManifestPath)

const byEffect = {}
for (const food of foods) {
  for (const effect of food.effects || []) {
    byEffect[effect.effect] ||= []
    byEffect[effect.effect].push(food.id)
  }
}

const sourceCatalog = coreEffects.map(effect => ({
  effect,
  foodCount: (byEffect[effect] || []).length,
  preferredSources: preferredSource[effect] || [],
  topFoods: topEffectFoods(foods, effect, 10),
  proposedStage: effect.startsWith('minecraft:') ? (
    ['minecraft:poison', 'minecraft:weakness', 'minecraft:levitation'].includes(effect) ? 'dangerous_extraction' :
    ['minecraft:strength', 'minecraft:regeneration', 'minecraft:resistance', 'minecraft:fire_resistance'].includes(effect) ? 'keg_distillation' :
    'kettle_infusion'
  ) : (
    effect.startsWith('brewinandchewin:') ? 'keg_distillation' :
    effect.startsWith('ars_nouveau:') || effect.startsWith('occultism:') ? 'magic_distillation' :
    'kitchen_infrastructure'
  )
}))

fs.mkdirSync(path.dirname(catalogPath), { recursive: true })
fs.writeFileSync(catalogPath, JSON.stringify({
  generatedBy: 'tools/plan_food_effect_pass.mjs',
  foodDump: path.relative(repoRoot, foodDumpPath),
  recipeManifest: path.relative(repoRoot, recipeManifestPath),
  foodCount: foods.length,
  recipeCount,
  relevantRecipeTypes: Object.fromEntries(Object.entries(typeCounts).filter(([type]) =>
    type.includes('brewing') ||
    type.includes('fermenting') ||
    type.includes('keg') ||
    type.includes('kettle') ||
    type.includes('potion') ||
    type === 'create:filling' ||
    type === 'create:emptying'
  ).sort()),
  effects: sourceCatalog
}, null, 2) + '\n')

const brewingSurfaces = Object.entries(typeCounts)
  .filter(([type]) => type.includes('brewing') || type.includes('fermenting') || type.includes('keg') || type.includes('kettle') || type.includes('potion') || type === 'create:filling' || type === 'create:emptying')
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => ({ type, count }))

const report = [
  '# Food Effect And Potion Engineering Pass Plan',
  '',
  '## Dump Audit',
  '',
  `- Food dump: \`${path.relative(repoRoot, foodDumpPath)}\``,
  `- Foods scanned: ${foods.length}`,
  `- Foods with direct effects: ${Object.values(byEffect).reduce((set, ids) => { ids.forEach(id => set.add(id)); return set }, new Set()).size}`,
  `- Distinct direct effects: ${Object.keys(byEffect).length}`,
  `- Recipe graph: ${recipeCount} recipes from \`${path.relative(repoRoot, recipeManifestPath)}\``,
  '',
  '## Existing Brewing Surfaces',
  '',
  table(brewingSurfaces, [
    { label: 'Recipe type', key: 'type' },
    { label: 'Count', key: 'count', align: '---:' }
  ]),
  '## Design Direction',
  '',
  'Food preparation should become potion engineering, not sit beside vanilla brewing. The player first learns to preserve, steep, cook, and ferment for nutrition. The next step is to isolate the same biological sources into controlled effects.',
  '',
  'The vanilla brewing stand should stop being the main potion recipe authority. It can remain as a bottling/finishing station or as an ingredient in later apparatus, but Nether Wart plus arbitrary vanilla reagents should not bypass the food graph.',
  '',
  '## Implementation Model',
  '',
  '1. `Kettle infusion`: short, clean, plant-forward extracts from water, tea, juice, and simple food sources.',
  '2. `Keg fermentation`: stronger, slower, riskier concentrates from alcohol, nether heat, sugars, proteins, and region-specific crops.',
  '3. `Create bottling`: mechanical filling/emptying for scale, not new effect discovery.',
  '4. `Vanilla brewing stand`: remove vanilla potion mixes with `MoreJSEvents.registerPotionBrewing`; re-add only pack-authored finishing recipes if needed.',
  '5. `Magic potion systems`: Blood Magic, Botania, Ars, Reliquary, and TCon potion systems become later amplification/specialization layers, not early effect discovery.',
  '',
  '## Proposed Effect Source Catalogue',
  '',
  ...sourceCatalog.flatMap(entry => [
    `### ${entry.effect}`,
    '',
    `- Stage: \`${entry.proposedStage}\``,
    `- Preferred source ingredients: ${entry.preferredSources.map(id => `\`${id}\``).join(', ') || 'UNKNOWN'}`,
    `- Foods currently proving this effect: ${entry.foodCount}`,
    '',
    table(entry.topFoods.slice(0, 6), [
      { label: 'Food evidence', key: 'id', format: row => `\`${row.id}\`` },
      { label: 'Duration', key: 'durationSeconds', align: '---:', format: row => `${row.durationSeconds}s` },
      { label: 'Amp', key: 'amplifier', align: '---:' },
      { label: 'Diet groups', key: 'dietGroups', format: row => row.dietGroups.join(', ') || 'none' }
    ])
  ]),
  '## MUST DO',
  '',
  '- Remove vanilla potion mix progression with `MoreJSEvents.registerPotionBrewing` so vanilla ingredient shortcuts do not bypass kettle/keg engineering.',
  '- Add a data-driven effect-source catalogue under `kubejs/config`, generated from this audit but curated by hand before recipe generation.',
  '- Route early utility effects through `farmersrespite:brewing` and `farmersrespite:kettle_pouring`.',
  '- Route stronger combat and hazard effects through `brewinandchewin:fermenting` and `brewinandchewin:keg_pouring`.',
  '- Keep Create filling/emptying as scale/logistics support after effect discovery.',
  '',
  '## SHOULD DO',
  '',
  '- Add quest nodes after `FB_KEG`: `Effect Sources`, `Kettle Infusions`, `Fermented Concentrates`, `Potion Engineering`.',
  '- Put each effect in the quest text with its source identity: coffee means speed/haste, rose hips mean recovery, cactus chili means heat immunity, salmonberries mean water routes.',
  '- Add JEI-visible recipes for effect concentrates before final potions so players can reason about the graph.',
  '',
  '## MAYBE',
  '',
  '- Add custom intermediate items or fluids such as `kubejs:rose_hip_extract` only if existing fluids/items cannot clearly represent the effect.',
  '- Use Blood Magic flask recipes as a later intensification layer for duration/potency after the food-derived base effect exists.',
  '',
  '## DO NOT DO',
  '',
  '- Do not leave vanilla Nether Wart potion brewing as the default route.',
  '- Do not make every food with an effect craft directly into a potion.',
  '- Do not assign one universal reagent to all effects. The effect should be identified with a source family.',
  ''
].join('\n')

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)
console.log(`Wrote ${path.relative(repoRoot, reportPath)}`)
console.log(`Wrote ${path.relative(repoRoot, catalogPath)}`)
