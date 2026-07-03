// ChemLib full integration routes.
//
// This pass gives guarded element and molecule families source, process, and
// demand roles. Create remains bulk/open processing, PNCR owns sealed pressure
// and thermal control, and Blood Magic is manual high-yield chemistry.

function btmFullChemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmFullChemFluidExists(id) {
    if (id === 'minecraft:water') return true
    try {
        if (typeof Fluid !== 'undefined' && Fluid.exists) return Fluid.exists(id)
    } catch (e) {}
    return BTM_FULL_CHEM_KNOWN_FLUIDS[id] === true
}

function btmFullChemIngredientExists(input) {
    if (!input) return false
    if (input.tag || input.fluid) return true
    if (input.item) return btmFullChemExists(input.item)
    return true
}

function btmFullChemAllInputsExist(inputs) {
    for (var i = 0; i < inputs.length; i++) {
        if (!btmFullChemIngredientExists(inputs[i])) return false
    }
    return true
}

function btmFullChemResult(item, count, chance) {
    var result = { item: item }
    if (count && count > 1) result.count = count
    if (chance && chance < 1) result.chance = chance
    return result
}

function btmFullChemSideResults(items) {
    var results = []
    for (var i = 0; i < (items || []).length; i++) {
        var item = items[i]
        if (!btmFullChemExists(item.item)) continue
        results.push(btmFullChemResult(item.item, item.count || 1, item.chance || null))
    }
    return results
}

function btmFullChemMix(event, id, inputs, outputs, heat, time) {
    if (!btmFullChemAllInputsExist(inputs)) return
    var results = []
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i]
        if (!btmFullChemExists(output.item)) return
        results.push(btmFullChemResult(output.item, output.count || 1, output.chance || null))
    }
    var recipe = {
        type: 'create:mixing',
        ingredients: inputs,
        results: results,
        processingTime: time || 200
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemlib_full/create_mixing/' + id)
}

function btmFullChemCompact(event, id, inputs, outputs, heat) {
    if (!btmFullChemAllInputsExist(inputs)) return
    var results = []
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i]
        if (!btmFullChemExists(output.item)) return
        results.push(btmFullChemResult(output.item, output.count || 1, output.chance || null))
    }
    var recipe = {
        type: 'create:compacting',
        ingredients: inputs,
        results: results,
        processingTime: 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemlib_full/create_compacting/' + id)
}

function btmFullChemPressure(event, id, inputs, output, pressure) {
    if (!btmFullChemAllInputsExist(inputs) || !btmFullChemExists(output.item)) return
    var pressureInputs = []
    for (var i = 0; i < inputs.length; i++) {
        var mapped = btmFullChemPressureInput(inputs[i])
        if (!mapped) return
        pressureInputs.push(mapped)
    }
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: pressureInputs,
        pressure: pressure,
        results: [btmFullChemResult(output.item, output.count || 1, null)]
    }).id('kubejs:chemlib_full/pncr_pressure/' + id)
}

function btmFullChemPressureInput(input) {
    if (input.type) return input
    if (input.item) return { type: 'pneumaticcraft:stacked_item', item: input.item, count: input.count || 1 }
    if (input.fluid) {
        var mapped = BTM_FULL_CHEM_PRESSURE_FLUID_ITEMS[input.fluid]
        if (!mapped || !btmFullChemExists(mapped)) return null
        return { type: 'pneumaticcraft:stacked_item', item: mapped, count: input.amount && input.amount > 250 ? 2 : 1 }
    }
    return null
}

function btmFullChemThermo(event, id, itemInput, fluid, amount, output, pressure, minTemp) {
    if (!btmFullChemIngredientExists(itemInput) || !btmFullChemFluidExists(fluid) || !btmFullChemExists(output.item)) return
    event.custom({
        type: 'pneumaticcraft:thermo_plant',
        exothermic: false,
        item_input: itemInput,
        fluid_input: {
            type: 'pneumaticcraft:fluid',
            fluid: fluid,
            amount: amount
        },
        item_output: btmFullChemResult(output.item, output.count || 1, null),
        pressure: pressure || 2.5,
        speed: 0.35,
        temperature: { min_temp: minTemp || 473 }
    }).id('kubejs:chemlib_full/pncr_thermo/' + id)
}

function btmFullChemBlood(event, id, inputs, output, syphon, ticks, tier) {
    if (!btmFullChemAllInputsExist(inputs) || !btmFullChemExists(output.item)) return
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs,
        output: btmFullChemResult(output.item, output.count || 1, null),
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:chemlib_full/blood_manual/' + id)
}

function btmFullChemCompound(element, suffix) {
    var aliases = BTM_FULL_CHEM_COMPOUND_ALIASES[element]
    if (aliases && aliases[suffix]) return aliases[suffix]
    return 'chemlib:' + element + '_' + suffix
}

var BTM_FULL_CHEM_KNOWN_FLUIDS = {
    'minecraft:water': true,
    'chemlib:ethanol_fluid': true,
    'chemlib:acetic_acid_fluid': true,
    'chemlib:hydrochloric_acid_fluid': true,
    'chemlib:nitric_acid_fluid': true,
    'chemlib:sulfuric_acid_fluid': true,
    'kubejs:phosphoric_acid_fluid': true,
    'chemlib:oxygen_fluid': true,
    'chemlib:hydrogen_fluid': true,
    'chemlib:chlorine_fluid': true
}

var BTM_FULL_CHEM_PRESSURE_FLUID_ITEMS = {
    'minecraft:water': 'minecraft:water_bucket',
    'chemlib:ethanol_fluid': 'chemlib:ethanol',
    'chemlib:acetic_acid_fluid': 'chemlib:acetic_acid',
    'chemlib:hydrochloric_acid_fluid': 'chemlib:hydrochloric_acid',
    'chemlib:nitric_acid_fluid': 'chemlib:nitric_acid',
    'chemlib:sulfuric_acid_fluid': 'chemlib:sulfuric_acid',
    'kubejs:phosphoric_acid_fluid': 'chemlib:phosphoric_acid',
    'chemlib:oxygen_fluid': 'chemlib:oxygen',
    'chemlib:hydrogen_fluid': 'chemlib:hydrogen',
    'chemlib:chlorine_fluid': 'chemlib:chlorine'
}

var BTM_FULL_CHEM_COMPOUND_ALIASES = {
    carbon: { oxide: 'chemlib:carbon_dioxide', sulfide: 'chemlib:carbon_disulfide' },
    copper: { oxide: 'chemlib:copper_i_oxide', hydroxide: 'chemlib:copper_ii_hydroxide', sulfate: 'chemlib:copper_ii_sulfate', sulfide: 'chemlib:copper_i_sulfide' },
    iron: { sulfate: 'chemlib:iron_ii_sulfate', nitrate: 'chemlib:iron_iii_nitrate' },
    silicon: { oxide: 'chemlib:silicon_dioxide' }
}

var BTM_FULL_CHEM_SOURCE_DEPOSITS = {
    light_metal: 'realisticores:crushed_bauxite_laterite',
    alkali: 'realisticores:crushed_lazurite_vein',
    alkaline: 'realisticores:crushed_phosphate_rock',
    transition: 'realisticores:crushed_titanium_iron_oxide_ore',
    refractory: 'realisticores:crushed_tin_tungsten_greisen',
    rare_earth: 'realisticores:crushed_emerald_schist_beryl_vein',
    noble: 'realisticores:crushed_osmiridium_lava_sulfide_ore',
    chalcophile: 'realisticores:crushed_lead_zinc_vein',
    radioactive: 'realisticores:crushed_uranium_ore',
    biogenic: 'realisticores:crushed_soul_bearing_black_shale_soulstone_vein',
    gas: 'realisticores:crushed_coal_measures'
}

var BTM_FULL_CHEM_ELEMENT_GROUPS = [
    { id: 'light_metal', slate: 'bloodmagic:reinforcedslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.light_metal, acid: 'chemlib:sulfuric_acid_fluid', elements: ['aluminum', 'gallium', 'indium', 'thallium'] },
    { id: 'alkali', slate: 'bloodmagic:blankslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.alkali, acid: 'chemlib:hydrochloric_acid_fluid', elements: ['lithium', 'sodium', 'potassium', 'rubidium', 'cesium', 'francium'] },
    { id: 'alkaline', slate: 'bloodmagic:blankslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.alkaline, acid: 'kubejs:phosphoric_acid_fluid', elements: ['beryllium', 'magnesium', 'calcium', 'strontium', 'barium', 'radium'] },
    { id: 'transition', slate: 'bloodmagic:infusedslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.transition, acid: 'chemlib:nitric_acid_fluid', elements: ['scandium', 'titanium', 'vanadium', 'chromium', 'manganese', 'iron', 'cobalt', 'nickel', 'copper', 'zinc'] },
    { id: 'refractory', slate: 'bloodmagic:demonslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.refractory, acid: 'chemlib:hydrochloric_acid_fluid', elements: ['zirconium', 'niobium', 'molybdenum', 'hafnium', 'tantalum', 'tungsten', 'rhenium'] },
    { id: 'noble', slate: 'bloodmagic:etherealslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.noble, acid: 'chemlib:nitric_acid_fluid', elements: ['ruthenium', 'rhodium', 'palladium', 'osmium', 'iridium', 'platinum', 'gold', 'silver'] },
    { id: 'rare_earth', slate: 'bloodmagic:demonslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.rare_earth, acid: 'kubejs:phosphoric_acid_fluid', elements: ['lanthanum', 'cerium', 'praseodymium', 'neodymium', 'samarium', 'europium', 'gadolinium', 'terbium', 'dysprosium', 'holmium', 'erbium', 'thulium', 'ytterbium', 'lutetium', 'yttrium'] },
    { id: 'chalcophile', slate: 'bloodmagic:infusedslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.chalcophile, acid: 'chemlib:sulfuric_acid_fluid', elements: ['cadmium', 'mercury', 'lead', 'bismuth', 'arsenic', 'antimony', 'selenium', 'tellurium'] },
    { id: 'radioactive', slate: 'bloodmagic:etherealslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.radioactive, acid: 'chemlib:nitric_acid_fluid', elements: ['actinium', 'thorium', 'protactinium', 'uranium', 'polonium'] },
    { id: 'biogenic', slate: 'bloodmagic:reinforcedslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.biogenic, acid: 'chemlib:acetic_acid_fluid', elements: ['carbon', 'nitrogen', 'oxygen', 'phosphorus', 'sulfur', 'chlorine', 'iodine', 'fluorine', 'silicon'] },
    { id: 'gas', slate: 'bloodmagic:infusedslate', source: BTM_FULL_CHEM_SOURCE_DEPOSITS.gas, acid: 'chemlib:ethanol_fluid', elements: ['hydrogen', 'helium', 'neon', 'argon', 'krypton', 'xenon', 'radon'] }
]

var BTM_FULL_CHEM_FAMILIES = [
    { id: 'oxide', suffix: 'oxide', fluid: 'minecraft:water', amount: 125, reagent: 'chemlib:oxygen', side: [{ item: 'chemlib:oxygen', chance: 0.08 }], heat: 'heated', pressure: 2.0, temp: 473 },
    { id: 'hydroxide', suffix: 'hydroxide', fluid: 'minecraft:water', amount: 250, reagent: 'chemlib:sodium_hydroxide', side: [{ item: 'chemlib:hydrogen', chance: 0.10 }], heat: null, pressure: 2.0, temp: 423 },
    { id: 'carbonate', suffix: 'carbonate', fluid: 'minecraft:water', amount: 250, reagent: 'chemlib:carbon', side: [{ item: 'chemlib:carbon_dioxide', chance: 0.12 }], heat: null, pressure: 2.25, temp: 423 },
    { id: 'chloride', suffix: 'chloride', fluid: 'chemlib:hydrochloric_acid_fluid', amount: 250, reagent: 'chemlib:sodium_chloride', side: [{ item: 'chemlib:hydrogen', chance: 0.16 }], heat: 'heated', pressure: 2.75, temp: 523 },
    { id: 'nitrate', suffix: 'nitrate', fluid: 'chemlib:nitric_acid_fluid', amount: 250, reagent: 'minecraft:redstone', side: [{ item: 'chemlib:nitrogen_dioxide', chance: 0.22 }], heat: 'heated', pressure: 3.25, temp: 573 },
    { id: 'sulfate', suffix: 'sulfate', fluid: 'chemlib:sulfuric_acid_fluid', amount: 250, reagent: 'chemlib:sulfur', side: [{ item: 'chemlib:sulfur_dioxide', chance: 0.18 }], heat: 'heated', pressure: 3.0, temp: 548 },
    { id: 'sulfide', suffix: 'sulfide', fluid: 'minecraft:water', amount: 125, reagent: 'chemlib:sulfur', side: [{ item: 'chemlib:hydrogen_sulfide', chance: 0.16 }], heat: 'heated', pressure: 2.5, temp: 523 },
    { id: 'phosphate', suffix: 'phosphate', fluid: 'kubejs:phosphoric_acid_fluid', amount: 250, reagent: 'chemlib:phosphorus', side: [{ item: 'chemlib:oxygen', chance: 0.10 }], heat: 'heated', pressure: 3.0, temp: 548 }
]

var BTM_FULL_CHEM_GROUP_SINKS = {
    light_metal: [
        { id: 'light_ceramic_glass', output: 'minecraft:glass', count: 6, inputs: ['chemlib:silicon_dioxide', 'chemlib:aluminum_oxide'], kind: 'compact' },
        { id: 'light_pcb_laminate', output: 'pneumaticcraft:empty_pcb', count: 2, inputs: ['chemlib:polyvinyl_chloride', 'chemlib:silicon_dioxide'], kind: 'pressure', pressure: 2.0 }
    ],
    alkali: [
        { id: 'electrolyte_red_alloy', output: 'morered:red_alloy_wire', count: 8, inputs: ['minecraft:redstone', 'minecraft:copper_ingot'], kind: 'mix' },
        { id: 'alkali_fertilizer', output: 'minecraft:bone_meal', count: 8, inputs: ['chemlib:phosphate', 'minecraft:bone_meal'], kind: 'mix' }
    ],
    alkaline: [
        { id: 'lime_scrubbed_filter', output: 'pneumaticcraft:air_canister', count: 1, inputs: ['chemlib:calcium_oxide', 'kubejs:pressure_seal'], kind: 'pressure', pressure: 2.0 },
        { id: 'refractory_grout', output: 'tconstruct:grout', count: 6, inputs: ['chemlib:silicon_dioxide', 'minecraft:clay_ball'], kind: 'compact' }
    ],
    transition: [
        { id: 'transition_mechanism_polish', output: 'create:precision_mechanism', count: 1, inputs: ['create:cogwheel', 'create:large_cogwheel', 'create:electron_tube'], kind: 'mix' },
        { id: 'transition_pressure_tube', output: 'pneumaticcraft:pressure_tube', count: 4, inputs: ['minecraft:glass', 'kubejs:pressure_seal'], kind: 'pressure', pressure: 2.0 }
    ],
    refractory: [
        { id: 'refractory_advanced_tube', output: 'pneumaticcraft:advanced_pressure_tube', count: 2, inputs: ['pneumaticcraft:reinforced_pressure_tube', 'kubejs:pressure_seal'], kind: 'pressure', pressure: 3.2 },
        { id: 'refractory_heat_shield', output: 'creatingspace:heat_shield', count: 1, inputs: ['chemlib:titanium_oxide', 'chemlib:aluminum_oxide'], kind: 'compact' }
    ],
    noble: [
        { id: 'noble_catalyst_pcb', output: 'pneumaticcraft:transistor', count: 2, inputs: ['chemlib:silicon_dioxide', 'chemlib:copper_chloride'], kind: 'pressure', pressure: 2.75 },
        { id: 'noble_precision_laser_trim', output: 'ae2:printed_logic_processor', count: 1, inputs: ['ae2:printed_silicon', 'minecraft:gold_ingot'], kind: 'mix' }
    ],
    rare_earth: [
        { id: 'rare_earth_fluix_lens', output: 'ae2:fluix_dust', count: 2, inputs: ['ae2:certus_quartz_crystal', 'minecraft:redstone'], kind: 'mix' },
        { id: 'rare_earth_signal_pigment', output: 'minecraft:glowstone_dust', count: 3, inputs: ['minecraft:redstone', 'minecraft:lapis_lazuli'], kind: 'mix' }
    ],
    chalcophile: [
        { id: 'chalcophile_shielding_glass', output: 'protection_pixel:shieldingglass', count: 2, inputs: ['minecraft:glass', 'chemlib:lead_oxide'], kind: 'compact' },
        { id: 'chalcophile_etchant_charge', output: 'pneumaticcraft:unassembled_pcb', count: 1, inputs: ['pneumaticcraft:empty_pcb', 'pneumaticcraft:capacitor', 'pneumaticcraft:transistor'], kind: 'pressure', pressure: 2.5 }
    ],
    radioactive: [
        { id: 'radioactive_salt_blend', output: 'kubejs:fissile_salt_blend', count: 1, inputs: ['chemlib:lead_sulfate', 'chemlib:calcium_sulfate'], kind: 'mix' },
        { id: 'radioactive_late_glass', output: 'protection_pixel:shieldingglass', count: 4, inputs: ['minecraft:glass', 'chemlib:lead_oxide'], kind: 'compact' }
    ],
    biogenic: [
        { id: 'biogenic_feed', output: 'farmersdelight:organic_compost', count: 2, inputs: ['minecraft:bone_meal', 'minecraft:wheat'], kind: 'mix' },
        { id: 'biogenic_source_gem', output: 'ars_nouveau:source_gem', count: 1, inputs: ['minecraft:amethyst_shard', 'bloodmagic:blankslate'], kind: 'mix' }
    ],
    gas: [
        { id: 'gas_lamp_glass', output: 'minecraft:glass_bottle', count: 4, inputs: ['minecraft:glass', 'kubejs:pressure_seal'], kind: 'pressure', pressure: 2.0 },
        { id: 'gas_coolant_charge', output: 'kubejs:pressure_seal', count: 2, inputs: ['minecraft:dried_kelp', 'minecraft:slime_ball'], kind: 'pressure', pressure: 2.25 }
    ]
}

var BTM_FULL_CHEM_MOLECULES = [
    { id: 'cellulose', item: 'chemlib:cellulose', source: [{ tag: 'minecraft:logs' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'minecraft:paper', count: 6 }], process: 'fiber_pulping', slate: 'bloodmagic:blankslate' },
    { id: 'starch', item: 'chemlib:starch', source: [{ item: 'minecraft:potato' }, { item: 'minecraft:wheat' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'minecraft:slime_ball', count: 2 }], process: 'binder_gelatinization', slate: 'bloodmagic:blankslate' },
    { id: 'sucrose', item: 'chemlib:sucrose', source: [{ item: 'minecraft:sugar_cane' }, { item: 'minecraft:beetroot' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'minecraft:sugar', count: 6 }], process: 'sugar_crystallization', slate: 'bloodmagic:blankslate' },
    { id: 'ethanol', item: 'chemlib:ethanol', fluid: 'chemlib:ethanol_fluid', source: [{ item: 'chemlib:sucrose' }, { item: 'chemlib:starch' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'create:blaze_cake_base', count: 1 }], process: 'fermentation_fuel', slate: 'bloodmagic:reinforcedslate' },
    { id: 'acetic_acid', item: 'chemlib:acetic_acid', fluid: 'chemlib:acetic_acid_fluid', source: [{ item: 'chemlib:ethanol' }, { item: 'chemlib:oxygen' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'minecraft:leather', count: 2 }], process: 'mild_solvent', slate: 'bloodmagic:reinforcedslate' },
    { id: 'ethylene', item: 'chemlib:ethylene', source: [{ item: 'chemlib:ethanol' }, { item: 'chemlib:carbon' }, { fluid: 'minecraft:water', amount: 125 }], outputs: [{ item: 'chemlib:polyvinyl_chloride', count: 4 }], process: 'polymer_feedstock', slate: 'bloodmagic:infusedslate' },
    { id: 'acetylene', item: 'chemlib:acetylene', source: [{ item: 'chemlib:calcium_carbonate' }, { item: 'chemlib:carbon' }, { fluid: 'minecraft:water', amount: 125 }], outputs: [{ item: 'minecraft:torch', count: 12 }], process: 'hot_cutting_gas', slate: 'bloodmagic:infusedslate' },
    { id: 'methane', item: 'chemlib:methane', source: [{ item: 'chemlib:cellulose' }, { item: 'chemlib:hydrogen' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'minecraft:charcoal', count: 2 }], process: 'fuel_gas', slate: 'bloodmagic:reinforcedslate' },
    { id: 'propane', item: 'chemlib:propane', source: [{ item: 'chemlib:methane' }, { item: 'chemlib:carbon' }, { item: 'chemlib:hydrogen' }], outputs: [{ item: 'create:blaze_cake_base', count: 1 }], process: 'pressure_fuel', slate: 'bloodmagic:infusedslate' },
    { id: 'butane', item: 'chemlib:butane', source: [{ item: 'chemlib:propane' }, { item: 'chemlib:carbon' }, { item: 'chemlib:hydrogen' }], outputs: [{ item: 'minecraft:fire_charge', count: 4 }], process: 'liquefied_fuel', slate: 'bloodmagic:infusedslate' },
    { id: 'carbon_dioxide', item: 'chemlib:carbon_dioxide', source: [{ item: 'chemlib:calcium_carbonate' }, { item: 'minecraft:charcoal' }], outputs: [{ item: 'chemlib:calcium_carbonate', count: 2 }], process: 'scrubbing_carbonation', slate: 'bloodmagic:blankslate' },
    { id: 'carbon_monoxide', item: 'chemlib:carbon_monoxide', source: [{ item: 'chemlib:carbon_dioxide' }, { item: 'chemlib:carbon' }], outputs: [{ item: 'chemlib:iron', count: 2 }], process: 'reducing_gas', slate: 'bloodmagic:reinforcedslate' },
    { id: 'carbon_disulfide', item: 'chemlib:carbon_disulfide', source: [{ item: 'chemlib:carbon' }, { item: 'chemlib:sulfur' }, { fluid: 'chemlib:sulfuric_acid_fluid', amount: 125 }], outputs: [{ item: 'minecraft:string', count: 4 }], process: 'sulfur_solvent', slate: 'bloodmagic:infusedslate' },
    { id: 'ammonia', item: 'chemlib:ammonia', source: [{ item: 'chemlib:nitrogen' }, { item: 'chemlib:hydrogen' }, { item: 'chemlib:hydrogen' }], outputs: [{ item: 'minecraft:bone_meal', count: 6 }], process: 'nitrogen_fixation', slate: 'bloodmagic:reinforcedslate' },
    { id: 'ammonium', item: 'chemlib:ammonium', source: [{ item: 'chemlib:ammonia' }, { item: 'chemlib:hydrogen' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'chemlib:diammonium_phosphate', count: 2 }], process: 'fertilizer_salt', slate: 'bloodmagic:reinforcedslate' },
    { id: 'ammonium_chloride', item: 'chemlib:ammonium_chloride', source: [{ item: 'chemlib:ammonium' }, { item: 'chemlib:chlorine' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'pneumaticcraft:empty_pcb', count: 2 }], process: 'flux_cleaning', slate: 'bloodmagic:infusedslate' },
    { id: 'diammonium_phosphate', item: 'chemlib:diammonium_phosphate', source: [{ item: 'chemlib:ammonium' }, { item: 'chemlib:phosphoric_acid' }, { fluid: 'minecraft:water', amount: 250 }], outputs: [{ item: 'minecraft:bone_meal', count: 12 }], process: 'fertilizer_prilling', slate: 'bloodmagic:infusedslate' },
    { id: 'hydrogen_sulfide', item: 'chemlib:hydrogen_sulfide', source: [{ item: 'chemlib:sulfur' }, { item: 'chemlib:hydrogen' }], outputs: [{ item: 'chemlib:sulfur', count: 3 }], process: 'sulfide_precipitation', slate: 'bloodmagic:demonslate' },
    { id: 'sulfur_dioxide', item: 'chemlib:sulfur_dioxide', source: [{ item: 'chemlib:sulfur' }, { item: 'chemlib:oxygen' }], outputs: [{ item: 'chemlib:sulfuric_acid', count: 2 }], process: 'acid_gas', slate: 'bloodmagic:demonslate' },
    { id: 'sulfur_trioxide', item: 'chemlib:sulfur_trioxide', source: [{ item: 'chemlib:sulfur_dioxide' }, { item: 'chemlib:oxygen' }], outputs: [{ item: 'chemlib:sulfuric_acid', count: 3 }], process: 'acid_upgrade', slate: 'bloodmagic:demonslate' },
    { id: 'nitric_oxide', item: 'chemlib:nitric_oxide', source: [{ item: 'chemlib:nitrogen' }, { item: 'chemlib:oxygen' }, { item: 'minecraft:redstone' }], outputs: [{ item: 'chemlib:nitrogen_dioxide', count: 2 }], process: 'oxidation_gas', slate: 'bloodmagic:demonslate' },
    { id: 'nitrogen_dioxide', item: 'chemlib:nitrogen_dioxide', source: [{ item: 'chemlib:nitric_oxide' }, { item: 'chemlib:oxygen' }], outputs: [{ item: 'chemlib:nitric_acid', count: 2 }], process: 'acid_absorption', slate: 'bloodmagic:demonslate' },
    { id: 'polyvinyl_chloride', item: 'chemlib:polyvinyl_chloride', source: [{ item: 'chemlib:ethylene' }, { item: 'chemlib:chlorine' }, { item: 'kubejs:pressure_seal' }], outputs: [{ item: 'kubejs:pressure_seal', count: 4 }], process: 'polymer_compounding', slate: 'bloodmagic:infusedslate' }
]

function btmFullChemRegisterElement(event, group, element) {
    var elementItem = 'chemlib:' + element
    if (!btmFullChemExists(elementItem)) return

    if (btmFullChemExists(group.source)) {
        btmFullChemMix(event, 'source/' + group.id + '/' + element, [
            { item: group.source },
            { item: 'kubejs:titanium_grinding_ball' },
            { fluid: group.acid, amount: 250 }
        ], [
            { item: elementItem, chance: group.id === 'noble' || group.id === 'radioactive' ? 0.10 : 0.16 },
            { item: 'kubejs:titanium_grinding_ball', chance: 0.78 }
        ], 'heated', 260)

        btmFullChemBlood(event, 'source/' + group.id + '/' + element, [
            { item: group.source },
            { item: group.slate },
            { item: 'kubejs:pressure_seal' }
        ], { item: elementItem, count: group.id === 'noble' || group.id === 'radioactive' ? 2 : 4 }, group.id === 'noble' || group.id === 'radioactive' ? 18000 : 9000, 360, group.slate === 'bloodmagic:etherealslate' ? 4 : 3)
    }

    for (var f = 0; f < BTM_FULL_CHEM_FAMILIES.length; f++) {
        var family = BTM_FULL_CHEM_FAMILIES[f]
        var compound = btmFullChemCompound(element, family.suffix)
        if (!btmFullChemExists(compound) || !btmFullChemFluidExists(family.fluid)) continue
        btmFullChemMix(event, 'compound/' + element + '/' + family.id, [
            { item: elementItem },
            { item: family.reagent },
            { fluid: family.fluid, amount: family.amount }
        ], [{ item: compound, count: 2 }].concat(btmFullChemSideResults(family.side)), family.heat, 220)

        btmFullChemThermo(event, 'compound/' + element + '/' + family.id, { item: elementItem }, family.fluid, family.amount, { item: compound, count: 3 }, family.pressure, family.temp)
    }

    var oxide = btmFullChemCompound(element, 'oxide')
    if (btmFullChemExists(oxide)) {
        btmFullChemMix(event, 'reduction/carbon/' + element, [
            { item: oxide },
            { item: 'chemlib:carbon' },
            { fluid: 'minecraft:water', amount: 125 }
        ], [
            { item: elementItem, count: 1 },
            { item: 'chemlib:carbon_dioxide', chance: 0.25 }
        ], 'heated', 220)
        btmFullChemBlood(event, 'reduction/blood/' + element, [
            { item: oxide },
            { item: group.slate },
            { item: 'chemlib:carbon' }
        ], { item: elementItem, count: 4 }, 10000, 300, 3)
    }

    var sinks = BTM_FULL_CHEM_GROUP_SINKS[group.id] || []
    for (var s = 0; s < sinks.length; s++) {
        btmFullChemRegisterSink(event, group, elementItem, sinks[s])
    }
}

function btmFullChemSinkInputs(elementItem, sink) {
    var inputs = [{ item: elementItem }]
    for (var i = 0; i < sink.inputs.length; i++) inputs.push({ item: sink.inputs[i] })
    return inputs
}

function btmFullChemRegisterSink(event, group, elementItem, sink) {
    var input = btmFullChemSinkInputs(elementItem, sink)
    if (sink.kind === 'pressure') {
        btmFullChemPressure(event, 'sink/' + group.id + '/' + elementItem.substring(8) + '/' + sink.id, input, { item: sink.output, count: sink.count || 1 }, sink.pressure || 2.5)
    } else if (sink.kind === 'compact') {
        btmFullChemCompact(event, 'sink/' + group.id + '/' + elementItem.substring(8) + '/' + sink.id, input, [{ item: sink.output, count: sink.count || 1 }], sink.heat || null)
    } else {
        btmFullChemMix(event, 'sink/' + group.id + '/' + elementItem.substring(8) + '/' + sink.id, input, [{ item: sink.output, count: sink.count || 1 }], sink.heat || null, 200)
    }
}

function btmFullChemRegisterMolecule(event, molecule) {
    if (!btmFullChemExists(molecule.item)) return

    btmFullChemMix(event, 'molecule/source/' + molecule.id, molecule.source, [{ item: molecule.item, count: 2 }], 'heated', 220)
    btmFullChemPressure(event, 'molecule/pressure_source/' + molecule.id, molecule.source, { item: molecule.item, count: 3 }, 2.75)
    btmFullChemBlood(event, 'molecule/manual_yield/' + molecule.id, molecule.source.concat([{ item: molecule.slate }]), { item: molecule.item, count: 5 }, 8000, 240, 2)

    btmFullChemMix(event, 'molecule/use/' + molecule.id + '/' + molecule.process, [{ item: molecule.item }], molecule.outputs, molecule.id.indexOf('oxide') >= 0 ? 'heated' : null, 180)
    btmFullChemPressure(event, 'molecule/controlled_use/' + molecule.id + '/' + molecule.process, [{ item: molecule.item }, { item: 'kubejs:pressure_seal' }], { item: molecule.outputs[0].item, count: molecule.outputs[0].count || 1 }, 2.5)

    if (molecule.fluid && btmFullChemFluidExists(molecule.fluid)) {
        btmFullChemMix(event, 'molecule/fluid_spend/' + molecule.id, [
            { item: molecule.item },
            { fluid: molecule.fluid, amount: 250 }
        ], molecule.outputs, null, 160)
    }
}

ServerEvents.recipes(function (event) {
    for (var g = 0; g < BTM_FULL_CHEM_ELEMENT_GROUPS.length; g++) {
        var group = BTM_FULL_CHEM_ELEMENT_GROUPS[g]
        for (var e = 0; e < group.elements.length; e++) {
            btmFullChemRegisterElement(event, group, group.elements[e])
        }
    }

    for (var m = 0; m < BTM_FULL_CHEM_MOLECULES.length; m++) {
        btmFullChemRegisterMolecule(event, BTM_FULL_CHEM_MOLECULES[m])
    }
})
