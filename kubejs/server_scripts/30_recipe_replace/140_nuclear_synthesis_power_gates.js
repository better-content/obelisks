// Integrate the custom fission/fusion synthesis mods into the expert graph.
// Fission is mid-game heat and nucleus transformation. Fusion/gases are visible before AE2,
// but using fusion as a serious power/synthesis source requires post-AE2 manufacturing.

function btmNuclearRemove(event, ids) {
    for (var i = 0; i < ids.length; i++) event.remove({ id: ids[i] })
}

ServerEvents.recipes(function (event) {
    btmNuclearRemove(event, [
        'fission_reactor:fission_fuel_acceptor',
        'fission_reactor:fission_reactor_rod',
        'gases_and_plasmas:gas_compressor',
        'gases_and_plasmas:gas_fan',
        'gases_and_plasmas:electrolyzer',
        'gases_and_plasmas:electromagnet',
        'gases_and_plasmas:ionizer',
        'gases_and_plasmas:gas_pipe',
        'gases_and_plasmas:creative_flux_node'
    ])

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'PUP',
            'HCH',
            'PTP'
        ],
        key: {
            P: { item: 'create_new_age:heat_pipe' },
            U: { item: 'kubejs:fissile_salt_blend' },
            H: { item: 'create_new_age:reactor_casing' },
            C: { item: 'kubejs:electrical_machine_casing' },
            T: { item: 'kubejs:titanium_thermal_plate' }
        },
        result: { item: 'fission_reactor:fission_fuel_acceptor' }
    }).id('kubejs:create/mechanical_crafting/fission/fuel_acceptor')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            ' P ',
            'URU',
            ' P '
        ],
        key: {
            P: { item: 'kubejs:platinum_group_residue' },
            U: { item: 'kubejs:fissile_salt_blend' },
            R: { item: 'create_new_age:reactor_rod' }
        },
        result: { item: 'fission_reactor:fission_reactor_rod' }
    }).id('kubejs:create/mechanical_crafting/fission/reactor_rod')

    event.shaped('6x gases_and_plasmas:gas_pipe', [
        'CGC',
        'S S',
        'CGC'
    ], {
        C: 'creatingspace:copronickel_sheet',
        G: '#forge:glass',
        S: 'kubejs:space_machine_casing'
    }).id('kubejs:nuclear/gases/gas_pipe')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            ' V ',
            'MCM',
            ' P '
        ],
        key: {
            V: { item: 'create:fluid_valve' },
            M: { item: 'create:precision_mechanism' },
            C: { item: 'kubejs:space_machine_casing' },
            P: { item: 'gases_and_plasmas:gas_pipe' }
        },
        result: { item: 'gases_and_plasmas:gas_compressor' }
    }).id('kubejs:create/mechanical_crafting/gases/gas_compressor')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'IPI',
            'MCM',
            'IPI'
        ],
        key: {
            I: { item: 'creatingspace:inconel_sheet' },
            P: { item: 'create:propeller' },
            M: { item: 'powergrid:electric_motor' },
            C: { item: 'gases_and_plasmas:gas_compressor' }
        },
        result: { item: 'gases_and_plasmas:gas_fan' }
    }).id('kubejs:create/mechanical_crafting/gases/gas_fan')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'BEB',
            'PCP',
            'BWB'
        ],
        key: {
            B: { item: 'powergrid:battery' },
            E: { item: 'powergrid:capacitor' },
            P: { item: 'gases_and_plasmas:gas_pipe' },
            C: { item: 'kubejs:space_machine_casing' },
            W: { item: 'create:fluid_pipe' }
        },
        result: { item: 'gases_and_plasmas:electrolyzer' }
    }).id('kubejs:create/mechanical_crafting/gases/electrolyzer')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'SFS',
            'MCM',
            'SFS'
        ],
        key: {
            S: { item: 'kubejs:sky_steel_sheet' },
            F: { item: 'ae2:fluix_crystal' },
            M: { item: 'powergrid:electromagnet' },
            C: { item: 'kubejs:impossible_machine_casing' }
        },
        result: { item: 'gases_and_plasmas:electromagnet' }
    }).id('kubejs:create/mechanical_crafting/gases/electromagnet')

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'FEF',
            'CAC',
            'FRF'
        ],
        key: {
            F: { item: 'ae2:fluix_glass_cable' },
            E: { item: 'gases_and_plasmas:electromagnet' },
            C: { item: 'powergrid:transformer_core' },
            A: { item: 'kubejs:impossible_machine_casing' },
            R: { item: 'fission_reactor:fission_reactor_rod' }
        },
        result: { item: 'gases_and_plasmas:ionizer' }
    }).id('kubejs:create/mechanical_crafting/gases/ionizer')
})
