// Circuit assembly authority.
//
// Upstream processes can prepare wafers, boards, traces, and primitive logic,
// but the finished circuit item should come off the PNCR assembly laser/drill.

function bcCircuitExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcCircuitIngredient(input) {
    if (input.charAt(0) === '#') return { tag: input.substring(1) }
    return { item: input }
}

function bcCircuitAssembly(event, program, id, input, output, count) {
    if (!bcCircuitExists(input) || !bcCircuitExists(output)) return
    event.remove({ output: output })
    event.custom({
        type: 'pneumaticcraft:assembly_' + program,
        input: bcCircuitIngredient(input),
        program: program,
        result: {
            item: output,
            count: count || 1
        }
    }).id('kubejs:circuit_authority/pncr_assembly/' + id)
}

ServerEvents.recipes(function (event) {
     bcCircuitAssembly(event, 'drill', 'pneumaticcraft_printed_circuit_board', 'pneumaticcraft:unassembled_pcb', 'pneumaticcraft:printed_circuit_board', 1)
     bcCircuitAssembly(event, 'laser', 'powergrid_integrated_circuit', 'powergrid:incomplete_circuit', 'powergrid:integrated_circuit', 1)
     bcCircuitAssembly(event, 'laser', 'oc2r_circuit_board', 'pneumaticcraft:printed_circuit_board', 'oc2r:circuit_board', 1)

     bcCircuitAssembly(event, 'laser', 'ae2_logic_processor', 'ae2:printed_logic_processor', 'ae2:logic_processor', 1)
     bcCircuitAssembly(event, 'laser', 'ae2_calculation_processor', 'ae2:printed_calculation_processor', 'ae2:calculation_processor', 1)
     bcCircuitAssembly(event, 'laser', 'ae2_engineering_processor', 'ae2:printed_engineering_processor', 'ae2:engineering_processor', 1)
})
