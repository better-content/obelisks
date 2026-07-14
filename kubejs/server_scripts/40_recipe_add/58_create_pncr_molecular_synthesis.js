// Create + PNCR molecular synthesis.
//
// Create owns bulk visible chemistry. PNCR owns sealed pressure/gas handling.
// These routes intentionally make easy molecules appear before Airtight and make
// stronger solvents depend on the machine tiers they help justify.

function bcChemItem(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcChemGas(original) {
    return { item: original }
}

function bcChemResults(primaryResults, sideProducts) {
    var results = primaryResults.slice()
    for (var i = 0; i < (sideProducts || []).length; i++) {
        var side = sideProducts[i]
        if (!bcChemItem(side.item)) continue
        var result = { item: side.item }
        if (side.count && side.count > 1) result.count = side.count
        if (side.chance && side.chance < 1) result.chance = side.chance
        results.push(result)
    }
    return results
}

function bcChemMixing(event, id, ingredients, results, heat, time) {
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: results,
        processingTime: time || 160
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/create_mixing/' + id)
}

function bcChemCompacting(event, id, ingredients, results, heat) {
    for (var i = 0; i < results.length; i++) {
        if (results[i].item && !bcChemItem(results[i].item)) return
    }
    for (var j = 0; j < ingredients.length; j++) {
        if (ingredients[j].item && !bcChemItem(ingredients[j].item)) return
    }
    var recipe = {
        type: 'create:compacting',
        ingredients: ingredients,
        results: results
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:chemistry/create_compacting/' + id)
}

function bcChemPressure(event, id, inputs, result, pressure) {
    if (result.item && !bcChemItem(result.item)) return
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].item && !bcChemItem(inputs[i].item)) return
    }
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (input) {
            if (input.fluid === 'minecraft:water') return { item: 'minecraft:water_bucket' }
            return input
        }),
        pressure: pressure,
        results: [result]
    }).id('kubejs:chemistry/pneumaticcraft/pressure_chamber/' + id)
}

function bcChemThermo(event, id, itemInput, fluidInput, fluidOutput, pressure, minTemp) {
    var recipe = {
        type: 'pneumaticcraft:thermo_plant',
        exothermic: false,
        item_input: itemInput,
        fluid_input: fluidInput,
        fluid_output: fluidOutput,
        pressure: pressure || 2,
        speed: 0.45
    }
    if (minTemp) recipe.temperature = { min_temp: minTemp }
    event.custom(recipe).id('kubejs:chemistry/pneumaticcraft/thermo_plant/' + id)
}

ServerEvents.recipes(function (event) {
    event.remove({ id: 'kubejs:pneumaticcraft/pressure_seal' })
     bcChemCompacting(event, 'pressure_seal', [
        { item: 'minecraft:slime_ball' },
        { item: 'minecraft:dried_kelp' },
        { item: 'chemlib:sulfur' },
        { item: 'chemlib:carbon' },
        { fluid: 'chemlib:ethanol_fluid', amount: 250 }
    ], [{ item: 'kubejs:pressure_seal', count: 2 }], null)

     bcChemMixing(event, 'ethanol_from_sugar', [
        { item: 'minecraft:sugar' },
        { item: 'chemlib:carbon' },
        { fluid: 'minecraft:water', amount: 250 }
    ], bcChemResults([{ fluid: 'chemlib:ethanol_fluid', amount: 250 }], [
        { item: 'chemlib:carbon_dioxide', chance: 0.20 }
    ]), null, 120)

     bcChemMixing(event, 'acetic_acid_from_ethanol', [bcChemGas('chemlib:oxygen'),
        { item: 'chemlib:carbon' },
        { fluid: 'chemlib:ethanol_fluid', amount: 250 }
    ], bcChemResults([{ fluid: 'chemlib:acetic_acid_fluid', amount: 250 }], [
        { item: 'chemlib:carbon_dioxide', chance: 0.12 }
    ]), 'heated', 180)

     bcChemMixing(event, 'sulfuric_acid_from_sulfur_trioxide', [bcChemGas('chemlib:sulfur_trioxide'), bcChemGas('chemlib:oxygen'),
        { fluid: 'minecraft:water', amount: 250 }
    ], bcChemResults([{ fluid: 'chemlib:sulfuric_acid_fluid', amount: 250 }], [
        { item: 'chemlib:sulfur_dioxide', chance: 0.16 }
    ]), 'heated', 200)

     bcChemMixing(event, 'hydrochloric_acid_from_chlorine', [bcChemGas('chemlib:chlorine'), bcChemGas('chemlib:hydrogen'),
        { fluid: 'minecraft:water', amount: 250 }
    ], bcChemResults([{ fluid: 'chemlib:hydrochloric_acid_fluid', amount: 250 }], [
        { item: 'chemlib:hydrogen', chance: 0.12 }
    ]), 'heated', 200)

     bcChemMixing(event, 'nitric_acid_from_nitrogen_dioxide', [bcChemGas('chemlib:nitrogen_dioxide'), bcChemGas('chemlib:oxygen'),
        { fluid: 'minecraft:water', amount: 250 }
    ], bcChemResults([{ fluid: 'chemlib:nitric_acid_fluid', amount: 250 }], [
        { item: 'chemlib:nitrogen_dioxide', chance: 0.16 }
    ]), 'heated', 220)

     bcChemMixing(event, 'phosphoric_acid_fluid', [
        { item: 'chemlib:phosphoric_acid' },
        { item: 'chemlib:phosphorus' },
        { fluid: 'minecraft:water', amount: 250 }
    ], [{ fluid: 'kubejs:phosphoric_acid_fluid', amount: 250 }], 'heated', 180)

     bcChemMixing(event, 'phosphoric_acid_molecule', [
        { item: 'chemlib:phosphorus' }, bcChemGas('chemlib:oxygen'),
        { item: 'minecraft:bone_meal' },
        { fluid: 'minecraft:water', amount: 250 }
    ], [{ item: 'chemlib:phosphoric_acid', count: 2 }], 'heated', 180)

     bcChemCompacting(event, 'sodium_hydroxide', [
        { item: 'chemlib:sodium' }, bcChemGas('chemlib:oxygen'),
        { fluid: 'minecraft:water', amount: 250 }
    ], [{ item: 'chemlib:sodium_hydroxide', count: 2 }], null)

     bcChemCompacting(event, 'silicon_dioxide', [
        { item: 'chemlib:silicon' }, bcChemGas('chemlib:oxygen'),
        { item: 'minecraft:quartz' }
    ], [{ item: 'chemlib:silicon_dioxide', count: 2 }], null)

     bcChemCompacting(event, 'calcium_carbonate', [
        { item: 'chemlib:calcium' },
        { item: 'chemlib:carbon' },
        { item: 'minecraft:bone_meal' }
    ], [{ item: 'chemlib:calcium_carbonate', count: 2 }], null)

     bcChemCompacting(event, 'calcium_oxide', [
        { item: 'chemlib:calcium_carbonate' },
        { item: 'minecraft:charcoal' }
    ], [{ item: 'chemlib:calcium_oxide' }, { item: 'chemlib:carbon_dioxide' }], 'heated')

     bcChemMixing(event, 'iron_ii_oxide', [
        { item: 'chemlib:iron' }, bcChemGas('chemlib:oxygen'),
        { item: 'minecraft:charcoal' }
    ], bcChemResults([{ item: 'chemlib:iron_ii_oxide', count: 2 }], [
        { item: 'chemlib:carbon_dioxide', chance: 0.18 }
    ]), 'heated', 180)

     bcChemPressure(event, 'copper_chloride', [
        { item: 'chemlib:copper' }, bcChemGas('chemlib:chlorine'),
        { item: 'chemlib:sodium_chloride' }
    ], { item: 'chemlib:copper_chloride', count: 2 }, 2.5)

     bcChemPressure(event, 'copper_nitrate', [
        { item: 'chemlib:copper' }, bcChemGas('chemlib:nitrogen_dioxide'), bcChemGas('chemlib:oxygen')
    ], { item: 'chemlib:copper_nitrate', count: 2 }, 3.0)

     bcChemPressure(event, 'pvc', [bcChemGas('chemlib:ethylene'), bcChemGas('chemlib:chlorine'),
        { item: 'chemlib:carbon' },
        { item: 'kubejs:pressure_seal' }
    ], { item: 'chemlib:polyvinyl_chloride', count: 4 }, 3.5)

     bcChemPressure(event, 'hydrogen_sulfide', [
        { item: 'chemlib:sulfur' }, bcChemGas('chemlib:hydrogen'),
        { item: 'kubejs:pressure_seal' }
    ], { item: 'chemlib:hydrogen_sulfide', count: 2 }, 2.75)

     bcChemPressure(event, 'nitric_oxide', [bcChemGas('chemlib:nitrogen'), bcChemGas('chemlib:oxygen'),
        { item: 'minecraft:redstone' }
    ], { item: 'chemlib:nitric_oxide', count: 2 }, 3.0)

     bcChemPressure(event, 'ammonium_chloride', [
        { item: 'chemlib:ammonium' }, bcChemGas('chemlib:chlorine'),
        { fluid: 'minecraft:water', amount: 250 }
    ], { item: 'chemlib:ammonium_chloride', count: 2 }, 2.75)

     bcChemPressure(event, 'diammonium_phosphate', [
        { item: 'chemlib:ammonium' },
        { item: 'chemlib:phosphoric_acid' },
        { fluid: 'minecraft:water', amount: 250 }
    ], { item: 'chemlib:diammonium_phosphate', count: 2 }, 3.0)

     bcChemMixing(event, 'arsenic_sulfide', [
        { item: 'chemlib:arsenic' },
        { item: 'chemlib:sulfur' },
        { fluid: 'chemlib:sulfuric_acid_fluid', amount: 125 }
    ], [{ item: 'chemlib:arsenic_sulfide', count: 2 }], 'heated', 220)

     bcChemMixing(event, 'mercury_sulfide', [
        { item: 'chemlib:mercury' },
        { item: 'chemlib:sulfur' },
        { fluid: 'chemlib:sulfuric_acid_fluid', amount: 125 }
    ], [{ item: 'chemlib:mercury_sulfide', count: 2 }], 'heated', 220)

     bcChemThermo(event, 'sulfur_dioxide', { item: 'chemlib:sulfur' }, {
        type: 'pneumaticcraft:fluid',
        fluid: 'chemlib:oxygen_fluid',
        amount: 250
    }, { fluid: 'chemlib:sulfur_dioxide_fluid', amount: 250 }, 2.0, 473)

     bcChemThermo(event, 'sulfur_trioxide', bcChemGas('chemlib:sulfur_dioxide'), {
        type: 'pneumaticcraft:fluid',
        fluid: 'chemlib:oxygen_fluid',
        amount: 250
    }, { fluid: 'chemlib:sulfur_trioxide_fluid', amount: 250 }, 3.0, 573)

     bcChemThermo(event, 'nitrogen_dioxide', bcChemGas('chemlib:nitric_oxide'), {
        type: 'pneumaticcraft:fluid',
        fluid: 'chemlib:oxygen_fluid',
        amount: 250
    }, { fluid: 'chemlib:nitrogen_dioxide_fluid', amount: 250 }, 3.0, 523)
})
