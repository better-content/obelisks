// General chemistry transformations.
//
// These routes turn acid/ball outputs into a reusable manufacturing language:
// roast salts, leach solids, precipitate powders, reduce oxides, and scrub gases.

function btmChemXExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmChemXIngredient(input) {
    if (typeof input !== 'string') return input
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmChemXIngredientExists(input) {
    if (!input) return false
    if (typeof input !== 'string') return true
    if (input.charAt(0) === '#') return true
    return btmChemXExists(input)
}

function btmChemXCanCraft(output, inputs) {
    if (!btmChemXExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!btmChemXIngredientExists(inputs[i])) return false
    }
    return true
}

function btmChemXResult(item, count, chance) {
    var result = { item: item }
    if (count && count > 1) result.count = count
    if (chance && chance < 1) result.chance = chance
    return result
}

function btmChemXMix(event, id, output, count, inputs, fluid, amount, heat, time, side) {
    if (!btmChemXCanCraft(output, inputs)) return
    var ingredients = inputs.map(btmChemXIngredient)
    if (fluid) ingredients.push({ fluid: fluid, amount: amount || 250 })
    var results = [btmChemXResult(output, count || 1)]
    if (side && btmChemXExists(side.item)) results.push(btmChemXResult(side.item, side.count || 1, side.chance || 1))
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: results,
        processingTime: time || 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/transform/create_mixing/' + id)
}

function btmChemXCompact(event, id, output, count, inputs, heat, side) {
    if (!btmChemXCanCraft(output, inputs)) return
    var results = [btmChemXResult(output, count || 1)]
    if (side && btmChemXExists(side.item)) results.push(btmChemXResult(side.item, side.count || 1, side.chance || 1))
    var recipe = {
        type: 'create:compacting',
        ingredients: inputs.map(btmChemXIngredient),
        results: results,
        processingTime: 180
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/transform/create_compacting/' + id)
}

function btmChemXPressure(event, id, output, count, inputs, pressure) {
    if (!btmChemXCanCraft(output, inputs)) return
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (input) {
            var stack = btmChemXIngredient(input)
            stack.type = 'pneumaticcraft:stacked_item'
            stack.count = 1
            return stack
        }),
        pressure: pressure || 2.0,
        results: [btmChemXResult(output, count || 1)]
    }).id('kubejs:chemistry/transform/pncr_pressure/' + id)
}

ServerEvents.recipes(function (event) {
    var carbonates = [
        { id: 'calcium', carbonate: 'chemlib:calcium_carbonate', oxide: 'chemlib:calcium_oxide' },
        { id: 'zinc', carbonate: 'chemlib:zinc_carbonate', oxide: 'chemlib:zinc_oxide' },
        { id: 'lead', carbonate: 'chemlib:lead_carbonate', oxide: 'chemlib:lead_oxide' },
        { id: 'iron', carbonate: 'chemlib:iron_carbonate', oxide: 'chemlib:iron_oxide' },
        { id: 'magnesium', carbonate: 'chemlib:magnesium_carbonate', oxide: 'chemlib:magnesium_oxide' },
        { id: 'nickel', carbonate: 'chemlib:nickel_carbonate', oxide: 'chemlib:nickel_oxide' },
        { id: 'copper', carbonate: 'chemlib:copper_carbonate', oxide: 'chemlib:copper_ii_oxide' }
    ]
    for (var c = 0; c < carbonates.length; c++) {
        btmChemXCompact(event, carbonates[c].id + '_carbonate_roasting', carbonates[c].oxide, 1, [
            carbonates[c].carbonate,
            'minecraft:charcoal'
        ], 'heated', { item: 'chemlib:carbon_dioxide', chance: 0.35 })
    }

    var reductions = [
        { id: 'iron', oxide: 'chemlib:iron_oxide', metal: 'chemlib:iron' },
        { id: 'lead', oxide: 'chemlib:lead_oxide', metal: 'chemlib:lead' },
        { id: 'tin', oxide: 'chemlib:tin_oxide', metal: 'chemlib:tin' },
        { id: 'zinc', oxide: 'chemlib:zinc_oxide', metal: 'chemlib:zinc' },
        { id: 'copper', oxide: 'chemlib:copper_ii_oxide', metal: 'chemlib:copper' },
        { id: 'nickel', oxide: 'chemlib:nickel_oxide', metal: 'chemlib:nickel' },
        { id: 'titanium_magnesium', oxide: 'chemlib:titanium_oxide', metal: 'chemlib:titanium', reductant: 'chemlib:magnesium' },
        { id: 'aluminum_magnesium', oxide: 'chemlib:aluminum_oxide', metal: 'chemlib:aluminum', reductant: 'chemlib:magnesium' }
    ]
    for (var r = 0; r < reductions.length; r++) {
        btmChemXCompact(event, reductions[r].id + '_oxide_reduction', reductions[r].metal, 1, [
            reductions[r].oxide,
            reductions[r].reductant || 'chemlib:carbon'
        ], 'superheated', { item: 'chemlib:carbon_dioxide', chance: reductions[r].reductant ? 0.12 : 0.30 })
    }

    var leaches = [
        { id: 'copper_sulfate_from_carbonate', input: 'chemlib:copper_carbonate', fluid: 'chemlib:sulfuric_acid_fluid', output: 'chemlib:copper_ii_sulfate' },
        { id: 'zinc_sulfate_from_carbonate', input: 'chemlib:zinc_carbonate', fluid: 'chemlib:sulfuric_acid_fluid', output: 'chemlib:zinc_sulfate' },
        { id: 'nickel_sulfate_from_carbonate', input: 'chemlib:nickel_carbonate', fluid: 'chemlib:sulfuric_acid_fluid', output: 'chemlib:nickel_sulfate' },
        { id: 'magnesium_sulfate_from_carbonate', input: 'chemlib:magnesium_carbonate', fluid: 'chemlib:sulfuric_acid_fluid', output: 'chemlib:magnesium_sulfate' },
        { id: 'calcium_nitrate_from_carbonate', input: 'chemlib:calcium_carbonate', fluid: 'chemlib:nitric_acid_fluid', output: 'chemlib:calcium_nitrate' },
        { id: 'copper_chloride_from_carbonate', input: 'chemlib:copper_carbonate', fluid: 'chemlib:hydrochloric_acid_fluid', output: 'chemlib:copper_chloride' },
        { id: 'nickel_chloride_from_carbonate', input: 'chemlib:nickel_carbonate', fluid: 'chemlib:hydrochloric_acid_fluid', output: 'chemlib:nickel_chloride' },
        { id: 'beryllium_chloride_from_beryl', input: 'chemlib:beryl', fluid: 'chemlib:hydrochloric_acid_fluid', output: 'chemlib:beryllium_chloride' }
    ]
    for (var l = 0; l < leaches.length; l++) {
        btmChemXMix(event, leaches[l].id, leaches[l].output, 2, [
            leaches[l].input
        ], leaches[l].fluid, 250, 'heated', 220, { item: 'chemlib:carbon_dioxide', chance: 0.20 })
    }

    var precipitates = [
        { id: 'copper_hydroxide', salt: 'chemlib:copper_ii_sulfate', base: 'chemlib:sodium_hydroxide', output: 'chemlib:copper_ii_hydroxide' },
        { id: 'aluminum_hydroxide', salt: 'chemlib:aluminum_nitrate', base: 'chemlib:sodium_hydroxide', output: 'chemlib:aluminum_hydroxide' },
        { id: 'zinc_hydroxide', salt: 'chemlib:zinc_sulfate', base: 'chemlib:sodium_hydroxide', output: 'chemlib:zinc_hydroxide' },
        { id: 'nickel_carbonate', salt: 'chemlib:nickel_sulfate', base: 'chemlib:sodium_carbonate', output: 'chemlib:nickel_carbonate' },
        { id: 'magnesium_carbonate', salt: 'chemlib:magnesium_sulfate', base: 'chemlib:sodium_carbonate', output: 'chemlib:magnesium_carbonate' },
        { id: 'lead_carbonate', salt: 'chemlib:lead_nitrate', base: 'chemlib:sodium_carbonate', output: 'chemlib:lead_carbonate' }
    ]
    for (var p = 0; p < precipitates.length; p++) {
        btmChemXMix(event, precipitates[p].id + '_precipitation', precipitates[p].output, 2, [
            precipitates[p].salt,
            precipitates[p].base
        ], 'minecraft:water', 250, null, 180, { item: 'chemlib:sodium_sulfate', chance: 0.25 })
    }

    btmChemXMix(event, 'soda_ash_from_salt_and_lime', 'chemlib:sodium_carbonate', 2, [
        'chemlib:sodium_chloride',
        'chemlib:calcium_carbonate'
    ], 'minecraft:water', 250, 'heated', 220, { item: 'chemlib:calcium_chloride', chance: 0.50 })
    btmChemXMix(event, 'phosphate_from_phosphoric_lime', 'chemlib:phosphate', 2, [
        'chemlib:phosphoric_acid',
        'chemlib:calcium'
    ], 'minecraft:water', 250, null, 180, null)
    btmChemXCompact(event, 'carbon_dioxide_scrub_lime', 'chemlib:calcium_carbonate', 2, [
        'chemlib:calcium_oxide',
        'chemlib:carbon_dioxide'
    ], null, null)
    btmChemXPressure(event, 'chloralkali_salt_cell', 'chemlib:sodium_hydroxide', 2, [
        'chemlib:sodium_chloride',
        'kubejs:pressure_seal',
        '#forge:plates/copper'
    ], 2.5)
    btmChemXPressure(event, 'beryllium_from_beryllium_chloride', 'chemlib:beryllium', 1, [
        'chemlib:beryllium_chloride',
        'chemlib:magnesium'
    ], 3.0)
})
