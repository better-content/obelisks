// More Red primitive circuitry pass.
//
// More Red is the terrestrial, early-Create predecessor for later circuit
// chains. Its own entry is reauthored away from nether/blaze materials, then
// the primitive wire/logic parts become the reagents used by later electronics.

var BTM_MORERED = {
    alloy: 'morered:red_alloy_ingot',
    wire: 'morered:red_alloy_wire',
    plate: 'morered:stone_plate',
    diode: 'morered:diode',
    solderingTable: 'morered:soldering_table'
}

function btmMoreRedExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmMoreRedIngredient(id) {
    if (id.charAt(0) === '#') return { tag: id.substring(1) }
    return { item: id }
}

function btmMoreRedSolder(event, id, output, ingredients) {
    if (!btmMoreRedExists(output)) return
    event.remove({ output: output })
    event.remove({ id: 'morered:' + id })
    event.remove({ id: 'morered:' + id + '_from_soldering' })
    event.custom({
        type: 'morered:soldering',
        ingredients: ingredients.map(btmMoreRedIngredient),
        result: { item: output }
    }).id('kubejs:morered/soldering/' + id)
}

function btmMoreRedReplace(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++) {
        if (!btmMoreRedExists(outputs[i])) continue
        for (var j = 0; j < oldInputs.length; j++) event.replaceInput({ output: outputs[i] }, oldInputs[j], newInput)
    }
}

ServerEvents.recipes(function (event) {
    event.remove({ output: BTM_MORERED.alloy })
    event.remove({ output: BTM_MORERED.wire })
    event.remove({ output: BTM_MORERED.plate })
    event.remove({ id: 'morered:soldering_table' })

    event.custom({
        type: 'create:mixing',
        ingredients: [
            { tag: 'forge:ingots/copper' },
            { tag: 'forge:ingots/zinc' },
            { item: 'minecraft:redstone' },
            { item: 'minecraft:redstone' },
            { item: 'minecraft:redstone' },
            { item: 'minecraft:redstone' }
        ],
        results: [{ item: BTM_MORERED.alloy, count: 2 }],
        processingTime: 160
    }).id('kubejs:morered/create_mixing/red_alloy_ingot')

    event.custom({
        type: 'create:pressing',
        ingredients: [{ item: BTM_MORERED.alloy }],
        results: [{ item: BTM_MORERED.wire, count: 2 }]
    }).id('kubejs:morered/create_pressing/red_alloy_wire')

    global.btmFactoryCrafting(event, 'kubejs:morered/soldering_table_terrestrial_create', BTM_MORERED.solderingTable, 1, [
        'PPP',
        'WCW',
        ' A '
    ], {
        P: BTM_MORERED.plate,
        W: BTM_MORERED.wire,
        C: '#forge:plates/copper',
        A: 'kubejs:andesite_machine_casing'
    }, true)

    btmMoreRedSolder(event, 'diode', 'morered:diode', [
        BTM_MORERED.plate,
        BTM_MORERED.wire,
        BTM_MORERED.wire,
        'minecraft:redstone'
    ])
    btmMoreRedSolder(event, 'not_gate', 'morered:not_gate', [
        BTM_MORERED.plate,
        BTM_MORERED.diode,
        BTM_MORERED.wire,
        'minecraft:redstone_torch'
    ])
    btmMoreRedSolder(event, 'and_gate', 'morered:and_gate', [
        BTM_MORERED.plate,
        BTM_MORERED.diode,
        BTM_MORERED.diode,
        BTM_MORERED.wire,
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'and_2_gate', 'morered:and_2_gate', [
        BTM_MORERED.plate,
        'morered:and_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'or_gate', 'morered:or_gate', [
        BTM_MORERED.plate,
        BTM_MORERED.diode,
        BTM_MORERED.wire,
        BTM_MORERED.wire,
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'nand_gate', 'morered:nand_gate', [
        BTM_MORERED.plate,
        'morered:and_gate',
        'morered:not_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'nand_2_gate', 'morered:nand_2_gate', [
        BTM_MORERED.plate,
        'morered:and_2_gate',
        'morered:not_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'nor_gate', 'morered:nor_gate', [
        BTM_MORERED.plate,
        'morered:or_gate',
        'morered:not_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'xor_gate', 'morered:xor_gate', [
        BTM_MORERED.plate,
        'morered:and_gate',
        'morered:or_gate',
        BTM_MORERED.wire,
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'xnor_gate', 'morered:xnor_gate', [
        BTM_MORERED.plate,
        'morered:xor_gate',
        'morered:not_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'latch', 'morered:latch', [
        BTM_MORERED.plate,
        'morered:nor_gate',
        'morered:nor_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'pulse_gate', 'morered:pulse_gate', [
        BTM_MORERED.plate,
        BTM_MORERED.diode,
        'morered:not_gate',
        BTM_MORERED.wire
    ])
    btmMoreRedSolder(event, 'multiplexer', 'morered:multiplexer', [
        BTM_MORERED.plate,
        'morered:and_gate',
        'morered:or_gate',
        BTM_MORERED.diode,
        BTM_MORERED.wire
    ])

    btmMoreRedSolder(event, 'redwire_post', 'morered:redwire_post', [
        BTM_MORERED.wire,
        BTM_MORERED.wire,
        '#forge:rods/wooden'
    ])
    btmMoreRedSolder(event, 'redwire_post_plate', 'morered:redwire_post_plate', [
        BTM_MORERED.plate,
        BTM_MORERED.wire,
        '#forge:rods/wooden'
    ])
    btmMoreRedSolder(event, 'redwire_post_relay_plate', 'morered:redwire_post_relay_plate', [
        BTM_MORERED.plate,
        BTM_MORERED.diode,
        BTM_MORERED.wire,
        '#forge:rods/wooden'
    ])
    btmMoreRedSolder(event, 'bundled_cable_relay_plate', 'morered:bundled_cable_relay_plate', [
        BTM_MORERED.plate,
        'morered:bundled_network_cable',
        BTM_MORERED.diode,
        BTM_MORERED.wire
    ])

    btmMoreRedReplace(event, [
        'morered:redwire_spool',
        'morered:bundled_cable_spool',
        'morered:bundled_network_cable',
        'morered:white_network_cable',
        'morered:orange_network_cable',
        'morered:magenta_network_cable',
        'morered:light_blue_network_cable',
        'morered:yellow_network_cable',
        'morered:lime_network_cable',
        'morered:pink_network_cable',
        'morered:gray_network_cable',
        'morered:light_gray_network_cable',
        'morered:cyan_network_cable',
        'morered:purple_network_cable',
        'morered:blue_network_cable',
        'morered:brown_network_cable',
        'morered:green_network_cable',
        'morered:red_network_cable',
        'morered:black_network_cable'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MORERED.wire)

    var downstreamCircuits = [
        'powergrid:redstone_relay',
        'powergrid:varistor',
        'powergrid:capacitor',
        'powergrid:integrated_circuit',
        'pneumaticcraft:capacitor',
        'pneumaticcraft:transistor',
        'pneumaticcraft:printed_circuit_board',
        'pneumaticcraft:assembly_controller',
        'pneumaticcraft:assembly_io_unit_export',
        'pneumaticcraft:assembly_io_unit_import',
        'pneumaticcraft:network_api',
        'pneumaticcraft:network_data_storage',
        'pneumaticcraft:network_io_port',
        'pneumaticcraft:network_node',
        'pneumaticcraft:network_registry',
        'pneumaticcraft:programmer',
        'pneumaticcraft:programmable_controller',
        'oc2r:circuit_board',
        'oc2r:transistor',
        'oc2r:cpu_tier_1',
        'oc2r:cpu_tier_2',
        'oc2r:cpu_tier_3',
        'oc2r:cpu_tier_4',
        'oc2r:redstone_interface',
        'oc2r:redstone_interface_card',
        'oc2r:network_interface_card',
        'oc2r:network_tunnel_card',
        'ae2:calculation_processor',
        'ae2:logic_processor',
        'ae2:engineering_processor',
        'ae2:basic_card',
        'ae2:advanced_card',
        'ae2:annihilation_core',
        'ae2:formation_core'
    ]
    btmMoreRedReplace(event, downstreamCircuits, ['minecraft:redstone', '#forge:dusts/redstone'], BTM_MORERED.wire)
    btmMoreRedReplace(event, downstreamCircuits, ['minecraft:repeater', 'minecraft:comparator'], BTM_MORERED.diode)
})
