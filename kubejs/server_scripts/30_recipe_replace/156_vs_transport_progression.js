// Valkyrien Skies family transport progression.
// - Eureka watercraft follows primitive, non-metal TConstruct workstations.
// - Trackwork land propulsion follows the Create railway/precision milestone.
// - Powered Eureka/Clockwork flight requires both Aether proof and Airtight casing work.

var BC_VS_TRANSPORT = {
    airtight: 'kubejs:airtight_machine_casing',
    railway: 'create:railway_casing',
    precision: 'create:precision_mechanism',
    aercloud: 'aether:blue_aercloud',
    aerogel: 'aether:aerogel',
    ambrosium: 'aether:ambrosium_shard',
    skyroot: 'aether:skyroot_stick',
    quicksoilGlass: 'aether:quicksoil_glass'
}

var BC_EUREKA_HELM_WOODS = [
    'oak',
    'spruce',
    'birch',
    'jungle',
    'acacia',
    'dark_oak',
    'crimson',
    'warped'
]

function bcVsShaped(event, output, pattern, keys, id, count) {
    event.remove({ output: output })
    var result = count && count > 1 ? (count + 'x ' + output) : output
    event.shaped(result, pattern, keys).id(id)
}

function bcVsFactory(event, output, pattern, keys, id, count) {
    event.remove({ output: output })
    global.bcFactoryCrafting(event, id, output, count || 1, pattern, keys, true)
}

ServerEvents.recipes(function (event) {
    // Primitive exploration hook: a working ship is the first payoff for building
    // the Part Builder and Tinker Station. Material-bearing TCon parts match by
    // item id, so wood, stone, bone, and later replacements all remain valid.
    for (var i = 0; i < BC_EUREKA_HELM_WOODS.length; i++) {
        var wood = BC_EUREKA_HELM_WOODS[i]
        bcVsShaped(event, 'vs_eureka:' + wood + '_ship_helm', [
            ' H ',
            'FSF',
            'P P'
        ], {
            H: 'tconstruct:tool_handle',
            F: 'minecraft:' + wood + '_fence',
            S: 'minecraft:' + wood + '_slab',
            P: 'minecraft:' + wood + '_planks'
        }, 'kubejs:vs_transport/eureka/' + wood + '_ship_helm')
    }

    bcVsShaped(event, 'vs_eureka:engine', [
        'CRC',
        'BHB',
        'LFL'
    ], {
        C: '#forge:cobblestone',
        R: 'tconstruct:repair_kit',
        B: 'tconstruct:small_blade',
        H: 'tconstruct:tool_handle',
        L: '#minecraft:logs',
        F: 'minecraft:furnace'
    }, 'kubejs:vs_transport/eureka/primitive_engine')

    // Trackwork is the rough-terrain peer to Create trains. Every independent
    // propulsion root crosses both railway casing and precision mechanisms.
    bcVsFactory(event, 'trackwork:simple_wheel_part', [
        'KAK',
        'RCP',
        'KAK'
    ], {
        K: 'minecraft:dried_kelp',
        A: 'create:andesite_alloy',
        R: BC_VS_TRANSPORT.railway,
        C: 'create:cogwheel',
        P: BC_VS_TRANSPORT.precision
    }, 'kubejs:vs_transport/trackwork/simple_wheel_part', 2)

    bcVsShaped(event, 'trackwork:small_simple_wheel_part', [
        ' K ',
        'KPK',
        ' K '
    ], {
        K: 'minecraft:dried_kelp',
        P: 'trackwork:simple_wheel_part'
    }, 'kubejs:vs_transport/trackwork/small_simple_wheel_part')

    bcVsShaped(event, 'trackwork:med_simple_wheel_part', [
        ' K ',
        'GPG',
        ' K '
    ], {
        K: 'minecraft:dried_kelp',
        G: 'create:cogwheel',
        P: 'trackwork:simple_wheel_part'
    }, 'kubejs:vs_transport/trackwork/med_simple_wheel_part')

    bcVsShaped(event, 'trackwork:large_simple_wheel_part', [
        'KDK',
        'GPG',
        'KDK'
    ], {
        K: 'minecraft:dried_kelp',
        D: 'minecraft:dried_kelp_block',
        G: 'create:large_cogwheel',
        P: 'trackwork:simple_wheel_part'
    }, 'kubejs:vs_transport/trackwork/large_simple_wheel_part')

    bcVsFactory(event, 'trackwork:phys_track', [
        'APA',
        'RCR',
        'BBB'
    ], {
        A: 'create:andesite_alloy',
        P: BC_VS_TRANSPORT.precision,
        R: BC_VS_TRANSPORT.railway,
        C: 'create:cogwheel',
        B: 'create:belt_connector'
    }, 'kubejs:vs_transport/trackwork/phys_track', 2)

    bcVsFactory(event, 'trackwork:suspension_track', [
        'MPM',
        'RCR',
        'BBB'
    ], {
        M: 'create:mechanical_piston',
        P: BC_VS_TRANSPORT.precision,
        R: BC_VS_TRANSPORT.railway,
        C: 'create:cogwheel',
        B: 'create:belt_connector'
    }, 'kubejs:vs_transport/trackwork/suspension_track', 2)

    bcVsShaped(event, 'trackwork:track_level_controller', [
        ' E ',
        'MCM',
        ' R '
    ], {
        E: 'create:electron_tube',
        M: 'create:mechanical_piston',
        C: BC_VS_TRANSPORT.precision,
        R: BC_VS_TRANSPORT.railway
    }, 'kubejs:vs_transport/trackwork/track_level_controller')

    bcVsShaped(event, 'trackwork:track_tool_kit', [
        'CTC',
        'WRH',
        ' P '
    ], {
        C: '#forge:plates/copper',
        T: 'create:red_toolbox',
        W: 'create:wrench',
        R: BC_VS_TRANSPORT.railway,
        H: 'create:hand_crank',
        P: BC_VS_TRANSPORT.precision
    }, 'kubejs:vs_transport/trackwork/track_tool_kit')

    // Aether proves buoyancy; Airtight casing proves the sealed manufacture
    // needed for powered flight. Cheap wool/paper/leather/membrane routes are
    // removed explicitly so no native balloon bypass survives.
    var balloonBypassIds = [
        'vs_eureka:balloon_leather',
        'vs_eureka:balloon_membrane',
        'vs_eureka:balloon_paper',
        'vs_eureka:balloon_wool'
    ]
    for (var j = 0; j < balloonBypassIds.length; j++) event.remove({ id: balloonBypassIds[j] })
    event.remove({ output: 'vs_eureka:balloon' })
    global.bcFactoryCrafting(event, 'kubejs:vs_transport/eureka/aether_balloon', 'vs_eureka:balloon', 8, [
        'CAC',
        'ABA',
        'CIC'
    ], {
        C: 'farmersdelight:canvas',
        A: BC_VS_TRANSPORT.aerogel,
        B: BC_VS_TRANSPORT.aercloud,
        I: BC_VS_TRANSPORT.airtight
    }, true)

    // Aerodynamic parts each carry Aether identity. Functional controllers,
    // bearings, and engines additionally consume an Airtight casing.
    bcVsFactory(event, 'vs_clockwork:propeller_blade', [
        ' SQ',
        'SIQ',
        'S  '
    ], {
        S: BC_VS_TRANSPORT.skyroot,
        Q: BC_VS_TRANSPORT.quicksoilGlass,
        I: 'create:iron_sheet'
    }, 'kubejs:vs_transport/clockwork/propeller_blade', 4)

    bcVsFactory(event, 'vs_clockwork:wide_propeller_blade', [
        'BQB',
        'SIS',
        ' B '
    ], {
        B: 'vs_clockwork:propeller_blade',
        Q: BC_VS_TRANSPORT.quicksoilGlass,
        S: BC_VS_TRANSPORT.skyroot,
        I: 'create:iron_sheet'
    }, 'kubejs:vs_transport/clockwork/wide_propeller_blade', 2)

    bcVsFactory(event, 'vs_clockwork:flap', [
        'CAC',
        'SIS',
        'CAC'
    ], {
        C: 'farmersdelight:canvas',
        A: BC_VS_TRANSPORT.aerogel,
        S: BC_VS_TRANSPORT.skyroot,
        I: 'create:iron_sheet'
    }, 'kubejs:vs_transport/clockwork/flap', 4)

    bcVsFactory(event, 'vs_clockwork:wing', [
        'FQF',
        'BAB',
        'FQF'
    ], {
        F: 'vs_clockwork:flap',
        Q: BC_VS_TRANSPORT.quicksoilGlass,
        B: '#forge:plates/brass',
        A: BC_VS_TRANSPORT.aerogel
    }, 'kubejs:vs_transport/clockwork/wing', 4)

    bcVsFactory(event, 'vs_clockwork:balloon_casing', [
        'BBB',
        'BAB',
        'BBB'
    ], {
        B: 'vs_eureka:balloon',
        A: '#forge:plates/brass'
    }, 'kubejs:vs_transport/clockwork/balloon_casing', 8)

    bcVsFactory(event, 'vs_clockwork:blade_controller', [
        ' P ',
        'AIA',
        ' B '
    ], {
        P: BC_VS_TRANSPORT.precision,
        A: BC_VS_TRANSPORT.ambrosium,
        I: BC_VS_TRANSPORT.airtight,
        B: 'vs_clockwork:propeller_blade'
    }, 'kubejs:vs_transport/clockwork/blade_controller')

    bcVsFactory(event, 'vs_clockwork:juryrigged_propeller_bearing', [
        ' B ',
        'AIA',
        ' M '
    ], {
        B: 'vs_clockwork:blade_controller',
        A: BC_VS_TRANSPORT.ambrosium,
        I: BC_VS_TRANSPORT.airtight,
        M: 'create:mechanical_bearing'
    }, 'kubejs:vs_transport/clockwork/juryrigged_propeller_bearing')

    bcVsFactory(event, 'vs_clockwork:brass_propeller_bearing', [
        ' P ',
        'ABA',
        ' C '
    ], {
        P: BC_VS_TRANSPORT.precision,
        A: BC_VS_TRANSPORT.ambrosium,
        B: 'vs_clockwork:juryrigged_propeller_bearing',
        C: 'create:brass_casing'
    }, 'kubejs:vs_transport/clockwork/brass_propeller_bearing')

    bcVsFactory(event, 'vs_clockwork:phys_bearing', [
        ' T ',
        'AIA',
        ' P '
    ], {
        T: 'create:turntable',
        A: BC_VS_TRANSPORT.aercloud,
        I: BC_VS_TRANSPORT.airtight,
        P: BC_VS_TRANSPORT.precision
    }, 'kubejs:vs_transport/clockwork/phys_bearing')

    bcVsFactory(event, 'vs_clockwork:command_seat', [
        ' W ',
        'LIL',
        'APA'
    ], {
        W: '#minecraft:wool',
        L: 'create:linked_controller',
        I: BC_VS_TRANSPORT.airtight,
        A: BC_VS_TRANSPORT.ambrosium,
        P: BC_VS_TRANSPORT.precision
    }, 'kubejs:vs_transport/clockwork/command_seat')

    bcVsFactory(event, 'vs_clockwork:gas_thruster', [
        'DAD',
        'PIP',
        'DAD'
    ], {
        D: 'vs_clockwork:duct',
        A: BC_VS_TRANSPORT.aerogel,
        P: 'create:propeller',
        I: BC_VS_TRANSPORT.airtight
    }, 'kubejs:vs_transport/clockwork/gas_thruster')

    bcVsFactory(event, 'vs_clockwork:gas_engine', [
        ' D ',
        'AIA',
        ' T '
    ], {
        D: 'vs_clockwork:duct',
        A: BC_VS_TRANSPORT.ambrosium,
        I: BC_VS_TRANSPORT.airtight,
        T: 'create:fluid_tank'
    }, 'kubejs:vs_transport/clockwork/gas_engine')

    console.info('[vs-transport-progression] registered primitive boats, railway land vehicles, and Aether/Airtight flight gates')
})
