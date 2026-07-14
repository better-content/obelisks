// Create stack integration pass.
// This file aligns Create addons to the same handoff points shown in the quest book:
// andesite components -> brass automation -> fluid/package logistics -> rail logistics ->
// heat/electric power -> OC2R/AE2 bridges. It also removes package teleportation.

var BC_CREATE_STACK = {
    seared: 'kubejs:seared_machine_casing',
    scorched: 'tconstruct:scorched_bricks',
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    power: 'kubejs:electrical_machine_casing',
    oc2r: 'kubejs:electrical_machine_casing',
    ae2: 'kubejs:impossible_machine_casing',
    ironPlate: '#forge:plates/iron',
    copperPlate: '#forge:plates/copper',
    brassPlate: '#forge:plates/brass',
    goldPlate: '#forge:plates/gold',
    redstoneRelay: 'powergrid:redstone_relay',
    circuit: 'powergrid:integrated_circuit',
    transistor: 'oc2r:transistor',
    network: 'oc2r:network_connector'
}

function bcCreateExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcCreateRemove(event, outputs) {
    for (var i = 0; i < outputs.length; i++) if (bcCreateExists(outputs[i])) event.remove({ output: outputs[i] })
}

function bcCreateShaped(event, output, pattern, keys, id) {
    if (!bcCreateExists(output)) return
    event.remove({ output: output })
    global.bcFactoryCrafting(event, id, output, 1, pattern, keys, { mirrored: true })
}

function bcCreateReplaceInputs(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++) {
        if (!bcCreateExists(outputs[i])) continue
        for (var j = 0; j < oldInputs.length; j++) event.replaceInput({ output: outputs[i] }, oldInputs[j], newInput)
    }
}

ServerEvents.recipes(function (event) {
    // Package wormholes are direct logistics teleportation. Keep them absent until explicitly redesigned.
     bcCreateRemove(event, ['createadvlogistics:package_wormhole'])

    // Passive fluid utilities do not consume SU; they can sit at the high-heat
    // TCon handoff before Andesite kinetic machinery.
     bcCreateShaped(event, 'create:fluid_tank', [
        'CPC',
        'GSG',
        'CPC'
    ], {
        C: BC_CREATE_STACK.copperPlate,
        P: 'create:fluid_pipe',
        G: 'minecraft:glass',
        S: BC_CREATE_STACK.scorched
    }, 'kubejs:create_stack/create/fluid_tank')

     bcCreateShaped(event, 'create:item_drain', [
        ' G ',
        'PSP',
        ' C '
    ], {
        G: 'minecraft:iron_bars',
        P: 'create:fluid_pipe',
        S: BC_CREATE_STACK.scorched,
        C: BC_CREATE_STACK.copperPlate
    }, 'kubejs:create_stack/create/item_drain')

     bcCreateShaped(event, 'create:spout', [
        ' P ',
        'TST',
        ' C '
    ], {
        P: 'create:fluid_pipe',
        T: 'create:fluid_tank',
        S: BC_CREATE_STACK.scorched,
        C: BC_CREATE_STACK.copperPlate
    }, 'kubejs:create_stack/create/spout')

     bcCreateShaped(event, 'create:portable_storage_interface', [
        'BFB',
        'PAP',
        'BFB'
    ], {
        B: BC_CREATE_STACK.brassPlate,
        F: 'create:brass_funnel',
        P: 'create:precision_mechanism',
        A: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/create/portable_storage_interface')

     bcCreateShaped(event, 'create:portable_fluid_interface', [
        'BFB',
        'PAP',
        'BFB'
    ], {
        B: BC_CREATE_STACK.brassPlate,
        F: 'create:fluid_pipe',
        P: 'create:precision_mechanism',
        A: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/create/portable_fluid_interface')

     bcCreateShaped(event, 'create:packager', [
        'BFB',
        'PAP',
        'BFB'
    ], {
        B: BC_CREATE_STACK.brassPlate,
        F: 'create:brass_funnel',
        P: 'create:precision_mechanism',
        A: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/create/packager')

     bcCreateShaped(event, 'create:repackager', [
        'BRB',
        'PAP',
        'BFB'
    ], {
        B: BC_CREATE_STACK.brassPlate,
        R: BC_CREATE_STACK.redstoneRelay,
        P: 'create:precision_mechanism',
        A: BC_CREATE_STACK.brass,
        F: 'create:brass_funnel'
    }, 'kubejs:create_stack/create/repackager')

     bcCreateShaped(event, 'create:stock_link', [
        'ERE',
        'PBP',
        'CRC'
    ], {
        E: 'create:electron_tube',
        R: BC_CREATE_STACK.redstoneRelay,
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brass,
        C: BC_CREATE_STACK.brassPlate
    }, 'kubejs:create_stack/create/stock_link')

     bcCreateShaped(event, 'create:stock_ticker', [
        'GLG',
        'RBR',
        'PDP'
    ], {
        G: 'minecraft:glass_pane',
        L: 'create:stock_link',
        R: BC_CREATE_STACK.redstoneRelay,
        B: BC_CREATE_STACK.brass,
        P: 'create:precision_mechanism',
        D: 'create:display_board'
    }, 'kubejs:create_stack/create/stock_ticker')

     bcCreateShaped(event, 'create:redstone_requester', [
        'RLR',
        'PBP',
        'RCR'
    ], {
        R: BC_CREATE_STACK.redstoneRelay,
        L: 'create:stock_link',
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brass,
        C: 'create:content_observer'
    }, 'kubejs:create_stack/create/redstone_requester')

    // Connected and package-addon logistics sit after brass automation.
     bcCreateShaped(event, 'create_connected:kinetic_battery', [
        'SRS',
        'PBP',
        'SRS'
    ], {
        S: 'create:shaft',
        R: BC_CREATE_STACK.redstoneRelay,
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/create_connected/kinetic_battery')

     bcCreateShaped(event, 'create_connected:brake', [
        'IRI',
        'SBS',
        'IRI'
    ], {
        I: BC_CREATE_STACK.ironPlate,
        R: BC_CREATE_STACK.redstoneRelay,
        S: 'create:shaft',
        B: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/create_connected/brake')

     bcCreateShaped(event, 'createadditionallogistics:package_editor', [
        'RGR',
        'PBP',
        'BCB'
    ], {
        R: BC_CREATE_STACK.redstoneRelay,
        G: 'minecraft:glass_pane',
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brassPlate,
        C: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/createadditionallogistics/package_editor')

     bcCreateShaped(event, 'createadditionallogistics:package_accelerator', [
        'SPS',
        'CBC',
        'SPS'
    ], {
        S: 'create:shaft',
        P: 'create:precision_mechanism',
        C: 'create_connected:kinetic_battery',
        B: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/createadditionallogistics/package_accelerator')

     bcCreateShaped(event, 'createadditionallogistics:network_monitor', [
        'GLG',
        'RBR',
        'PCP'
    ], {
        G: 'minecraft:glass_pane',
        L: 'create:stock_link',
        R: BC_CREATE_STACK.redstoneRelay,
        B: BC_CREATE_STACK.brass,
        P: 'create:precision_mechanism',
        C: 'createadditionallogistics:package_editor'
    }, 'kubejs:create_stack/createadditionallogistics/network_monitor')

     bcCreateShaped(event, 'createadvlogistics:package_content_filter', [
        'RGR',
        'PBP',
        'RGR'
    ], {
        R: BC_CREATE_STACK.redstoneRelay,
        G: 'minecraft:glass_pane',
        P: 'createadditionallogistics:package_editor',
        B: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/createadvlogistics/package_content_filter')

     bcCreateShaped(event, 'createadvlogistics:redstone_radio', [
        ' T ',
        'RCR',
        ' N '
    ], {
        T: BC_CREATE_STACK.transistor,
        R: BC_CREATE_STACK.redstoneRelay,
        C: BC_CREATE_STACK.oc2r,
        N: BC_CREATE_STACK.network
    }, 'kubejs:create_stack/createadvlogistics/redstone_radio')

    // Trains remain physical logistics, but station/signal control needs brass-era components.
     bcCreateShaped(event, 'create:track_station', [
        ' G ',
        'PBP',
        ' T '
    ], {
        G: 'minecraft:glass_pane',
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brass,
        T: 'create:track'
    }, 'kubejs:create_stack/create/track_station')

     bcCreateShaped(event, 'create:track_signal', [
        'RER',
        'PBP',
        ' T '
    ], {
        R: BC_CREATE_STACK.redstoneRelay,
        E: 'create:electron_tube',
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brass,
        T: 'create:track'
    }, 'kubejs:create_stack/create/track_signal')

     bcCreateShaped(event, 'create:track_observer', [
        'RER',
        'PBP',
        ' T '
    ], {
        R: BC_CREATE_STACK.redstoneRelay,
        E: 'create:content_observer',
        P: 'create:precision_mechanism',
        B: BC_CREATE_STACK.brass,
        T: 'create:track'
    }, 'kubejs:create_stack/create/track_observer')

     bcCreateShaped(event, 'railways:track_coupler', [
        'CPC',
        'TBT',
        'CPC'
    ], {
        C: BC_CREATE_STACK.brassPlate,
        P: 'create:precision_mechanism',
        T: 'create:track',
        B: BC_CREATE_STACK.brass
    }, 'kubejs:create_stack/railways/track_coupler')

     bcCreateReplaceInputs(event, [
        'railways:conductor_whistle',
        'railways:portable_fuel_interface',
        'railways:fuel_tank'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron', 'minecraft:copper_ingot', '#forge:ingots/copper'], BC_CREATE_STACK.brassPlate)

    // Diesel branch: CDG burns liquid fuels; PNCR owns oil discovery/refining.
    event.remove({ type: 'createdieselgenerators:distillation' })
     bcCreateReplaceInputs(event, [
        'createdieselgenerators:bulk_fermenter',
        'createdieselgenerators:basin_lid',
        'createdieselgenerators:oil_barrel',
        'createdieselgenerators:canister'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron', 'minecraft:copper_ingot', '#forge:ingots/copper', 'minecraft:redstone', '#forge:dusts/redstone'], BC_CREATE_STACK.brass)

     bcCreateReplaceInputs(event, [
        'createdieselgenerators:large_diesel_engine',
        'createdieselgenerators:huge_diesel_engine',
        'createdieselgenerators:engine_turbocharger'
    ], ['create:brass_casing', 'create:precision_mechanism', 'minecraft:redstone', '#forge:dusts/redstone'], BC_CREATE_STACK.power)

    // Applied Kinetics is post-AE2; reinforce the existing broad gate with full-output input rewrites.
     bcCreateReplaceInputs(event, [
        'createappliedkinetics:energy_provider',
        'createappliedkinetics:me_proxy'
    ], ['create:brass_casing', 'create:precision_mechanism', 'ae2:energy_acceptor', 'ae2:interface'], BC_CREATE_STACK.ae2)
})
