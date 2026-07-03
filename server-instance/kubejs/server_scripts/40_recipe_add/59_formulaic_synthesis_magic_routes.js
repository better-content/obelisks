// Formulaic synthesis expansion.
//
// Tech routes give throughput and automation. Blood Magic provides manual,
// high-yield alternatives where life-force extraction, dangerous sorting, and
// player attention are more immersive than machinery; Ars handles purified
// resonance and source stabilization.

function btmSynExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmSynIngredientExists(ingredient) {
    if (!ingredient || ingredient.tag || ingredient.fluid) return true
    if (ingredient.item) return btmSynExists(ingredient.item)
    return true
}

function btmSynFluidExists(id) {
    try {
        if (typeof Fluid !== 'undefined' && Fluid.exists) return Fluid.exists(id)
    } catch (e) {}
    return !!BTM_SYN_KNOWN_FLUIDS[id]
}

function btmSynMixing(event, id, ingredients, output, heat, time, sideProducts) {
    if (!btmSynExists(output.item)) return
    for (var i = 0; i < ingredients.length; i++) {
        if (!btmSynIngredientExists(ingredients[i])) return
    }
    var results = [output]
    for (var s = 0; s < (sideProducts || []).length; s++) {
        var side = sideProducts[s]
        if (!btmSynExists(side.item)) continue
        var sideResult = { item: side.item }
        if (side.count && side.count > 1) sideResult.count = side.count
        if (side.chance && side.chance < 1) sideResult.chance = side.chance
        results.push(sideResult)
    }
    var recipe = {
        type: 'create:mixing',
        ingredients: ingredients,
        results: results,
        processingTime: time || 200
    }
    if (heat) recipe.heatRequirement = heat
    event.custom(recipe).id('kubejs:synthesis/formulaic/create_mixing/' + id)
}

function btmSynThermo(event, id, itemInput, fluid, amount, output, pressure, minTemp) {
    if (!btmSynExists(output.item)) return
    if (!btmSynIngredientExists(itemInput) || !btmSynFluidExists(fluid)) return
    event.custom({
        type: 'pneumaticcraft:thermo_plant',
        exothermic: false,
        item_input: itemInput,
        fluid_input: {
            type: 'pneumaticcraft:fluid',
            fluid: fluid,
            amount: amount
        },
        item_output: output,
        pressure: pressure || 2.5,
        speed: 0.35,
        temperature: { min_temp: minTemp || 473 }
    }).id('kubejs:synthesis/formulaic/pncr_thermo/' + id)
}

function btmSynBloodAlchemy(event, id, inputs, output, syphon, ticks, tier) {
    var outputItem = typeof output === 'string' ? output : output.item
    var outputCount = typeof output === 'string' ? 1 : (output.count || 1)
    if (!btmSynExists(outputItem)) return
    for (var i = 0; i < inputs.length; i++) {
        if (!btmSynIngredientExists(inputs[i])) return
    }
    var result = { item: outputItem }
    if (outputCount > 1) result.count = outputCount
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: inputs,
        output: result,
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: tier
    }).id('kubejs:synthesis/magic/blood_alchemy/' + id)
}

function btmSynBloodArc(event, id, input, tool, output, sideProducts) {
    if (!btmSynExists(input) || !btmSynExists(tool) || !btmSynExists(output.item)) return
    var added = []
    for (var i = 0; i < (sideProducts || []).length; i++) {
        var side = sideProducts[i]
        if (!btmSynExists(side.item)) continue
        var item = { item: side.item }
        if (side.count && side.count > 1) item.count = side.count
        added.push({
            type: item,
            chance: side.chance || 0.25,
            mainchance: side.mainchance || 0.0
        })
    }
    var recipe = {
        type: 'bloodmagic:arc',
        input: { item: input },
        inputsize: 1,
        tool: { item: tool },
        consumeingredient: false,
        mainoutputchance: 0.0,
        output: output
    }
    if (added.length > 0) recipe.addedoutput = added
    event.custom(recipe).id('kubejs:synthesis/magic/blood_arc/' + id)
}

function btmSynArsImbuement(event, id, input, output, pedestalItems, sourceCost) {
    if (!btmSynExists(input) || !btmSynExists(output)) return
    event.custom({
        type: 'ars_nouveau:imbuement',
        count: 1,
        input: { item: input },
        output: output,
        pedestalItems: pedestalItems.map(function (item) { return { item: { item: item } } }),
        source: sourceCost
    }).id('kubejs:synthesis/magic/ars_imbuement/' + id)
}

function btmSynArsApparatus(event, id, reagent, output, pedestalItems, sourceCost) {
    if (!btmSynExists(reagent) || !btmSynExists(output)) return
    for (var i = 0; i < pedestalItems.length; i++) {
        if (!btmSynExists(pedestalItems[i])) return
    }
    event.custom({
        type: 'ars_nouveau:enchanting_apparatus',
        keepNbtOfReagent: false,
        output: { item: output },
        pedestalItems: pedestalItems.map(function (item) { return { item: item } }),
        reagent: [{ item: reagent }],
        sourceCost: sourceCost
    }).id('kubejs:synthesis/magic/ars_apparatus/' + id)
}

function btmSynCompoundName(element, suffix) {
    var aliases = BTM_SYN_COMPOUND_ALIASES[element]
    if (aliases && aliases[suffix]) return aliases[suffix]
    return 'chemlib:' + element + '_' + suffix
}

var BTM_SYN_ELEMENTS = [
    'aluminum', 'barium', 'beryllium', 'cadmium', 'calcium', 'carbon', 'cesium',
    'chromium', 'cobalt', 'copper', 'gold', 'iron', 'lead', 'lithium',
    'magnesium', 'manganese', 'nickel', 'palladium', 'phosphorus', 'platinum',
    'potassium', 'rubidium', 'silicon', 'silver', 'sodium', 'strontium', 'tin',
    'titanium', 'tungsten', 'uranium', 'thorium', 'zinc'
]

var BTM_SYN_FAMILIES = [
    { id: 'oxide', suffix: 'oxide', fluid: 'minecraft:water', amount: 125, reagent: 'chemlib:oxygen', heat: 'heated', time: 180 },
    { id: 'hydroxide', suffix: 'hydroxide', fluid: 'minecraft:water', amount: 250, reagent: 'chemlib:sodium_hydroxide', heat: null, time: 180, gas: { item: 'chemlib:hydrogen', chance: 0.10 } },
    { id: 'carbonate', suffix: 'carbonate', fluid: 'minecraft:water', amount: 250, reagent: 'chemlib:carbon', heat: null, time: 180, gas: { item: 'chemlib:carbon_dioxide', chance: 0.12 } },
    { id: 'chloride', suffix: 'chloride', fluid: 'chemlib:hydrochloric_acid_fluid', amount: 250, reagent: 'chemlib:sodium_chloride', thermo: true, heat: 'heated', time: 220, gas: { item: 'chemlib:hydrogen', chance: 0.18 } },
    { id: 'nitrate', suffix: 'nitrate', fluid: 'chemlib:nitric_acid_fluid', amount: 250, reagent: 'minecraft:redstone', thermo: true, heat: 'heated', time: 240, gas: { item: 'chemlib:nitrogen_dioxide', chance: 0.22 } },
    { id: 'sulfate', suffix: 'sulfate', fluid: 'chemlib:sulfuric_acid_fluid', amount: 250, reagent: 'chemlib:sulfur', thermo: true, heat: 'heated', time: 230, gas: { item: 'chemlib:sulfur_dioxide', chance: 0.18 } },
    { id: 'sulfide', suffix: 'sulfide', fluid: 'minecraft:water', amount: 125, reagent: 'chemlib:sulfur', heat: 'heated', time: 210, gas: { item: 'chemlib:hydrogen_sulfide', chance: 0.16 } },
    { id: 'phosphate', suffix: 'phosphate', fluid: 'kubejs:phosphoric_acid_fluid', amount: 250, reagent: 'chemlib:phosphorus', heat: 'heated', time: 230, gas: { item: 'chemlib:oxygen', chance: 0.10 } }
]

var BTM_SYN_SIDE_GASES = {
    acetic: { item: 'chemlib:carbon_dioxide', chance: 0.30 },
    sulfuric: { item: 'chemlib:sulfur_dioxide', chance: 0.30 },
    hydrochloric: { item: 'chemlib:hydrogen', chance: 0.30 },
    nitric: { item: 'chemlib:nitrogen_dioxide', chance: 0.35 },
    phosphoric: { item: 'chemlib:oxygen', chance: 0.22 }
}

var BTM_SYN_KNOWN_FLUIDS = {
    'minecraft:water': true,
    'chemlib:hydrochloric_acid_fluid': true,
    'chemlib:nitric_acid_fluid': true,
    'chemlib:sulfuric_acid_fluid': true,
    'kubejs:phosphoric_acid_fluid': true
}

var BTM_SYN_COMPOUND_ALIASES = {
    carbon: { oxide: 'chemlib:carbon_dioxide', sulfide: 'chemlib:carbon_disulfide' },
    copper: { oxide: 'chemlib:copper_i_oxide', hydroxide: 'chemlib:copper_ii_hydroxide', sulfate: 'chemlib:copper_ii_sulfate', sulfide: 'chemlib:copper_i_sulfide' },
    iron: { sulfate: 'chemlib:iron_ii_sulfate', nitrate: 'chemlib:iron_iii_nitrate' },
    silicon: { oxide: 'chemlib:silicon_dioxide' }
}

var BTM_SYN_MAGIC_CRYSTALS = [
    { input: 'minecraft:quartz', output: 'chemlib:silicon_dioxide', source: 400, pedestal: ['ars_nouveau:source_gem'] },
    { input: 'chemlib:silicon_dioxide', output: 'chemlib:silicon', source: 900, pedestal: ['ars_nouveau:source_gem', 'bloodmagic:reinforcedslate'] },
    { input: 'chemlib:beryl', output: 'chemlib:beryllium', source: 1200, pedestal: ['ars_nouveau:source_gem', 'minecraft:emerald'] },
    { input: 'ae2:certus_quartz_crystal', output: 'ae2:fluix_dust', source: 1800, pedestal: ['ars_nouveau:source_gem', 'minecraft:redstone', 'bloodmagic:infusedslate'] }
]

var BTM_SYN_MAGIC_CUTTING_FLUIDS = {
    acetic: {
        item: 'kubejs:sanguine_acetic_cutting_fluid',
        acid: 'chemlib:acetic_acid',
        base: 'bloodmagic:basiccuttingfluid',
        slate: 'bloodmagic:blankslate',
        syphon: 4000,
        ticks: 160,
        tier: 1
    },
    sulfuric: {
        item: 'kubejs:sanguine_sulfuric_cutting_fluid',
        acid: 'chemlib:sulfuric_acid',
        base: 'bloodmagic:intermediatecuttingfluid',
        slate: 'bloodmagic:reinforcedslate',
        syphon: 7000,
        ticks: 220,
        tier: 2
    },
    hydrochloric: {
        item: 'kubejs:sanguine_hydrochloric_cutting_fluid',
        acid: 'chemlib:hydrochloric_acid',
        base: 'bloodmagic:intermediatecuttingfluid',
        slate: 'bloodmagic:infusedslate',
        syphon: 9000,
        ticks: 260,
        tier: 3
    },
    nitric: {
        item: 'kubejs:sanguine_nitric_cutting_fluid',
        acid: 'chemlib:nitric_acid',
        base: 'bloodmagic:advancedcuttingfluid',
        slate: 'bloodmagic:demonslate',
        syphon: 13000,
        ticks: 340,
        tier: 4
    },
    phosphoric: {
        item: 'kubejs:sanguine_phosphoric_cutting_fluid',
        acid: 'chemlib:phosphoric_acid',
        base: 'bloodmagic:advancedcuttingfluid',
        slate: 'bloodmagic:etherealslate',
        syphon: 16000,
        ticks: 400,
        tier: 4
    }
}

ServerEvents.recipes(function (event) {
    for (var fluidKey in BTM_SYN_MAGIC_CUTTING_FLUIDS) {
        var cuttingFluid = BTM_SYN_MAGIC_CUTTING_FLUIDS[fluidKey]
        btmSynBloodAlchemy(event, fluidKey + '_cutting_fluid_charge', [
            { item: cuttingFluid.acid },
            { item: cuttingFluid.base },
            { item: cuttingFluid.slate },
            { item: 'ars_nouveau:source_gem' }
        ], cuttingFluid.item, cuttingFluid.syphon, cuttingFluid.ticks, cuttingFluid.tier)
    }

    for (var e = 0; e < BTM_SYN_ELEMENTS.length; e++) {
        var element = BTM_SYN_ELEMENTS[e]
        var elementId = 'chemlib:' + element
        if (!btmSynExists(elementId)) continue

        for (var f = 0; f < BTM_SYN_FAMILIES.length; f++) {
            var family = BTM_SYN_FAMILIES[f]
            var outputId = btmSynCompoundName(element, family.suffix)
            if (!btmSynExists(outputId) || !btmSynFluidExists(family.fluid)) continue
            var ingredients = [
                { item: elementId },
                { item: family.reagent },
                { fluid: family.fluid, amount: family.amount }
            ]
            btmSynMixing(event, element + '/' + family.id, ingredients, { item: outputId, count: 2 }, family.heat, family.time, family.gas ? [family.gas] : [])
            if (family.thermo) {
                btmSynThermo(event, element + '/' + family.id, { item: elementId }, family.fluid, family.amount, { item: outputId, count: 3 }, family.id === 'nitrate' ? 3.5 : 2.75, family.id === 'nitrate' ? 573 : 523)
            }
        }

        var oxide = btmSynCompoundName(element, 'oxide')
        if (btmSynExists(oxide)) {
            btmSynBloodAlchemy(event, element + '_blood_reduction', [
                { item: oxide },
                { item: 'bloodmagic:reinforcedslate' },
                { item: BTM_SYN_MAGIC_CUTTING_FLUIDS.sulfuric.item }
            ], { item: elementId, count: 4 }, 9000, 260, 2)
            btmSynBloodArc(event, element + '_sulfuric_reduction_gas', oxide, BTM_SYN_MAGIC_CUTTING_FLUIDS.sulfuric.item, { item: elementId, count: 2 }, [
                BTM_SYN_SIDE_GASES.sulfuric
            ])
        }
    }

    var deposits = global.BTM_RO_DEPOSITS || []
    if (deposits.length > 0) {
        for (var d = 0; d < deposits.length; d++) {
            var dep = deposits[d]
            if (btmSynExists(dep.crushed) && btmSynExists(dep.primary)) {
                btmSynBloodAlchemy(event, dep.id + '_cutting_primary', [
                    { item: dep.crushed },
                    { item: 'bloodmagic:blankslate' },
                    { item: BTM_SYN_MAGIC_CUTTING_FLUIDS.acetic.item }
                ], { item: dep.primary, count: 4 }, 4800, 220, 1)
                btmSynBloodArc(event, dep.id + '_arc_primary_gas', dep.crushed, BTM_SYN_MAGIC_CUTTING_FLUIDS.acetic.item, { item: dep.primary, count: 2 }, [
                    BTM_SYN_SIDE_GASES.acetic
                ])
            }
            if (btmSynExists(dep.crushed) && btmSynExists(dep.trace)) {
                btmSynBloodAlchemy(event, dep.id + '_life_trace', [
                    { item: dep.crushed },
                    { item: 'bloodmagic:infusedslate' },
                    { item: BTM_SYN_MAGIC_CUTTING_FLUIDS.nitric.item }
                ], { item: dep.trace, count: 2 }, 11000, 320, 3)
                btmSynBloodArc(event, dep.id + '_arc_trace_gas', dep.crushed, BTM_SYN_MAGIC_CUTTING_FLUIDS.nitric.item, { item: dep.trace }, [
                    BTM_SYN_SIDE_GASES.nitric
                ])
            }
            if (btmSynExists(dep.crushed) && btmSynExists(dep.hard)) {
                btmSynBloodAlchemy(event, dep.id + '_life_hard_fraction', [
                    { item: dep.crushed },
                    { item: 'bloodmagic:demonslate' },
                    { item: BTM_SYN_MAGIC_CUTTING_FLUIDS.hydrochloric.item }
                ], { item: dep.hard, count: 2 }, 14000, 380, 4)
                btmSynBloodArc(event, dep.id + '_arc_hard_gas', dep.crushed, BTM_SYN_MAGIC_CUTTING_FLUIDS.hydrochloric.item, { item: dep.hard }, [
                    BTM_SYN_SIDE_GASES.hydrochloric
                ])
            }
            if (btmSynExists(dep.crushed) && btmSynExists(dep.rare)) {
                btmSynBloodAlchemy(event, dep.id + '_life_rare_fraction', [
                    { item: dep.crushed },
                    { item: 'bloodmagic:etherealslate' },
                    { item: BTM_SYN_MAGIC_CUTTING_FLUIDS.phosphoric.item }
                ], { item: dep.rare, count: 2 }, 18000, 460, 4)
                btmSynBloodArc(event, dep.id + '_arc_rare_gas', dep.crushed, BTM_SYN_MAGIC_CUTTING_FLUIDS.phosphoric.item, { item: dep.rare }, [
                    BTM_SYN_SIDE_GASES.phosphoric
                ])
            }
        }
    }

    for (var c = 0; c < BTM_SYN_MAGIC_CRYSTALS.length; c++) {
        var crystal = BTM_SYN_MAGIC_CRYSTALS[c]
        btmSynArsImbuement(event, crystal.output.replace(':', '_'), crystal.input, crystal.output, crystal.pedestal, crystal.source)
    }

    btmSynArsApparatus(event, 'stabilized_sealed_cell', 'latent_chemlib:sealed_chemical_cell', 'latent_chemlib:sealed_chemical_cell', [
        'ars_nouveau:source_gem',
        'bloodmagic:reinforcedslate',
        'kubejs:pressure_seal',
        'minecraft:amethyst_shard'
    ], 1200)
})
