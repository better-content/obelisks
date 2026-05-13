// TiCEX is post-AE2 Tinkers work. Its default Reconstruction Core recipe is
// intentionally replaced because the upstream recipe is much too early for this pack.

function btmTicexItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmTicexRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) {
        if (btmTicexItemExists(outputs[i])) event.remove({ output: outputs[i] })
    }
}

ServerEvents.recipes(function (event) {
    if (!btmTicexItemExists('ticex:reconstruction_core')) return

    btmTicexRemoveOutputs(event, [
        'ticex:reconstruction_core',
        'ticex:flickering_reconstruction_core'
    ])

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'SQSQS',
            'QEREQ',
            'SFAFS',
            'QEREQ',
            'SQSQS'
        ],
        key: {
            S: { item: 'kubejs:sky_steel_sheet' },
            Q: { item: 'kubejs:sky_steel_sheet' },
            E: { item: 'bloodmagic:etherealslate' },
            F: { item: 'ae2:fluix_pearl' },
            R: { item: 'fission_reactor:fission_reactor_rod' },
            A: { item: 'kubejs:impossible_machine_casing' }
        },
        result: { item: 'ticex:reconstruction_core' }
    }).id('kubejs:create/mechanical_crafting/ticex/reconstruction_core')

    if (btmTicexItemExists('ticex:flickering_reconstruction_core')) {
        event.custom({
            type: 'create:mixing',
            heatRequirement: 'superheated',
            ingredients: [
                { item: 'ticex:reconstruction_core' },
                { item: 'ticex:reconstruction_core' },
                { item: 'ticex:reconstruction_core' },
                { item: 'ticex:reconstruction_core' },
                { item: 'kubejs:impossible_circuit' },
                { item: 'kubejs:impossible_circuit' },
                { item: 'minecraft:nether_star' },
                { item: 'fission_reactor:fission_reactor_rod' }
            ],
            results: [{ item: 'ticex:flickering_reconstruction_core' }]
        }).id('kubejs:create/mixing/ticex/flickering_reconstruction_core')
    }

    // Embossment is a very high-leverage TiCEX modifier. Keep the recognizable
    // slime-crystal identity, but require the late reconstruction chain.
    event.remove({ id: 'ticex:tools/modifiers/slotless/embossment' })
    event.custom({
        type: 'ticex:embossment_modifier',
        emboss_inputs: [{ tag: 'tconstruct:parts' }],
        inputs: [
            { item: 'tconstruct:earth_slime_crystal' },
            { item: 'tconstruct:sky_slime_crystal' },
            { item: 'tconstruct:ichor_slime_crystal' },
            { item: 'tconstruct:ender_slime_crystal' },
            { item: 'ticex:flickering_reconstruction_core' }
        ],
        result: 'ticex:embossment',
        tools: { tag: 'tconstruct:modifiable/durability' }
    }).id('kubejs:ticex/modifiers/slotless/embossment')
})
