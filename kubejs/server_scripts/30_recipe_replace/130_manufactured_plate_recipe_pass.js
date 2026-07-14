// Broad manufactured-part pass for machine/logistics/electronics recipes.
// Raw ingots are fine for hand tools, building blocks, and early survival. Block machines,
// vehicles, storage authority, electronics, and logistics should use plates/sheets that can
// be made by Create pressing or TCon casting through forge:plates/*.

var BC_PLATE = {
    iron: '#forge:plates/iron',
    copper: '#forge:plates/copper',
    gold: '#forge:plates/gold',
    brass: '#forge:plates/brass',
    redstoneRelay: 'morered:red_alloy_wire',
    powerCircuit: 'powergrid:integrated_circuit',
    transistor: 'oc2r:transistor',
    skySteelSheet: 'kubejs:sky_steel_sheet',
    inconelSheet: 'creatingspace:inconel_sheet',
    copronickelSheet: 'creatingspace:copronickel_sheet',
    reinforcedCopperSheet: 'creatingspace:reinforced_copper_sheet'
}

function bcPlateReplace(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++) {
        for (var j = 0; j < oldInputs.length; j++) event.replaceInput({ output: outputs[i] }, oldInputs[j], newInput)
    }
}

ServerEvents.recipes(function (event) {
    // Create kinetic/logistics appliances that were still using raw ingots after the casing pass.
    var createIronMachines = [
        'create:chute',
        'create:mechanical_drill',
        'create:mechanical_saw',
        'create:metal_bracket',
        'create:packager',
        'create:redstone_requester',
        'create:cart_assembler'
    ]
     bcPlateReplace(event, createIronMachines, ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)

    var createCopperMachines = [
        'create:fluid_pipe',
        'create:steam_whistle',
        'create:copper_backtank',
        'create:copper_diving_helmet',
        'create:copper_diving_boots',
        'create:potato_cannon'
    ]
     bcPlateReplace(event, createCopperMachines, ['minecraft:copper_ingot', '#forge:ingots/copper'], BC_PLATE.copper)

     bcPlateReplace(event, [
        'create:controller_rail',
        'create:stock_ticker'
    ], ['minecraft:gold_ingot', '#forge:ingots/gold'], BC_PLATE.gold)

     bcPlateReplace(event, [
        'create:brass_funnel',
        'create:brass_tunnel',
        'create:extendo_grip',
        'create:flywheel',
        'create:wand_of_symmetry'
    ], ['create:brass_ingot', '#forge:ingots/brass'], BC_PLATE.brass)

     bcPlateReplace(event, [
        'create:cart_assembler',
        'create:clutch',
        'create:gearshift',
        'create:gantry_shaft',
        'create:packager',
        'create:powered_latch',
        'create:pulse_extender',
        'create:pulse_repeater',
        'create:redstone_contact',
        'create:redstone_requester',
        'create:rose_quartz_lamp',
        'create:sticker',
        'create:transmitter'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.redstoneRelay)

    // Create Connected and diesel/acid logistics: brass-era parts should be fabricated sheets.
     bcPlateReplace(event, [
        'create_connected:empty_fan_catalyst',
        'createdieselgenerators:burner',
        'creatingspace:brass_blisk',
        'creatingspace:brass_rib',
        'creatingspace:brass_turbine_shaft'
    ], ['create:brass_ingot', '#forge:ingots/brass'], BC_PLATE.brass)

     bcPlateReplace(event, [
        'create_connected:brake',
        'create_connected:kinetic_battery',
        'railways:track_coupler'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.redstoneRelay)

    // Power Grid: keep its own integrated circuit as the later electronic part,
    // but make More Red wire/gates the primitive circuitry predecessor.
     bcPlateReplace(event, [
        'powergrid:alarm_bell',
        'powergrid:contactor',
        'powergrid:hv_breaker',
        'powergrid:transformer_core'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)

     bcPlateReplace(event, [
        'powergrid:grounding_rod'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BC_PLATE.copper)

     bcPlateReplace(event, [
        'powergrid:redstone_relay',
        'powergrid:varistor'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.redstoneRelay)

    // OC2R is intersite communication authority. Basic boards and cases use plates;
    // redstone-bearing electronics use Power Grid output.
    var oc2rIronHardware = [
        'oc2r:bus_cable',
        'oc2r:charger',
        'oc2r:computer',
        'oc2r:cpu_tier_1',
        'oc2r:disk_drive',
        'oc2r:file_import_export_card',
        'oc2r:flash_memory',
        'oc2r:flash_memory_flasher',
        'oc2r:floppy',
        'oc2r:floppy_modern',
        'oc2r:hard_drive_small',
        'oc2r:keyboard',
        'oc2r:memory_small',
        'oc2r:network_connector',
        'oc2r:network_hub',
        'oc2r:network_interface_card',
        'oc2r:network_tunnel_card',
        'oc2r:redstone_interface',
        'oc2r:redstone_interface_card',
        'oc2r:robot',
        'oc2r:sound_card',
        'oc2r:transistor',
        'oc2r:wrench'
    ]
     bcPlateReplace(event, oc2rIronHardware, ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)

     bcPlateReplace(event, [
        'oc2r:cpu_tier_1',
        'oc2r:cpu_tier_2'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BC_PLATE.copper)

     bcPlateReplace(event, [
        'oc2r:block_operations_module',
        'oc2r:bus_cable',
        'oc2r:circuit_board',
        'oc2r:cpu_tier_2',
        'oc2r:cpu_tier_3',
        'oc2r:cpu_tier_4',
        'oc2r:hard_drive_medium',
        'oc2r:inventory_operations_module',
        'oc2r:memory_medium',
        'oc2r:network_tunnel_module',
        'oc2r:projector'
    ], ['minecraft:gold_ingot', '#forge:ingots/gold'], BC_PLATE.gold)

     bcPlateReplace(event, [
        'oc2r:flash_memory',
        'oc2r:transistor'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.powerCircuit)

    // Creating Space rocket parts: blisks/ribs/shafts are formed metal, not raw ingot assemblies.
     bcPlateReplace(event, [
        'creatingspace:copper_blisk',
        'creatingspace:copper_coil',
        'creatingspace:copper_rib',
        'creatingspace:copper_turbine_shaft'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BC_PLATE.copper)

     bcPlateReplace(event, [
        'creatingspace:iron_blisk',
        'creatingspace:iron_rib',
        'creatingspace:iron_turbine_shaft',
        'creatingspace:sturdy_propeller'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)

    // Little Logistics is physical route infrastructure: hulls and docks consume manufactured plates.
    var littleIron = [
        'littlelogistics:barge',
        'littlelogistics:barge_dock',
        'littlelogistics:barrel_barge',
        'littlelogistics:conductors_wrench',
        'littlelogistics:energy_locomotive',
        'littlelogistics:energy_tug',
        'littlelogistics:fishing_barge',
        'littlelogistics:fluid_barge',
        'littlelogistics:seater_barge',
        'littlelogistics:seater_car',
        'littlelogistics:steam_locomotive',
        'littlelogistics:tug',
        'littlelogistics:tug_dock',
        'littlelogistics:vacuum_barge',
        'littlelogistics:vessel_charger'
    ]
     bcPlateReplace(event, littleIron, ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)
     bcPlateReplace(event, ['littlelogistics:rapid_hopper', 'littlelogistics:vessel_charger'], ['minecraft:gold_ingot', '#forge:ingots/gold'], BC_PLATE.gold)
     bcPlateReplace(event, ['littlelogistics:locomotive_route', 'littlelogistics:receiver_component', 'littlelogistics:tug_route'], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.redstoneRelay)

    // AE2 and addons: fill gaps not covered by the earlier economy pass.
     bcPlateReplace(event, [
        'ae2:advanced_card',
        'ae2:annihilation_plane',
        'ae2:basic_card',
        'ae2:blank_pattern',
        'ae2:cell_workbench',
        'ae2:condenser',
        'ae2:export_bus',
        'ae2:formation_plane',
        'ae2:growth_accelerator',
        'ae2:import_bus',
        'ae2:me_p2p_tunnel',
        'ae2:quantum_ring',
        'ae2:quartz_fixture',
        'ae2:semi_dark_monitor',
        'ae2:spatial_io_port',
        'ae2:toggle_bus'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.skySteelSheet)

     bcPlateReplace(event, [
        'ae2:basic_card',
        'ae2:memory_card'
    ], ['minecraft:gold_ingot', '#forge:ingots/gold'], BC_PLATE.gold)

     bcPlateReplace(event, [
        'ae2:advanced_card',
        'ae2:basic_card',
        'ae2:semi_dark_monitor',
        'ae2:toggle_bus',
        'ae2additions:disk_fluid_1k',
        'ae2additions:disk_fluid_4k',
        'ae2additions:disk_fluid_16k',
        'ae2additions:disk_fluid_64k',
        'ae2additions:disk_fluid_256k',
        'ae2additions:disk_fluid_1024k',
        'ae2additions:disk_fluid_4096k',
        'ae2additions:disk_fluid_16384k',
        'ae2additions:disk_fluid_65536k',
        'ae2additions:disk_fluid_housing',
        'ae2additions:disk_item_1024k',
        'ae2additions:disk_item_4096k',
        'ae2additions:disk_item_16384k',
        'ae2additions:disk_item_65536k'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.powerCircuit)

     bcPlateReplace(event, [
        'ae2additions:fluid_storage_cell_1024',
        'ae2additions:fluid_storage_cell_4096',
        'ae2additions:fluid_storage_cell_16384'
    ], ['minecraft:copper_ingot', '#forge:ingots/copper'], BC_PLATE.reinforcedCopperSheet)

     bcPlateReplace(event, [
        'expatternprovider:assembler_matrix_frame',
        'expatternprovider:circuit_cutter',
        'expatternprovider:crystal_fixer',
        'expatternprovider:ingredient_buffer',
        'expatternprovider:me_packing_tape',
        'expatternprovider:wireless_tool'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.skySteelSheet)

     bcPlateReplace(event, [
        'expatternprovider:mod_export_bus',
        'expatternprovider:mod_storage_bus',
        'expatternprovider:tag_export_bus',
        'expatternprovider:tag_storage_bus'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.powerCircuit)

    // Building and storage utility: upgrades with automation authority should be assembled from plates/circuits.
     bcPlateReplace(event, [
        'buildinggadgets2:gadget_building',
        'buildinggadgets2:gadget_copy_paste',
        'buildinggadgets2:gadget_cut_paste',
        'buildinggadgets2:gadget_exchanging',
        'buildinggadgets2:template_manager'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)

     bcPlateReplace(event, [
        'buildinggadgets2:gadget_building',
        'buildinggadgets2:gadget_copy_paste',
        'buildinggadgets2:gadget_cut_paste',
        'buildinggadgets2:gadget_exchanging',
        'buildinggadgets2:template_manager'
    ], ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.powerCircuit)

    var sophisticatedAutomation = [
        'sophisticatedbackpacks:alchemy_upgrade',
        'sophisticatedbackpacks:anvil_upgrade',
        'sophisticatedbackpacks:auto_blasting_upgrade',
        'sophisticatedbackpacks:auto_smelting_upgrade',
        'sophisticatedbackpacks:auto_smoking_upgrade',
        'sophisticatedbackpacks:blasting_upgrade',
        'sophisticatedbackpacks:compacting_upgrade',
        'sophisticatedbackpacks:crafting_upgrade',
        'sophisticatedbackpacks:deposit_upgrade',
        'sophisticatedstorage:alchemy_upgrade',
        'sophisticatedstorage:auto_blasting_upgrade',
        'sophisticatedstorage:auto_smelting_upgrade',
        'sophisticatedstorage:auto_smoking_upgrade',
        'sophisticatedstorage:compacting_upgrade',
        'sophisticatedstorage:crafting_upgrade',
        'sophisticatedstorage:deposit_upgrade'
    ]
     bcPlateReplace(event, sophisticatedAutomation, ['minecraft:iron_ingot', '#forge:ingots/iron'], BC_PLATE.iron)
     bcPlateReplace(event, sophisticatedAutomation, ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.redstoneRelay)

    var sophisticatedAdvanced = [
        'sophisticatedbackpacks:advanced_alchemy_upgrade',
        'sophisticatedbackpacks:advanced_compacting_upgrade',
        'sophisticatedbackpacks:advanced_deposit_upgrade',
        'sophisticatedbackpacks:advanced_feeding_upgrade',
        'sophisticatedbackpacks:advanced_filter_upgrade',
        'sophisticatedbackpacks:advanced_jukebox_upgrade',
        'sophisticatedbackpacks:advanced_pickup_upgrade',
        'sophisticatedbackpacks:advanced_pump_upgrade',
        'sophisticatedbackpacks:advanced_refill_upgrade',
        'sophisticatedbackpacks:advanced_restock_upgrade',
        'sophisticatedbackpacks:advanced_void_upgrade',
        'sophisticatedstorage:advanced_compacting_upgrade',
        'sophisticatedstorage:advanced_deposit_upgrade',
        'sophisticatedstorage:advanced_filter_upgrade',
        'sophisticatedstorage:advanced_pickup_upgrade',
        'sophisticatedstorage:advanced_pump_upgrade',
        'sophisticatedstorage:advanced_refill_upgrade',
        'sophisticatedstorage:advanced_restock_upgrade',
        'sophisticatedstorage:advanced_void_upgrade'
    ]
     bcPlateReplace(event, sophisticatedAdvanced, ['minecraft:gold_ingot', '#forge:ingots/gold'], BC_PLATE.gold)
     bcPlateReplace(event, sophisticatedAdvanced, ['minecraft:redstone', '#forge:dusts/redstone'], BC_PLATE.powerCircuit)
})
