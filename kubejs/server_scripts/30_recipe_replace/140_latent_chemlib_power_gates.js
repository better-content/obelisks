// Latent ChemLib owns chemical cloud containment, high-energy reactions, and
// neutron-economy traversal. Heat transfer uses HeatSync.

function btmLatentExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmLatentFactory(event, id, output, count, pattern, keys, mirrored) {
    if (!btmLatentExists(output)) return
    for (var key in keys) {
        var ingredient = keys[key]
        if (ingredient && ingredient.charAt && ingredient.charAt(0) !== '#' && ingredient.indexOf(':') >= 0 && !btmLatentExists(ingredient)) return
    }
    global.btmFactoryCrafting(event, id, output, count, pattern, keys, { mirrored: mirrored })
}

ServerEvents.recipes(function (event) {
    btmLatentFactory(event, 'kubejs:create/assembly/latent_chemlib/gas_capture', 'latent_chemlib:gas_capture', 1, [
        ' V ',
        'ACA',
        ' P '
    ], {
        V: 'create:fluid_valve',
        A: 'kubejs:airtight_machine_casing',
        C: 'kubejs:airtight_fluid_module',
        P: 'pneumaticcraft:reinforced_pressure_tube'
    }, false)

    btmLatentFactory(event, 'kubejs:create/assembly/latent_chemlib/gas_tank', 'latent_chemlib:gas_tank', 1, [
        'GPG',
        'ACA',
        'GPG'
    ], {
        G: '#forge:glass',
        P: 'heatsync:heat_pipe',
        A: 'kubejs:airtight_machine_casing',
        C: 'latent_chemlib:gas_capture'
    }, false)

    btmLatentFactory(event, 'kubejs:create/assembly/latent_chemlib/gas_reaction_chamber', 'latent_chemlib:gas_reaction_chamber', 1, [
        'SES',
        'TCT',
        'SPS'
    ], {
        S: 'creatingspace:inconel_sheet',
        E: 'powergrid:electromagnet',
        T: 'latent_chemlib:gas_tank',
        C: 'kubejs:space_machine_casing',
        P: 'powergrid:battery'
    }, false)

    btmLatentFactory(event, 'kubejs:create/assembly/latent_chemlib/gas_release', 'latent_chemlib:gas_release', 1, [
        ' P ',
        'TCT',
        ' V '
    ], {
        P: 'create:propeller',
        T: 'heatsync:heat_pipe',
        C: 'latent_chemlib:gas_tank',
        V: 'create:fluid_valve'
    }, false)

    btmLatentFactory(event, 'kubejs:create/assembly/latent_chemlib/sealed_chemical_cell', 'latent_chemlib:sealed_chemical_cell', 4, [
        ' G ',
        'SCS',
        ' P '
    ], {
        G: '#forge:glass',
        S: 'kubejs:pressure_seal',
        C: 'pneumaticcraft:small_tank',
        P: 'heatsync:heat_pipe'
    }, true)
})
