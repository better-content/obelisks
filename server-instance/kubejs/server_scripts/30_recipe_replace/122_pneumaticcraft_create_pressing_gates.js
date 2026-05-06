// PNCR compression gates.
//
// Compressed iron and compressed stone are intentionally produced by Create
// pressing only. This removes PNCR explosion/pressure-chamber routes and
// crafting-table decompression bypasses that can produce the target items.

ServerEvents.recipes(function (event) {
    var compressedIron = 'pneumaticcraft:ingot_iron_compressed'
    var compressedStone = 'pneumaticcraft:compressed_stone'
    var removedIds = [
        'pneumaticcraft:pressure_chamber/compressed_stone',
        'pneumaticcraft:pressure_chamber/compressed_iron_ingot',
        'pneumaticcraft:explosion_crafting/compressed_iron_ingot'
    ]

    for (var i = 0; i < removedIds.length; i++) event.remove({ id: removedIds[i] })
    event.remove({ type: 'pneumaticcraft:pressure_chamber', output: compressedIron })
    event.remove({ type: 'pneumaticcraft:pressure_chamber', output: compressedStone })
    event.remove({ type: 'pneumaticcraft:explosion_crafting', output: compressedIron })
    event.remove({ output: compressedIron })
    event.remove({ output: compressedStone })

    event.custom({
        type: 'create:pressing',
        ingredients: [
            { item: 'minecraft:iron_ingot' }
        ],
        results: [
            { item: compressedIron }
        ]
    }).id('kubejs:create/pressing/pneumaticcraft/compressed_iron_ingot')

    event.custom({
        type: 'create:pressing',
        ingredients: [
            { item: 'minecraft:stone' }
        ],
        results: [
            { item: compressedStone }
        ]
    }).id('kubejs:create/pressing/pneumaticcraft/compressed_stone')
})
