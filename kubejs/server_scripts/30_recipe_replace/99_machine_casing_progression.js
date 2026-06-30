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

    event.shaped('kubejs:andesite_machine_casing', [
        'ADA',
        'DCD',
        'AAA'
    ], {
        A: 'create:andesite_alloy',
        D: 'create:andesite_casing',
        C: 'tconstruct:scorched_bricks'
    }).id('kubejs:machine_casing/andesite')

    // Brass and later casing tiers require Create manufacturing. Remove the simple shaped
    // definitions before adding mechanical crafting/mixing routes below.
    event.remove({ id: 'kubejs:machine_casing/brass' })
    event.remove({ id: 'kubejs:machine_casing/airtight' })
    event.remove({ id: 'kubejs:machine_casing/electrical' })
    event.remove({ id: 'kubejs:machine_casing/circuited' })
    event.remove({ id: 'kubejs:machine_casing/space' })
    event.remove({ id: 'kubejs:machine_casing/raw_impossible' })
    event.remove({ id: 'kubejs:machine_casing/impossible' })
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

    global.btmCreateCompacting(event, 'kubejs:pneumaticcraft/pressure_seal', 'kubejs:pressure_seal', 1, [
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:dried_kelp',
        'minecraft:slime_ball'
    ])

    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'create:precision_mechanism' },
        transitionalItem: { item: 'create:incomplete_precision_mechanism' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    { item: 'create:shaft' }
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    { item: 'pneumaticcraft:pressure_tube' }
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    { item: 'pneumaticcraft:ingot_iron_compressed' }
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'create:incomplete_precision_mechanism' }],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            }
        ],
        results: [{ item: 'kubejs:rotational_compressor_core' }],
        loops: 2
    }).id('kubejs:create/sequenced_assembly/pneumaticcraft/rotational_compressor_core')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'SISI',
            'PBGP',
            'PGCP',
            'ISIS'
        ],
        key: {
            S: { item: 'kubejs:pressure_seal' },
            I: { item: 'pneumaticcraft:ingot_iron_compressed' },
            P: { item: 'pneumaticcraft:pressure_tube' },
            G: { item: 'minecraft:glass' },
            C: { item: 'kubejs:rotational_compressor_core' },
            B: { item: 'kubejs:brass_machine_casing' }
        },
        result: { item: 'kubejs:airtight_machine_casing' }
    }).id('kubejs:create/mechanical_crafting/machine_casing/airtight')

    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: [
            { type: 'pneumaticcraft:stacked_item', item: 'kubejs:airtight_machine_casing', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'powergrid:conductive_casing', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'powergrid:capacitor', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'powergrid:integrated_circuit', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'pneumaticcraft:printed_circuit_board', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'pneumaticcraft:transistor', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'oc2r:silicon_wafer', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'oc2r:network_connector', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'chemlib:copper_chloride', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'chemlib:aluminum_oxide', count: 1 }
        ],
        pressure: 4.0,
        results: [{ item: 'kubejs:electrical_machine_casing' }]
    }).id('kubejs:pneumaticcraft/pressure_chamber/machine_casing/electrical')

    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: [
            { type: 'pneumaticcraft:stacked_item', item: 'kubejs:electrical_machine_casing', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'creatingspace:rocket_casing', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'kubejs:titanium_thermal_plate', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'creatingspace:inconel_sheet', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'creatingspace:hastelloy_ingot', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'pneumaticcraft:pressure_tube', count: 2 }
        ],
        pressure: 4.5,
        results: [{ item: 'kubejs:space_machine_casing' }]
    }).id('kubejs:pneumaticcraft/pressure_chamber/machine_casing/space')

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
        type: 'pneumaticcraft:pressure_chamber',
        inputs: [
            { type: 'pneumaticcraft:stacked_item', item: 'kubejs:space_machine_casing', count: 1 },
            { type: 'pneumaticcraft:stacked_item', item: 'kubejs:sky_steel_sheet', count: 4 },
            { type: 'pneumaticcraft:stacked_item', item: 'ae2:fluix_crystal', count: 4 },
            { type: 'pneumaticcraft:stacked_item', item: 'ae2:engineering_processor', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'ae2:sky_stone_block', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'chemlib:silicon_dioxide', count: 2 },
            { type: 'pneumaticcraft:stacked_item', item: 'ae2:fluix_glass_cable', count: 1 }
        ],
        pressure: 4.5,
        results: [{ item: 'kubejs:raw_impossible_casing' }]
    }).id('kubejs:pneumaticcraft/pressure_chamber/machine_casing/raw_impossible')

    if (event.recipes.bloodmagic && event.recipes.bloodmagic.altar) {
        event.recipes.bloodmagic
            .altar('kubejs:impossible_machine_casing', 'kubejs:raw_impossible_casing')
            .upgradeLevel(5)
            .altarSyphon(150000)
            .consumptionRate(120)
            .drainRate(120)
            .id('kubejs:bloodmagic/machine_casing/impossible')
    } else {
        event.shaped('kubejs:impossible_machine_casing', [
            'EAE',
            'ARA',
            'EAE'
        ], {
            E: 'bloodmagic:etherealslate',
            A: 'bloodmagic:archmagebloodorb',
            R: 'kubejs:raw_impossible_casing'
        }).id('kubejs:machine_casing/impossible_fallback')
    }

    event.remove({ output: 'pneumaticcraft:pressure_chamber_wall' })
    event.remove({ output: 'pneumaticcraft:pressure_chamber_glass' })
    event.remove({ output: 'pneumaticcraft:pressure_chamber_interface' })

    global.btmFactoryCrafting(event, 'kubejs:pneumaticcraft/pressure_chamber_wall_airtight', 'pneumaticcraft:pressure_chamber_wall', 16, [
        'RRR',
        'RAR',
        'RRR'
    ], {
        R: 'pneumaticcraft:reinforced_bricks',
        A: 'kubejs:airtight_machine_casing'
    }, { mirrored: true })

    global.btmFactoryCrafting(event, 'kubejs:pneumaticcraft/pressure_chamber_glass_airtight', 'pneumaticcraft:pressure_chamber_glass', 16, [
        'RGR',
        'GAG',
        'RGR'
    ], {
        R: 'pneumaticcraft:reinforced_bricks',
        G: '#forge:glass',
        A: 'kubejs:airtight_machine_casing'
    }, { mirrored: true })

    event.remove({ output: 'pneumaticcraft:pressure_chamber_interface' })
    event.shaped('2x pneumaticcraft:pressure_chamber_interface', [
        'HW',
        'AW'
    ], {
        H: 'minecraft:hopper',
        A: 'kubejs:airtight_machine_casing',
        W: 'pneumaticcraft:pressure_chamber_wall'
    }).id('kubejs:pneumaticcraft/pressure_chamber_interface_airtight')

    // First block-like machines per tier. Avoid deadlocking Deployer; it remains pre-casing.
    btmGateAny(event, [
        'tconstruct:smeltery_controller',
        'tconstruct:seared_fuel_tank',
        'tconstruct:seared_melter'
    ], ['tconstruct:seared_bricks', 'tconstruct:seared_brick'], 'kubejs:seared_machine_casing')

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
        'create:content_observer',
        'create:cart_assembler'
    ], ['create:brass_casing', 'create:brass_ingot', '#forge:ingots/brass'], 'kubejs:brass_machine_casing')

    btmGateAny(event, [
        'pneumaticcraft:reinforced_pressure_tube',
        'pneumaticcraft:refinery',
        'pneumaticcraft:thermopneumatic_processing_plant',
        'pneumaticcraft:assembly_controller',
        'pneumaticcraft:assembly_platform',
        'pneumaticcraft:assembly_laser',
        'pneumaticcraft:assembly_drill',
        'pneumaticcraft:assembly_io_unit'
    ], [
        'pneumaticcraft:ingot_iron_compressed',
        'pneumaticcraft:pressure_tube',
        '#forge:ingots/iron'
    ], 'kubejs:airtight_machine_casing')

    btmGateAny(event, [
        'powergrid:battery',
        'powergrid:electric_motor',
        'powergrid:generator_housing'
    ], ['create:andesite_casing', 'create:brass_casing', '#forge:ingots/iron', '#forge:plates/iron'], 'kubejs:electrical_machine_casing')

    btmGateAny(event, [
        'oc2r:computer',
        'oc2r:network_hub',
        'oc2r:disk_drive',
        'oc2r:monitor',
        'oc2r:pci_card_cage',
        'oc2r:charger'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron', 'powergrid:integrated_circuit'], 'kubejs:electrical_machine_casing')

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
        'ae2:vibration_chamber',
        'ae2:condenser',
        'ae2:molecular_assembler',
        'ae2:pattern_provider'
    ], ['minecraft:iron_ingot', '#forge:ingots/iron', 'ae2:fluix_crystal', 'ae2:engineering_processor'], 'kubejs:impossible_machine_casing')
})
