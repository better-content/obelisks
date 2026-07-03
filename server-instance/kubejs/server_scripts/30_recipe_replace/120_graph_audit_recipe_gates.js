// Gates found by the offline expert graph audit. These are explicit recipes/removals for
// high-impact outputs that broad replaceInput passes can miss.

var BTM_GRAPH_GATE = {
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    power: 'kubejs:electrical_machine_casing',
    oc2r: 'kubejs:electrical_machine_casing',
    ae2: 'kubejs:impossible_machine_casing',
    demonic: 'bloodmagic:demonslate',
    ethereal: 'bloodmagic:etherealslate'
}

function btmGraphItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmGraphRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) event.remove({ output: outputs[i] })
}

function btmGraphShaped(event, output, pattern, keys, id) {
    if (!btmGraphItemExists(output)) return
    event.remove({ output: output })
    global.btmFactoryCrafting(event, id, output, 1, pattern, keys, true)
}

ServerEvents.recipes(function (event) {
    // Teleportation and chunk-loading bypasses: remove generic routes unless explicitly re-authored.
    btmGraphRemoveOutputs(event, [
        'vampirism:crossbow_arrow_teleport',
        'naturesaura:chunk_loader'
    ])

    // Early Create utility should still depend on the andesite machine casing tier once it is block-machine-like.
    btmGraphShaped(event, 'create:fluid_pipe', [
        ' C ',
        'SAS',
        ' C '
    ], {
        C: 'minecraft:copper_ingot',
        S: 'create:copper_sheet',
        A: BTM_GRAPH_GATE.andesite
    }, 'kubejs:graph_gate/create/fluid_pipe')

    btmGraphShaped(event, 'create:mechanical_pump', [
        ' S ',
        'FAF',
        ' C '
    ], {
        S: 'create:shaft',
        F: 'create:fluid_pipe',
        A: BTM_GRAPH_GATE.andesite,
        C: 'create:cogwheel'
    }, 'kubejs:graph_gate/create/mechanical_pump')

    btmGraphShaped(event, 'create:track_observer', [
        ' R ',
        'CAC',
        ' T '
    ], {
        R: 'minecraft:redstone',
        C: 'create:electron_tube',
        A: BTM_GRAPH_GATE.andesite,
        T: 'create:track'
    }, 'kubejs:graph_gate/create/track_observer')

    // Create Connected and diesel logistics are brass-era infrastructure.
    btmGraphShaped(event, 'create_connected:sequenced_pulse_generator', [
        'RCR',
        'ABA',
        'RCR'
    ], {
        R: 'minecraft:redstone',
        C: 'create:electron_tube',
        A: 'create:brass_sheet',
        B: BTM_GRAPH_GATE.brass
    }, 'kubejs:graph_gate/create_connected/sequenced_pulse_generator')

    btmGraphShaped(event, 'create_connected:linked_transmitter', [
        ' E ',
        'RBR',
        ' P '
    ], {
        E: 'minecraft:ender_pearl',
        R: 'minecraft:redstone',
        B: BTM_GRAPH_GATE.brass,
        P: 'create:precision_mechanism'
    }, 'kubejs:graph_gate/create_connected/linked_transmitter')

    event.remove({ type: 'createdieselgenerators:distillation' })

    // Power Grid / New Age heat infrastructure should not be simple Create-era crafting.
    btmGraphShaped(event, 'heatsync:heat_pipe', [
        'SCS',
        'PBP',
        'SCS'
    ], {
        S: 'create:copper_sheet',
        C: 'powergrid:conductive_casing',
        P: 'create:fluid_pipe',
        B: BTM_GRAPH_GATE.power
    }, 'kubejs:graph_gate/heatsync/heat_pipe')

    btmGraphShaped(event, 'heatsync:coolant_exchanger', [
        'PHP',
        'CBC',
        'PHP'
    ], {
        P: 'heatsync:heat_pipe',
        H: 'powergrid:electric_motor',
        C: 'powergrid:conductive_casing',
        B: BTM_GRAPH_GATE.power
    }, 'kubejs:graph_gate/heatsync/coolant_exchanger')

    // Chunk loading is remote-site infrastructure and must sit behind power/compute logistics.
    btmGraphShaped(event, 'create_power_loader:empty_andesite_chunk_loader', [
        'SPS',
        'CBC',
        'SPS'
    ], {
        S: 'create:andesite_alloy',
        P: 'powergrid:battery',
        C: 'powergrid:conductive_casing',
        B: BTM_GRAPH_GATE.power
    }, 'kubejs:graph_gate/create_power_loader/empty_andesite_chunk_loader')

    btmGraphShaped(event, 'create_power_loader:empty_brass_chunk_loader', [
        'SPS',
        'CBC',
        'SPS'
    ], {
        S: 'create:brass_sheet',
        P: 'oc2r:network_connector',
        C: 'oc2r:circuit_board',
        B: BTM_GRAPH_GATE.oc2r
    }, 'kubejs:graph_gate/create_power_loader/empty_brass_chunk_loader')

    // AE2 addon oversize interface is local-intelligence scale, not a cheap alternate interface.
    btmGraphShaped(event, 'expatternprovider:oversize_interface', [
        'IPI',
        'BAB',
        'IPI'
    ], {
        I: 'ae2:interface',
        P: 'ae2:engineering_processor',
        B: BTM_GRAPH_GATE.ae2,
        A: 'ae2:annihilation_core'
    }, 'kubejs:graph_gate/expatternprovider/oversize_interface')
})
