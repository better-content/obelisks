// Starting progression hard gates: netherrack grout remains in 20_expensive_grout.js;
// this file removes Create/TCon shortcuts that bypass early metallurgy and deployer assembly.

ServerEvents.recipes(function (event) {
    // Andesite alloy must come from TCon alloying -> molten andesite alloy -> TCon casting.
    var andesiteAlloyBypassIds = [
        'create:crafting/materials/andesite_alloy',
        'create:crafting/materials/andesite_alloy_from_zinc',
        'create:crafting/materials/andesite_alloy_from_block',
        'create:crafting/materials/andesite_alloy_block',
        'create:mixing/andesite_alloy',
        'create:mixing/andesite_alloy_from_zinc',
        'create:cutting/andesite_alloy',
        'tconstruct:casting_basin/compat/create/andesite_alloy_iron',
        'tconstruct:casting_basin/compat/create/andesite_alloy_zinc'
    ]
    andesiteAlloyBypassIds.forEach(function (id) { event.remove({ id: id }) })

    event.custom({
        type: 'tconstruct:alloy',
        inputs: [
            { tag: 'forge:molten_iron', amount: 90 },
            { tag: 'forge:molten_zinc', amount: 90 },
            { tag: 'tconstruct:molten_quartz', amount: 50 }
        ],
        result: { fluid: 'tinkersinnovation:molten_andesite_alloy', amount: 180 },
        temperature: 800
    }).id('kubejs:tconstruct/alloy/andesite_alloy')

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

    // Gravel has value before bulk Create processing. TNT stays visible and reachable.
    event.shapeless('minecraft:gunpowder', [
        'minecraft:gravel',
        'minecraft:flint',
        'minecraft:charcoal'
    ]).id('kubejs:survival/gunpowder_from_gravel_flint_charcoal')

    event.custom({
        type: 'create:milling',
        ingredients: [{ item: 'minecraft:gravel' }],
        processingTime: 80,
        results: [
            { item: 'minecraft:flint', chance: 0.25 },
            { item: 'minecraft:gunpowder', chance: 0.12 }
        ]
    }).id('kubejs:create/milling/gravel_to_flint_and_gunpowder')

    event.shaped('minecraft:tnt', [
        'GSG',
        'SFS',
        'GSG'
    ], {
        G: 'minecraft:gunpowder',
        S: '#forge:sand',
        F: 'minecraft:flint'
    }).id('kubejs:survival/tnt_with_flint_core')
})
