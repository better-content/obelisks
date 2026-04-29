// Pack integration gates for custom mods promoted from deferred.
// Keep this Rhino-safe for KubeJS 6.

ServerEvents.recipes(function (event) {
    event.remove({ output: 'liquid_coolant:coolant_exchanger' })

    event.custom({
        type: 'create:mechanical_crafting',
        acceptMirrored: false,
        pattern: [
            'HPFH',
            'BCTB',
            'BTCB',
            'HFPH'
        ],
        key: {
            H: { item: 'create_new_age:heat_pipe' },
            P: { item: 'powergrid:copper_coil' },
            F: { item: 'create:fluid_tank' },
            B: { item: 'create:brass_sheet' },
            C: { item: 'kubejs:power_grid_machine_casing' },
            T: { item: 'create_new_age:heat_pump' }
        },
        result: { item: 'liquid_coolant:coolant_exchanger' }
    }).id('kubejs:create/mechanical_crafting/liquid_coolant/coolant_exchanger')

    event.remove({ output: 'procedural_bouquets:bouquet_grid' })
    event.shaped('procedural_bouquets:bouquet_grid', [
        'SSS',
        'SCS',
        'PAP'
    ], {
        S: '#minecraft:wooden_slabs',
        C: 'wares:cardboard_box',
        P: 'minecraft:stick',
        A: 'create:andesite_casing'
    }).id('kubejs:decor/procedural_bouquets/bouquet_grid')
})
