// Explicit manufacturing routes for Chemlib plates used by progression gates.
// Create pressing is available for all listed plates from their ingot tags. TCon casting is
// added only where a molten tag is known/supported; missing molten fluids are documented.

var BC_CHEMLIB_PLATES = [
    { material: 'iridium', plate: 'chemlib:iridium_plate', tcon: true },
    { material: 'osmium', plate: 'chemlib:osmium_plate', tcon: true },
    { material: 'palladium', plate: 'chemlib:palladium_plate', tcon: false },
    { material: 'platinum', plate: 'chemlib:platinum_plate', tcon: true },
    { material: 'rhodium', plate: 'chemlib:rhodium_plate', tcon: false },
    { material: 'ruthenium', plate: 'chemlib:ruthenium_plate', tcon: false },
    { material: 'thorium', plate: 'chemlib:thorium_plate', tcon: false },
    { material: 'uranium', plate: 'chemlib:uranium_plate', tcon: true }
]

function bcChemlibPlateExists(id) {
    try { return Item.exists(id) } catch (e) { return false }
}

function bcChemlibPressing(event, entry) {
    if (!bcChemlibPlateExists(entry.plate)) return
    event.custom({
        type: 'create:pressing',
        conditions: [
            { type: 'forge:not', value: { type: 'forge:tag_empty', tag: 'forge:ingots/' + entry.material } }
        ],
        ingredients: [{ tag: 'forge:ingots/' + entry.material }],
        results: [{ item: entry.plate }]
    }).id('kubejs:create/pressing/chemlib/' + entry.material + '_plate')
}

function bcChemlibCasting(event, entry, consumed) {
    if (!bcChemlibPlateExists(entry.plate)) return
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
    for (var i = 0; i < BC_CHEMLIB_PLATES.length; i++) {
        var entry = BC_CHEMLIB_PLATES[i]
         bcChemlibPressing(event, entry)
        if (entry.tcon) {
             bcChemlibCasting(event, entry, false)
             bcChemlibCasting(event, entry, true)
        }
    }
})
