// Late-tier material economy completion.
//
// Not every valuable component should contain a casing directly. This pass turns
// several electronics, gas-containment, and AE2 precursor parts into outputs of
// machines whose blocks are casing-gated elsewhere.

var BTM_LATE_ECON = {
    searedServiceFitting: 'kubejs:seared_service_fitting',
    andesiteUtilityFrame: 'kubejs:andesite_utility_frame',
    brassControlAssembly: 'kubejs:brass_control_assembly',
    brassUtilityAssembly: 'kubejs:brass_utility_assembly',
    airtightFluidModule: 'kubejs:airtight_fluid_module',
    airtightServiceModule: 'kubejs:airtight_service_module',
    electricalControlModule: 'kubejs:electrical_control_module',
    electricalInstrumentationModule: 'kubejs:electrical_instrumentation_module',
    spaceExpeditionKit: 'kubejs:space_expedition_kit',
    rawImpossibleStorageMatrix: 'kubejs:raw_impossible_storage_matrix',
    aeLogicPackage: 'kubejs:ae_logic_package',
    impossibleSupportMatrix: 'kubejs:impossible_support_matrix',
    sealedCell: 'latent_chemlib:sealed_chemical_cell',
    pressureSeal: 'kubejs:pressure_seal',
    redstoneRelay: 'powergrid:redstone_relay',
    circuit: 'powergrid:integrated_circuit',
    transistor: 'pneumaticcraft:transistor',
    pcb: 'pneumaticcraft:printed_circuit_board',
    siliconDioxide: 'chemlib:silicon_dioxide',
    copperChloride: 'chemlib:copper_chloride',
    aluminumOxide: 'chemlib:aluminum_oxide'
}

function btmLateExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmLateSequenced(event, id, input, transitionalItem, output, loops, steps, bonusResults) {
    if (!btmLateCanMake(output, [input])) return
    event.remove({ output: output })
    var results = [{ item: output }]
    if (bonusResults) {
        for (var i = 0; i < bonusResults.length; i++) results.push(bonusResults[i])
    }
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: input },
        transitionalItem: { item: transitionalItem },
        sequence: steps,
        results: results,
        loops: loops || 1
    }).id('kubejs:late_material_economy/create_sequenced/' + id)
}

function btmLateIngredientExists(input) {
    if (!input || typeof input !== 'string') return true
    if (input.charAt(0) === '#') return true
    if (input.indexOf(':') < 0) return true
    return btmLateExists(input)
}

function btmLateCanMake(output, inputs) {
    if (!btmLateExists(output)) return false
    for (var i = 0; i < inputs.length; i++) if (!btmLateIngredientExists(inputs[i])) return false
    return true
}

function btmLateStack(input, count) {
    if (input.charAt(0) === '#') return { type: 'pneumaticcraft:stacked_item', count: count || 1, tag: input.substring(1) }
    return { type: 'pneumaticcraft:stacked_item', count: count || 1, item: input }
}

function btmLateTconCasting(event, id, output, cast, fluidTag, amount) {
    if (!btmLateCanMake(output, [cast])) return
    event.remove({ output: output })
    event.custom({
        type: 'tconstruct:casting_table',
        cast: { item: cast },
        cast_consumed: false,
        cooling_time: 80,
        fluid: { amount: amount || 90, tag: fluidTag },
        result: { item: output }
    }).id('kubejs:late_material_economy/tconstruct_casting/' + id)
}

function btmLatePressing(event, id, output, input) {
    if (!btmLateCanMake(output, [input])) return
    event.remove({ output: output })
    event.custom({
        type: 'create:pressing',
        ingredients: [{ item: input }],
        results: [{ item: output }]
    }).id('kubejs:late_material_economy/create_pressing/' + id)
}

function btmLatePressure(event, id, output, count, pressure, inputs) {
    var ids = []
    for (var i = 0; i < inputs.length; i++) ids.push(inputs[i].id)
    if (!btmLateCanMake(output, ids)) return
    event.remove({ output: output })
    event.custom({
        type: 'pneumaticcraft:pressure_chamber',
        inputs: inputs.map(function (entry) { return btmLateStack(entry.id, entry.count || 1) }),
        pressure: pressure,
        results: [{ item: output, count: count || 1 }]
    }).id('kubejs:late_material_economy/pncr_pressure/' + id)
}

function btmLateAssembly(event, program, id, input, output) {
    if (!btmLateCanMake(output, [input])) return
    event.remove({ output: output })
    event.custom({
        type: 'pneumaticcraft:assembly_' + program,
        input: input.charAt(0) === '#' ? { tag: input.substring(1) } : { item: input },
        program: program,
        result: { item: output }
    }).id('kubejs:late_material_economy/pncr_assembly/' + id)
}

function btmLateEnergising(event, id, output, energy, inputs) {
    if (!btmLateCanMake(output, inputs)) return
    event.remove({ output: output })
    global.btmPncrPressure(event, 'kubejs:late_material_economy/pncr_pressure/' + id, output, 1, Math.max(1.0, energy / 4000), inputs)
}

function btmLateReplace(event, outputs, oldInputs, newInput) {
    if (!btmLateIngredientExists(newInput)) return
    for (var i = 0; i < outputs.length; i++) {
        if (!btmLateExists(outputs[i])) continue
        for (var j = 0; j < oldInputs.length; j++) event.replaceInput({ output: outputs[i] }, oldInputs[j], newInput)
    }
}

function btmLateShaped(event, output, pattern, keys, id) {
    if (!btmLateExists(output)) return
    for (var key in keys) if (!btmLateIngredientExists(keys[key])) return
    event.remove({ output: output })
    global.btmFactoryCrafting(event, id, output, 1, pattern, keys, true)
}

function btmLateAlchemy(event, id, output, input, syphon, ticks, upgradeLevel) {
    var ids = []
    for (var i = 0; i < input.length; i++) ids.push(input[i].item)
    if (!btmLateCanMake(output, ids)) return
    event.remove({ output: output })
    event.custom({
        type: 'bloodmagic:alchemytable',
        input: input,
        output: { item: output },
        syphon: syphon,
        ticks: ticks,
        upgradeLevel: upgradeLevel
    }).id('kubejs:late_material_economy/blood_alchemy/' + id)
}

ServerEvents.recipes(function (event) {
    btmLateTconCasting(event, 'seared_service_fitting', BTM_LATE_ECON.searedServiceFitting, 'kubejs:seared_machine_casing', 'forge:molten_copper', 90)

    btmLatePressing(event, 'andesite_utility_frame', BTM_LATE_ECON.andesiteUtilityFrame, 'kubejs:andesite_machine_casing')

    btmLateSequenced(event, 'brass_control_assembly', 'create:precision_mechanism', 'create:incomplete_precision_mechanism', BTM_LATE_ECON.brassControlAssembly, 1, [
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: 'create:brass_sheet' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: 'create:electron_tube' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: BTM_LATE_ECON.redstoneRelay }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:pressing',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        }
    ])

    btmLateSequenced(event, 'brass_utility_assembly', 'kubejs:brass_machine_casing', 'create:incomplete_precision_mechanism', BTM_LATE_ECON.brassUtilityAssembly, 1, [
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: 'create:precision_mechanism' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:deploying',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }, { item: 'create:brass_sheet' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        },
        {
            type: 'create:pressing',
            ingredients: [{ item: 'create:incomplete_precision_mechanism' }],
            results: [{ item: 'create:incomplete_precision_mechanism' }]
        }
    ])

    // Gas cells are PNCR-sealed pressure goods, not generic mechanical-crafter parts.
    btmLatePressure(event, 'sealed_chemical_cell', BTM_LATE_ECON.sealedCell, 4, 2.0, [
        { id: 'pneumaticcraft:small_tank' },
        { id: BTM_LATE_ECON.pressureSeal, count: 2 },
        { id: 'heatsync:heat_pipe' },
        { id: '#forge:glass', count: 2 }
    ])

    btmLatePressure(event, 'airtight_fluid_module', BTM_LATE_ECON.airtightFluidModule, 2, 2.5, [
        { id: BTM_LATE_ECON.pressureSeal, count: 2 },
        { id: '#forge:glass' },
        { id: 'pneumaticcraft:pressure_tube' },
        { id: 'pneumaticcraft:small_tank' },
        { id: 'heatsync:heat_pipe' }
    ])

    btmLatePressure(event, 'airtight_service_module', BTM_LATE_ECON.airtightServiceModule, 2, 2.5, [
        { id: 'kubejs:airtight_machine_casing' },
        { id: BTM_LATE_ECON.pressureSeal, count: 2 },
        { id: 'pneumaticcraft:pressure_tube' },
        { id: 'pneumaticcraft:ingot_iron_compressed' },
        { id: '#forge:glass' }
    ])

    // OC2R electronics become authored pressure/assembly outputs before they are
    // consumed by Circuited casing, AE2 processor closure, and programmable blocks.
    btmLatePressure(event, 'oc2r_raw_silicon_wafer', 'oc2r:raw_silicon_wafer', 2, 2.0, [
        { id: BTM_LATE_ECON.siliconDioxide, count: 2 },
        { id: BTM_LATE_ECON.aluminumOxide },
        { id: '#forge:plates/gold' }
    ])
    btmLateAssembly(event, 'laser', 'oc2r_silicon_wafer', 'oc2r:raw_silicon_wafer', 'oc2r:silicon_wafer')
    btmLatePressure(event, 'oc2r_transistor', 'oc2r:transistor', 2, 2.5, [
        { id: 'oc2r:silicon_wafer' },
        { id: BTM_LATE_ECON.transistor },
        { id: BTM_LATE_ECON.redstoneRelay },
        { id: BTM_LATE_ECON.copperChloride }
    ])
    btmLatePressure(event, 'oc2r_circuit_board', 'oc2r:circuit_board', 1, 3.0, [
        { id: BTM_LATE_ECON.pcb },
        { id: BTM_LATE_ECON.circuit },
        { id: 'oc2r:transistor', count: 2 },
        { id: '#forge:plates/gold' }
    ])
    btmLatePressure(event, 'oc2r_bus_cable', 'oc2r:bus_cable', 4, 2.0, [
        { id: 'oc2r:circuit_board' },
        { id: 'powergrid:wire', count: 2 },
        { id: BTM_LATE_ECON.pressureSeal }
    ])
    btmLatePressure(event, 'oc2r_network_connector', 'oc2r:network_connector', 2, 2.5, [
        { id: 'oc2r:bus_cable' },
        { id: 'oc2r:transistor' },
        { id: BTM_LATE_ECON.circuit },
        { id: 'powergrid:wire_connector' }
    ])

    // These are post-electrical power components: energising gives them a native
    // electrical surface instead of leaving them as simple metal/redstone crafts.
    btmLateEnergising(event, 'heating_coil', 'powergrid:heating_coil', 4000, [
        'powergrid:copper_coil',
        BTM_LATE_ECON.electricalInstrumentationModule,
        BTM_LATE_ECON.redstoneRelay
    ])
    btmLateEnergising(event, 'carbon_pile_coil', 'powergrid:carbon_pile_coil', 5000, [
        'powergrid:heating_coil',
        'minecraft:coal',
        BTM_LATE_ECON.redstoneRelay
    ])
    btmLateEnergising(event, 'electromagnet', 'powergrid:electromagnet', 8000, [
        'powergrid:copper_coil',
        'powergrid:heating_coil',
        BTM_LATE_ECON.redstoneRelay
    ])
    btmLateEnergising(event, 'electrical_gizmo', 'powergrid:electrical_gizmo', 12000, [
        BTM_LATE_ECON.circuit,
        'powergrid:electromagnet',
        'powergrid:capacitor'
    ])
    btmLatePressure(event, 'electrical_control_module', BTM_LATE_ECON.electricalControlModule, 1, 3.5, [
        { id: BTM_LATE_ECON.circuit },
        { id: 'powergrid:electrical_gizmo' },
        { id: 'powergrid:battery' },
        { id: 'powergrid:capacitor' }
    ])

    btmLatePressure(event, 'electrical_instrumentation_module', BTM_LATE_ECON.electricalInstrumentationModule, 2, 3.5, [
        { id: 'kubejs:electrical_machine_casing' },
        { id: BTM_LATE_ECON.circuit },
        { id: BTM_LATE_ECON.redstoneRelay },
        { id: 'powergrid:wire' },
        { id: 'pneumaticcraft:printed_circuit_board' }
    ])

    btmLatePressure(event, 'space_expedition_kit', BTM_LATE_ECON.spaceExpeditionKit, 2, 4.5, [
        { id: 'kubejs:space_machine_casing' },
        { id: BTM_LATE_ECON.pressureSeal, count: 2 },
        { id: 'creatingspace:inconel_sheet', count: 2 },
        { id: 'creatingspace:hastelloy_sheet' },
        { id: 'pneumaticcraft:reinforced_pressure_tube' }
    ])

    btmLatePressure(event, 'raw_impossible_storage_matrix', BTM_LATE_ECON.rawImpossibleStorageMatrix, 2, 4.5, [
        { id: 'kubejs:raw_impossible_casing' },
        { id: 'kubejs:sky_steel_sheet', count: 2 },
        { id: 'ae2:engineering_processor' },
        { id: 'ae2:fluix_crystal', count: 2 },
        { id: 'ae2:quartz_glass' }
    ])

    // AE2 processors should cross the programmable-control economy before AE2
    // becomes the dominant logistics authority.
    btmLateReplace(event, [
        'ae2:logic_processor',
        'ae2:calculation_processor',
        'ae2:engineering_processor'
    ], [BTM_LATE_ECON.redstoneRelay, 'minecraft:redstone', '#forge:dusts/redstone'], 'oc2r:transistor')

    btmLateReplace(event, [
        'ae2:annihilation_core',
        'ae2:formation_core',
        'ae2:wireless_receiver',
        'ae2:advanced_card'
    ], [BTM_LATE_ECON.circuit, 'minecraft:redstone', '#forge:dusts/redstone'], 'oc2r:circuit_board')

    // Rocket and gas infrastructure should spend real aerospace subassemblies
    // once those parts exist, not just sheets.
    btmLateReplace(event, ['creatingspace:rocket_engine'], ['creatingspace:inconel_sheet'], 'creatingspace:inconel_engine_wall')
    btmLateReplace(event, ['creatingspace:rocket_engine'], ['creatingspace:rocket_casing'], 'creatingspace:hastelloy_injector_grid')
    btmLateReplace(event, ['creatingspace:rocket_generator'], ['powergrid:electric_motor'], 'powergrid:electrical_gizmo')
    btmLateReplace(event, ['latent_chemlib:gas_reaction_chamber'], ['creatingspace:inconel_sheet'], 'creatingspace:inconel_engine_wall')

    btmLatePressure(event, 'ae_logic_package', BTM_LATE_ECON.aeLogicPackage, 1, 4.5, [
        { id: 'kubejs:sky_steel_sheet', count: 2 },
        { id: 'oc2r:circuit_board' },
        { id: 'ae2:logic_processor' },
        { id: 'kubejs:raw_impossible_casing' }
    ])

    btmLateAlchemy(event, 'impossible_support_matrix', BTM_LATE_ECON.impossibleSupportMatrix, [
        { item: 'kubejs:impossible_machine_casing' },
        { item: 'kubejs:ae_logic_package' },
        { item: 'bloodmagic:etherealslate' },
        { item: 'kubejs:sky_steel_sheet' }
    ], 90000, 240, 5)
})
