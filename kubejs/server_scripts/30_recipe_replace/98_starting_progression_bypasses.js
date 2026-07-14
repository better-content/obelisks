// Starting progression hard gates: netherrack grout remains in 20_expensive_grout.js;
// this file removes Create/TCon shortcuts that bypass early metallurgy and deployer assembly.

ServerEvents.recipes(function (event) {
    event.remove({ id: 'tconstruct:common/materials/flint_from_gravel' })
    event.remove({ id: 'tconstruct:materials/flint_from_gravel' })
    event.remove({ id: 'tconstruct:flint_from_gravel' })
    event.remove({ type: 'minecraft:crafting_shapeless', input: 'minecraft:gravel', output: 'minecraft:flint' })

    event.shapeless('tconstruct:flint_and_brick', [
        'minecraft:flint',
        'minecraft:brick'
    ]).id('kubejs:tconstruct/flint_and_brick')

    // TCon patterns are an early textile/paper route, not a sticks + planks bypass.
    event.remove({ id: 'tconstruct:common/pattern' })
    event.remove({ id: 'tconstruct:tables/pattern' })
    event.remove({ id: 'tconstruct:pattern' })
    event.remove({ type: 'minecraft:crafting_shaped', output: 'tconstruct:pattern' })
    event.remove({ type: 'minecraft:crafting_shapeless', output: 'tconstruct:pattern' })

    event.shaped(Item.of('tconstruct:pattern', 4), [
        'CC',
        'CC'
    ], {
        C: 'farmersdelight:canvas'
    }).id('kubejs:tconstruct/pattern_from_canvas')

    event.custom({
        type: 'create:pressing',
        ingredients: [
            { item: 'minecraft:paper' }
        ],
        results: [
            { item: 'tconstruct:pattern' }
        ]
    }).id('kubejs:create/pressing/tconstruct_pattern_from_paper')

    // Andesite alloy must come from TCon molten handling before Create casing work.
    var andesiteAlloyBypassIds = [
        'create:crafting/materials/andesite_alloy',
        'create:crafting/materials/andesite_alloy_from_zinc',
        'create:crafting/materials/andesite_alloy_from_block',
        'create:crafting/materials/andesite_alloy_block',
        'create:mixing/andesite_alloy',
        'create:mixing/andesite_alloy_from_zinc',
        'create:cutting/andesite_alloy',
        'tconstruct:compat/create/andesite_alloy_iron',
        'tconstruct:compat/create/andesite_alloy_zinc',
        'tconstruct:casting_basin/compat/create/andesite_alloy_iron',
        'tconstruct:casting_basin/compat/create/andesite_alloy_zinc'
    ]
    andesiteAlloyBypassIds.forEach(function (id) { event.remove({ id: id }) })

    event.custom({
        type: 'tconstruct:casting_basin',
        cast: { item: 'minecraft:andesite' },
        cast_consumed: true,
        fluid: { tag: 'forge:molten_zinc', amount: 90 },
        result: 'create:andesite_alloy',
        cooling_time: 80
    }).id('kubejs:tconstruct/casting_basin/andesite_alloy_zinc')

    event.custom({
        type: 'tconstruct:casting_basin',
        cast: { item: 'minecraft:andesite' },
        cast_consumed: true,
        fluid: { tag: 'forge:molten_iron', amount: 90 },
        result: 'create:andesite_alloy',
        cooling_time: 80
    }).id('kubejs:tconstruct/casting_basin/andesite_alloy_iron')

    // Andesite casing requires Deployer assembly; item application is the bypass.
    event.remove({ id: 'create:item_application/andesite_casing_from_log' })
    event.remove({ id: 'create:item_application/andesite_casing_from_wood' })
    event.remove({ output: 'create:andesite_casing', type: 'create:item_application' })
    event.custom({
        type: 'create:deploying',
        ingredients: [
            { tag: 'minecraft:logs' },
            { item: 'create:andesite_alloy' }
        ],
        results: [{ item: 'create:andesite_casing' }]
    }).id('kubejs:create/deploying/andesite_casing')

    // Gravel has value before bulk Create processing. TNT stays visible and reachable,
    // but explosive work moves off the crafting table once Create is available.
    event.custom({
        type: 'create:milling',
        ingredients: [{ item: 'minecraft:gravel' }],
        processingTime: 80,
        results: [
            { item: 'minecraft:flint', chance: 0.25 },
            { item: 'minecraft:gunpowder', chance: 0.06 }
        ]
    }).id('kubejs:create/milling/gravel_to_flint_and_gunpowder')

    event.remove({ output: 'minecraft:tnt', type: 'minecraft:crafting_shaped' })
    event.remove({ output: 'minecraft:tnt', type: 'minecraft:crafting_shapeless' })
    global.bcCreateCompacting(event, 'kubejs:create/compacting/tnt_with_flint_core', 'minecraft:tnt', 1, [
        'minecraft:gunpowder',
        'minecraft:gunpowder',
        'minecraft:gunpowder',
        'minecraft:gunpowder',
        '#forge:sand',
        '#forge:sand',
        '#forge:sand',
        '#forge:sand',
        'minecraft:flint'
    ])
})
