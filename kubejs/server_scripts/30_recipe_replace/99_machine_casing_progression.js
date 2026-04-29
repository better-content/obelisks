// E2E-style machine casing progression. Each tier adds a new mod's manufacturing complexity
// while depending on all previous tiers through the casing chain.

function btmReplaceInput(event, output, oldInput, newInput) {
    event.replaceInput({ output: output }, oldInput, newInput)
}

function btmGateAny(event, outputs, oldInputs, newInput) {
    for (var i = 0; i < outputs.length; i++) {
        for (var j = 0; j < oldInputs.length; j++) {
            btmReplaceInput(event, outputs[i], oldInputs[j], newInput)
        }
    }
}

ServerEvents.recipes(function (event) {
    // Casing source-of-truth recipes.
    event.shaped('kubejs:seared_machine_casing', [
        'BGB',
        'GCG',
        'BGB'
    ], {
        B: 'tconstruct:seared_brick',
        G: 'tconstruct:seared_glass',
        C: 'minecraft:copper_ingot'
    }).id('kubejs:machine_casing/seared')

    event.shaped('kubejs:scorched_machine_casing', [
        'BGB',
        'GCG',
        'BGB'
    ], {
        B: 'tconstruct:scorched_brick',
        G: 'tconstruct:scorched_glass',
        C: 'kubejs:seared_machine_casing'
    }).id('kubejs:machine_casing/scorched')

    event.shaped('kubejs:andesite_machine_casing', [
        'ADA',
        'DCD',
        'AAA'
    ], {
        A: 'create:andesite_alloy',
        D: 'create:andesite_casing',
        C: 'kubejs:scorched_machine_casing'
    }).id('kubejs:machine_casing/andesite')

    event.shaped('kubejs:brass_machine_casing', [
        'BPB',
        'PCP',
        'BDB'
    ], {
        B: 'create:brass_ingot',
        P: 'create:precision_mechanism',
        D: 'create:brass_casing',
        C: 'kubejs:andesite_machine_casing'
    }).id('kubejs:machine_casing/brass')

    event.shaped('kubejs:power_grid_machine_casing', [
        'ZCZ',
        'IBI',
        'ZKZ'
    ], {
        Z: 'powergrid:zinc_sheet',
        C: 'powergrid:capacitor',
        I: 'powergrid:integrated_circuit',
        K: 'powergrid:conductive_casing',
        B: 'kubejs:brass_machine_casing'
    }).id('kubejs:machine_casing/power_grid')

    event.shaped('kubejs:oc2r_machine_casing', [
        'TWT',
        'CBC',
        'TNT'
    ], {
        T: 'oc2r:transistor',
        W: 'oc2r:silicon_wafer',
        C: 'oc2r:circuit_board',
        N: 'oc2r:network_connector',
        B: 'kubejs:power_grid_machine_casing'
    }).id('kubejs:machine_casing/oc2r')

    event.shaped('kubejs:space_machine_casing', [
        'RCR',
        'SBS',
        'RHR'
    ], {
        R: 'creatingspace:rocket_casing',
        C: 'creatingspace:copronickel_sheet',
        S: 'creatingspace:inconel_sheet',
        H: 'creatingspace:hastelloy_ingot',
        B: 'kubejs:oc2r_machine_casing'
    }).id('kubejs:machine_casing/space')

    event.shaped('kubejs:sky_steel_ingot', [
        'FSF',
        'SES',
        'FSF'
    ], {
        F: 'ae2:fluix_crystal',
        S: 'ae2:sky_dust',
        E: 'ae2:engineering_processor'
    }).id('kubejs:alloy/sky_steel_ingot')

    event.custom({
        type: 'create:pressing',
        ingredients: [{ item: 'kubejs:sky_steel_ingot' }],
        results: [{ item: 'kubejs:sky_steel_sheet' }]
    }).id('kubejs:create/pressing/sky_steel_sheet')

    event.shaped('kubejs:ae2_machine_casing', [
        'SFS',
        'CBC',
        'SPS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        F: 'ae2:fluix_crystal',
        C: 'ae2:engineering_processor',
        P: 'ae2:sky_stone_block',
        B: 'kubejs:space_machine_casing'
    }).id('kubejs:machine_casing/ae2')

    // First block-like machines per tier. Avoid deadlocking Deployer; it remains pre-casing.
    btmGateAny(event, [
        'tconstruct:smeltery_controller',
        'tconstruct:seared_fuel_tank',
        'tconstruct:seared_melter'
    ], ['tconstruct:seared_bricks', 'tconstruct:seared_brick'], 'kubejs:seared_machine_casing')

    btmGateAny(event, [
        'tconstruct:foundry_controller',
        'tconstruct:scorched_fuel_tank',
        'tconstruct:alloyer'
    ], ['tconstruct:scorched_bricks', 'tconstruct:scorched_brick'], 'kubejs:scorched_machine_casing')

    btmGateAny(event, [
        'create:mechanical_press',
        'create:mechanical_mixer',
        'create:mechanical_saw',
        'create:mechanical_drill',
        'create:mechanical_crafter'
    ], ['create:andesite_casing', 'minecraft:andesite', '#forge:ingots/iron'], 'kubejs:andesite_machine_casing')

    btmGateAny(event, [
        'create:rotation_speed_controller',
        'create:mechanical_arm',
        'create:stockpile_switch',
        'create:content_observer'
    ], ['create:brass_casing', 'create:brass_ingot', '#forge:ingots/brass'], 'kubejs:brass_machine_casing')

    btmGateAny(event, [
        'powergrid:battery',
        'powergrid:electric_motor',
        'powergrid:generator_housing'
    ], ['create:andesite_casing', 'create:brass_casing', '#forge:ingots/iron', '#forge:plates/iron'], 'kubejs:power_grid_machine_casing')

    btmGateAny(event, [
        'oc2r:computer',
        'oc2r:network_hub',
        'oc2r:network_connector',
        'oc2r:disk_drive',
        'oc2r:monitor',
        'oc2r:pci_card_cage'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron', 'powergrid:integrated_circuit'], 'kubejs:oc2r_machine_casing')

    btmGateAny(event, [
        'creatingspace:chemical_synthesizer',
        'creatingspace:air_liquefier'
    ], ['create:brass_casing', 'powergrid:conductive_casing', '#forge:plates/iron'], 'kubejs:space_machine_casing')

    btmGateAny(event, [
        'ae2:controller',
        'ae2:drive',
        'ae2:energy_acceptor',
        'ae2:interface',
        'ae2:io_port',
        'ae2:spatial_io_port',
        'ae2:molecular_assembler',
        'ae2:pattern_provider'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron', 'ae2:fluix_crystal', 'ae2:engineering_processor'], 'kubejs:ae2_machine_casing')
})
