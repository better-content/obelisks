#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const chapterDir = path.join(root, 'config/ftbquests/quests/chapters')
const registryFile = "/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/dump/registry_builtin/minecraft/item/_entries.txt"
const registry = fs.existsSync(registryFile) ? fs.readFileSync(registryFile, 'utf8') : ''
const knownItems = new Set([...registry.matchAll(/^([^\s]+)\s+raw_id=/gm)].map(m => m[1]))
for (const id of [
  'fission_reactor:fission_fuel_acceptor',
  'fission_reactor:fission_reactor_rod',
  'gases_and_plasmas:gas_pipe',
  'gases_and_plasmas:gas_compressor',
  'gases_and_plasmas:gas_fan',
  'gases_and_plasmas:electrolyzer',
  'gases_and_plasmas:electromagnet',
  'gases_and_plasmas:ionizer',
  'liquid_coolant:coolant_exchanger',
  'procedural_bouquets:bouquet_grid',
  'procedural_bouquets:potted_bouquet'
]) knownItems.add(id)

const coinOrder = ['copper', 'iron', 'tin', 'bronze', 'brass', 'silver', 'gold', 'diamond', 'platinum', 'emerald', 'ruby', 'sapphire', 'topaz']
const tierCoins = {
  copper: ['copper'],
  iron: ['copper', 'iron'],
  tin: ['copper', 'iron', 'tin'],
  bronze: ['copper', 'iron', 'tin', 'bronze'],
  brass: ['copper', 'iron', 'tin', 'bronze', 'brass'],
  silver: ['copper', 'iron', 'tin', 'bronze', 'brass', 'silver'],
  gold: ['copper', 'iron', 'tin', 'bronze', 'brass', 'silver', 'gold'],
  diamond: ['copper', 'iron', 'tin', 'bronze', 'brass', 'silver', 'gold', 'diamond'],
  platinum: ['copper', 'iron', 'tin', 'bronze', 'brass', 'silver', 'gold', 'diamond', 'platinum']
}

const tierGroups = {
  starting: { id: 'BTM_GROUP_STARTING', title: 'Starting Out', order: 0 },
  copper: { id: 'BTM_GROUP_COPPER', title: 'Copper Tier', order: 1 },
  iron: { id: 'BTM_GROUP_IRON', title: 'Iron Tier', order: 2 },
  tin: { id: 'BTM_GROUP_TIN', title: 'Tin Tier', order: 3 },
  bronze: { id: 'BTM_GROUP_BRONZE', title: 'Bronze Tier', order: 4 },
  brass: { id: 'BTM_GROUP_BRASS', title: 'Brass Tier', order: 5 },
  silver: { id: 'BTM_GROUP_SILVER', title: 'Silver Tier', order: 6 },
  gold: { id: 'BTM_GROUP_GOLD', title: 'Gold Tier', order: 7 },
  diamond: { id: 'BTM_GROUP_DIAMOND', title: 'Diamond Tier', order: 8 },
  platinum: { id: 'BTM_GROUP_PLATINUM', title: 'Platinum Tier', order: 9 },
  emerald: { id: 'BTM_GROUP_EMERALD', title: 'Emerald Tier', order: 10 },
  ruby: { id: 'BTM_GROUP_RUBY', title: 'Ruby Tier', order: 11 },
  sapphire: { id: 'BTM_GROUP_SAPPHIRE', title: 'Sapphire Tier', order: 12 },
  topaz: { id: 'BTM_GROUP_TOPAZ', title: 'Topaz Tier', order: 13 }
}
function groupForTier(tier) { return (tierGroups[tier] || tierGroups.copper).id }
function chapterGroupsSnbt() {
  const used = new Set(chapters.map(ch => ch.tier || 'copper'))
  const groups = Object.entries(tierGroups)
    .filter(([tier]) => used.has(tier))
    .map(([, g]) => `		{id:"${g.id}" order_index:${g.order} title:"${esc(g.title)}"}`)
  return `{
	chapter_groups: [
${groups.join(',\n')}
	]
}
`
}

function q(id, title, x, y, tasks, deps = [], description = []) { return { id, title, x, y, tasks, deps, description } }
function item(item, count = 1) { return { item, count } }
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') }
function desc(lines) {
  const list = Array.isArray(lines) ? lines : [lines]
  return list.length ? ` description:[${list.map(line => `"${esc(line)}"`).join(',')}]` : ''
}
function defaultQuestDescription(chapterPrefix, quest) {
  const taskList = quest.tasks.map(t => t.item).join(', ')
  const guidance = {
    TC: 'Tinkers is the metallurgy authority here. This checkpoint should teach deposits, molten material, repair, and foundry interpretation before Create machines dominate infrastructure.',
    DE: 'Death trophies are milestone evidence, not bulk fuel. Use this checkpoint to connect body maintenance, Still-Beating Hearts, and Blood Magic permission.',
    FB: 'Food and water are infrastructure. This checkpoint should improve route endurance, recovery, and settlement readiness instead of becoming a decorative side quest.',
    C1: 'Create begins only after early metallurgy. This checkpoint should prove andesite alloy, deployers, casings, and local power without bypassing Tinkers.',
    C2: 'This is the manufacturing layer where plates, mixers, press work, and brass turn Create into real infrastructure.',
    PG: 'SU heat and electricity are power infrastructure. This checkpoint compares water, wind, blaze burners, diesel, solar heat, fission heat, and Power Grid conversion from SU into electricity.',
    OC: 'OC2R is preferred for intersite communication. This checkpoint is about authored logic and wired site intelligence, not teleporting items.',
    SP: 'Space is a logistics and synthesis commitment. Rockets, suits, and chemical machines should consume the previous workshop rather than replace it.',
    AE: 'AE2 is local site intelligence. This checkpoint may make a factory smarter, but it must not become global logistics or infinite storage.',
    M1: 'Blood Magic sets permission. Side magic can become powerful only after the appropriate slate tier is proven.',
    AD: 'Adventure progression is a real crafting economy. Routes, coins, Wares, and villages are part of how the pack pays for risk.',
    VE: 'Village economy is a sideload path. It can supply comfort, recovery, and decor without bypassing machine or material progression.',
    S1: 'Acid chemistry interprets deposits as chemical packages. The pack side treats Acid Vat as a recipe surface; the mod source remains read-only.',
    PA: 'Post-AE2 branches improve local manufacturing, bounded storage, source integration, and body-scale rewards without breaking distance.',
    FU: 'Fusion is not just another generator. It requires gas handling, high electricity, fission-adjacent materials, AE2 control, and magnetic containment before it becomes a power source.'
  }[chapterPrefix] || 'This checkpoint exists to make the item graph explicit.'
  return [
    guidance,
    `Inspect or craft: ${taskList}.`
  ]
}
function taskSnbt(chapter, quest, t, idx) {
  const count = t.count && t.count !== 1 ? ` count:${t.count}L` : ''
  const nbt = t.matchNbt === false ? ' match_nbt:false' : ''
  return `{id:"${chapter}_${quest}_T${idx}" type:"item" item:"${t.item}"${count}${nbt}}`
}
function rewards(chapter, quest, tier) {
  if (tier === 'starting') return `[{id:"${chapter}_${quest}_R0" type:"item" item:"dotcoinmod:copper_coin" count:16}]`
  const list = tierCoins[tier] || ['copper']
  return '[' + list.map((coin, i) => `{id:"${chapter}_${quest}_R${i}" type:"item" item:"dotcoinmod:${coin}_coin" count:4}`).join(',') + ']'
}
function questSnbt(chapterPrefix, tier, quest) {
  const deps = quest.deps?.length ? ` dependencies:[${quest.deps.map(d => `"${d}"`).join(',')}] hide_until_deps_complete:true` : ''
  const text = quest.description?.length ? quest.description : defaultQuestDescription(chapterPrefix, quest)
  return `\t\t{id:"${quest.id}"${deps} title:"${esc(quest.title)}"${desc(text)} x:${quest.x.toFixed(1)}d y:${quest.y.toFixed(1)}d rewards:${rewards(chapterPrefix, quest.id, tier)} tasks:[${quest.tasks.map((t, i) => taskSnbt(chapterPrefix, quest.id, t, i + 1)).join(',')}]}`
}
function chapterSnbt(ch) {
  return `{
\tdefault_hide_dependency_lines: false
\tfilename: "${ch.filename}"
\tgroup: "${groupForTier(ch.tier)}"
\tid: "${ch.id}"
\torder_index: ${ch.order}
\ttitle: "${esc(ch.title)}"
\tdescription: [${(ch.description || []).map(line => `"${esc(line)}"`).join(',')}]
\tquests: [
${ch.quests.map(qt => questSnbt(ch.prefix, ch.tier, qt)).join('\n')}
\t]
}
`
}

const chapters = [
  {
    filename: 'starting_out', prefix: 'SO', id: 'BTM_STARTING_OUT', order: 0, title: 'Starting Out', tier: 'starting',
    description: ['This chapter is the playable tutorial spine: foothold, body, Tinkers, Nether netherrack, meltery, then exits.', 'Every quest pays 16 copper coins so the village economy unlocks immediately after a few real survival commitments.'],
    quests: [
      q('SO_BACKPACK', 'Carry More', -8, 0, [item('sophisticatedbackpacks:backpack')], [], ['Distance matters here. A backpack is not luxury storage; it is what lets a scouting run become a supply line.']),
      q('SO_LIGHT', 'Make Light', -6, 0, [item('minecraft:torch', 16)], ['SO_BACKPACK'], ['Commit to a safe pocket of terrain. Darkness should be a local problem you solve with carried supplies.']),
      q('SO_SHELTER', 'Claim Shelter', -4, 0, [item('minecraft:white_bed')], ['SO_LIGHT'], ['A bed is the first sign that this location is becoming a foothold instead of a camp.']),
      q('SO_WATER', 'Carry Water', -2, 0, [{ item: 'thirst:terracotta_water_bowl', matchNbt: false }], ['SO_BACKPACK'], ['Thirst is not a background debuff. Carry a vessel before long trips, obelisk runs, and blast mining.']),
      q('SO_SEWING', 'Body Temperature', 0, 0, [item('cold_sweat:sewing_table')], ['SO_BACKPACK'], ['Cold and heat make terrain matter. The sewing table starts the habit of preparing your body for a route.']),
      q('SO_COOKING', 'Food Is Infrastructure', 2, 0, [item('farmersdelight:cooking_pot'), item('farmersdelight:skillet')], ['SO_WATER'], ['Meals are base infrastructure. Better food means longer routes, safer retreats, and less panic after death.']),
      q('SO_TINKER', 'Tinkers Station', -6, 2, [item('tconstruct:tinker_station')], ['SO_LIGHT'], ['This pack expects tool investment. Tinkers is the early crafting authority before Create takes over infrastructure.']),
      q('SO_PARTS', 'Tool Parts', -4, 2, [item('tconstruct:part_builder')], ['SO_TINKER'], ['Tool parts teach replacement and repair instead of disposable vanilla tools.']),
      q('SO_CRAFTING', 'Crafting Station', -2, 2, [item('tconstruct:crafting_station')], ['SO_TINKER'], ['Keep the workshop physical. The station is the first small piece of authored infrastructure.']),
      q('SO_REPAIR', 'Repair Mindset', 0, 2, [item('tconstruct:repair_kit')], ['SO_PARTS'], ['Do not throw tools away. Repair is part of the cost of distance and deposits.']),
      q('SO_HOOK', 'Hooks and Routes', 2, 2, [item('rehooked:wood_hook')], ['SO_BACKPACK'], ['Movement tools are route tools. They help traverse terrain; they do not erase distance.']),
      q('SO_TNT', 'Controlled Blast Mining', 4, 2, [item('minecraft:tnt')], ['SO_PARTS'], ['TNT is meant to be an early mining method. It is loud, risky, and efficient when you plan the blast.']),
      q('SO_TRADE_FLOAT', 'Sixteen Copper Coins', 6, 2, [item('dotcoinmod:copper_coin', 16)], ['SO_BACKPACK'], ['Holding copper coins unlocks village trading. Coins are a crafting system, not just money.']),
      q('SO_NETHER', 'First Nether Obelisk Run', -4, 4, [item('minecraft:netherrack', 16)], ['SO_SHELTER', 'SO_WATER', 'SO_COOKING'], ['This is a prepared raid, not a base move. Pack light, bring food and water, take netherrack, retreat successfully.']),
      q('SO_GROUT', 'Netherrack Grout', -2, 4, [item('tconstruct:grout', 8)], ['SO_NETHER', 'SO_PARTS'], ['Base grout now remembers the Nether. This is the first hard proof that obelisks feed progression.']),
      q('SO_MELTERY', 'First Meltery', 0, 4, [item('tconstruct:seared_melter'), item('tconstruct:seared_heater'), item('tconstruct:seared_faucet'), item('tconstruct:seared_basin'), item('tconstruct:seared_table')], ['SO_GROUT'], ['The meltery is the first metallurgy checkpoint. From here, ore is a material stream instead of a furnace shortcut.']),
      q('SO_EXIT_TECH', 'Exit: Tech 1', 2, 4, [item('tconstruct:seared_brick', 8)], ['SO_MELTERY'], ['You have enough seared infrastructure to enter the tech spine.']),
      q('SO_EXIT_MAGIC', 'Exit: Body and Blood', 4, 4, [item('rpgstats:still_beating_heart')], ['SO_WATER', 'SO_COOKING'], ['The body is maintained by food and water, then witnessed by death. Hearts bridge survival into Blood Magic.']),
      q('SO_EXIT_ADVENTURE', 'Exit: Routes and Villages', 6, 4, [item('minecraft:compass'), item('minecraft:map')], ['SO_TRADE_FLOAT', 'SO_NETHER'], ['Villages, maps, coins, and obelisks are the adventure economy. Start thinking in routes.'])
    ]
  },
  {
    filename: 'tinkers_construct', prefix: 'TC', id: 'BTM_TINKERS', order: 1, title: 'Iron Tier - Tinkers Construct', tier: 'iron', description: ['Tinkers owns early metallurgy: repair, molten primaries, smeltery scale, scorched progression, and foundry byproducts.'], quests: [
      q('TC_SEARED_CASE', 'Seared Machine Casing', 0, 0, [item('kubejs:seared_machine_casing')], ['SO_MELTERY']),
      q('TC_SMELTERY', 'Smeltery Authority', 2, 0, [item('tconstruct:smeltery_controller'), item('tconstruct:seared_fuel_tank')], ['TC_SEARED_CASE']),
      q('TC_FIRST_COPPER', 'Primary Molten Output', 4, -1, [item('minecraft:copper_ingot')], ['TC_SMELTERY']),
      q('TC_FIRST_IRON', 'Ironstone Pays Out', 4, 1, [item('minecraft:iron_ingot')], ['TC_SMELTERY']),
      q('TC_SCORCHED', 'Scorched Machine Casing', 6, 0, [item('kubejs:scorched_machine_casing')], ['TC_FIRST_COPPER', 'TC_FIRST_IRON']),
      q('TC_FOUNDRY', 'Foundry Reads Geology', 8, 0, [item('tconstruct:foundry_controller')], ['TC_SCORCHED']),
      q('TC_ALLOYER', 'Scorched Alloying', 10, -1, [item('tconstruct:scorched_alloyer')], ['TC_SCORCHED']),
      q('TC_FUEL', 'Scorched Fuel Handling', 10, 1, [item('tconstruct:scorched_fuel_tank')], ['TC_SCORCHED'])
    ]
  },
  {
    filename: 'death', prefix: 'DE', id: 'BTM_DEATH', order: 2, title: 'Iron Tier - Death and Blood', tier: 'iron', description: ['Still-Beating Hearts are death trophies and Blood Magic keys. They should feel like ordeal evidence, not farmable reagent dust.'], quests: [
      q('DE_HEART', 'Still-Beating Heart', 0, 0, [item('rpgstats:still_beating_heart')], ['SO_EXIT_MAGIC']),
      q('DE_ALTAR', 'First Blood Altar', 2, 0, [item('bloodmagic:altar')], ['DE_HEART']),
      q('DE_WEAK_HEART', 'Blood-Touched Heart', 4, 0, [item('kubejs:weak_blood_heart')], ['DE_ALTAR']),
      q('DE_WEAK_ORB', 'Weak Blood Orb', 6, 0, [item('bloodmagic:weakbloodorb')], ['DE_WEAK_HEART']),
      q('DE_BLANK', 'Blank Slate', 8, -1, [item('bloodmagic:blankslate')], ['DE_WEAK_ORB']),
      q('DE_BODY_LOOP', 'Body Systems Matter', 8, 1, [item('farmersdelight:cooking_pot'), item('thirst:sand_filter')], ['DE_WEAK_ORB'])
    ]
  },
  {
    filename: 'food_body', prefix: 'FB', id: 'BTM_FOOD_BODY', order: 3, title: 'Iron Tier - Food, Water, and Body', tier: 'iron',
    description: ['Food is not decorative in this pack. This chapter turns early cooking into expedition readiness, thirst management, and the bodily logic that makes Blood Magic feel earned.'],
    quests: [
      q('FB_CUTTING', 'Knife Work and Prep', 0, 0, [item('farmersdelight:cutting_board')], ['SO_COOKING'], ['Cutting boards turn food from found calories into prepared stock. This is also where many side ingredients start being worth collecting.']),
      q('FB_DOUGH', 'Staple Dough', 2, -1, [item('farmersdelight:wheat_dough')], ['FB_CUTTING'], ['Dough is the first reliable staple. It gives farming a practical purpose before automation.']),
      q('FB_CANVAS', 'Canvas and Packing', 2, 1, [item('farmersdelight:canvas')], ['FB_CUTTING'], ['Canvas ties food infrastructure to carrying, drying, and expedition packing.']),
      q('FB_STOVE', 'Permanent Kitchen', 4, 0, [item('farmersdelight:stove')], ['FB_DOUGH', 'FB_CANVAS'], ['The stove marks the kitchen as infrastructure. A base that cannot cook cannot support long routes.']),
      q('FB_SOUP', 'Hydrating Meals', 6, -1, [item('farmersdelight:vegetable_soup')], ['FB_STOVE'], ['Soups are survival logistics: food and water pressure handled together.']),
      q('FB_FEAST', 'Group Expedition Stock', 6, 1, [item('farmersdelight:roast_chicken_block')], ['FB_STOVE'], ['Feasts are for team travel, recovery, and staging around dangerous deposits or obelisks.']),
      q('FB_FILTER', 'Clean Water Site', 8, -1, [item('thirst:sand_filter')], ['FB_SOUP', 'C1_CASING'], ['The sand filter is post-Create survival infrastructure. Clean water should be built, not assumed.']),
      q('FB_KETTLE', 'Kettle Drinks', 8, 1, [item('farmersrespite:kettle')], ['FB_FEAST'], ['Tea and hot drinks make body management more interesting than eating one best food forever.']),
      q('FB_TEA', 'Route Tea', 10, 1, [item('farmersrespite:green_tea')], ['FB_KETTLE'], ['Pack drinks alongside food. A route with prepared drinks is a different route.']),
      q('FB_KEG', 'Fermentation', 12, 0, [item('brewinandchewin:keg')], ['FB_KETTLE', 'C2_ANDESITE_CASE'], ['Fermentation is slow value: stronger travel food, tavern economy, and material for village contracts.']),
      q('FB_PRESERVED', 'Preserved Food', 14, -1, [item('brewinandchewin:jerky'), item('brewinandchewin:kimchi')], ['FB_KEG'], ['Preserved food is for distance. It belongs in backpacks, trains, ships, and outpost crates.']),
      q('FB_BREW', 'Brewed Recovery', 14, 1, [item('brewinandchewin:beer')], ['FB_KEG'], ['Brews are powerful enough to matter, but they should come from a kitchen and a route economy, not loot spam.'])
    ]
  },
  {
    filename: 'create_i', prefix: 'C1', id: 'BTM_CREATE_I', order: 4, title: 'Tin Tier - Create I', tier: 'tin', description: ['Create starts after alloying. This chapter teaches hand power, millstones, deployer assembly, and sustainable local power.'], quests: [
      q('C1_ALLOY', 'Alloyed Andesite', 0, 0, [item('create:andesite_alloy')], ['TC_FOUNDRY']),
      q('C1_CRANK', 'Hand Crank', 2, 0, [item('create:hand_crank')], ['C1_ALLOY']),
      q('C1_MILL', 'Millstone', 4, 0, [item('create:millstone')], ['C1_CRANK']),
      q('C1_DEPLOYER', 'Deployer', 6, 0, [item('create:deployer')], ['C1_MILL']),
      q('C1_CASING', 'Deployed Andesite Casing', 8, 0, [item('create:andesite_casing')], ['C1_DEPLOYER']),
      q('C1_POWER_WATER', 'Water Wheel', 10, -1, [item('create:water_wheel')], ['C1_CASING']),
      q('C1_POWER_WIND', 'Windmill Bearing', 10, 1, [item('create:windmill_bearing')], ['C1_CASING']),
      q('C1_WATER', 'Clean Water Infrastructure', 12, 0, [item('thirst:sand_filter')], ['C1_POWER_WATER']),
      q('C1_CRUSHED', 'Deposit Preprocessing', 14, 0, [item('realisticores:crushed_copper_sulfide_ore')], ['C1_WATER'])
    ]
  },
  {
    filename: 'create_ii', prefix: 'C2', id: 'BTM_CREATE_II', order: 5, title: 'Bronze Tier - Create II', tier: 'bronze', description: ['Create II is the first real manufactured-component layer: machine casings, press work, plates, mixers, brass, and larger mechanisms.'], quests: [
      q('C2_ANDESITE_CASE', 'Andesite Machine Casing', 0, 0, [item('kubejs:andesite_machine_casing')], ['C1_CRUSHED']),
      q('C2_PRESS', 'Mechanical Press', 2, 0, [item('create:mechanical_press')], ['C2_ANDESITE_CASE']),
      q('C2_PLATES', 'Pressed or Cast Plates', 4, -1, [item('chemlib:iron_plate'), item('chemlib:copper_plate')], ['C2_PRESS']),
      q('C2_MIXER', 'Mechanical Mixer', 4, 1, [item('create:mechanical_mixer')], ['C2_PRESS']),
      q('C2_SAW_DRILL', 'Industrial Contact Tools', 6, -1, [item('create:mechanical_saw'), item('create:mechanical_drill')], ['C2_ANDESITE_CASE']),
      q('C2_CRAFTER', 'Mechanical Crafting', 6, 1, [item('create:mechanical_crafter')], ['C2_ANDESITE_CASE']),
      q('C2_BRASS_INGOT', 'Brass Is Create Steel', 8, -1, [item('create:brass_ingot')], ['C2_MIXER']),
      q('C2_BRASS_SHEET', 'Brass Sheet', 8, 1, [item('create:brass_sheet')], ['C2_BRASS_INGOT', 'C2_PLATES']),
      q('C2_BRASS', 'Brass Machine Casing', 10, 0, [item('kubejs:brass_machine_casing')], ['C2_BRASS_SHEET'])
    ]
  },
  {
    filename: 'electricity', prefix: 'PG', id: 'BTM_SU_HEAT_ELECTRICITY', order: 6, title: 'Brass Tier - SU Heat and Electricity', tier: 'brass', description: ['This chapter is the power atlas. Water wheels, windmills, blaze burners, diesel engines, solar heat, and fission all make or support SU/heat.', 'Power Grid is the electrical step: build generator hardware, circuits, relays, storage, and learn how rotational work becomes electricity.'], quests: [
      q('PG_WATER_GRAPH', 'SU Source: Water Wheel', -2, -2, [item('create:water_wheel')], ['C1_POWER_WATER'], ['Water wheels are the first stable SU source. They are local, terrain-aware, and good enough for early workshops.']),
      q('PG_WIND_GRAPH', 'SU Source: Windmill', -2, 0, [item('create:windmill_bearing')], ['C1_POWER_WIND'], ['Windmills are the scalable early alternative. They reward structure, sails, and exposed space.']),
      q('PG_BLAZE_GRAPH', 'Heat Source: Blaze Burner', -2, 2, [item('create:blaze_burner')], ['C2_MIXER'], ['Blaze burners turn fuel and logistics into process heat. Treat them as heat infrastructure, not just mixer upgrades.']),
      q('PG_DIESEL_GRAPH', 'SU Source: Diesel Engine', 0, -3, [item('createdieselgenerators:diesel_engine')], ['C2_BRASS'], ['Diesel is a fluid logistics branch: oil discovery, distillation, fuel routing, and stronger rotational output.']),
      q('PG_DIESEL_REFINING', 'Diesel Refining', 2, -3, [item('createdieselgenerators:distillation_controller')], ['PG_DIESEL_GRAPH'], ['Refining makes diesel a real infrastructure chain instead of one engine recipe.']),
      q('PG_SOLAR_HEAT', 'Heat Source: CNA Solar', 0, 3, [item('create_new_age:basic_solar_heating_plate')], ['C2_BRASS'], ['Solar heat is passive but material-bound. It is useful when terrain and site planning support it.']),
      q('PG_CONDUCTIVE', 'Conductive Casing', 0, 0, [item('powergrid:conductive_casing')], ['C2_BRASS'], ['Conductive casing starts the electrical build. This is not redstone; it is manufactured electrical infrastructure.']),
      q('PG_CASE', 'Power Grid Machine Casing', 2, 0, [item('kubejs:power_grid_machine_casing')], ['PG_CONDUCTIVE']),
      q('PG_GENERATOR_HOUSING', 'Step 1: Generator Housing', 4, -2, [item('powergrid:generator_housing')], ['PG_CASE'], ['The generator housing is the physical bridge from rotation to electricity. Build it before pretending you have a grid.']),
      q('PG_GENERATOR_ROTOR', 'Step 2: Rotor and Commutator', 6, -2, [item('powergrid:generator_induction_rotor'), item('powergrid:generator_commutator')], ['PG_GENERATOR_HOUSING'], ['Rotors and commutators make the generator legible: moving magnetic hardware creates usable current.']),
      q('PG_CONNECTORS', 'Step 3: Wires and Connectors', 4, 0, [item('powergrid:wire_connector'), item('powergrid:wire')], ['PG_CASE'], ['Electricity needs visible conductors. Keep the grid inspectable and local.']),
      q('PG_CIRCUIT', 'Step 4: Integrated Circuit', 6, 0, [item('powergrid:integrated_circuit')], ['PG_CONNECTORS']),
      q('PG_RELAY', 'Step 5: Relay Control', 6, 2, [item('powergrid:redstone_relay')], ['PG_CONNECTORS']),
      q('PG_BATTERY', 'Step 6: Stored Electricity', 8, 0, [item('powergrid:battery')], ['PG_CIRCUIT', 'PG_RELAY', 'PG_GENERATOR_ROTOR'], ['Storage makes electrical work forgiving enough to use, but still bounded by the site grid.']),
      q('PG_HEAT_PIPE', 'Heat Transport', 10, -1, [item('create_new_age:heat_pipe')], ['PG_BATTERY', 'PG_SOLAR_HEAT']),
      q('PG_HEAT_PUMP', 'Heat Pump', 10, 1, [item('create_new_age:heat_pump')], ['PG_HEAT_PIPE']),
      q('PG_HEATSYNC', 'Heat Affects the Body', 12, 2, [item('create_new_age:heat_pipe'), item('cold_sweat:sewing_table')], ['PG_HEAT_PUMP'], ['HeatSync makes heat pipes part of body survival. A hot or cold workshop is now an engineering condition, not just a machine stat.']),
      q('PG_TRANSMISSION_LOSS', 'No Free SU Transport', 12, -2, [item('create:shaft'), item('create:gearbox'), item('create:belt_connector')], ['PG_WATER_GRAPH', 'PG_WIND_GRAPH'], ['Transmission Loss makes shafts, cogs, gearboxes, and belts part of the operating cost of distance. Keep power generation local or pay for long runs.']),
      q('PG_STIRLING', 'Heat to SU: Stirling Engine', 14, 0, [item('create_new_age:stirling_engine')], ['PG_HEAT_PUMP'], ['Stirling engines make the heat loop explicit: heat sources become rotational work.']),
      q('PG_COOLANT', 'Liquid Coolant Exchanger', 16, 0, [item('liquid_coolant:coolant_exchanger')], ['PG_STIRLING', 'PG_BATTERY'], ['Coolant loops are the bridge from ordinary heat transport into serious fission and fusion thermal engineering.']),
      q('PG_FISSION_ACCEPTOR', 'Fission Fuel Acceptor', 18, -1, [item('fission_reactor:fission_fuel_acceptor')], ['PG_COOLANT', 'S1_SYNTHESIS_EXIT'], ['Fission is a nucleus-transformation and heat branch. It belongs after electrical control and chemical material routing.']),
      q('PG_FISSION_ROD', 'Fission Reactor Rod', 18, 1, [item('fission_reactor:fission_reactor_rod')], ['PG_FISSION_ACCEPTOR'], ['The rod is the active heat/nucleus-transformer surface. It should feel like dangerous infrastructure, not a furnace upgrade.'])
    ]
  },
  {
    filename: 'oc2r', prefix: 'OC', id: 'BTM_OC2R', order: 7, title: 'Silver Tier - OC2R', tier: 'silver', description: ['OC2R is the preferred intersite communication layer. It should coordinate routes and machines without becoming item teleportation.'], quests: [
      q('OC_TRANSISTOR', 'Transistor', 0, -1, [item('oc2r:transistor')], ['PG_BATTERY']),
      q('OC_CASE', 'OC2R Machine Casing', 0, 1, [item('kubejs:oc2r_machine_casing')], ['PG_BATTERY']),
      q('OC_COMPUTER', 'Local Computer', 2, 0, [item('oc2r:computer')], ['OC_TRANSISTOR', 'OC_CASE']),
      q('OC_NETWORK', 'Wired Site Communication', 4, 0, [item('oc2r:network_hub'), item('oc2r:network_connector')], ['OC_COMPUTER']),
      q('OC_CREATE_BRIDGE', 'Create Device Bridge', 6, -2, [item('create:speedometer'), item('create:stressometer'), item('oc2r:network_connector')], ['OC_NETWORK'], ['ComputerBridge exposes Create machines to OC2R. It is intersite communication and observability, not item teleportation.']),
      q('OC_ROBOT', 'Authored Field Work', 6, -1, [item('oc2r:robot')], ['OC_NETWORK']),
      q('OC_ROUTE_LOGIC', 'Route Logic', 6, 1, [item('oc2r:redstone_interface'), item('oc2r:network_interface_card')], ['OC_NETWORK'])
    ]
  },
  {
    filename: 'space', prefix: 'SP', id: 'BTM_SPACE', order: 8, title: 'Gold Tier - Creating Space', tier: 'gold', description: ['Creating Space is a major logistics commitment: suit up, build rockets, route materials, and unlock chemical synthesis.'], quests: [
      q('SP_TABLE', 'Rocket Engineer Table', 0, 0, [item('creatingspace:rocket_engineer_table')], ['OC_NETWORK']),
      q('SP_CASE', 'Space Machine Casing', 2, 0, [item('kubejs:space_machine_casing')], ['SP_TABLE']),
      q('SP_SUIT_BASIC', 'Basic Spacesuit', 4, -1, [item('creatingspace:basic_spacesuit_helmet'), item('creatingspace:basic_spacesuit_leggings'), item('creatingspace:basic_spacesuit_boots')], ['SP_CASE']),
      q('SP_ENGINE', 'Rocket Engine', 4, 1, [item('creatingspace:rocket_engine')], ['SP_CASE']),
      q('SP_CASING', 'Rocket Casing', 6, -1, [item('creatingspace:rocket_casing')], ['SP_ENGINE']),
      q('SP_CONTROLS', 'Rocket Controls', 6, 1, [item('creatingspace:rocket_controls')], ['SP_ENGINE']),
      q('SP_CHEM', 'Chemical Synthesizer', 8, 0, [item('creatingspace:chemical_synthesizer')], ['SP_CASING', 'SP_CONTROLS']),
      q('SP_SUIT_ADV', 'Advanced Spacesuit', 10, 0, [item('creatingspace:advanced_spacesuit_helmet'), item('creatingspace:advanced_spacesuit_leggings'), item('creatingspace:advanced_spacesuit_boots')], ['SP_CHEM'])
    ]
  },
  {
    filename: 'ae2', prefix: 'AE', id: 'BTM_AE2', order: 9, title: 'Diamond Tier - AE2 Local Intelligence', tier: 'diamond', description: ['AE2 is local intelligence for a committed site. Storage and autocrafting improve a base, but trains and routes still move matter.'], quests: [
      q('AE_CHARGER', 'Certus Preparation', 0, -1, [item('ae2:charger')], ['SP_CHEM']),
      q('AE_INSCRIBER', 'Processor Fabrication', 0, 1, [item('ae2:inscriber')], ['SP_CHEM']),
      q('AE_CASE', 'AE2 Machine Casing', 2, 0, [item('kubejs:ae2_machine_casing')], ['AE_CHARGER', 'AE_INSCRIBER']),
      q('AE_CONTROLLER', 'Local Controller', 4, 0, [item('ae2:controller')], ['AE_CASE']),
      q('AE_DRIVE', 'Site Storage, Not Global Logistics', 6, -1, [item('ae2:drive')], ['AE_CONTROLLER']),
      q('AE_CRAFTING', 'Local Pattern Work', 6, 1, [item('ae2:crafting_unit'), item('ae2:molecular_assembler')], ['AE_CONTROLLER']),
      q('AE_SPATIAL', 'Spatial Field Work', 8, 0, [item('ae2:spatial_io_port')], ['AE_DRIVE', 'AE_CRAFTING'])
    ]
  },

  {
    filename: 'create_iii', prefix: 'C3', id: 'BTM_CREATE_III', order: 14, title: 'Silver Tier - Create III Logistics', tier: 'silver', description: ['Create III is physical logistics: trains, conductors, route displays, Little Logistics vessels, and authored intersite movement.'], quests: [
      q('C3_TRACK_COUPLER', 'Track Coupler', 0, 0, [item('railways:track_coupler')], ['C2_BRASS'], ['Couplers make trains into planned logistics instead of minecart clutter.']),
      q('C3_CONDUCTOR', 'Conductor Tools', 2, -1, [item('railways:conductor_whistle'), item('railways:black_conductor_cap')], ['C3_TRACK_COUPLER'], ['The conductor layer is for authored train work and route maintenance.']),
      q('C3_BUFFER', 'Rail Yard Hardware', 2, 1, [item('railways:big_buffer')], ['C3_TRACK_COUPLER'], ['Buffers and yards make train stations physical places.']),
      q('C3_NAVIGATOR', 'Railway Navigation', 4, -1, [item('createrailwaysnavigator:navigator'), item('createrailwaysnavigator:advanced_display')], ['C3_CONDUCTOR', 'OC_NETWORK'], ['Navigation displays are local infrastructure for distance, not teleportation.']),
      q('C3_STEAM_LOCO', 'Little Steam Locomotive', 4, 1, [item('littlelogistics:steam_locomotive')], ['C3_BUFFER'], ['Small trains are early intersite logistics and outpost supply.']),
      q('C3_LAND_ROUTE', 'Land Route Card', 6, 1, [item('littlelogistics:locomotive_route')], ['C3_STEAM_LOCO', 'OC_ROUTE_LOGIC'], ['Route cards turn transport into authored logistics.']),
      q('C3_TUG', 'Tug and Barge', 6, -1, [item('littlelogistics:tug'), item('littlelogistics:barge')], ['C3_BUFFER'], ['Water logistics should matter where terrain makes rails awkward.']),
      q('C3_WATER_ROUTE', 'Water Route Card', 8, -1, [item('littlelogistics:tug_route')], ['C3_TUG', 'OC_ROUTE_LOGIC'], ['Water route planning is still physical logistics.']),
      q('C3_CHARGER', 'Vehicle Charging', 8, 1, [item('littlelogistics:vessel_charger')], ['PG_BATTERY', 'C3_STEAM_LOCO'], ['Chargers connect the logistics layer back to the power grid.'])
    ]
  },
  {
    filename: 'magic_ii', prefix: 'M2', id: 'BTM_MAGIC_II', order: 15, title: 'Diamond Tier - Magic II Power Branches', tier: 'diamond', description: ['Magic II surfaces the stronger side-magic branches after Blood Magic permissions are already proven.'], quests: [
      q('M2_OCCULT_STORAGE', 'Occult Storage Permission', 0, -2, [item('occultism:storage_controller')], ['M1_DEMONIC'], ['Occult storage is useful, but it must not become an early infinite-storage substitute.']),
      q('M2_OCCULT_MINER', 'Bounded Spirit Mining', 2, -2, [item('occultism:miner_foliot_unspecialized')], ['M2_OCCULT_STORAGE'], ['Spirit miners are late enough to be convenience, not the first mining plan.']),
      q('M2_BOTANIA_TERRA', 'Terrestrial Plate', 0, 0, [item('botania:terra_plate')], ['M1_BOTANIA'], ['Botania engineering starts after the Demonic Slate tier.']),
      q('M2_ALFHEIM', 'Alfheim Portal', 2, 0, [item('botania:alfheim_portal')], ['M2_BOTANIA_TERRA'], ['Dimensional magic has to be a constructed commitment.']),
      q('M2_FORGE', 'Forbidden Forge', 0, 2, [item('forbidden_arcanus:hephaestus_forge')], ['M1_DEMONIC'], ['Forbidden and Arcanus belongs at Demonic tier, not early utility tier.']),
      q('M2_THEURGY', 'Theurgy Accumulator', 2, 2, [item('theurgy:sal_ammoniac_accumulator')], ['M2_FORGE'], ['Theurgy is matter transmutation, so it belongs near late magic and synthesis rather than early ore solving.']),
      q('M2_HEXCAST', 'Hex Focus and Staff', 4, -1, [item('hexcasting:focus'), item('hexcasting:staff/oak')], ['M1_ETHEREAL'], ['Programmable magic waits for Ethereal Slate permission.']),
      q('M2_MNA', 'Mana and Artifice Runeforge', 4, 1, [item('mna:runeforge'), item('mna:manaweaver_wand')], ['M1_ETHEREAL'], ['Mana and Artifice is late magical infrastructure, not a side-door around Blood Magic.']),
      q('M2_ARS_POWER', 'Ars Addon Power', 6, 0, [item('ars_elemental:advanced_prism'), item('ars_creo:starbuncle_wheel'), item('ars_caelum:ritual_conjure_island_starter')], ['M1_ETHEREAL'], ['Late Ars branches are allowed to be powerful after the Blood tier says yes.'])
    ]
  },
  {
    filename: 'synthesis_ii', prefix: 'S2', id: 'BTM_SYNTHESIS_II', order: 16, title: 'Platinum Tier - Synthesis II', tier: 'platinum', description: ['Synthesis II extends Acid Vat and Chemlib into late plates and slurry logistics. The Acid Vat mod source remains read-only; this chapter only references exposed pack items.'], quests: [
      q('S2_PUMP', 'Mechanical Slurry Pump', 0, 0, [item('acid_vat:mechanical_slurry_pump')], ['S1_SYNTHESIS_EXIT'], ['Slurry movement is physical infrastructure, not a magic pipe.']),
      q('S2_INTERFACE', 'Portable Slurry Interface', 2, -1, [item('acid_vat:portable_slurry_interface')], ['S2_PUMP'], ['Portable interfaces make chemistry fieldwork practical.']),
      q('S2_VALVE', 'Slurry Valve Control', 2, 1, [item('acid_vat:slurry_valve')], ['S2_PUMP'], ['Valves make chemical routing authored and inspectable.']),
      q('S2_URANIUM', 'Uranium Plate', 4, -2, [item('chemlib:uranium_plate')], ['S2_INTERFACE'], ['Lava-depth and deep synthesis materials become engineered plates.']),
      q('S2_THORIUM', 'Thorium Plate', 4, 0, [item('chemlib:thorium_plate')], ['S2_INTERFACE'], ['Thorium is a late matter-routing material, not furnace ore.']),
      q('S2_IRIDIUM', 'Iridium Plate', 4, 2, [item('chemlib:iridium_plate')], ['S2_VALVE'], ['Iridium should represent serious chemistry and extreme-resource commitment.']),
      q('S2_RUTHENIUM', 'Ruthenium Plate', 6, 0, [item('chemlib:ruthenium_plate')], ['S2_URANIUM', 'S2_THORIUM', 'S2_IRIDIUM'], ['Ruthenium is a capstone signal for advanced chemical interpretation.'])
    ]
  },
  {
    filename: 'books', prefix: 'BK', id: 'BTM_BOOKS', order: 17, title: 'Reference Books', tier: 'copper', description: ['Books are references, not gates. This chapter gives players obvious places to find documentation without making guidebooks the progression key.'], quests: [
      q('BK_QUEST_BOOK', 'Quest Book', 0, 0, [item('ftbquests:book')], ['SO_BACKPACK'], ['Use the quest book as the authored graph. It is allowed to explain; it should not be the mechanical gate.']),
      q('BK_TCON', 'Tinkers Encyclopedia', 2, -1, [item('tconstruct:encyclopedia')], ['SO_TINKER'], ['Tinkers documentation belongs near the repair and metallurgy spine.']),
      q('BK_PATCHOULI', 'Patchouli Guides', 2, 1, [item('patchouli:guide_book')], ['SO_BACKPACK'], ['Patchouli guide books vary by mod/NBT, so this is a loose reference checkpoint rather than a hard mod gate.']),
      q('BK_MNA', 'Codex Arcana', 4, 1, [item('mna:guide_book')], ['M2_MNA'], ['Mana and Artifice documentation is late because the mod itself is late.'])
    ]
  },
  {
    filename: 'post_ae2', prefix: 'PA', id: 'BTM_POST_AE2', order: 18, title: 'Platinum Tier - Post-AE2 Branches', tier: 'platinum', description: ['Post-AE2 fans into a few strong branches: quantum manufacturing, extended local intelligence, bounded storage, source-AE hybrid, and quantum body rewards.'], quests: [
      q('PA_QUANTUM_STRUCTURE', 'Quantum Structure', 0, 0, [item('advanced_ae:quantum_structure')], ['AE_SPATIAL']),
      q('PA_REACTION', 'Reaction Chamber', 2, -1, [item('advanced_ae:reaction_chamber')], ['PA_QUANTUM_STRUCTURE']),
      q('PA_QUANTUM_CORE', 'Quantum Core', 2, 1, [item('advanced_ae:quantum_core')], ['PA_QUANTUM_STRUCTURE']),
      q('PA_QUANTUM_CRAFTING', 'Quantum Crafting Branch', 4, -2, [item('advanced_ae:quantum_crafter'), item('advanced_ae:quantum_accelerator')], ['PA_REACTION', 'PA_QUANTUM_CORE']),
      q('PA_MULTI_THREAD', 'Parallel Pattern Work', 6, -2, [item('advanced_ae:quantum_multi_threader')], ['PA_QUANTUM_CRAFTING']),
      q('PA_EXTENDED_AE', 'Extended Local Intelligence', 4, 0, [item('expatternprovider:ex_drive'), item('expatternprovider:ex_interface'), item('expatternprovider:ex_pattern_provider')], ['PA_QUANTUM_CORE']),
      q('PA_MATRIX', 'Assembler Matrix', 6, 0, [item('expatternprovider:assembler_matrix_frame'), item('expatternprovider:assembler_matrix_crafter')], ['PA_EXTENDED_AE']),
      q('PA_DEEP_STORAGE', 'Bounded Deep Storage', 4, 2, [item('ae2additions:super_cell_housing'), item('ae2additions:super_cell_1024k')], ['PA_QUANTUM_CORE']),
      q('PA_DISK_STORAGE', 'Disk Storage Branch', 6, 2, [item('ae2additions:disk_item_1024k')], ['PA_DEEP_STORAGE']),
      q('PA_SOURCE_BRIDGE', 'Source-AE Bridge', 8, 0, [item('arseng:me_source_jar'), item('arseng:source_acceptor'), item('arseng:source_cell_housing')], ['PA_MATRIX', 'M1_ETHEREAL']),
      q('PA_PORTABLE_SOURCE', 'Portable Source Cell', 10, 0, [item('arseng:portable_source_cell_64k')], ['PA_SOURCE_BRIDGE']),
      q('PA_BODY_BASE', 'Quantum Body Base', 8, 2, [item('advanced_ae:quantum_upgrade_base')], ['PA_QUANTUM_CORE', 'S1_SYNTHESIS_EXIT']),
      q('PA_LAVA_CARD', 'Lava-Depth Body Reward', 10, 1, [item('advanced_ae:lava_immunity_card')], ['PA_BODY_BASE']),
      q('PA_REGEN_CARD', 'Regeneration Body Reward', 10, 3, [item('advanced_ae:regeneration_card')], ['PA_BODY_BASE']),
      q('PA_MAGNET_CARD', 'Magnetic Field Reward', 12, 2, [item('advanced_ae:magnet_card')], ['PA_BODY_BASE']),
      q('PA_QUANTUM_ARMOR', 'Quantum Armor Set', 14, 2, [item('advanced_ae:quantum_helmet'), item('advanced_ae:quantum_chestplate'), item('advanced_ae:quantum_leggings'), item('advanced_ae:quantum_boots')], ['PA_LAVA_CARD', 'PA_REGEN_CARD', 'PA_MAGNET_CARD'])
    ]
  },
  {
    filename: 'fusion_power', prefix: 'FU', id: 'BTM_FUSION_POWER', order: 19, title: 'Platinum Tier - Fusion Power and Plasma', tier: 'platinum', description: ['Fusion is the high-requirement power/synthesis branch. Gas handling starts with space-era materials, but magnetic confinement and ionization require AE2 control and fission hardware.', 'The goal is a complete late branch, not a cheap generator: compressor, pipes, electrolysis, fans, electromagnets, ionization, and only then plasma/fusion work.'], quests: [
      q('FU_PIPE', 'Gas Pipe Network', 0, 0, [item('gases_and_plasmas:gas_pipe')], ['SP_CHEM'], ['Gas handling is physical infrastructure. Pipes make the branch visible before it becomes powerful.']),
      q('FU_COMPRESSOR', 'Gas Compressor', 2, -1, [item('gases_and_plasmas:gas_compressor')], ['FU_PIPE', 'SP_CASE'], ['Compression belongs to the space/synthesis workshop, not early Create.']),
      q('FU_FAN', 'Gas Fan', 2, 1, [item('gases_and_plasmas:gas_fan')], ['FU_COMPRESSOR', 'PG_BATTERY'], ['Fans move gas with electrical commitment. This is the first practical gas routing step.']),
      q('FU_ELECTROLYZER', 'Electrolyzer', 4, -1, [item('gases_and_plasmas:electrolyzer')], ['FU_PIPE', 'PG_BATTERY'], ['Electrolysis turns water and electricity into fusion-relevant feedstocks. It should require a working grid.']),
      q('FU_AE_CONTROL', 'AE2 Control Permission', 4, 1, [item('kubejs:ae2_machine_casing')], ['AE_CONTROLLER'], ['Fusion as power is too strong before AE2-level control and local intelligence.']),
      q('FU_ELECTROMAGNET', 'Magnetic Confinement', 6, 0, [item('gases_and_plasmas:electromagnet')], ['FU_AE_CONTROL', 'FU_FAN'], ['Electromagnets are the line between gas handling and plasma engineering.']),
      q('FU_IONIZER', 'Ionizer', 8, 0, [item('gases_and_plasmas:ionizer')], ['FU_ELECTROMAGNET', 'PG_FISSION_ROD'], ['Ionization requires fission-era hardware and AE2-era control. This is where fusion becomes serious.']),
      q('FU_PLASMA_READY', 'Reactive Matter Cell Work', 10, 0, [item('gases_and_plasmas:electromagnet'), item('gases_and_plasmas:ionizer'), item('fission_reactor:fission_reactor_rod')], ['FU_IONIZER'], ['At this point the player has gas feedstocks, magnetic control, and nuclear hardware. Fusion power can be tuned from here in playtest.'])
    ]
  },
  {
    filename: 'magic_i', prefix: 'M1', id: 'BTM_MAGIC_I', order: 10, title: 'Tin Tier - Magic I', tier: 'tin', description: ['Blood Magic is the permission spine. Slates unlock side magic tiers; guidebooks are not the gate unless a mod gives no better surface.'], quests: [
      q('M1_BLANK', 'Blank Slate Permission', 0, 0, [item('bloodmagic:blankslate')], ['DE_WEAK_ORB']),
      q('M1_HEXEREI', 'Hexerei Gate', 2, -1, [item('hexerei:mixing_cauldron')], ['M1_BLANK']),
      q('M1_MALUM', 'Malum Gate', 2, 1, [item('malum:spirit_altar')], ['M1_BLANK']),
      q('M1_RUNEWOOD', 'Living Runewood', 4, 2, [item('malum:runewood_sapling'), item('malum:azure_runewood_sapling')], ['M1_MALUM'], ['Dynamic Trees for Malum makes Runewood part of the living world instead of static decoration.']),
      q('M1_REINFORCED', 'Reinforced Slate Permission', 4, 0, [item('bloodmagic:reinforcedslate')], ['M1_HEXEREI', 'M1_MALUM']),
      q('M1_ARS', 'Ars Entry', 6, -1, [item('ars_nouveau:imbuement_chamber')], ['M1_REINFORCED']),
      q('M1_APPARATUS', 'Enchanting Apparatus', 6, 1, [item('ars_nouveau:enchanting_apparatus')], ['M1_ARS']),
      q('M1_RITUALS', 'Ritual Brazier', 8, -1, [item('ars_nouveau:ritual_brazier')], ['M1_APPARATUS']),
      q('M1_NATURE', 'Nature Aura Entry', 8, 1, [item('naturesaura:offering_table')], ['M1_REINFORCED']),
      q('M1_IMBUED', 'Imbued Slate Permission', 10, 0, [item('bloodmagic:infusedslate')], ['M1_RITUALS']),
      q('M1_OCCULT', 'Occultism Chalk', 12, -1, [item('occultism:chalk_white_impure')], ['M1_IMBUED']),
      q('M1_GOETY', 'Goety Dark Altar', 12, 1, [item('goety:dark_altar')], ['M1_IMBUED']),
      q('M1_DEMONIC', 'Demonic Slate Permission', 14, 0, [item('bloodmagic:demonslate')], ['M1_OCCULT', 'M1_GOETY']),
      q('M1_BOTANIA', 'Botania Engineering Gate', 16, -1, [item('botania:runic_altar')], ['M1_DEMONIC']),
      q('M1_ETHEREAL', 'Ethereal Slate Permission', 18, 0, [item('bloodmagic:etherealslate')], ['M1_BOTANIA']),
      q('M1_PSI_HEX', 'Programmable Magic', 20, 0, [item('psi:programmer'), item('hexalia:hex_focus')], ['M1_ETHEREAL'])
    ]
  },
  {
    filename: 'adventuring', prefix: 'AD', id: 'BTM_ADVENTURING', order: 11, title: 'Copper Tier - Adventuring, Coins, and Wares', tier: 'copper', description: ['Adventure is a grindable progression lane. Coins, contracts, villages, and routes give useful work when the next factory is unclear.'], quests: [
      q('AD_ROUTE', 'Route Supplies', 0, 0, [item('minecraft:compass'), item('minecraft:map')], ['SO_EXIT_ADVENTURE']),
      q('AD_COIN', 'First Market Float', 2, 0, [item('dotcoinmod:copper_coin', 16)], ['AD_ROUTE']),
      q('AD_TRADING_POST', 'Village Trading Post', 4, -1, [item('tradingpost:trading_post')], ['AD_COIN']),
      q('AD_WARES_TABLE', 'Wares Delivery Table', 4, 1, [item('wares:delivery_table')], ['AD_COIN']),
      q('AD_CONTRACT', 'Contract As Crafting', 6, 0, [item('wares:delivery_agreement')], ['AD_WARES_TABLE']),
      q('AD_PACKAGE', 'Physical Package', 8, -1, [item('wares:package')], ['AD_CONTRACT']),
      q('AD_COMPLETED', 'Completed Delivery', 8, 1, [item('wares:completed_delivery_agreement')], ['AD_PACKAGE']),
      q('AD_CURSED_REGIONS', 'Cursed Regions', 10, -1, [item('minecraft:compass'), item('minecraft:shield')], ['AD_COMPLETED'], ['Cursed Biomes adds dangerous regional laws. Treat cursed territory as an extraction/adventure route, not background ambience.']),
      q('AD_IRON_FLOAT', 'Iron Tier Float', 12, 0, [item('dotcoinmod:iron_coin', 4)], ['AD_CURSED_REGIONS'])
    ]
  },
  {
    filename: 'village_economy', prefix: 'VE', id: 'BTM_VILLAGE_ECONOMY', order: 12, title: 'Tin Tier - Villages, Wares, and Settlement Rewards', tier: 'tin',
    description: ['Villager trading and Wares contracts are part of the expert item graph. This chapter teaches coins as a crafting surface and keeps decorative depth shallow through trade sideloads.'],
    quests: [
      q('VE_TRADING_POST', 'Centralized Trades', 0, 0, [item('tradingpost:trading_post')], ['AD_TRADING_POST'], ['Villages matter because people and routes matter. A trading post is a local market, not a magic converter.']),
      q('VE_WARES_BOX', 'Cardboard Logistics', 2, -1, [item('wares:cardboard_box')], ['AD_WARES_TABLE'], ['Wares packages are physical goods. Treat them like small logistics contracts.']),
      q('VE_AGREEMENT', 'Delivery Agreement', 2, 1, [item('wares:delivery_agreement')], ['AD_CONTRACT'], ['Contracts should consume and produce coin-tier value without falling back to emeralds.']),
      q('VE_COMPLETED', 'Completed Contract', 4, 0, [item('wares:completed_delivery_agreement')], ['VE_WARES_BOX', 'VE_AGREEMENT'], ['A completed delivery is proof of route work. It belongs in the same mental category as crafting components.']),
      q('VE_FURNITURE_TOOL', 'Furniture Toolkit', 6, -2, [item('another_furniture:furniture_hammer'), item('handcrafted:hammer')], ['VE_COMPLETED'], ['Decorative blocks can have graph depth, but only shallow depth: village economy plus early workshop tools.']),
      q('VE_SETTLEMENT_ROOM', 'Furnished Room', 8, -2, [item('another_furniture:oak_chair'), item('another_furniture:oak_table'), item('handcrafted:oak_table')], ['VE_FURNITURE_TOOL'], ['A settlement should look inhabited. These are sideload rewards, not required machine gates.']),
      q('VE_GARDEN_MARKET', 'Garden Market', 6, 0, [item('beautify:botanist_workbench'), item('beautify:oak_trellis'), item('beautify:hanging_pot')], ['VE_COMPLETED'], ['Garden and decor trades make villages useful without trivializing ore, magic, or machines.']),
      q('VE_BOUQUETS', 'Procedural Bouquets', 8, -1, [item('procedural_bouquets:bouquet_grid'), item('procedural_bouquets:potted_bouquet')], ['VE_GARDEN_MARKET'], ['Decorative systems can have shallow graph depth. Bouquets belong in the village/decor economy, not the machine spine.']),
      q('VE_VILLAGE_WALLS', 'Fortified Village', 8, 1, [item('minecraft:stone_bricks'), item('minecraft:spruce_log')], ['VE_COMPLETED'], ['Village Walls turns settlement defense into local infrastructure. The wall itself is commanded/world work, but the materials should still be physical.']),
      q('VE_SETTLEMENT_ROADS', 'Settlement Roads', 10, 1, [item('minecraft:dirt_path'), item('minecraft:gravel'), item('minecraft:stone_bricks')], ['VE_VILLAGE_WALLS'], ['Settlement Roads makes routes visible in the world. Roads and bridges support distance; they do not erase it.']),
      q('VE_BUILDERS_STOCK', 'Builder Stock', 10, 0, [item('buildersaddition:shelf_oak'), item('buildersaddition:bench_oak'), item('twigs:bamboo_thatch')], ['VE_GARDEN_MARKET'], ['Bulk building support is allowed here because it improves bases and routes instead of skipping progression.']),
      q('VE_LIGHTING_STOCK', 'Settlement Lighting', 10, 0, [item('beautify:lamp_light_bulb'), item('excessive_building:copper_bulb')], ['VE_BUILDERS_STOCK'], ['Lighting trades reward villages and coins while staying below Create andesite depth.']),
      q('VE_SERVICE_BELL', 'Market Signal', 10, -2, [item('another_furniture:service_bell')], ['VE_SETTLEMENT_ROOM'], ['A village route should have signals, meeting points, and trade counters.']),
      q('VE_IRON_COIN_TIER', 'Iron Coin Trade Float', 12, -1, [item('dotcoinmod:iron_coin', 8)], ['VE_COMPLETED'], ['Higher coin tiers come from harder chapters, loot, and combat loops. They should not be convertible downward or upward in bulk.']),
      q('VE_TIN_COIN_TIER', 'Tin Coin Trade Float', 14, -1, [item('dotcoinmod:tin_coin', 8)], ['VE_IRON_COIN_TIER'], ['Tin tier trades are where villages begin supporting workshop recovery and settlement upgrades.'])
    ]
  },
  {
    filename: 'synthesis_i', prefix: 'S1', id: 'BTM_SYNTHESIS_I', order: 13, title: 'Gold Tier - Acid Chemistry', tier: 'gold', description: ['Acid chemistry is where deposits stop being ore and become chemical packages. This pack wires recipes against Acid Vat without editing its mod source.'], quests: [
      q('S1_VAT', 'Acid Vat', 0, 0, [item('acid_vat:acid_vat')], ['C2_BRASS', 'TC_FOUNDRY']),
      q('S1_TUBE', 'Slurry Transport', 2, 0, [item('acid_vat:slurry_tank'), item('acid_vat:smart_slurry_pipe')], ['S1_VAT']),
      q('S1_CENTRIFUGE', 'Centrifuge Fractions', 4, 0, [item('acid_vat:centrifuge_bearing'), item('acid_vat:centrifuge_chamber')], ['S1_TUBE']),
      q('S1_SAMPLE', 'Chemical Interpretation', 6, -1, [item('chemlib:copper'), item('chemlib:sulfur')], ['S1_CENTRIFUGE']),
      q('S1_PLATINUM', 'Mountain-Depth Plate Reward', 6, 1, [item('chemlib:platinum_plate')], ['S1_CENTRIFUGE']),
      q('S1_SYNTHESIS_EXIT', 'Exit: Matter Routing', 8, 0, [item('chemlib:osmium_plate')], ['S1_SAMPLE', 'S1_PLATINUM'])
    ]
  }
]

const allQuestIds = new Set()
const allDeps = []
const missingItems = []
for (const ch of chapters) {
  for (const quest of ch.quests) {
    if (allQuestIds.has(quest.id)) throw new Error(`Duplicate quest id ${quest.id}`)
    allQuestIds.add(quest.id)
    for (const dep of quest.deps || []) allDeps.push({ quest: quest.id, dep })
    for (const t of quest.tasks) if (knownItems.size && !knownItems.has(t.item)) missingItems.push(`${quest.id}: ${t.item}`)
  }
}
const missingDeps = allDeps.filter(d => !allQuestIds.has(d.dep))
if (missingDeps.length) throw new Error(`Missing dependency refs:\n${missingDeps.map(d => `${d.quest} -> ${d.dep}`).join('\n')}`)
if (missingItems.length) throw new Error(`Missing item ids:\n${missingItems.join('\n')}`)

for (const ch of chapters) fs.writeFileSync(path.join(chapterDir, `${ch.filename}.snbt`), chapterSnbt(ch))
fs.writeFileSync(path.join(root, 'config/ftbquests/quests/chapter_groups.snbt'), chapterGroupsSnbt())
console.log(`generated ${chapters.length} quest chapters, ${allQuestIds.size} quests`)
