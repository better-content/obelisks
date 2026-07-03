// Some outputs are too small, soft, wearable, or interface-like to make sense
// with a whole machine casing embedded in the item. Keep direct casing inputs
// for block-sized machines; route these components through casing-gated
// machine surfaces instead.

var BTM_CASING_AESTHETIC = {
    pressureSeal: 'kubejs:pressure_seal',
    compressorCore: 'kubejs:rotational_compressor_core',
    brassUtilityAssembly: 'kubejs:brass_utility_assembly',
    electricalInstrumentationModule: 'kubejs:electrical_instrumentation_module',
    spaceExpeditionKit: 'kubejs:space_expedition_kit',
    impossibleSupportMatrix: 'kubejs:impossible_support_matrix',
    ironPlate: '#forge:plates/iron',
    brassPlate: '#forge:plates/brass',
    copperPlate: '#forge:plates/copper',
    goldPlate: '#forge:plates/gold',
    zincPlate: '#forge:plates/zinc',
    glass: '#forge:glass',
    redstoneRelay: 'powergrid:redstone_relay',
    circuit: 'powergrid:integrated_circuit',
    electricalGizmo: 'powergrid:electrical_gizmo',
    pcb: 'pneumaticcraft:printed_circuit_board',
    transistor: 'pneumaticcraft:transistor',
    pvc: 'chemlib:polyvinyl_chloride',
    copperChloride: 'chemlib:copper_chloride',
    titaniumOxide: 'chemlib:titanium_oxide'
}

function btmAestheticExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmAestheticIngredientExists(input) {
    if (!input || typeof input !== 'string') return true
    if (input.charAt(0) === '#') return true
    if (input.indexOf(':') < 0) return true
    return btmAestheticExists(input)
}

function btmAestheticCanMake(output, inputs) {
    if (!btmAestheticExists(output)) return false
    for (var i = 0; i < inputs.length; i++) {
        if (!btmAestheticIngredientExists(inputs[i])) return false
    }
    return true
}

function btmAestheticIngredient(input) {
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function btmAestheticStack(input, count) {
    var ingredient = btmAestheticIngredient(input)
    ingredient.type = 'pneumaticcraft:stacked_item'
    ingredient.count = count || 1
    return ingredient
}

function btmAestheticRemove(event, output) {
    event.remove({ output: output })
}

function btmAestheticSequenced(event, id, input, output, count, steps, loops) {
    var inputs = [input]
    for (var i = 0; i < steps.length; i++) {
        if (steps[i] !== 'create:pressing') inputs.push(steps[i])
    }
    if (!btmAestheticCanMake(output, inputs)) return
    btmAestheticRemove(event, output)
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: btmAestheticIngredient(input),
        transitionalItem: { item: 'create:incomplete_precision_mechanism' },
        sequence: steps.map(function (step) {
            if (step === 'create:pressing') {
                return {
                    type: 'create:pressing',
                    ingredients: [{ item: 'create:incomplete_precision_mechanism' }],
                    results: [{ item: 'create:incomplete_precision_mechanism' }]
                }
            }
            return {
                type: 'create:deploying',
                ingredients: [
                    { item: 'create:incomplete_precision_mechanism' },
                    btmAestheticIngredient(step)
                ],
                results: [{ item: 'create:incomplete_precision_mechanism' }]
            }
        }),
        results: [{ item: output, count: count || 1 }],
        loops: loops || 1
    }).id('kubejs:casing_aesthetic/create_sequence/' + id)
}

function btmAestheticPressure(event, id, output, count, pressure, inputs) {
    var ids = inputs.map(function (entry) { return entry.id })
    if (!btmAestheticCanMake(output, ids)) return
    btmAestheticRemove(event, output)
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (entry) { return btmAestheticStack(entry.id, entry.count || 1) }),
        pressure: pressure,
        results: [{ item: output, count: count || 1 }]
    }).id('kubejs:casing_aesthetic/pncr_pressure/' + id)
}

function btmAestheticAssembly(event, program, id, input, output) {
    if (!btmAestheticCanMake(output, [input])) return
    btmAestheticRemove(event, output)
    event.custom({
        type: 'pneumaticcraft:assembly_' + program,
        input: btmAestheticIngredient(input),
        program: program,
        result: { item: output }
    }).id('kubejs:casing_aesthetic/pncr_assembly/' + id)
}

function btmAestheticEnergising(event, id, output, energy, inputs) {
    if (!btmAestheticCanMake(output, inputs)) return
    btmAestheticRemove(event, output)
    global.btmPncrPressure(event, 'kubejs:casing_aesthetic/pncr_pressure/' + id, output, 1, Math.max(1.0, energy / 4000), inputs)
}

function btmAestheticMechanical(event, id, output, pattern, keys) {
    var inputs = []
    for (var key in keys) inputs.push(keys[key])
    if (!btmAestheticCanMake(output, inputs)) return
    btmAestheticRemove(event, output)
    global.btmFactoryCrafting(event, 'kubejs:casing_aesthetic/factory/' + id, output, 1, pattern, keys, { mirrored: true })
}

ServerEvents.recipes(function (event) {
    // Create logistics and display fittings: brass-tier manufacturing should
    // happen on staged Create machines, not by hiding a full brass casing in a
    // funnel, tunnel, link, or interface.
    btmAestheticSequenced(event, 'brass_funnel', 'create:andesite_funnel', 'create:brass_funnel', 1, [
        BTM_CASING_AESTHETIC.brassPlate,
        'create:precision_mechanism',
        'create:pressing'
    ], 1)
    btmAestheticSequenced(event, 'brass_tunnel', 'create:andesite_tunnel', 'create:brass_tunnel', 1, [
        BTM_CASING_AESTHETIC.brassPlate,
        'create:precision_mechanism',
        'create:pressing'
    ], 1)
    btmAestheticSequenced(event, 'smart_chute', 'create:chute', 'create:smart_chute', 1, [
        BTM_CASING_AESTHETIC.redstoneRelay,
        'create:electron_tube',
        'create:pressing'
    ], 1)
    btmAestheticSequenced(event, 'display_link', 'create:electron_tube', 'create:display_link', 1, [
        BTM_CASING_AESTHETIC.redstoneRelay,
        'create:precision_mechanism',
        BTM_CASING_AESTHETIC.brassUtilityAssembly,
        'create:pressing'
    ], 1)
    btmAestheticSequenced(event, 'display_board', 'create:electron_tube', 'create:display_board', 1, [
        BTM_CASING_AESTHETIC.glass,
        'create:precision_mechanism',
        BTM_CASING_AESTHETIC.brassUtilityAssembly,
        'create:pressing'
    ], 2)
    btmAestheticSequenced(event, 'portable_storage_interface', 'create:andesite_funnel', 'create:portable_storage_interface', 1, [
        'create:brass_funnel',
        'create:precision_mechanism',
        BTM_CASING_AESTHETIC.brassPlate,
        'create:pressing'
    ], 1)
    btmAestheticSequenced(event, 'portable_fluid_interface', 'create:fluid_pipe', 'create:portable_fluid_interface', 1, [
        'create:fluid_tank',
        'create:precision_mechanism',
        BTM_CASING_AESTHETIC.brassPlate,
        'create:pressing'
    ], 1)
    btmAestheticSequenced(event, 'stock_link', 'create:electron_tube', 'create:stock_link', 1, [
        BTM_CASING_AESTHETIC.redstoneRelay,
        'create:precision_mechanism',
        BTM_CASING_AESTHETIC.brassUtilityAssembly,
        'create:pressing'
    ], 2)
    btmAestheticSequenced(event, 'stock_ticker', 'create:stock_link', 'create:stock_ticker', 1, [
        'create:display_board',
        BTM_CASING_AESTHETIC.redstoneRelay,
        'create:precision_mechanism',
        'create:pressing'
    ], 2)
    btmAestheticSequenced(event, 'engine_piston', 'create:shaft', 'createdieselgenerators:engine_piston', 1, [
        BTM_CASING_AESTHETIC.ironPlate,
        '#forge:ingots/zinc',
        BTM_CASING_AESTHETIC.brassPlate,
        'create:pressing'
    ], 2)
    btmAestheticSequenced(event, 'portable_fuel_interface', 'create:chute', 'railways:portable_fuel_interface', 1, [
        'create:railway_casing',
        'create:precision_mechanism',
        BTM_CASING_AESTHETIC.brassPlate,
        'create:pressing'
    ], 1)

    // Pressure tubes are manufactured pressure goods. The pressure chamber is
    // already Airtight-casing-gated, so the tube itself should read as sealed
    // metal/plastic, not a block frame.
    btmAestheticPressure(event, 'reinforced_pressure_tube', 'pneumaticcraft:reinforced_pressure_tube', 8, 2.0, [
        { id: 'pneumaticcraft:pressure_tube', count: 4 },
        { id: BTM_CASING_AESTHETIC.pressureSeal, count: 2 },
        { id: 'pneumaticcraft:ingot_iron_compressed', count: 2 }
    ])
    btmAestheticPressure(event, 'advanced_pressure_tube', 'pneumaticcraft:advanced_pressure_tube', 4, 3.0, [
        { id: 'pneumaticcraft:reinforced_pressure_tube', count: 2 },
        { id: BTM_CASING_AESTHETIC.pvc, count: 2 },
        { id: BTM_CASING_AESTHETIC.pressureSeal, count: 2 }
    ])

    // Small electrical fittings are energiser outputs. The energiser block is
    // Electrical-casing-gated, while the parts stay visually wire/coil/gauge
    // sized.
    btmAestheticEnergising(event, 'portable_battery', 'powergrid:portable_battery', 6000, [
        'powergrid:battery',
        'powergrid:capacitor',
        BTM_CASING_AESTHETIC.zincPlate
    ])
    btmAestheticEnergising(event, 'relay', 'powergrid:relay', 4000, [
        'powergrid:wire',
        BTM_CASING_AESTHETIC.redstoneRelay,
        'powergrid:capacitor'
    ])
    btmAestheticEnergising(event, 'relay_dpdt', 'powergrid:relay_dpdt', 6000, [
        'powergrid:relay',
        'powergrid:wire',
        BTM_CASING_AESTHETIC.redstoneRelay
    ])
    btmAestheticEnergising(event, 'current_gauge', 'powergrid:current_gauge', 4000, [
        BTM_CASING_AESTHETIC.glass,
        'powergrid:copper_coil',
        'powergrid:wire'
    ])
    btmAestheticEnergising(event, 'voltage_gauge', 'powergrid:voltage_gauge', 4000, [
        BTM_CASING_AESTHETIC.glass,
        'powergrid:capacitor',
        BTM_CASING_AESTHETIC.redstoneRelay
    ])
    btmAestheticEnergising(event, 'power_gauge', 'powergrid:power_gauge', 6000, [
        'powergrid:current_gauge',
        'powergrid:voltage_gauge',
        'powergrid:wire'
    ])
    btmAestheticEnergising(event, 'device_connector', 'powergrid:device_connector', 5000, [
        'powergrid:wire_connector',
        BTM_CASING_AESTHETIC.circuit,
        BTM_CASING_AESTHETIC.copperPlate
    ])
    btmAestheticEnergising(event, 'heavy_wire_connector', 'powergrid:heavy_wire_connector', 7000, [
        'powergrid:wire_connector',
        'powergrid:conductive_casing',
        BTM_CASING_AESTHETIC.copperPlate
    ])

    // OC2R cards and modules are PCB assembly outputs, not whole computer
    // chassis. PNCR assembly/pressure machines are already Airtight-gated and
    // feed the Circuited economy cleanly.
    btmAestheticPressure(event, 'oc2r_block_operations_module', 'oc2r:block_operations_module', 1, 3.0, [
        { id: 'oc2r:circuit_board' },
        { id: 'oc2r:transistor', count: 2 },
        { id: BTM_CASING_AESTHETIC.circuit }
    ])
    btmAestheticPressure(event, 'oc2r_inventory_operations_module', 'oc2r:inventory_operations_module', 1, 3.0, [
        { id: 'oc2r:circuit_board' },
        { id: 'minecraft:hopper' },
        { id: BTM_CASING_AESTHETIC.circuit }
    ])
    btmAestheticPressure(event, 'oc2r_network_interface_card', 'oc2r:network_interface_card', 1, 3.0, [
        { id: 'oc2r:circuit_board' },
        { id: 'oc2r:network_connector' },
        { id: BTM_CASING_AESTHETIC.circuit }
    ])
    btmAestheticPressure(event, 'oc2r_redstone_interface_card', 'oc2r:redstone_interface_card', 1, 3.0, [
        { id: 'oc2r:circuit_board' },
        { id: BTM_CASING_AESTHETIC.redstoneRelay },
        { id: BTM_CASING_AESTHETIC.circuit }
    ])
    btmAestheticPressure(event, 'oc2r_cpu_tier_2', 'oc2r:cpu_tier_2', 1, 3.5, [
        { id: 'oc2r:circuit_board' },
        { id: 'oc2r:transistor', count: 2 },
        { id: BTM_CASING_AESTHETIC.electricalInstrumentationModule }
    ])
    btmAestheticPressure(event, 'oc2r_hard_drive_large', 'oc2r:hard_drive_large', 1, 3.0, [
        { id: 'oc2r:silicon_wafer', count: 4 },
        { id: 'oc2r:circuit_board' },
        { id: BTM_CASING_AESTHETIC.pcb }
    ])
    btmAestheticPressure(event, 'oc2r_memory_large', 'oc2r:memory_large', 1, 3.0, [
        { id: 'oc2r:silicon_wafer', count: 2 },
        { id: 'oc2r:transistor', count: 2 },
        { id: 'oc2r:circuit_board' },
        { id: BTM_CASING_AESTHETIC.electricalInstrumentationModule }
    ])

    // AE2 addon part/full conversions should spend impossible-tier logic, not
    // an entire impossible casing hidden in a flat interface part.
    btmAestheticMechanical(event, 'expatternprovider_ex_interface_part', 'expatternprovider:ex_interface_part', [
        'SPS',
        'CIC',
        'SPS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        P: 'ae2:capacity_card',
        C: BTM_CASING_AESTHETIC.impossibleSupportMatrix,
        I: 'expatternprovider:ex_interface'
    })
    btmAestheticMechanical(event, 'expatternprovider_oversize_interface_part', 'expatternprovider:oversize_interface_part', [
        'SPS',
        'CIC',
        'SPS'
    ], {
        S: 'kubejs:sky_steel_sheet',
        P: 'ae2:engineering_processor',
        C: BTM_CASING_AESTHETIC.impossibleSupportMatrix,
        I: 'expatternprovider:oversize_interface'
    })

    // Space wearables, packs, and fabric should be sealed and laminated through
    // pressure work. The space machine blocks still consume Space casing, while
    // these pieces inherit the tier through space alloys and pressure systems.
    btmAestheticPressure(event, 'engine_blueprint', 'creatingspace:engine_blueprint', 1, 2.0, [
        { id: 'minecraft:paper', count: 2 },
        { id: BTM_CASING_AESTHETIC.circuit },
        { id: BTM_CASING_AESTHETIC.spaceExpeditionKit }
    ])
    btmAestheticPressure(event, 'power_pack', 'creatingspace:power_pack', 1, 3.0, [
        { id: 'powergrid:battery', count: 2 },
        { id: BTM_CASING_AESTHETIC.electricalGizmo },
        { id: BTM_CASING_AESTHETIC.spaceExpeditionKit }
    ])
    btmAestheticPressure(event, 'exhaust_pack', 'creatingspace:exhaust_pack', 1, 3.0, [
        { id: 'pneumaticcraft:reinforced_pressure_tube', count: 2 },
        { id: BTM_CASING_AESTHETIC.pressureSeal, count: 2 },
        { id: BTM_CASING_AESTHETIC.spaceExpeditionKit }
    ])
    btmAestheticPressure(event, 'copper_oxygen_backtank', 'creatingspace:copper_oxygen_backtank', 1, 3.0, [
        { id: 'pneumaticcraft:small_tank' },
        { id: 'pneumaticcraft:reinforced_pressure_tube', count: 2 },
        { id: BTM_CASING_AESTHETIC.pressureSeal, count: 2 },
        { id: BTM_CASING_AESTHETIC.spaceExpeditionKit }
    ])
    btmAestheticPressure(event, 'netherite_oxygen_backtank', 'creatingspace:netherite_oxygen_backtank', 1, 4.0, [
        { id: 'creatingspace:copper_oxygen_backtank' },
        { id: 'minecraft:netherite_ingot' },
        { id: 'pneumaticcraft:advanced_pressure_tube', count: 2 }
    ])
    btmAestheticPressure(event, 'advanced_spacesuit_fabric', 'creatingspace:advanced_spacesuit_fabric', 2, 4.0, [
        { id: 'creatingspace:basic_spacesuit_fabric', count: 2 },
        { id: 'kubejs:titanium_thermal_plate', count: 2 },
        { id: BTM_CASING_AESTHETIC.titaniumOxide },
        { id: BTM_CASING_AESTHETIC.spaceExpeditionKit }
    ])
})
