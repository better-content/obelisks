// High-value mod placement pass.
// Focuses on systems that can bypass bounded matter, bounded distance, authored logistics,
// combat/adventure scaling, or local-site AE2 limits.

var BC_GATE = {
    seared: 'kubejs:seared_machine_casing',
    andesite: 'kubejs:andesite_machine_casing',
    brass: 'kubejs:brass_machine_casing',
    power: 'kubejs:electrical_machine_casing',
    oc2r: 'kubejs:electrical_machine_casing',
    space: 'kubejs:space_machine_casing',
    ae2: 'kubejs:impossible_machine_casing',
    blankSlate: 'bloodmagic:blankslate',
    imbuedSlate: 'bloodmagic:infusedslate',
    demonicSlate: 'bloodmagic:demonslate',
    etherealSlate: 'bloodmagic:etherealslate'
}

function bcReplaceInputs(event, output, oldInputs, newInput) {
    if (newInput && newInput.charAt && newInput.charAt(0) !== '#' && newInput.indexOf(':') >= 0 && !bcGateItemExists(newInput)) return
    for (var i = 0; i < oldInputs.length; i++) {
        event.replaceInput({ output: output }, oldInputs[i], newInput)
    }
}

function bcRemoveOutputs(event, outputs) {
    for (var i = 0; i < outputs.length; i++) event.remove({ output: outputs[i] })
}

function bcGateOutputs(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++)  bcReplaceInputs(event, outputs[i], oldInputs, newInput)
}

function bcGateItemExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcGatePath(id) {
    var split = id.indexOf(':')
    return split < 0 ? id : id.substring(split + 1)
}

function bcMechanicalGate(event, output, pattern, keys, id, count) {
    if (!bcGateItemExists(output)) return
    for (var key in keys) {
        var ingredient = keys[key]
        if (ingredient && ingredient.charAt && ingredient.charAt(0) !== '#' && ingredient.indexOf(':') >= 0 && !bcGateItemExists(ingredient)) return
    }
    event.remove({ output: output })
    global.bcFactoryCrafting(event, id, output, count || 1, pattern, keys, true)
}

function bcMechanicalGateMany(event, outputs, idPrefix, core, part, shell) {
    for (var i = 0; i < outputs.length; i++) {
         bcMechanicalGate(event, outputs[i], [
            'SPS',
            'PCP',
            'SPS'
        ], {
            S: shell,
            P: part,
            C: core
        }, 'kubejs:' + idPrefix + '/' +  bcGatePath(outputs[i]))
    }
}

ServerEvents.recipes(function (event) {
    // No infinite storage or creative-scale carry/storage loops.
     bcRemoveOutputs(event, [
        'sophisticatedbackpacks:infinity_upgrade',
        'sophisticatedbackpacks:survival_infinity_upgrade',
        'sophisticatedstorage:infinity_upgrade',
        'expatternprovider:infinity_cell'
    ])

    // Sophisticated Backpacks: early carry stays available; automation and pseudo-storage systems become tech milestones.
     bcGateOutputs(event, [
        'sophisticatedbackpacks:upgrade_base',
        'sophisticatedbackpacks:crafting_upgrade',
        'sophisticatedbackpacks:deposit_upgrade',
        'sophisticatedbackpacks:pickup_upgrade',
        'sophisticatedbackpacks:filter_upgrade'
    ], ['minecraft:string', '#forge:string', 'minecraft:redstone', '#forge:dusts/redstone'], BC_GATE.seared)

     bcGateOutputs(event, [
        'sophisticatedbackpacks:compacting_upgrade',
        'sophisticatedbackpacks:void_upgrade',
        'sophisticatedbackpacks:magnet_upgrade',
        'sophisticatedbackpacks:pump_upgrade',
        'sophisticatedbackpacks:xp_pump_upgrade',
        'sophisticatedbackpacks:stack_upgrade_tier_1',
        'sophisticatedbackpacks:stack_upgrade_tier_2',
        'sophisticatedbackpacks:stack_upgrade_tier_3',
        'sophisticatedbackpacks:stack_upgrade_tier_4',
        'sophisticatedbackpacks:inception_upgrade'
    ], ['minecraft:redstone', '#forge:dusts/redstone', 'minecraft:ender_pearl', '#forge:ender_pearls', 'minecraft:gold_ingot', '#forge:ingots/gold', 'minecraft:diamond', '#forge:gems/diamond'], BC_GATE.brass)

     bcGateOutputs(event, [
        'sophisticatedbackpacks:feeding_upgrade',
        'sophisticatedbackpacks:advanced_feeding_upgrade',
        'sophisticatedbackpacks:alchemy_upgrade',
        'sophisticatedbackpacks:advanced_alchemy_upgrade',
        'sophisticatedbackpacks:tool_swapper_upgrade',
        'sophisticatedbackpacks:advanced_tool_swapper_upgrade',
        'sophisticatedstorage:alchemy_upgrade',
        'sophisticatedstorage:advanced_alchemy_upgrade'
    ], ['minecraft:redstone', '#forge:dusts/redstone', 'minecraft:gold_ingot', '#forge:ingots/gold', 'minecraft:diamond', '#forge:gems/diamond', 'minecraft:ender_pearl', '#forge:ender_pearls'], BC_GATE.ae2)

     bcMechanicalGate(event, 'sophisticatedbackpacks:backpack', [
        'LSL',
        'SCS',
        'LSL'
    ], {
        L: 'minecraft:leather',
        S: 'minecraft:string',
        C: BC_GATE.seared
    }, 'kubejs:sophisticatedbackpacks/backpack_seared')

     bcMechanicalGateMany(event, [
        'sophisticatedbackpacks:upgrade_base',
        'sophisticatedbackpacks:crafting_upgrade',
        'sophisticatedbackpacks:deposit_upgrade',
        'sophisticatedbackpacks:pickup_upgrade',
        'sophisticatedbackpacks:filter_upgrade'
    ], 'sophisticatedbackpacks/seared', BC_GATE.seared, 'morered:red_alloy_wire', 'minecraft:string')

     bcMechanicalGateMany(event, [
        'sophisticatedbackpacks:compacting_upgrade',
        'sophisticatedbackpacks:void_upgrade',
        'sophisticatedbackpacks:magnet_upgrade',
        'sophisticatedbackpacks:pump_upgrade',
        'sophisticatedbackpacks:xp_pump_upgrade',
        'sophisticatedbackpacks:stack_upgrade_tier_1',
        'sophisticatedbackpacks:stack_upgrade_tier_2',
        'sophisticatedbackpacks:stack_upgrade_tier_3',
        'sophisticatedbackpacks:stack_upgrade_tier_4',
        'sophisticatedbackpacks:inception_upgrade'
    ], 'sophisticatedbackpacks/brass', BC_GATE.brass, 'create:precision_mechanism', '#forge:plates/brass')

     bcMechanicalGateMany(event, [
        'sophisticatedbackpacks:feeding_upgrade',
        'sophisticatedbackpacks:advanced_feeding_upgrade',
        'sophisticatedbackpacks:alchemy_upgrade',
        'sophisticatedbackpacks:advanced_alchemy_upgrade',
        'sophisticatedbackpacks:tool_swapper_upgrade',
        'sophisticatedbackpacks:advanced_tool_swapper_upgrade'
    ], 'sophisticatedbackpacks/ae2', BC_GATE.ae2, 'kubejs:ae_logic_package', 'kubejs:sky_steel_sheet')

    // Sophisticated Storage: local bulk storage is allowed; controllers and high upgrades wait for AE2-local-intelligence tier.
     bcGateOutputs(event, [
        'sophisticatedstorage:controller',
        'sophisticatedstorage:storage_io',
        'sophisticatedstorage:storage_tool',
        'sophisticatedstorage:compression_upgrade',
        'sophisticatedstorage:compacting_upgrade',
        'sophisticatedstorage:advanced_compacting_upgrade',
        'sophisticatedstorage:advanced_hopper_upgrade',
        'sophisticatedstorage:advanced_void_upgrade'
    ], ['minecraft:redstone', '#forge:dusts/redstone', 'minecraft:ender_pearl', '#forge:ender_pearls', 'minecraft:gold_ingot', '#forge:ingots/gold', 'minecraft:diamond', '#forge:gems/diamond'], BC_GATE.ae2)

     bcGateOutputs(event, [
        'sophisticatedstorage:basic_to_diamond_tier_upgrade',
        'sophisticatedstorage:copper_to_diamond_tier_upgrade',
        'sophisticatedstorage:iron_to_diamond_tier_upgrade',
        'sophisticatedstorage:gold_to_diamond_tier_upgrade',
        'sophisticatedstorage:basic_to_netherite_tier_upgrade',
        'sophisticatedstorage:copper_to_netherite_tier_upgrade',
        'sophisticatedstorage:iron_to_netherite_tier_upgrade',
        'sophisticatedstorage:gold_to_netherite_tier_upgrade',
        'sophisticatedstorage:diamond_to_netherite_tier_upgrade'
    ], ['minecraft:diamond', '#forge:gems/diamond', 'minecraft:netherite_ingot', '#forge:ingots/netherite'], BC_GATE.space)

     bcMechanicalGateMany(event, [
        'sophisticatedstorage:upgrade_base',
        'sophisticatedstorage:filter_upgrade',
        'sophisticatedstorage:pickup_upgrade',
        'sophisticatedstorage:hopper_upgrade',
        'sophisticatedstorage:smelting_upgrade',
        'sophisticatedstorage:smoking_upgrade',
        'sophisticatedstorage:blasting_upgrade',
        'sophisticatedstorage:stonecutter_upgrade',
        'sophisticatedstorage:crafting_upgrade'
    ], 'sophisticatedstorage/seared', BC_GATE.seared, 'morered:red_alloy_wire', '#forge:plates/iron')

     bcMechanicalGateMany(event, [
        'sophisticatedstorage:controller',
        'sophisticatedstorage:storage_io',
        'sophisticatedstorage:storage_tool',
        'sophisticatedstorage:compression_upgrade',
        'sophisticatedstorage:compacting_upgrade',
        'sophisticatedstorage:advanced_compacting_upgrade',
        'sophisticatedstorage:advanced_hopper_upgrade',
        'sophisticatedstorage:advanced_void_upgrade',
        'sophisticatedstorage:alchemy_upgrade',
        'sophisticatedstorage:advanced_alchemy_upgrade'
    ], 'sophisticatedstorage/ae2', BC_GATE.ae2, 'kubejs:ae_logic_package', 'kubejs:sky_steel_sheet')

     bcMechanicalGateMany(event, [
        'sophisticatedstorage:basic_to_diamond_tier_upgrade',
        'sophisticatedstorage:copper_to_diamond_tier_upgrade',
        'sophisticatedstorage:iron_to_diamond_tier_upgrade',
        'sophisticatedstorage:gold_to_diamond_tier_upgrade',
        'sophisticatedstorage:basic_to_netherite_tier_upgrade',
        'sophisticatedstorage:copper_to_netherite_tier_upgrade',
        'sophisticatedstorage:iron_to_netherite_tier_upgrade',
        'sophisticatedstorage:gold_to_netherite_tier_upgrade',
        'sophisticatedstorage:diamond_to_netherite_tier_upgrade'
    ], 'sophisticatedstorage/space', BC_GATE.space, 'kubejs:sky_steel_sheet', '#forge:ingots/netherite')

    // Building Gadgets mass construction edits are post-AE2.
     bcGateOutputs(event, [
        'buildinggadgets2:gadget_building',
        'buildinggadgets2:gadget_exchanging',
        'buildinggadgets2:template_manager'
    ], ['minecraft:diamond', '#forge:gems/diamond', 'minecraft:emerald', '#forge:gems/emerald', 'minecraft:redstone', '#forge:dusts/redstone', 'minecraft:netherite_ingot', '#forge:ingots/netherite'], BC_GATE.ae2)

     bcGateOutputs(event, [
        'buildinggadgets2:gadget_copy_paste',
        'buildinggadgets2:gadget_cut_paste'
    ], ['minecraft:emerald', '#forge:gems/emerald', 'minecraft:redstone', '#forge:dusts/redstone'], BC_GATE.ae2)

     bcGateOutputs(event, [
        'buildinggadgets2:gadget_destruction'
    ], ['minecraft:ender_pearl', '#forge:ender_pearls', 'minecraft:redstone', '#forge:dusts/redstone'], BC_GATE.ae2)

     bcMechanicalGateMany(event, [
        'buildinggadgets2:gadget_building',
        'buildinggadgets2:gadget_exchanging',
        'buildinggadgets2:template_manager',
        'buildinggadgets2:gadget_copy_paste',
        'buildinggadgets2:gadget_cut_paste',
        'buildinggadgets2:gadget_destruction'
    ], 'buildinggadgets2/ae2', BC_GATE.ae2, 'kubejs:ae_logic_package', 'kubejs:sky_steel_sheet')

    // Chunk loading is remote-site infrastructure. It must not appear before power/computing logistics.
     bcGateOutputs(event, [
        'create_power_loader:empty_andesite_chunk_loader',
        'create_power_loader:andesite_chunk_loader'
    ], ['create:andesite_casing', 'minecraft:respawn_anchor'], BC_GATE.power)

     bcGateOutputs(event, [
        'create_power_loader:empty_brass_chunk_loader',
        'create_power_loader:brass_chunk_loader'
    ], ['create:brass_casing', 'minecraft:respawn_anchor', 'create:precision_mechanism'], BC_GATE.oc2r)

    // Physical logistics are encouraged; long-range abstractions and electronic logistics are tiered.
     bcRemoveOutputs(event, [
        'createadvlogistics:package_wormhole'
    ])

     bcGateOutputs(event, [
        'createadditionallogistics:package_accelerator',
        'createadditionallogistics:package_editor',
        'createadditionallogistics:cash_register',
        'createadditionallogistics:network_monitor',
        'createadvlogistics:redstone_radio',
        'createadvlogistics:package_content_filter'
    ], ['create:brass_casing', 'create:precision_mechanism', 'minecraft:redstone', '#forge:dusts/redstone'], BC_GATE.brass)

     bcGateOutputs(event, [
        'littlelogistics:energy_locomotive',
        'littlelogistics:energy_tug',
        'littlelogistics:vessel_charger',
        'littlelogistics:receiver_component',
        'littlelogistics:transmitter_component'
    ], ['minecraft:redstone', '#forge:dusts/redstone', 'minecraft:iron_ingot', '#forge:ingots/iron', 'minecraft:copper_ingot', '#forge:ingots/copper'], BC_GATE.power)

    // AOE villager trading is too strong for the early village economy.
    // PROVISIONAL - requires playtesting.
    event.remove({ output: 'tradingpost:trading_post' })
    global.bcFactoryCrafting(event, 'kubejs:late_game/tradingpost/trading_post', 'tradingpost:trading_post', 1, [
        'GEG',
        'PAP',
        'WWW'
    ], {
        G: 'createdeco:gold_coin',
        E: 'ae2:engineering_processor',
        P: 'pneumaticcraft:printed_circuit_board',
        A: BC_GATE.ae2,
        W: '#minecraft:planks'
    }, true)

    // Economy tools use coins instead of emeralds where there is a clear recipe hook.
     bcReplaceInputs(event, 'wares:delivery_table', ['minecraft:ink_sac'], 'createdeco:iron_coin')

    // Create Enchantment Industry and Apotheosis are combat/adventure power spikes; parent them to Blood Magic tiers.
     bcGateOutputs(event, [
        'create_enchantment_industry:disenchanter',
        'create_enchantment_industry:printer',
        'create_enchantment_industry:experience_rotor'
    ], ['create:brass_casing', 'create:precision_mechanism', 'minecraft:enchanting_table', 'minecraft:experience_bottle'], BC_GATE.demonicSlate)

     bcGateOutputs(event, [
        'apotheosis:gem_cutting_table',
        'apotheosis:salvaging_table',
        'apotheosis:simple_reforging_table'
    ], ['minecraft:diamond', '#forge:gems/diamond', 'minecraft:anvil', 'minecraft:smithing_table'], BC_GATE.imbuedSlate)

     bcGateOutputs(event, [
        'apotheosis:reforging_table',
        'apotheosis:augmenting_table',
        'apotheosis:library',
        'apotheosis:ender_library'
    ], ['minecraft:diamond', '#forge:gems/diamond', 'minecraft:nether_star', 'minecraft:ender_eye', 'minecraft:enchanting_table', 'minecraft:smithing_table'], BC_GATE.demonicSlate)

     bcGateOutputs(event, [
        'apotheosis:endshelf',
        'apotheosis:deepshelf',
        'apotheosis:dormant_deepshelf',
        'apotheosis:echoing_deepshelf',
        'apotheosis:soul_touched_deepshelf',
        'apotheosis:draconic_endshelf',
        'apotheosis:treasure_shelf'
    ], ['minecraft:ender_eye', 'minecraft:echo_shard', 'minecraft:dragon_breath', 'minecraft:nether_star'], BC_GATE.etherealSlate)

    // AE2 addons: local intelligence yes, global/wireless/oversized systems late and never infinite.
     bcGateOutputs(event, [
        'ae2additions:me_wireless_transceiver',
        'expatternprovider:wireless_connector',
        'expatternprovider:wireless_hub',
        'expatternprovider:wireless_ex_pat',
        'expatternprovider:wireless_tool'
    ], ['ae2:wireless_receiver', 'ae2:fluix_pearl', 'ae2:fluix_crystal', 'ae2:engineering_processor'], BC_GATE.oc2r)

     bcGateOutputs(event, [
        'merequester:requester',
        'merequester:requester_terminal',
        'expatternprovider:ex_drive',
        'expatternprovider:ex_io_port',
        'expatternprovider:ex_interface',
        'expatternprovider:ex_pattern_provider',
        'expatternprovider:ex_molecular_assembler',
        'expatternprovider:assembler_matrix_frame',
        'expatternprovider:assembler_matrix_wall',
        'expatternprovider:assembler_matrix_crafter'
    ], ['ae2:interface', '#ae2:interface', 'ae2:engineering_processor', 'ae2:calculation_processor', 'ae2:logic_processor', 'minecraft:iron_ingot', '#forge:ingots/iron'], BC_GATE.ae2)

     bcGateOutputs(event, [
        'ae2additions:item_storage_cell_1024',
        'ae2additions:item_storage_cell_4096',
        'ae2additions:item_storage_cell_16384',
        'ae2additions:item_storage_cell_65536',
        'ae2additions:fluid_storage_cell_1024',
        'ae2additions:fluid_storage_cell_4096',
        'ae2additions:fluid_storage_cell_16384',
        'ae2additions:chemical_storage_cell_1024',
        'ae2additions:chemical_storage_cell_4096',
        'ae2additions:chemical_storage_cell_16384'
    ], ['ae2:cell_component_256k', 'ae2:cell_component_64k', 'ae2:cell_component_16k', 'ae2:engineering_processor', 'kubejs:ae_logic_package'], BC_GATE.space)

    // Create Applied Kinetics is an AE/Create bridge, not a pre-AE power shortcut.
     bcGateOutputs(event, [
        'createappliedkinetics:energy_provider',
        'createappliedkinetics:me_proxy'
    ], ['ae2:energy_acceptor', 'ae2:interface', 'create:brass_casing', 'create:precision_mechanism'], BC_GATE.ae2)

    // Late occult/tech bridge: requires both Create brass era and Blood Magic mid-tier permission.
     bcGateOutputs(event, [
        'occultengineering:mechanical_chamber',
        'occultengineering:mechanical_pulverizer',
        'occultengineering:otherworld_detector',
        'occultengineering:phlogiport',
        'occultengineering:pentacle_altar'
    ], ['create:brass_casing', 'create:precision_mechanism', 'occultism:spirit_attuned_crystal', 'minecraft:gold_ingot', '#forge:ingots/gold'], BC_GATE.imbuedSlate)
})
