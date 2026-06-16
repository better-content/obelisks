// Chemical alternate routes for existing pack items.
//
// These recipes are intentionally additive unless a prior pass already owns removal.
// They let acid/ball outputs substitute effort, plant/ore byproducts, and machine setup
// for scarce drops or generic hand-stacked recipes.

function btmChemAltExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmChemAltIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmChemAltIngredientExists(input) {
    if (!input) return false
    if (typeof input !== 'string') return true
    if (input.charAt(0) === '#') return true
    return btmChemAltExists(input)
}

function btmChemAltCanCraft(output, inputs) {
    if (!btmChemAltExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!btmChemAltIngredientExists(inputs[i])) return false
    }
    return true
}

function btmChemAltResult(output, count, chance) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    if (chance && chance < 1) result.chance = chance
    return result
}

function btmChemAltMix(event, id, output, count, inputs, fluid, amount, heat, time) {
    if (!btmChemAltCanCraft(output, inputs)) return
    var ingredients = inputs.map(btmChemAltIngredient)
    if (fluid) ingredients.push({ fluid: fluid, amount: amount || 250 })
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: [btmChemAltResult(output, count || 1)],
        processingTime: time || 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/existing/create_mixing/' + id)
}

function btmChemAltCompact(event, id, output, count, inputs, heat) {
    if (!btmChemAltCanCraft(output, inputs)) return
    var recipe = {
        type: 'create:compacting',
        ingredients: inputs.map(btmChemAltIngredient),
        results: [btmChemAltResult(output, count || 1)],
        processingTime: 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/existing/create_compacting/' + id)
}

function btmChemAltPress(event, id, output, count, input) {
    if (!btmChemAltCanCraft(output, [input])) return
    event.custom({
        type: 'create:pressing',
        ingredients: [btmChemAltIngredient(input)],
        results: [btmChemAltResult(output, count || 1)]
    }).id('kubejs:chemistry/existing/create_pressing/' + id)
}

function btmChemAltSequenced(event, id, output, input, transitional, loops, results, sequence) {
    if (!btmChemAltCanCraft(output, [input, transitional])) return
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: btmChemAltIngredient(input),
        transitionalItem: { item: transitional },
        loops: loops || 1,
        results: results,
        sequence: sequence
    }).id('kubejs:chemistry/existing/create_sequence/' + id)
}

function btmChemAltPressure(event, id, output, count, pressure, inputs) {
    if (!btmChemAltCanCraft(output, inputs)) return
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (input) {
            var stack = btmChemAltIngredient(input)
            stack.type = 'pneumaticcraft:stacked_item'
            stack.count = 1
            return stack
        }),
        pressure: pressure || 2.0,
        results: [btmChemAltResult(output, count || 1)]
    }).id('kubejs:chemistry/existing/pncr_pressure/' + id)
}

ServerEvents.recipes(function (event) {
    // Refractory and casting materials.
    btmChemAltMix(event, 'tconstruct/grout_chemical_bulk', 'tconstruct:grout', 12, [
        'minecraft:clay_ball',
        'minecraft:clay_ball',
        '#forge:sand',
        '#forge:gravel',
        'chemlib:calcium_carbonate',
        'chemlib:silicon_dioxide'
    ], 'minecraft:water', 250, null, 160)
    btmChemAltMix(event, 'tconstruct/nether_grout_sulfuric_refractory', 'tconstruct:nether_grout', 16, [
        'tconstruct:grout',
        'minecraft:soul_sand',
        'chemlib:sulfur',
        'chemlib:iron_oxide',
        'chemlib:aluminum_oxide'
    ], 'chemlib:sulfuric_acid_fluid', 250, 'heated', 220)
    btmChemAltCompact(event, 'tconstruct/seared_brick_alumina', 'tconstruct:seared_brick', 4, [
        'tconstruct:grout',
        'chemlib:aluminum_oxide'
    ], 'heated')
    btmChemAltCompact(event, 'tconstruct/scorched_brick_titania', 'tconstruct:scorched_brick', 4, [
        'tconstruct:nether_grout',
        'chemlib:titanium_oxide',
        'chemlib:sulfur'
    ], 'superheated')
    btmChemAltCompact(event, 'tconstruct/gold_cast_ceramic', 'tconstruct:ingot_cast', 1, [
        'chemlib:aluminum_oxide',
        'chemlib:silicon_dioxide',
        'minecraft:clay_ball'
    ], 'heated')

    // Glass, lenses, and technical surfaces.
    btmChemAltCompact(event, 'minecraft/glass_from_silica_flux', 'minecraft:glass', 4, [
        'chemlib:silicon_dioxide',
        'chemlib:sodium_carbonate',
        'chemlib:calcium_carbonate'
    ], 'heated')
    btmChemAltCompact(event, 'ae2/quartz_glass_pure_silica', 'ae2:quartz_glass', 4, [
        'chemlib:silicon_dioxide',
        'minecraft:quartz',
        'chemlib:aluminum_oxide'
    ], 'heated')
    btmChemAltCompact(event, 'ae2/quartz_fiber_pure_silica', 'ae2:quartz_fiber', 3, [
        'ae2:quartz_glass',
        'chemlib:silicon_dioxide',
        '#forge:dusts/redstone'
    ], 'heated')

    // Explosives and cannon consumables.
    btmChemAltMix(event, 'minecraft/gunpowder_nitrate_black_powder', 'minecraft:gunpowder', 4, [
        'chemlib:sodium_nitrate',
        'chemlib:sulfur',
        'chemlib:carbon'
    ], null, 0, null, 120)
    btmChemAltCompact(event, 'minecraft/tnt_chemical_charge', 'minecraft:tnt', 2, [
        'minecraft:sand',
        'minecraft:sand',
        'minecraft:paper',
        'chemlib:sodium_nitrate',
        'chemlib:sulfur',
        'chemlib:carbon'
    ], null)
    btmChemAltCompact(event, 'createbigcannons/powder_charge_nitrate', 'createbigcannons:powder_charge', 2, [
        'minecraft:paper',
        'chemlib:sodium_nitrate',
        'chemlib:sulfur',
        'chemlib:carbon'
    ], null)
    btmChemAltCompact(event, 'createbigcannons/impact_fuze_copper_nitrate', 'createbigcannons:impact_fuze', 1, [
        'minecraft:redstone',
        'chemlib:copper_nitrate',
        '#forge:plates/copper'
    ], null)

    // Create machinery and control parts.
    btmChemAltMix(event, 'create/abrasive_slurry_for_precision', 'create:polished_rose_quartz', 2, [
        'create:rose_quartz',
        'chemlib:aluminum_oxide',
        'chemlib:silicon_dioxide'
    ], 'minecraft:water', 250, null, 160)
    btmChemAltSequenced(event, 'create/precision_mechanism_chemical_polish', 'create:precision_mechanism', 'create:cogwheel', 'create:incomplete_precision_mechanism', 5, [
        { chance: 140.0, item: 'create:precision_mechanism' },
        { chance: 8.0, item: 'create:cogwheel' },
        { chance: 8.0, item: 'create:andesite_alloy' }
    ], [
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: 'create:large_cogwheel' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:filling',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { fluid: 'minecraft:water', amount: 250 }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: 'chemlib:aluminum_oxide' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:pressing',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        }
    ])
    btmChemAltMix(event, 'create/electron_tube_copper_chloride', 'create:electron_tube', 2, [
        'create:polished_rose_quartz',
        '#forge:plates/copper',
        'chemlib:copper_chloride',
        'chemlib:silicon_dioxide'
    ], null, 0, null, 160)
    btmChemAltPressure(event, 'create/brass_hand_nickel_plated', 'create:brass_hand', 1, 2.0, [
        '#forge:plates/brass',
        'chemlib:nickel_sulfate',
        'chemlib:sodium_hydroxide'
    ])
    btmChemAltPressure(event, 'create/deployer_passivated', 'create:deployer', 1, 2.0, [
        'create:brass_hand',
        'kubejs:andesite_machine_casing',
        'chemlib:zinc_sulfate',
        'morered:red_alloy_wire'
    ])
    btmChemAltPressure(event, 'create/spout_clean_nozzle', 'create:spout', 1, 2.0, [
        'create:fluid_pipe',
        'create:fluid_tank',
        'chemlib:copper_chloride',
        'kubejs:pressure_seal'
    ])
    btmChemAltPressure(event, 'create/steam_engine_nickel_condenser', 'create:steam_engine', 1, 2.5, [
        'kubejs:brass_machine_casing',
        '#forge:storage_blocks/copper',
        'chemlib:nickel_sulfate',
        'chemlib:aluminum_oxide'
    ])

    // PneumaticCraft, pressure hardware, and late materials.
    btmChemAltPressure(event, 'pneumaticcraft/pressure_chamber_wall_refractory', 'pneumaticcraft:pressure_chamber_wall', 8, 2.0, [
        'pneumaticcraft:ingot_iron_compressed',
        'chemlib:aluminum_oxide',
        'chemlib:calcium_oxide'
    ])
    btmChemAltPressure(event, 'pneumaticcraft/pressure_chamber_glass_leaded', 'pneumaticcraft:pressure_chamber_glass', 4, 2.0, [
        'minecraft:glass',
        'chemlib:lead_oxide',
        'chemlib:silicon_dioxide'
    ])
    btmChemAltPressure(event, 'pneumaticcraft/advanced_pressure_tube_titania', 'pneumaticcraft:advanced_pressure_tube', 4, 3.0, [
        'pneumaticcraft:reinforced_pressure_tube',
        'chemlib:titanium_oxide',
        'chemlib:polyvinyl_chloride',
        'kubejs:pressure_seal'
    ])
    btmChemAltCompact(event, 'pneumaticcraft/turbine_blade_titanium_treated', 'pneumaticcraft:turbine_blade', 2, [
        '#forge:plates/steel',
        'chemlib:titanium_oxide',
        'chemlib:aluminum_oxide'
    ], 'heated')
    btmChemAltCompact(event, 'pneumaticcraft/assembly_drill_tungsten_carbide', 'pneumaticcraft:assembly_drill', 1, [
        'kubejs:airtight_machine_casing',
        'kubejs:tungsten_carbide_insert',
        'kubejs:rotational_compressor_core'
    ], null)
    btmChemAltPressure(event, 'pneumaticcraft/assembly_laser_beryl_lens', 'pneumaticcraft:assembly_laser', 1, 2.5, [
        'kubejs:airtight_machine_casing',
        'kubejs:mountain_beryl_lens',
        'powergrid:integrated_circuit'
    ])

    btmChemAltCompact(event, 'protection_pixel/lead_shielding_glass', 'protection_pixel:shieldingglass', 2, [
        'minecraft:glass',
        'chemlib:lead_oxide',
        'chemlib:silicon_dioxide'
    ], 'heated')
    btmChemAltCompact(event, 'creatingspace/heat_shield_ceramic', 'creatingspace:heat_shield', 2, [
        'chemlib:aluminum_oxide',
        'chemlib:titanium_oxide',
        'chemlib:calcium_oxide'
    ], 'superheated')
})
