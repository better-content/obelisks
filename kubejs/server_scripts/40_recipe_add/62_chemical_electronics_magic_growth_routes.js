// Chemical routes for electronics, magic reagents, and growable economy sinks.
//
// Finished circuit authority remains in PNCR assembly. These recipes prepare boards,
// wafers, pigments, salts, and manual/magic alternatives around that authority.

function btmChemUseExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmChemUseIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmChemUseIngredientExists(input) {
    if (!input) return false
    if (typeof input !== 'string') return true
    if (input.charAt(0) === '#') return true
    return btmChemUseExists(input)
}

function btmChemUseCanCraft(output, inputs) {
    if (!btmChemUseExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!btmChemUseIngredientExists(inputs[i])) return false
    }
    return true
}

function btmChemUseResult(output, count, chance) {
    var result = { item: output }
    if (count && count > 1) result.count = count
    if (chance && chance < 1) result.chance = chance
    return result
}

function btmChemUseMix(event, id, output, count, inputs, fluid, amount, heat, time) {
    if (!btmChemUseCanCraft(output, inputs)) return
    var ingredients = inputs.map(btmChemUseIngredient)
    if (fluid) ingredients.push({ fluid: fluid, amount: amount || 250 })
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: [btmChemUseResult(output, count || 1)],
        processingTime: time || 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/use/create_mixing/' + id)
}

function btmChemUseCompact(event, id, output, count, inputs, heat) {
    if (!btmChemUseCanCraft(output, inputs)) return
    var recipe = {
        type: 'create:compacting',
        ingredients: inputs.map(btmChemUseIngredient),
        results: [btmChemUseResult(output, count || 1)],
        processingTime: 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/use/create_compacting/' + id)
}

function btmChemUsePressure(event, id, output, count, pressure, inputs) {
    if (!btmChemUseCanCraft(output, inputs)) return
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (input) {
            var stack = btmChemUseIngredient(input)
            stack.type = 'pneumaticcraft:stacked_item'
            stack.count = 1
            return stack
        }),
        pressure: pressure || 2.0,
        results: [btmChemUseResult(output, count || 1)]
    }).id('kubejs:chemistry/use/pncr_pressure/' + id)
}

function btmChemUseAlchemy(event, id, output, count, inputs, syphon, ticks, upgradeLevel) {
    if (!btmChemUseCanCraft(output, inputs)) return
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs.map(btmChemUseIngredient),
        output: btmChemUseResult(output, count || 1),
        syphon: syphon || 1000,
        ticks: ticks || 200,
        upgradeLevel: upgradeLevel || 0
    }).id('kubejs:chemistry/use/blood_alchemy/' + id)
}

function btmChemUseArsImbue(event, id, input, output, count, source, pedestalItems) {
    if (!btmChemUseCanCraft(output, [input])) return
    event.custom({
        type: 'ars_nouveau:imbuement',
        input: btmChemUseIngredient(input),
        output: output,
        count: count || 1,
        source: source || 500,
        pedestalItems: pedestalItems.map(function (item) {
            return { item: btmChemUseIngredient(item) }
        })
    }).id('kubejs:chemistry/use/ars_imbuement/' + id)
}

ServerEvents.recipes(function (event) {
    // Electronics: boards, wafers, processors-in-waiting.
    btmChemUseMix(event, 'morered/red_alloy_signal_salt', 'morered:red_alloy_ingot', 3, [
        '#forge:ingots/copper',
        '#forge:ingots/zinc',
        'minecraft:redstone',
        'chemlib:copper_nitrate'
    ], null, 0, null, 160)
    btmChemUseCompact(event, 'morered/stone_plate_ceramic', 'morered:stone_plate', 4, [
        '#forge:stone',
        'chemlib:aluminum_oxide',
        'chemlib:silicon_dioxide'
    ], null)
    btmChemUseMix(event, 'powergrid/unetched_circuit_ceramic_board', 'powergrid:unetched_circuit', 2, [
        '#forge:plates/copper',
        'chemlib:aluminum_oxide',
        'chemlib:silicon_dioxide',
        'morered:red_alloy_wire'
    ], null, 0, null, 160)
    btmChemUseMix(event, 'powergrid/incomplete_circuit_copper_chloride', 'powergrid:incomplete_circuit', 2, [
        'powergrid:unetched_circuit',
        'chemlib:copper_chloride',
        'chemlib:phosphorus'
    ], 'chemlib:hydrochloric_acid_fluid', 250, 'heated', 220)
    btmChemUsePressure(event, 'pneumaticcraft/empty_pcb_ceramic_laminate', 'pneumaticcraft:empty_pcb', 2, 2.0, [
        '#forge:plates/copper',
        'chemlib:aluminum_oxide',
        'chemlib:polyvinyl_chloride'
    ])
    btmChemUsePressure(event, 'pneumaticcraft/unassembled_pcb_etched_batch', 'pneumaticcraft:unassembled_pcb', 2, 2.5, [
        'pneumaticcraft:empty_pcb',
        'chemlib:copper_chloride',
        'chemlib:silicon_dioxide',
        'pneumaticcraft:transistor',
        'pneumaticcraft:capacitor'
    ])
    btmChemUsePressure(event, 'pneumaticcraft/transistor_doped_silicon', 'pneumaticcraft:transistor', 2, 2.5, [
        'chemlib:silicon',
        'chemlib:phosphorus',
        '#forge:nuggets/gold'
    ])
    btmChemUsePressure(event, 'pneumaticcraft/capacitor_copper_sulfate', 'pneumaticcraft:capacitor', 2, 2.0, [
        '#forge:plates/copper',
        'chemlib:copper_ii_sulfate',
        'chemlib:aluminum_oxide'
    ])
    btmChemUsePressure(event, 'oc2r/silicon_wafer_pure_silica', 'oc2r:silicon_wafer', 4, 2.5, [
        'chemlib:silicon_dioxide',
        'chemlib:phosphorus',
        'chemlib:aluminum_oxide'
    ])
    btmChemUsePressure(event, 'oc2r/transistor_phosphorus_doped', 'oc2r:transistor', 2, 2.5, [
        'oc2r:silicon_wafer',
        'chemlib:phosphorus',
        '#forge:nuggets/gold'
    ])
    btmChemUseMix(event, 'ae2/printed_silicon_chemical', 'ae2:printed_silicon', 2, [
        'chemlib:silicon',
        'chemlib:silicon_dioxide',
        'chemlib:phosphorus'
    ], null, 0, null, 160)
    btmChemUseMix(event, 'ae2/printed_logic_gold_etch', 'ae2:printed_logic_processor', 1, [
        '#forge:ingots/gold',
        'ae2:printed_silicon',
        'chemlib:copper_chloride'
    ], null, 0, null, 160)
    btmChemUseMix(event, 'ae2/printed_calculation_certus_etch', 'ae2:printed_calculation_processor', 1, [
        'ae2:certus_quartz_crystal',
        'ae2:printed_silicon',
        'chemlib:silicon_dioxide'
    ], null, 0, null, 160)
    btmChemUseMix(event, 'ae2/printed_engineering_diamond_etch', 'ae2:printed_engineering_processor', 1, [
        'minecraft:diamond',
        'ae2:printed_silicon',
        'chemlib:aluminum_oxide'
    ], null, 0, null, 160)

    // Magic reagent alternatives.
    btmChemUseAlchemy(event, 'bloodmagic/blank_slate_lime_batch', 'bloodmagic:blankslate', 2, [
        '#forge:stone',
        'chemlib:calcium_carbonate',
        'chemlib:iron'
    ], 1200, 180, 0)
    btmChemUseAlchemy(event, 'bloodmagic/reinforced_slate_iron_oxide_batch', 'bloodmagic:reinforcedslate', 2, [
        'bloodmagic:blankslate',
        'chemlib:iron_oxide',
        'chemlib:sulfur'
    ], 2600, 240, 1)
    btmChemUseAlchemy(event, 'bloodmagic/imbued_slate_phosphate_batch', 'bloodmagic:infusedslate', 2, [
        'bloodmagic:reinforcedslate',
        'chemlib:phosphoric_acid',
        'chemlib:calcium'
    ], 5200, 300, 2)
    btmChemUseAlchemy(event, 'bloodmagic/demonic_slate_soul_carbon_batch', 'bloodmagic:demonslate', 2, [
        'bloodmagic:infusedslate',
        'chemlib:carbon',
        'chemlib:hydrogen_sulfide',
        'minecraft:soul_sand'
    ], 10000, 360, 3)

    var runes = [
        { id: 'fire', output: 'irons_spellbooks:fire_rune', inputs: ['chemlib:sulfur', 'minecraft:blaze_powder', 'bloodmagic:reinforcedslate'] },
        { id: 'ice', output: 'irons_spellbooks:ice_rune', inputs: ['chemlib:sodium_chloride', 'minecraft:packed_ice', 'bloodmagic:reinforcedslate'] },
        { id: 'lightning', output: 'irons_spellbooks:lightning_rune', inputs: ['chemlib:copper_nitrate', 'minecraft:redstone', 'bloodmagic:infusedslate'] },
        { id: 'protection', output: 'irons_spellbooks:protection_rune', inputs: ['chemlib:aluminum_oxide', 'minecraft:shield', 'bloodmagic:infusedslate'] },
        { id: 'blood', output: 'irons_spellbooks:blood_rune', inputs: ['chemlib:iron_oxide', 'chemlib:phosphorus', 'bloodmagic:reinforcedslate'] },
        { id: 'nature', output: 'irons_spellbooks:nature_rune', inputs: ['chemlib:phosphate', 'chemlib:potassium', 'bloodmagic:reinforcedslate'] }
    ]
    for (var r = 0; r < runes.length; r++) {
        btmChemUseAlchemy(event, 'irons_spellbooks/' + runes[r].id + '_rune_chemical_salt', runes[r].output, 1, runes[r].inputs, 3500, 240, 1)
    }

    btmChemUseAlchemy(event, 'occultism/chalk_white_lime_sulfur', 'occultism:chalk_white', 2, [
        'minecraft:white_dye',
        'chemlib:calcium_carbonate',
        'chemlib:sulfur',
        'minecraft:charcoal'
    ], 1600, 180, 0)
    btmChemUseAlchemy(event, 'occultism/chalk_gold_phosphate', 'occultism:chalk_gold', 2, [
        'occultism:chalk_white',
        'chemlib:phosphate',
        '#forge:nuggets/gold',
        'bloodmagic:reinforcedslate'
    ], 2800, 220, 1)
    btmChemUseAlchemy(event, 'hexerei/blood_bottle_stabilized_salt', 'hexerei:blood_bottle', 2, [
        'minecraft:glass_bottle',
        'chemlib:sodium_chloride',
        'chemlib:phosphorus',
        'minecraft:redstone'
    ], 2200, 220, 1)
    btmChemUseArsImbue(event, 'ars/source_gem_beryl_silica', 'minecraft:amethyst_shard', 'ars_nouveau:source_gem', 2, 900, [
        'chemlib:beryl',
        'chemlib:silicon_dioxide',
        'bloodmagic:reinforcedslate'
    ])
    btmChemUseArsImbue(event, 'ars/source_gem_phosphorus_charge', 'ars_nouveau:source_gem', 'ars_nouveau:source_gem_block', 1, 1800, [
        'chemlib:phosphorus',
        'chemlib:aluminum_oxide',
        'bloodmagic:infusedslate'
    ])

    // Growable/body economy sinks.
    btmChemUseMix(event, 'minecraft/bone_meal_phosphate_bulk', 'minecraft:bone_meal', 8, [
        'chemlib:phosphate',
        'chemlib:calcium',
        'chemlib:phosphorus'
    ], 'minecraft:water', 250, null, 120)
    btmChemUseMix(event, 'farmersdelight/organic_compost_npk', 'farmersdelight:organic_compost', 4, [
        'minecraft:dirt',
        'chemlib:phosphate',
        'chemlib:nitrogen',
        'chemlib:potassium',
        'minecraft:bone_meal'
    ], 'minecraft:water', 250, null, 200)
    btmChemUseMix(event, 'farmersdelight/rich_soil_npk', 'farmersdelight:rich_soil', 2, [
        'farmersdelight:organic_compost',
        'chemlib:phosphoric_acid',
        'chemlib:calcium_carbonate'
    ], 'minecraft:water', 250, null, 240)
    btmChemUseMix(event, 'minecraft/wheat_protein_feed', 'minecraft:wheat', 4, [
        'minecraft:wheat_seeds',
        'chemlib:phosphate',
        'chemlib:potassium',
        'chemlib:nitrogen'
    ], 'minecraft:water', 250, null, 160)
    btmChemUseMix(event, 'minecraft/leather_tanned_hide', 'minecraft:leather', 2, [
        'minecraft:rotten_flesh',
        'chemlib:sodium_chloride',
        'chemlib:aluminum_oxide'
    ], 'chemlib:acetic_acid_fluid', 250, null, 220)
    btmChemUseMix(event, 'minecraft/string_collagen_fiber', 'minecraft:string', 4, [
        'minecraft:bone_meal',
        'chemlib:calcium',
        'chemlib:sulfur'
    ], 'minecraft:water', 250, null, 160)
    btmChemUseMix(event, 'minecraft/slime_ball_polymerized_biomass', 'minecraft:slime_ball', 2, [
        'minecraft:sugar',
        'chemlib:carbon',
        'chemlib:sulfur'
    ], 'chemlib:acetic_acid_fluid', 250, null, 220)
})
