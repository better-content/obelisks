// PNCR compression gates.
//
// Compressed iron and compressed stone are intentionally produced by Create
// pressing only. This removes PNCR explosion/pressure-chamber routes and
// crafting-table decompression bypasses that can produce the target items.

ServerEvents.recipes(function (event) {
    var compressedIron = 'pneumaticcraft:ingot_iron_compressed'
    var compressedStone = 'pneumaticcraft:compressed_stone'
    var retiredCompressors = [
        'pneumaticcraft:air_compressor',
        'pneumaticcraft:advanced_air_compressor',
        'pneumaticcraft:liquid_compressor',
        'pneumaticcraft:advanced_liquid_compressor',
        'pneumaticcraft:thermal_compressor',
        'pneumaticcraft:manual_compressor',
        'pneumaticcraft:electrostatic_compressor',
        'pneumaticcraft:solar_compressor',
        'pneumaticcraft:flux_compressor',
        'pneumaticcraft:creative_compressor'
    ]
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

    for (var c = 0; c < retiredCompressors.length; c++) {
        event.remove({ output: retiredCompressors[c] })
    }
    event.remove({ output: 'pneumaticcraft:jet_boots_upgrade_4' })
    event.remove({ output: 'pneumaticcraft:jet_boots_upgrade_5' })

    if (Item.exists('kubejs:pressure_seal')) {
        event.remove({ id: 'pneumaticcraft:assembly/unassembled_pcb' })
        event.remove({ output: 'pneumaticcraft:unassembled_pcb' })
        event.custom({
            type: 'pneumaticcraft:pressure_chamber',
            inputs: [
                { item: 'pneumaticcraft:empty_pcb' },
                { item: 'pneumaticcraft:capacitor' },
                { item: 'pneumaticcraft:transistor' },
                { item: 'morered:diode' },
                { item: 'morered:red_alloy_wire' },
                { item: 'chemlib:copper_chloride' },
                { item: 'chemlib:silicon_dioxide' },
                { item: 'kubejs:pressure_seal' }
            ],
            pressure: 2.0,
            results: [{ item: 'pneumaticcraft:unassembled_pcb' }]
        }).id('kubejs:pneumaticcraft/pressure_chamber/unassembled_pcb_with_primitive_logic')
    }
})
