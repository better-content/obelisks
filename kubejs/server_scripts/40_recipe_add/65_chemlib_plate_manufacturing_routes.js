// Explicit manufacturing routes for Chemlib plates used by progression gates.
// Create pressing is available for all listed plates from their ingot tags. TCon casting is
// added only where a molten tag is known/supported; missing molten fluids are documented.

var BTM_CHEMLIB_PLATES = [
    { material: 'iridium', plate: 'chemlib:iridium_plate', tcon: true },
    { material: 'osmium', plate: 'chemlib:osmium_plate', tcon: true },
    { material: 'palladium', plate: 'chemlib:palladium_plate', tcon: false },
    { material: 'platinum', plate: 'chemlib:platinum_plate', tcon: true },
    { material: 'rhodium', plate: 'chemlib:rhodium_plate', tcon: false },
    { material: 'ruthenium', plate: 'chemlib:ruthenium_plate', tcon: false },
    { material: 'thorium', plate: 'chemlib:thorium_plate', tcon: false },
    { material: 'uranium', plate: 'chemlib:uranium_plate', tcon: true }
]

function btmChemlibPlateExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function btmChemlibPressing(event, entry) {
    if (!btmChemlibPlateExists(entry.plate)) return
    event.custom({
        type: 'create:pressing',
        conditions: [
            { type: 'forge:not', value: { type: 'forge:tag_empty', tag: 'forge:ingots/' + entry.material } }
        ],
        ingredients: [{ tag: 'forge:ingots/' + entry.material }],
        results: [{ item: entry.plate }]
    }).id('kubejs:create/pressing/chemlib/' + entry.material + '_plate')
}

function btmChemlibCasting(event, entry, consumed) {
    if (!btmChemlibPlateExists(entry.plate)) return
    event.custom({
        type: 'tconstruct:casting_table',
        cast: { tag: consumed ? 'tconstruct:casts/single_use/plate' : 'tconstruct:casts/multi_use/plate' },
        cast_consumed: consumed,
        conditions: [
            { type: 'mantle:tag_filled', tag: 'forge:molten_' + entry.material },
            { type: 'mantle:tag_filled', tag: 'forge:plates/' + entry.material }
        ],
        cooling_time: 80,
        fluid: { amount: 90, tag: 'forge:molten_' + entry.material },
        result: { item: entry.plate }
    }).id('kubejs:tconstruct/casting/chemlib/' + entry.material + '_plate_' + (consumed ? 'sand_cast' : 'gold_cast'))
}

ServerEvents.recipes(function (event) {
    for (var i = 0; i < BTM_CHEMLIB_PLATES.length; i++) {
        var entry = BTM_CHEMLIB_PLATES[i]
        btmChemlibPressing(event, entry)
        if (entry.tcon) {
            btmChemlibCasting(event, entry, false)
            btmChemlibCasting(event, entry, true)
        }
    }
})
