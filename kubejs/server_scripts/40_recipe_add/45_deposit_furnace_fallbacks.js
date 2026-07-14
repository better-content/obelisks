// Emergency furnace fallback for starter deposits.
// This keeps furnaces useful for survival recovery without making them a real ore-processing tier.

var BC_DEPOSIT_FURNACE_FALLBACKS = [
    { id: 'coal_measures', tag: 'kubejs:deposit_blocks/coal_measures', output: 'minecraft:coal', count: 1 },
    { id: 'ironstone', tag: 'kubejs:deposit_blocks/ironstone', output: 'minecraft:iron_nugget', count: 3 },
    { id: 'copper_sulfide', tag: 'kubejs:deposit_blocks/copper_sulfide', output: 'tconstruct:copper_nugget', count: 3 },
    { id: 'tin', tag: 'kubejs:deposit_blocks/tin', output: 'chemlib:tin_nugget', count: 3 },
    { id: 'zinc', tag: 'kubejs:deposit_blocks/zinc', output: 'create:zinc_nugget', count: 3 },
    { id: 'lead_zinc_vein', tag: 'kubejs:deposit_blocks/lead_zinc_vein', output: 'chemlib:lead_nugget', count: 3 },
    { id: 'quartz_vein', tag: 'kubejs:deposit_blocks/quartz_vein', output: 'minecraft:quartz', count: 1 },
    { id: 'bauxite_laterite', tag: 'kubejs:deposit_blocks/bauxite_laterite', output: 'chemlib:aluminum_nugget', count: 3 }
]

ServerEvents.recipes(function (event) {
    for (var i = 0; i < BC_DEPOSIT_FURNACE_FALLBACKS.length; i++) {
        var dep = BC_DEPOSIT_FURNACE_FALLBACKS[i]
        var input = '#' + dep.tag
        var output = Item.of(dep.output, dep.count)

        event.remove({ type: 'minecraft:smelting', input: input })
        event.remove({ type: 'minecraft:blasting', input: input })

        event.smelting(output, input)
            .xp(0.1)
            .cookingTime(240)
            .id('kubejs:furnace_fallback/deposits/' + dep.id)

        event.blasting(output, input)
            .xp(0.1)
            .cookingTime(120)
            .id('kubejs:blasting_fallback/deposits/' + dep.id)
    }
})
