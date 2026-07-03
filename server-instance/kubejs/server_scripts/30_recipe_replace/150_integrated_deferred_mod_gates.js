// Pack integration gates for custom mods promoted from deferred.
// Keep this Rhino-safe for KubeJS 6.

ServerEvents.recipes(function (event) {
    global.btmFactoryCrafting(event, 'kubejs:decor/procedural_bouquets/bouquet_grid', 'procedural_bouquets:bouquet_grid', 1, [
        'SSS',
        'SCS',
        'PAP'
    ], {
        S: '#minecraft:wooden_slabs',
        C: 'wares:cardboard_box',
        P: 'minecraft:stick',
        A: 'create:andesite_casing'
    }, true)
})
