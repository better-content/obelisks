// Latent ChemLib owns chemical cloud containment, high-energy reactions, and
// neutron-economy traversal. Heat transfer uses HeatSync.

ServerEvents.recipes(function (event) {
    global.btmFactoryCrafting(event, 'kubejs:create/assembly/latent_chemlib/gas_capture', 'latent_chemlib:gas_capture', 1, [
        ' V ',
        'ACA',
        ' P '
    ], {
        V: 'create:fluid_valve',
        A: 'kubejs:airtight_machine_casing',
        C: 'kubejs:airtight_fluid_module',
        P: 'pneumaticcraft:reinforced_pressure_tube'
    }, { mirrored: false })

    global.btmFactoryCrafting(event, 'kubejs:create/assembly/latent_chemlib/gas_tank', 'latent_chemlib:gas_tank', 1, [
        'GPG',
        'ACA',
        'GPG'
    ], {
        G: '#forge:glass',
        P: 'heatsync:heat_pipe',
        A: 'kubejs:airtight_machine_casing',
        C: 'latent_chemlib:gas_capture'
    }, { mirrored: false })

    global.btmFactoryCrafting(event, 'kubejs:create/assembly/latent_chemlib/gas_reaction_chamber', 'latent_chemlib:gas_reaction_chamber', 1, [
        'SES',
        'TCT',
        'SPS'
    ], {
        S: 'creatingspace:inconel_sheet',
        E: 'powergrid:electromagnet',
        T: 'latent_chemlib:gas_tank',
        C: 'kubejs:space_machine_casing',
        P: 'powergrid:battery'
    }, { mirrored: false })

    global.btmFactoryCrafting(event, 'kubejs:create/assembly/latent_chemlib/gas_release', 'latent_chemlib:gas_release', 1, [
        ' P ',
        'TCT',
        ' V '
    ], {
        P: 'create:propeller',
        T: 'heatsync:heat_pipe',
        C: 'latent_chemlib:gas_tank',
        V: 'create:fluid_valve'
    }, { mirrored: false })

    global.btmFactoryCrafting(event, 'kubejs:create/assembly/latent_chemlib/sealed_chemical_cell', 'latent_chemlib:sealed_chemical_cell', 4, [
        ' G ',
        'SCS',
        ' P '
    ], {
        G: '#forge:glass',
        S: 'kubejs:pressure_seal',
        C: 'pneumaticcraft:small_tank',
        P: 'heatsync:heat_pipe'
    }, { mirrored: true })
})
