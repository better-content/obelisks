// Realistic Ores chemical identity matrix.
//
// Crushing and splashing stay the simple route. This file is the high-agency route:
// crushed deposit + solvent/acid + grinding ball. Solvent selects the chemistry
// family, ball selects recovery bias and operating cost through retention chance.

var BTM_RO_SOLVENTS = [
    { id: 'ethanol', fluid: 'chemlib:ethanol_fluid', amount: 250, time: 180, primary: 0, secondary: 0.24, trace: 0.06, heat: null },
    { id: 'acetic', fluid: 'chemlib:acetic_acid_fluid', amount: 250, time: 200, primary: 1, secondary: 0.32, trace: 0.10, heat: null },
    { id: 'sulfuric', fluid: 'chemlib:sulfuric_acid_fluid', amount: 250, time: 220, primary: 2, secondary: 0.48, trace: 0.14, heat: 'heated' },
    { id: 'hydrochloric', fluid: 'chemlib:hydrochloric_acid_fluid', amount: 250, time: 230, primary: 2, secondary: 0.44, trace: 0.18, heat: 'heated' },
    { id: 'nitric', fluid: 'chemlib:nitric_acid_fluid', amount: 300, time: 260, primary: 1, secondary: 0.38, trace: 0.28, heat: 'heated' },
    { id: 'phosphoric', fluid: 'kubejs:phosphoric_acid_fluid', amount: 250, time: 230, primary: 1, secondary: 0.42, trace: 0.16, heat: 'heated' }
]

var BTM_RO_BALLS = [
    { id: 'andesite', item: 'kubejs:andesite_grinding_ball', primaryBonus: 0, secondaryBonus: 0.00, traceBonus: 0.00, bias: 'gangue' },
    { id: 'iron', item: 'kubejs:iron_grinding_ball', primaryBonus: 0, secondaryBonus: 0.06, traceBonus: 0.02, bias: 'ferrous' },
    { id: 'brass', item: 'kubejs:brass_grinding_ball', primaryBonus: 0, secondaryBonus: 0.08, traceBonus: 0.03, bias: 'nonferrous' },
    { id: 'steel', item: 'kubejs:steel_grinding_ball', primaryBonus: 1, secondaryBonus: 0.10, traceBonus: 0.04, bias: 'general' },
    { id: 'nickel', item: 'kubejs:nickel_grinding_ball', primaryBonus: 1, secondaryBonus: 0.12, traceBonus: 0.07, bias: 'hard' },
    { id: 'titanium', item: 'kubejs:titanium_grinding_ball', primaryBonus: 1, secondaryBonus: 0.14, traceBonus: 0.10, bias: 'rare' },
    { id: 'blood_infused', item: 'kubejs:blood_infused_grinding_ball', primaryBonus: 0, secondaryBonus: 0.10, traceBonus: 0.09, bias: 'blood' },
    { id: 'fluix', item: 'kubejs:fluix_grinding_ball', primaryBonus: 0, secondaryBonus: 0.10, traceBonus: 0.09, bias: 'ae' }
]

var BTM_RO_RETENTION = {
    ethanol: { andesite: 0.80, iron: 0.90, brass: 0.92, steel: 0.94, nickel: 0.94, titanium: 0.96, blood_infused: 0.96, fluix: 0.95 },
    acetic: { andesite: 0.75, iron: 0.88, brass: 0.90, steel: 0.92, nickel: 0.92, titanium: 0.95, blood_infused: 0.94, fluix: 0.93 },
    sulfuric: { andesite: 0.55, iron: 0.62, brass: 0.72, steel: 0.78, nickel: 0.84, titanium: 0.88, blood_infused: 0.68, fluix: 0.70 },
    hydrochloric: { andesite: 0.45, iron: 0.38, brass: 0.55, steel: 0.62, nickel: 0.72, titanium: 0.82, blood_infused: 0.48, fluix: 0.66 },
    nitric: { andesite: 0.35, iron: 0.30, brass: 0.42, steel: 0.50, nickel: 0.58, titanium: 0.72, blood_infused: 0.78, fluix: 0.82 },
    phosphoric: { andesite: 0.60, iron: 0.64, brass: 0.74, steel: 0.80, nickel: 0.84, titanium: 0.88, blood_infused: 0.74, fluix: 0.76 }
}

var BTM_RO_SOLVENT_GAS_PRODUCTS = {
    ethanol: { item: 'chemlib:carbon_dioxide', chance: 0.06 },
    acetic: { item: 'chemlib:carbon_dioxide', chance: 0.10 },
    sulfuric: { item: 'chemlib:sulfur_dioxide', chance: 0.18 },
    hydrochloric: { item: 'chemlib:hydrogen', chance: 0.16 },
    nitric: { item: 'chemlib:nitrogen_dioxide', chance: 0.22 },
    phosphoric: { item: 'chemlib:hydrogen', chance: 0.08 }
}

var BTM_RO_CREATE_ITEM_OUTPUT_LIMIT = 6

var BTM_RO_OVERWORLD_ORE_EXTRAS = {
    coal_measures: {
        ethanol: { andesite: 'minecraft:coal', steel: 'minecraft:coal' },
        sulfuric: { iron: 'create:crushed_raw_iron' },
        nitric: { titanium: 'minecraft:coal', blood_infused: 'minecraft:soul_sand' }
    },
    ironstone: {
        sulfuric: { iron: 'minecraft:raw_iron', steel: 'create:crushed_raw_iron' },
        hydrochloric: { iron: 'minecraft:raw_iron', nickel: 'chemlib:nickel' },
        phosphoric: { blood_infused: 'minecraft:redstone' }
    },
    copper_sulfide: {
        acetic: { brass: 'minecraft:raw_copper' },
        sulfuric: { brass: 'create:crushed_raw_copper', steel: 'minecraft:raw_copper' },
        hydrochloric: { brass: 'minecraft:raw_copper', blood_infused: 'minecraft:redstone' }
    },
    quartz_vein: {
        hydrochloric: { fluix: 'ae2:certus_quartz_crystal', titanium: 'minecraft:quartz' },
        nitric: { titanium: 'minecraft:gold_nugget', fluix: 'ae2:fluix_dust' }
    },
    kimberlite_pipe: {
        sulfuric: { nickel: 'minecraft:diamond' },
        hydrochloric: { titanium: 'minecraft:diamond' },
        nitric: { titanium: 'minecraft:diamond', blood_infused: 'minecraft:soul_sand' }
    },
    emerald_schist_beryl: {
        sulfuric: { titanium: 'minecraft:emerald' },
        hydrochloric: { fluix: 'ae2:certus_quartz_crystal' },
        phosphoric: { titanium: 'minecraft:emerald' }
    },
    cupriferous_redbed_redstone_vein: {
        acetic: { brass: 'minecraft:redstone' },
        sulfuric: { brass: 'minecraft:raw_copper', steel: 'minecraft:redstone' },
        nitric: { blood_infused: 'minecraft:redstone', fluix: 'ae2:fluix_dust' }
    },
    lazurite_vein: {
        acetic: { brass: 'minecraft:lapis_lazuli' },
        hydrochloric: { fluix: 'ae2:certus_quartz_crystal' },
        phosphoric: { titanium: 'minecraft:lapis_lazuli' }
    },
    sulfur_bearing_pyrite_ore: {
        sulfuric: { iron: 'create:crushed_raw_iron', brass: 'minecraft:raw_copper' },
        nitric: { titanium: 'create:crushed_raw_gold' },
        hydrochloric: { steel: 'minecraft:raw_iron' }
    }
}

var BTM_RO_DEPOSITS = [
    {
        id: 'coal_measures', crushed: 'realisticores:crushed_coal_measures', primary: 'minecraft:coal',
        ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:iron_oxide', nitric: 'chemlib:iron_iii_nitrate', phosphoric: 'chemlib:calcium_carbonate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:sulfur', hard: 'chemlib:chromium', rare: 'create:crushed_raw_iron', blood: 'minecraft:soul_sand', ae: 'chemlib:silicon', gangue: 'minecraft:cobbled_deepslate', trace: 'minecraft:redstone'
    },
    {
        id: 'ironstone', crushed: 'realisticores:crushed_ironstone', primary: 'chemlib:iron',
        ethanol: 'chemlib:iron_carbonate', acetic: 'chemlib:iron_carbonate', sulfuric: 'chemlib:iron_ii_sulfate', hydrochloric: 'chemlib:iron_oxide', nitric: 'chemlib:iron_iii_nitrate', phosphoric: 'chemlib:calcium_carbonate',
        ferrous: 'create:crushed_raw_iron', nonferrous: 'chemlib:nickel', hard: 'chemlib:chromium', rare: 'chemlib:manganese', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'chemlib:nickel'
    },
    {
        id: 'copper_sulfide', crushed: 'realisticores:crushed_copper_sulfide_ore', primary: 'chemlib:copper',
        ethanol: 'chemlib:copper_carbonate', acetic: 'chemlib:copper_carbonate', sulfuric: 'chemlib:copper_ii_sulfate', hydrochloric: 'chemlib:copper_chloride', nitric: 'chemlib:copper_nitrate', phosphoric: 'chemlib:sulfur',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_copper', hard: 'chemlib:cobalt', rare: 'chemlib:gold', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:sulfur', trace: 'create:crushed_raw_gold'
    },
    {
        id: 'tin', crushed: 'realisticores:crushed_tin_ore', primary: 'chemlib:tin',
        ethanol: 'minecraft:quartz', acetic: 'minecraft:quartz', sulfuric: 'chemlib:tin_sulfate', hydrochloric: 'chemlib:silicon_dioxide', nitric: 'chemlib:tin_oxide', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_tin', hard: 'chemlib:tungsten', rare: 'chemlib:tungsten', blood: 'minecraft:redstone', ae: 'ae2:certus_quartz_crystal', gangue: 'chemlib:silicon', trace: 'chemlib:tungsten'
    },
    {
        id: 'zinc', crushed: 'realisticores:crushed_zinc_ore', primary: 'chemlib:zinc',
        ethanol: 'chemlib:zinc_carbonate', acetic: 'chemlib:zinc_carbonate', sulfuric: 'chemlib:zinc_sulfate', hydrochloric: 'chemlib:zinc_hydroxide', nitric: 'chemlib:zinc_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_zinc', hard: 'chemlib:cadmium', rare: 'chemlib:silver', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:lead', trace: 'chemlib:cadmium'
    },
    {
        id: 'lead_zinc_vein', crushed: 'realisticores:crushed_lead_zinc_vein', primary: 'chemlib:lead',
        ethanol: 'chemlib:lead_carbonate', acetic: 'chemlib:lead_carbonate', sulfuric: 'chemlib:lead_sulfate', hydrochloric: 'chemlib:lead_oxide', nitric: 'chemlib:lead_nitrate', phosphoric: 'chemlib:zinc_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:zinc', hard: 'chemlib:cadmium', rare: 'chemlib:silver', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'create:crushed_raw_silver'
    },
    {
        id: 'quartz_vein', crushed: 'realisticores:crushed_quartz_vein', primary: 'minecraft:quartz',
        ethanol: 'minecraft:quartz', acetic: 'chemlib:silicon_dioxide', sulfuric: 'chemlib:calcium_sulfate', hydrochloric: 'chemlib:silicon', nitric: 'chemlib:gold', phosphoric: 'chemlib:phosphate',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_copper', hard: 'chemlib:beryllium', rare: 'create:crushed_raw_gold', blood: 'minecraft:redstone', ae: 'ae2:certus_quartz_crystal', gangue: 'chemlib:silicon', trace: 'ae2:fluix_dust'
    },
    {
        id: 'bauxite_laterite', crushed: 'realisticores:crushed_bauxite_laterite', primary: 'chemlib:aluminum',
        ethanol: 'chemlib:aluminum_hydroxide', acetic: 'chemlib:iron_oxide', sulfuric: 'chemlib:aluminum_oxide', hydrochloric: 'chemlib:calcium_chloride', nitric: 'chemlib:aluminum_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_aluminum', hard: 'chemlib:nickel', rare: 'chemlib:titanium', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'chemlib:gallium'
    },
    {
        id: 'nickel_sulfide', crushed: 'realisticores:crushed_nickel_sulfide_ore', primary: 'chemlib:nickel',
        ethanol: 'chemlib:nickel_carbonate', acetic: 'chemlib:nickel_carbonate', sulfuric: 'chemlib:nickel_sulfate', hydrochloric: 'chemlib:nickel_chloride', nitric: 'chemlib:nickel_nitrate', phosphoric: 'chemlib:sulfur',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_nickel', hard: 'chemlib:cobalt', rare: 'chemlib:platinum', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:sulfur', trace: 'chemlib:palladium'
    },
    {
        id: 'osmiridium_lava_sulfide', crushed: 'realisticores:crushed_osmiridium_lava_sulfide_ore', primary: 'chemlib:osmium',
        ethanol: 'chemlib:sulfur', acetic: 'chemlib:nickel', sulfuric: 'chemlib:platinum', hydrochloric: 'chemlib:iridium', nitric: 'chemlib:iridium', phosphoric: 'chemlib:palladium',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:nickel', hard: 'chemlib:ruthenium', rare: 'chemlib:iridium', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:sulfur', trace: 'chemlib:osmium'
    },
    {
        id: 'tin_tungsten_greisen', crushed: 'realisticores:crushed_tin_tungsten_greisen', primary: 'chemlib:tungsten',
        ethanol: 'minecraft:quartz', acetic: 'chemlib:silicon_dioxide', sulfuric: 'chemlib:tin_sulfate', hydrochloric: 'chemlib:tin_oxide', nitric: 'chemlib:tungsten', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:tin', hard: 'chemlib:tungsten', rare: 'chemlib:tantalum', blood: 'minecraft:redstone', ae: 'ae2:certus_quartz_crystal', gangue: 'chemlib:silicon', trace: 'chemlib:tungsten'
    },
    {
        id: 'titanium_iron_oxide', crushed: 'realisticores:crushed_titanium_iron_oxide_ore', primary: 'chemlib:titanium',
        ethanol: 'chemlib:titanium_oxide', acetic: 'chemlib:iron_oxide', sulfuric: 'chemlib:iron_ii_sulfate', hydrochloric: 'chemlib:magnesium_chloride', nitric: 'chemlib:iron_iii_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'create:crushed_raw_iron', hard: 'chemlib:chromium', rare: 'chemlib:titanium', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:oxygen', trace: 'chemlib:vanadium'
    },
    {
        id: 'kimberlite_pipe', crushed: 'realisticores:crushed_kimberlite_pipe', primary: 'chemlib:carbon',
        ethanol: 'chemlib:carbon', acetic: 'chemlib:magnesium_carbonate', sulfuric: 'chemlib:magnesium_sulfate', hydrochloric: 'chemlib:magnesium_chloride', nitric: 'chemlib:magnesium_nitrate', phosphoric: 'chemlib:calcium_carbonate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:magnesium', hard: 'chemlib:nickel', rare: 'minecraft:diamond', blood: 'minecraft:soul_sand', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'minecraft:diamond'
    },
    {
        id: 'emerald_schist_beryl', crushed: 'realisticores:crushed_emerald_schist_beryl_vein', primary: 'chemlib:beryllium',
        ethanol: 'chemlib:beryl', acetic: 'chemlib:beryllium_carbonate', sulfuric: 'chemlib:beryllium_sulfate', hydrochloric: 'chemlib:beryllium_chloride', nitric: 'chemlib:beryllium_nitrate', phosphoric: 'chemlib:aluminum_oxide',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:aluminum', hard: 'chemlib:beryllium', rare: 'minecraft:emerald', blood: 'minecraft:redstone', ae: 'ae2:certus_quartz_crystal', gangue: 'chemlib:silicon', trace: 'minecraft:emerald'
    },
    {
        id: 'corundum_beryl_vein', crushed: 'realisticores:crushed_corundum_beryl_gem_vein', primary: 'chemlib:aluminum',
        ethanol: 'chemlib:beryl', acetic: 'chemlib:beryllium_carbonate', sulfuric: 'chemlib:beryllium_sulfate', hydrochloric: 'chemlib:beryllium_chloride', nitric: 'chemlib:beryllium_nitrate', phosphoric: 'chemlib:aluminum_oxide',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:aluminum', hard: 'chemlib:beryllium', rare: 'minecraft:amethyst_shard', blood: 'minecraft:redstone', ae: 'ae2:certus_quartz_crystal', gangue: 'chemlib:silicon', trace: 'minecraft:amethyst_shard'
    },
    {
        id: 'uranium_ore', crushed: 'realisticores:crushed_uranium_ore', primary: 'chemlib:uranium',
        ethanol: 'chemlib:calcium_carbonate', acetic: 'chemlib:lead_carbonate', sulfuric: 'chemlib:lead_sulfate', hydrochloric: 'chemlib:lead_oxide', nitric: 'chemlib:lead_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:lead', hard: 'chemlib:thorium', rare: 'chemlib:uranium', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'chemlib:thorium'
    },
    {
        id: 'thorium_ore', crushed: 'realisticores:crushed_thorium_ore', primary: 'chemlib:thorium',
        ethanol: 'chemlib:calcium_carbonate', acetic: 'chemlib:lead_carbonate', sulfuric: 'chemlib:lead_sulfate', hydrochloric: 'chemlib:lead_oxide', nitric: 'chemlib:lead_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:lead', hard: 'chemlib:uranium', rare: 'chemlib:thorium', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'chemlib:uranium'
    },
    {
        id: 'cupriferous_redbed_redstone_vein', crushed: 'realisticores:crushed_cupriferous_redbed_redstone_vein', primary: 'minecraft:redstone',
        ethanol: 'chemlib:copper_carbonate', acetic: 'chemlib:copper_carbonate', sulfuric: 'chemlib:copper_ii_sulfate', hydrochloric: 'chemlib:copper_chloride', nitric: 'chemlib:copper_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:copper', hard: 'chemlib:chromium', rare: 'chemlib:silver', blood: 'minecraft:redstone', ae: 'ae2:fluix_dust', gangue: 'chemlib:calcium', trace: 'chemlib:gold'
    },
    {
        id: 'lazurite_vein', crushed: 'realisticores:crushed_lazurite_vein', primary: 'minecraft:lapis_lazuli',
        ethanol: 'chemlib:sodium_carbonate', acetic: 'chemlib:sodium_carbonate', sulfuric: 'chemlib:sodium_sulfate', hydrochloric: 'chemlib:sodium_chloride', nitric: 'chemlib:sodium_nitrate', phosphoric: 'chemlib:aluminum_oxide',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:aluminum', hard: 'chemlib:sodium', rare: 'minecraft:lapis_lazuli', blood: 'minecraft:redstone', ae: 'ae2:certus_quartz_crystal', gangue: 'chemlib:silicon', trace: 'chemlib:gold'
    },
    {
        id: 'phosphate_rock', crushed: 'realisticores:crushed_phosphate_rock', primary: 'chemlib:phosphorus',
        ethanol: 'minecraft:bone_meal', acetic: 'chemlib:calcium_carbonate', sulfuric: 'chemlib:calcium_sulfate', hydrochloric: 'chemlib:calcium_chloride', nitric: 'chemlib:calcium_nitrate', phosphoric: 'chemlib:phosphoric_acid',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:calcium', hard: 'chemlib:fluorine', rare: 'chemlib:phosphorus', blood: 'minecraft:bone_meal', ae: 'chemlib:silicon', gangue: 'chemlib:oxygen', trace: 'chemlib:fluorine'
    },
    {
        id: 'soul_bearing_black_shale_soulstone_vein', crushed: 'realisticores:crushed_soul_bearing_black_shale_soulstone_vein', primary: 'chemlib:carbon',
        ethanol: 'chemlib:carbon', acetic: 'chemlib:carbon', sulfuric: 'chemlib:sulfur', hydrochloric: 'chemlib:hydrogen_sulfide', nitric: 'chemlib:nitrogen_dioxide', phosphoric: 'chemlib:phosphoric_acid',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:sulfur', hard: 'chemlib:lead', rare: 'minecraft:soul_sand', blood: 'minecraft:soul_sand', ae: 'chemlib:silicon', gangue: 'chemlib:calcium', trace: 'minecraft:redstone'
    },
    {
        id: 'sulfur_bearing_pyrite_ore', crushed: 'realisticores:crushed_sulfur_bearing_pyrite_ore', primary: 'chemlib:sulfur',
        ethanol: 'chemlib:iron_disulfide', acetic: 'chemlib:iron_disulfide', sulfuric: 'chemlib:iron_ii_sulfate', hydrochloric: 'chemlib:iron_oxide', nitric: 'chemlib:iron_iii_nitrate', phosphoric: 'chemlib:calcium_sulfate',
        ferrous: 'chemlib:iron', nonferrous: 'chemlib:copper', hard: 'chemlib:cobalt', rare: 'chemlib:gold', blood: 'minecraft:redstone', ae: 'chemlib:silicon', gangue: 'chemlib:sulfur', trace: 'create:crushed_raw_gold'
    }
]

global.BTM_RO_SOLVENTS = BTM_RO_SOLVENTS
global.BTM_RO_BALLS = BTM_RO_BALLS
global.BTM_RO_DEPOSITS = BTM_RO_DEPOSITS
global.BTM_RO_RETENTION = BTM_RO_RETENTION

function btmRoItemExists(id) {
    if (!id) return false
    try { return Item.exists(id) } catch (e) { return false }
}

function btmRoPushResult(results, result) {
    if (results.length < BTM_RO_CREATE_ITEM_OUTPUT_LIMIT) results.push(result)
}

function btmRoAddResult(results, id, count, chance) {
    if (!id || id.indexOf('kubejs:') === 0 || !btmRoItemExists(id)) return
    var result = { item: id }
    if (count && count > 1) result.count = count
    if (chance && chance < 1) result.chance = Math.max(0.01, Math.min(0.99, chance))
    btmRoPushResult(results, result)
}

function btmRoAddGasResult(results, seen, id, chance) {
    if (!id || seen[id] || !btmRoItemExists(id)) return
    seen[id] = true
    btmRoAddResult(results, id, 1, chance)
}

function btmRoDepositGas(dep) {
    var haystack = [
        dep.id, dep.primary, dep.ethanol, dep.acetic, dep.sulfuric, dep.hydrochloric,
        dep.nitric, dep.phosphoric, dep.gangue, dep.trace
    ].join('|')
    if (haystack.indexOf('hydrogen_sulfide') >= 0 || haystack.indexOf('sulfide') >= 0 || haystack.indexOf('pyrite') >= 0) {
        return { item: 'chemlib:hydrogen_sulfide', chance: 0.12 }
    }
    if (haystack.indexOf('carbonate') >= 0 || haystack.indexOf('coal') >= 0 || haystack.indexOf('kimberlite') >= 0 || haystack.indexOf('soul') >= 0) {
        return { item: 'chemlib:carbon_dioxide', chance: 0.14 }
    }
    if (haystack.indexOf('phosphate') >= 0 || haystack.indexOf('oxide') >= 0 || haystack.indexOf('lazurite') >= 0) {
        return { item: 'chemlib:oxygen', chance: 0.10 }
    }
    return null
}

function btmRoAddGasSideProducts(results, dep, solvent) {
    var seen = {}
    var solventGas = BTM_RO_SOLVENT_GAS_PRODUCTS[solvent.id]
    if (solventGas) btmRoAddGasResult(results, seen, solventGas.item, solventGas.chance)
    var depositGas = btmRoDepositGas(dep)
    if (depositGas) btmRoAddGasResult(results, seen, depositGas.item, depositGas.chance)
}

function btmRoBallResult(dep, ball) {
    var id = dep[ball.bias] || dep.trace || dep.secondary || dep.primary
    if (ball.bias === 'general') id = dep.secondary || dep.trace || dep.primary
    return id
}

function btmRoPrimaryCount(solvent, ball) {
    return Math.max(1, solvent.primary + ball.primaryBonus)
}

function btmRoRecipeResults(dep, solvent, ball) {
    var results = []
    btmRoAddResult(results, dep.primary, btmRoPrimaryCount(solvent, ball), null)
    btmRoAddResult(results, dep[solvent.id], 1, solvent.secondary + ball.secondaryBonus)
    btmRoAddResult(results, btmRoBallResult(dep, ball), 1, 0.42 + ball.secondaryBonus)
    btmRoAddOverworldOreExtra(results, dep, solvent, ball)
    btmRoAddResult(results, dep.trace, 1, solvent.trace + ball.traceBonus)
    var retained = BTM_RO_RETENTION[solvent.id][ball.id]
    if (retained && retained > 0) btmRoPushResult(results, { item: ball.item, chance: retained })
    btmRoAddGasSideProducts(results, dep, solvent)
    return results
}

function btmRoAddOverworldOreExtra(results, dep, solvent, ball) {
    var byDeposit = BTM_RO_OVERWORLD_ORE_EXTRAS[dep.id]
    if (!byDeposit) return
    var bySolvent = byDeposit[solvent.id]
    if (!bySolvent) return
    var extra = bySolvent[ball.id] || bySolvent[ball.bias]
    if (!extra) return
    btmRoAddResult(results, extra, 1, 0.18 + solvent.trace + ball.traceBonus)
}

function btmRoMixing(event, dep, solvent, ball) {
    if (!btmRoItemExists(dep.crushed) || !btmRoItemExists(ball.item)) return
    var recipe = {
        type: 'create:mixing',
        ingredients: [
            { item: dep.crushed },
            { item: ball.item },
            { fluid: solvent.fluid, amount: solvent.amount }
        ],
        results: btmRoRecipeResults(dep, solvent, ball),
        processingTime: solvent.time
    }
    if (solvent.heat) recipe.heatRequirement = solvent.heat
    event.custom(recipe).id('kubejs:realistic_ores/acid_ball/' + dep.id + '/' + solvent.id + '/' + ball.id)
}

function btmRoMixingComponent(event, id, output, ingredients, heat) {
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: [output],
        processingTime: 220
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:realistic_ores/components/' + id)
}

function btmRoPressing(event, id, output, input) {
    event.custom({
        type: 'create:pressing',
        ingredients: [{ item: input }],
        results: [{ item: output }]
    }).id('kubejs:realistic_ores/pressing/' + id)
}

ServerEvents.recipes(function (event) {
    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/andesite', 'kubejs:andesite_grinding_ball', 1, [
        'create:andesite_alloy',
        'create:andesite_alloy',
        'create:andesite_alloy',
        'create:andesite_alloy',
        'create:andesite_alloy'
    ])

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/iron', 'kubejs:iron_grinding_ball', 1, [
        '#forge:ingots/iron',
        '#forge:ingots/iron',
        '#forge:ingots/iron',
        '#forge:ingots/iron',
        '#forge:ingots/iron'
    ])

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/brass', 'kubejs:brass_grinding_ball', 1, [
        '#forge:ingots/brass',
        '#forge:ingots/brass',
        '#forge:ingots/brass',
        '#forge:ingots/brass',
        '#forge:ingots/brass'
    ])

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/steel', 'kubejs:steel_grinding_ball', 1, [
        '#forge:ingots/steel',
        '#forge:ingots/steel',
        '#forge:ingots/steel',
        '#forge:ingots/steel',
        'kubejs:iron_grinding_ball'
    ], 'heated')

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/nickel', 'kubejs:nickel_grinding_ball', 1, [
        '#forge:ingots/nickel',
        '#forge:ingots/nickel',
        '#forge:ingots/nickel',
        '#forge:ingots/nickel',
        'kubejs:steel_grinding_ball'
    ], 'heated')

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/titanium', 'kubejs:titanium_grinding_ball', 1, [
        'chemlib:titanium_ingot',
        'chemlib:titanium_ingot',
        'chemlib:titanium_ingot',
        'chemlib:titanium_ingot',
        'kubejs:nickel_grinding_ball'
    ], 'heated')

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/blood_infused', 'kubejs:blood_infused_grinding_ball', 1, [
        'bloodmagic:demonslate',
        'bloodmagic:demonslate',
        'bloodmagic:demonslate',
        'minecraft:redstone',
        'minecraft:redstone',
        'minecraft:redstone',
        'kubejs:steel_grinding_ball'
    ], 'heated')

    global.btmCreateCompacting(event, 'kubejs:realistic_ores/grinding_ball/fluix', 'kubejs:fluix_grinding_ball', 1, [
        'ae2:fluix_crystal',
        'ae2:fluix_crystal',
        'ae2:certus_quartz_crystal',
        'ae2:certus_quartz_crystal',
        'kubejs:steel_grinding_ball'
    ], 'heated')

    for (var d = 0; d < BTM_RO_DEPOSITS.length; d++) {
        for (var s = 0; s < BTM_RO_SOLVENTS.length; s++) {
            for (var b = 0; b < BTM_RO_BALLS.length; b++) {
                btmRoMixing(event, BTM_RO_DEPOSITS[d], BTM_RO_SOLVENTS[s], BTM_RO_BALLS[b])
            }
        }
    }

    btmRoMixingComponent(event, 'tungsten_carbide_insert', { item: 'kubejs:tungsten_carbide_insert' }, [
        { item: 'chemlib:tungsten' },
        { item: 'chemlib:tungsten' },
        { item: 'chemlib:carbon' },
        { item: 'kubejs:steel_grinding_ball' }
    ], 'heated')

    btmRoMixingComponent(event, 'titanium_thermal_plate', { item: 'kubejs:titanium_thermal_plate' }, [
        { item: 'chemlib:titanium_ingot' },
        { item: 'chemlib:titanium_oxide' },
        { item: 'kubejs:tungsten_carbide_insert' },
        { item: 'chemlib:oxygen' }
    ], 'heated')

    btmRoMixingComponent(event, 'kimberlite_diamond_seed', { item: 'kubejs:kimberlite_diamond_seed' }, [
        { item: 'minecraft:diamond' },
        { item: 'chemlib:carbon' },
        { item: 'chemlib:magnesium' },
        { item: 'kubejs:tungsten_carbide_insert' }
    ], 'heated')

    btmRoMixingComponent(event, 'corundum_lapping_grit', { item: 'kubejs:corundum_lapping_grit', count: 2 }, [
        { item: 'chemlib:aluminum_oxide' },
        { item: 'minecraft:amethyst_shard' },
        { item: 'chemlib:beryllium' },
        { item: 'kubejs:brass_grinding_ball' }
    ], null)

    btmRoMixingComponent(event, 'mountain_beryl_lens', { item: 'kubejs:mountain_beryl_lens' }, [
        { item: 'minecraft:emerald' },
        { item: 'chemlib:beryllium' },
        { item: 'chemlib:silicon_dioxide' },
        { item: 'kubejs:corundum_lapping_grit' }
    ], 'heated')

    btmRoMixingComponent(event, 'fissile_salt_blend', { item: 'kubejs:fissile_salt_blend' }, [
        { item: 'chemlib:uranium' },
        { item: 'chemlib:thorium' },
        { item: 'chemlib:sodium_nitrate' },
        { item: 'kubejs:titanium_thermal_plate' }
    ], 'heated')

    btmRoMixingComponent(event, 'soulstone_carbon_matrix', { item: 'kubejs:soulstone_carbon_matrix' }, [
        { item: 'chemlib:carbon' },
        { item: 'chemlib:sulfur' },
        { item: 'minecraft:soul_sand' },
        { item: 'kubejs:blood_infused_grinding_ball' }
    ], 'heated')

    btmRoMixingComponent(event, 'redbed_signal_salt', { item: 'kubejs:redbed_signal_salt' }, [
        { item: 'minecraft:redstone' },
        { item: 'chemlib:copper_nitrate' },
        { item: 'chemlib:iron_oxide' },
        { item: 'kubejs:iron_grinding_ball' }
    ], null)

    btmRoMixingComponent(event, 'lazurite_logic_pigment', { item: 'kubejs:lazurite_logic_pigment' }, [
        { item: 'minecraft:lapis_lazuli' },
        { item: 'chemlib:sodium_chloride' },
        { item: 'chemlib:aluminum_oxide' },
        { item: 'kubejs:redbed_signal_salt' }
    ], null)

    btmRoMixingComponent(event, 'phosphate_flux', { item: 'kubejs:phosphate_flux' }, [
        { item: 'chemlib:phosphoric_acid' },
        { item: 'chemlib:phosphorus' },
        { item: 'chemlib:calcium' },
        { item: 'minecraft:bone_meal' }
    ], null)

    btmRoMixingComponent(event, 'platinum_group_residue', { item: 'kubejs:platinum_group_residue' }, [
        { item: 'chemlib:platinum' },
        { item: 'chemlib:palladium' },
        { item: 'chemlib:nickel_sulfate' },
        { item: 'kubejs:nickel_grinding_ball' }
    ], 'heated')

    btmRoPressing(event, 'titanium_thermal_plate_from_ingot', 'kubejs:titanium_thermal_plate', 'chemlib:titanium_ingot')
})
