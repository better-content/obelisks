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

    // Brass and later casing tiers require Create manufacturing. Remove the simple shaped
    // definitions before adding mechanical crafting/mixing routes below.
    event.remove({ id: 'kubejs:machine_casing/brass' })
    event.remove({ id: 'kubejs:machine_casing/power_grid' })
    event.remove({ id: 'kubejs:machine_casing/oc2r' })
    event.remove({ id: 'kubejs:machine_casing/space' })
    event.remove({ id: 'kubejs:machine_casing/ae2' })
    event.remove({ id: 'kubejs:alloy/sky_steel_ingot' })

    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'kubejs:andesite_machine_casing' },
        transitionalItem: { item: 'create:incomplete_precision_mechanism' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    { item: 'create:brass_sheet' }
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    { item: 'create:precision_mechanism' }
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    { item: 'create:brass_casing' }
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'create:incomplete_precision_mechanism' }],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            }
        ],
        results: [
            { item: 'kubejs:brass_machine_casing' },
            { item: 'create:precision_mechanism', chance: 0.08 }
        ],
        loops: 2
    }).id('kubejs:create/sequenced_assembly/machine_casing/brass')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'ZCCZ',
            'IBBI',
            'IKKI',
            'ZCCZ'
        ],
        key: {
            Z: { item: 'powergrid:zinc_sheet' },
            C: { item: 'powergrid:capacitor' },
            I: { item: 'powergrid:integrated_circuit' },
            K: { item: 'powergrid:conductive_casing' },
            B: { item: 'kubejs:brass_machine_casing' }
        },
        result: { item: 'kubejs:power_grid_machine_casing' }
    }).id('kubejs:create/mechanical_crafting/machine_casing/power_grid')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'TWWT',
            'CBBC',
            'CNNC',
            'TWWT'
        ],
        key: {
            T: { item: 'oc2r:transistor' },
            W: { item: 'oc2r:silicon_wafer' },
            C: { item: 'oc2r:circuit_board' },
            N: { item: 'oc2r:network_connector' },
            B: { item: 'kubejs:power_grid_machine_casing' }
        },
        result: { item: 'kubejs:oc2r_machine_casing' }
    }).id('kubejs:create/mechanical_crafting/machine_casing/oc2r')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'RCR',
            'SBS',
            'RHR'
        ],
        key: {
            R: { item: 'creatingspace:rocket_casing' },
            C: { item: 'creatingspace:copronickel_sheet' },
            S: { item: 'creatingspace:inconel_sheet' },
            H: { item: 'creatingspace:hastelloy_ingot' },
            B: { item: 'kubejs:oc2r_machine_casing' }
        },
        result: { item: 'kubejs:space_machine_casing' }
    }).id('kubejs:create/mechanical_crafting/machine_casing/space')

    event.custom({
        type: 'create:mixing',
        heatRequirement: 'heated',
        ingredients: [
            { item: 'ae2:fluix_crystal' },
            { item: 'ae2:sky_dust' },
            { item: 'ae2:sky_dust' },
            { item: 'ae2:engineering_processor' }
        ],
        results: [{ item: 'kubejs:sky_steel_ingot' }]
    }).id('kubejs:create/mixing/sky_steel_ingot')

    event.custom({
        type: 'create:pressing',
        ingredients: [{ item: 'kubejs:sky_steel_ingot' }],
        results: [{ item: 'kubejs:sky_steel_sheet' }]
    }).id('kubejs:create/pressing/sky_steel_sheet')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'SFPFS',
            'FCBCF',
            'PBABP',
            'FCBCF',
            'SFPFS'
        ],
        key: {
            S: { item: 'kubejs:sky_steel_sheet' },
            F: { item: 'ae2:fluix_crystal' },
            C: { item: 'ae2:engineering_processor' },
            P: { item: 'ae2:sky_stone_block' },
            A: { item: 'ae2:controller' },
            B: { item: 'kubejs:space_machine_casing' }
        },
        result: { item: 'kubejs:ae2_machine_casing' }
    }).id('kubejs:create/mechanical_crafting/machine_casing/ae2')

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
        'acid_vat:acid_vat',
        'acid_vat:acid_vat_faucet',
        'acid_vat:centrifuge_bearing',
        'acid_vat:centrifuge_anchor',
        'acid_vat:centrifuge_chamber',
        'acid_vat:smart_slurry_pipe'
    ], ['create:brass_casing', 'create:andesite_casing', 'create:brass_sheet', '#forge:plates/brass'], 'kubejs:brass_machine_casing')

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
