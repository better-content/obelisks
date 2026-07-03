// Closure pass for high-signal recipe graph gaps found from the generated recipe index.
// Earlier passes define the broad policy; this pass removes remaining concrete bypasses
// and re-authors machine-like outputs with the casing tier the quest graph teaches.

var BTM_CLOSURE = {
    seared: 'kubejs:seared_machine_casing',
    scorched: 'tconstruct:scorched_bricks',
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    power: 'kubejs:electrical_machine_casing',
    oc2r: 'kubejs:electrical_machine_casing',
    space: 'kubejs:space_machine_casing',
    ae2: 'kubejs:impossible_machine_casing',
    ironPlate: '#forge:plates/iron',
    copperPlate: '#forge:plates/copper',
    goldPlate: '#forge:plates/gold',
    brassPlate: '#forge:plates/brass',
    redstoneRelay: 'morered:red_alloy_wire',
    circuit: 'powergrid:integrated_circuit',
    skySteelSheet: 'kubejs:sky_steel_sheet'
}

function btmClosureExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmClosureRemove(event, outputs) {
    for (var i = 0; i < outputs.length; i++) if (btmClosureExists(outputs[i])) event.remove({ output: outputs[i] })
}

function btmClosureRemoveIds(event, ids) {
    for (var i = 0; i < ids.length; i++) event.remove({ id: ids[i] })
}

function btmClosureShaped(event, output, pattern, keys, id) {
    if (!btmClosureExists(output)) return
    event.remove({ output: output })
    global.btmFactoryCrafting(event, id, output, 1, pattern, keys, true)
}

function btmClosureShapeless(event, output, inputs, id) {
    if (!btmClosureExists(output)) return
    event.remove({ output: output })
    event.shapeless(output, inputs).id(id)
}

function btmClosureReplace(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++) {
        if (!btmClosureExists(outputs[i])) continue
        for (var j = 0; j < oldInputs.length; j++) event.replaceInput({ output: outputs[i] }, oldInputs[j], newInput)
    }
}

ServerEvents.recipes(function (event) {
    // Alchemistry and ChemLib own chemistry identity; Create/PNCR own player-facing synthesis.
    event.remove({ id: 'alchemistry:patchouli_book' })

    // Remove controller casting shortcuts so the controller recipes visibly consume machine casings.
    btmClosureShaped(event, 'tconstruct:smeltery_controller', [
        'BGB',
        'GCG',
        'BGB'
    ], {
        B: 'tconstruct:seared_bricks',
        G: 'tconstruct:seared_glass',
        C: BTM_CLOSURE.seared
    }, 'kubejs:closure/tconstruct/smeltery_controller')

    btmClosureShaped(event, 'tconstruct:foundry_controller', [
        'BGB',
        'GCG',
        'BGB'
    ], {
        B: 'tconstruct:scorched_bricks',
        G: 'tconstruct:scorched_glass',
        C: 'tconstruct:scorched_brick'
    }, 'kubejs:closure/tconstruct/foundry_controller')

    // Andesite Create machines and controls: gearbox/control infrastructure should be casing-visible.
    btmClosureRemoveIds(event, [
        'create:crafting/kinetics/gearbox_from_conversion',
        'create:crafting/kinetics/vertical_gearbox_from_conversion',
        'create:crafting/kinetics/encased_chain_drive_from_zinc'
    ])
    btmClosureShaped(event, 'create:gearbox', [
        ' C ',
        'CAC',
        ' C '
    ], { C: 'create:cogwheel', A: BTM_CLOSURE.andesite }, 'kubejs:closure/create/gearbox')
    btmClosureShaped(event, 'create:vertical_gearbox', [
        'C C',
        ' A ',
        'C C'
    ], { C: 'create:cogwheel', A: BTM_CLOSURE.andesite }, 'kubejs:closure/create/vertical_gearbox')
    btmClosureShaped(event, 'create:encased_chain_drive', [
        ' N ',
        'NAN',
        ' N '
    ], { N: '#forge:nuggets/iron', A: BTM_CLOSURE.andesite }, 'kubejs:closure/create/encased_chain_drive')
    btmClosureShaped(event, 'create:smart_fluid_pipe', [
        'R',
        'P',
        'A'
    ], { R: BTM_CLOSURE.redstoneRelay, P: 'create:fluid_pipe', A: BTM_CLOSURE.andesite }, 'kubejs:closure/create/smart_fluid_pipe')
    btmClosureShaped(event, 'create:linked_controller', [
        'BSB',
        'RAR',
        'BSB'
    ], { B: '#minecraft:wooden_buttons', S: 'create:redstone_link', R: BTM_CLOSURE.redstoneRelay, A: BTM_CLOSURE.andesite }, 'kubejs:closure/create/linked_controller')
    btmClosureShaped(event, 'create:controller_rail', [
        'G G',
        'GSG',
        'AEA'
    ], { G: BTM_CLOSURE.goldPlate, S: '#forge:rods/wooden', A: BTM_CLOSURE.andesite, E: 'create:electron_tube' }, 'kubejs:closure/create/controller_rail')
    btmClosureShaped(event, 'create:steam_engine', [
        ' G ',
        ' B ',
        ' C '
    ], { G: BTM_CLOSURE.goldPlate, B: BTM_CLOSURE.brass, C: '#forge:storage_blocks/copper' }, 'kubejs:closure/create/steam_engine')
    btmClosureShaped(event, 'create:transmitter', [
        ' L ',
        'CAC',
        ' R '
    ], { L: 'minecraft:lightning_rod', C: BTM_CLOSURE.copperPlate, A: BTM_CLOSURE.andesite, R: BTM_CLOSURE.redstoneRelay }, 'kubejs:closure/create/transmitter')
    btmClosureShaped(event, 'create:crafter_slot_cover', [
        'BBB',
        ' A '
    ], { B: '#forge:nuggets/brass', A: BTM_CLOSURE.andesite }, 'kubejs:closure/create/crafter_slot_cover')
    btmClosureShaped(event, 'create:cart_assembler', [
        'ARA',
        'L L',
        ' C '
    ], { A: BTM_CLOSURE.andesite, R: BTM_CLOSURE.redstoneRelay, L: '#minecraft:logs', C: 'create:contraption_controls' }, 'kubejs:closure/create/cart_assembler')

    // Create Connected gearboxes are brass-era transmission hardware.
    btmClosureRemoveIds(event, [
        'create_connected:crafting/kinetics/brass_gearbox_from_conversion',
        'create_connected:crafting/kinetics/vertical_brass_gearbox_from_conversion',
        'create_connected:crafting/kinetics/parallel_gearbox_from_conversion',
        'create_connected:crafting/kinetics/vertical_parallel_gearbox_from_conversion',
        'create_connected:crafting/kinetics/six_way_gearbox_from_conversion',
        'create_connected:crafting/kinetics/vertical_six_way_gearbox_from_conversion',
        'create_connected:crafting/kinetics/six_way_gearbox_from_parallel',
        'create_connected:crafting/kinetics/six_way_gearbox_from_gearbox'
    ])
    btmClosureShaped(event, 'create_connected:brass_gearbox', [
        ' C ',
        'CBC',
        ' C '
    ], { C: 'create:cogwheel', B: BTM_CLOSURE.brass }, 'kubejs:closure/create_connected/brass_gearbox')
    btmClosureShaped(event, 'create_connected:vertical_brass_gearbox', [
        'C C',
        ' B ',
        'C C'
    ], { C: 'create:cogwheel', B: BTM_CLOSURE.brass }, 'kubejs:closure/create_connected/vertical_brass_gearbox')
    btmClosureShaped(event, 'create_connected:parallel_gearbox', [
        'LCL',
        'CBC',
        'LCL'
    ], { L: 'create:large_cogwheel', C: 'create:cogwheel', B: BTM_CLOSURE.brass }, 'kubejs:closure/create_connected/parallel_gearbox')
    btmClosureShaped(event, 'create_connected:vertical_parallel_gearbox', [
        'CLC',
        'LBL',
        'CLC'
    ], { L: 'create:large_cogwheel', C: 'create:cogwheel', B: BTM_CLOSURE.brass }, 'kubejs:closure/create_connected/vertical_parallel_gearbox')
    btmClosureShaped(event, 'create_connected:six_way_gearbox', [
        'LCL',
        'CBC',
        'LCL'
    ], { L: 'create:large_cogwheel', C: 'create_connected:parallel_gearbox', B: BTM_CLOSURE.brass }, 'kubejs:closure/create_connected/six_way_gearbox')
    btmClosureShaped(event, 'create_connected:vertical_six_way_gearbox', [
        'CLC',
        'LBL',
        'CLC'
    ], { L: 'create:large_cogwheel', C: 'create_connected:vertical_parallel_gearbox', B: BTM_CLOSURE.brass }, 'kubejs:closure/create_connected/vertical_six_way_gearbox')

    // Diesel machinery: every block-like component consumes the brass casing tier.
    btmClosureShaped(event, 'createdieselgenerators:engine_piston', [
        'AIA',
        ' S ',
        'ZBZ'
    ], { A: 'create:andesite_alloy', I: BTM_CLOSURE.ironPlate, S: 'create:shaft', Z: '#forge:ingots/zinc', B: BTM_CLOSURE.brass }, 'kubejs:closure/createdieselgenerators/engine_piston')
    btmClosureShaped(event, 'createdieselgenerators:engine_silencer', [
        'SWA',
        'WBW',
        'PWS'
    ], { A: 'create:andesite_alloy', S: BTM_CLOSURE.ironPlate, W: '#minecraft:wool', P: 'create:fluid_pipe', B: BTM_CLOSURE.brass }, 'kubejs:closure/createdieselgenerators/engine_silencer')
    btmClosureShaped(event, 'createdieselgenerators:diesel_engine', [
        ' Q ',
        'PBP',
        'SFS'
    ], { Q: 'minecraft:flint_and_steel', P: 'createdieselgenerators:engine_piston', B: BTM_CLOSURE.brass, S: 'minecraft:polished_blackstone_slab', F: 'create:fluid_tank' }, 'kubejs:closure/createdieselgenerators/diesel_engine')
    btmClosureShaped(event, 'createdieselgenerators:large_diesel_engine', [
        ' P ',
        'SBS',
        ' E '
    ], { P: BTM_CLOSURE.power, S: BTM_CLOSURE.brassPlate, B: BTM_CLOSURE.brass, E: 'createdieselgenerators:diesel_engine' }, 'kubejs:closure/createdieselgenerators/large_diesel_engine')
    btmClosureShaped(event, 'createdieselgenerators:huge_diesel_engine', [
        'PFP',
        'SES',
        'BDB'
    ], { P: BTM_CLOSURE.power, F: 'minecraft:flint_and_steel', S: BTM_CLOSURE.brassPlate, E: 'create:steam_engine', B: BTM_CLOSURE.brass, D: 'createdieselgenerators:large_diesel_engine' }, 'kubejs:closure/createdieselgenerators/huge_diesel_engine')
    btmClosureShaped(event, 'createdieselgenerators:engine_turbocharger', [
        'AZF',
        'SBS',
        'AZA'
    ], { A: 'create:andesite_alloy', Z: '#forge:ingots/zinc', F: 'create:fluid_pipe', S: BTM_CLOSURE.ironPlate, B: BTM_CLOSURE.brass }, 'kubejs:closure/createdieselgenerators/engine_turbocharger')
    event.remove({ type: 'createdieselgenerators:distillation' })

    // AE2 addon conversions require the AE2 casing tier so part/full cycling is not free.
    btmClosureShapeless(event, 'expatternprovider:ex_interface_part', ['expatternprovider:ex_interface', BTM_CLOSURE.ae2], 'kubejs:closure/expatternprovider/ex_interface_part')
    btmClosureShaped(event, 'expatternprovider:ex_interface', [
        'PC',
        'BZ'
    ], { P: '#ae2:interface', C: 'ae2:capacity_card', B: BTM_CLOSURE.ae2, Z: 'ae2:logic_processor' }, 'kubejs:closure/expatternprovider/ex_interface')
    btmClosureShapeless(event, 'expatternprovider:oversize_interface_part', ['expatternprovider:oversize_interface', BTM_CLOSURE.ae2], 'kubejs:closure/expatternprovider/oversize_interface_part')

    btmClosureShapeless(event, 'railways:portable_fuel_interface', ['create:railway_casing', 'create:chute', BTM_CLOSURE.brass], 'kubejs:closure/railways/portable_fuel_interface')

    // Residual raw-valuable machine inputs from the recipe index.
    btmClosureReplace(event, [
        'ae2:calculation_processor',
        'ae2:logic_processor',
        'ae2:engineering_processor',
        'littlelogistics:receiver_component',
        'oc2r:redstone_interface_card',
        'expatternprovider:pattern_terminal_upgrade',
        'sophisticatedstorageinmotion:storage_minecart',
        'sophisticatedstorage:storage_tool',
        'weather2:wind_turbine',
        'framedblocks:framed_fancy_activator_rail',
        'minecraft:activator_rail'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BTM_CLOSURE.redstoneRelay)

    btmClosureReplace(event, [
        'ae2things:disk_housing',
        'ae2things:disk_drive_1k',
        'ae2things:disk_drive_4k',
        'ae2things:disk_drive_16k',
        'ae2things:disk_drive_64k',
        'ae2things:disk_drive_256k'
    ], ['minecraft:amethyst_shard'], BTM_CLOSURE.skySteelSheet)
})
