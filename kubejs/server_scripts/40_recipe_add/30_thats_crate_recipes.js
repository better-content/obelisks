// kubejs/server_scripts/thats_crate_recipes.js
// Packs with Create compacting (all tiers) + unpacks with Create crushing (all tiers).
// Uses global.CRATE_BASES from startup postInit when available; falls back to a tiny proof list.
// Emits loud logs so you can see whether recipes were actually registered.

var MAX_TIER = 8

function itemExists(id) { try { return Item.exists(id) } catch (e) { return false } }
function idPath(itemId) { var s = String(itemId), i = s.indexOf(':'); return i >= 0 ? s.substring(i + 1) : s }

function crateId(baseId, tier) {
    var p = idPath(baseId)
    var t = tier < 10 ? ('0' + tier) : String(tier)
    return 'kubejs:crate_' + p + '_t' + t
}

ServerEvents.recipes(function (event) {
    // Prefer the startup-computed list. It should be populated after postInit.
    var BASES = (global.CRATE_BASES && global.CRATE_BASES.length)
    ? global.CRATE_BASES
    : ['minecraft:cobblestone', 'minecraft:nether_star']

    console.info('[crates] recipes start; bases=' + BASES.length + (BASES === global.CRATE_BASES ? ' (from global.CRATE_BASES)' : ' (FALLBACK)'))

    var addedPack = 0
    var addedUnpack = 0
    var missing = 0

    // Top half tiers should require heat on compacting.
    // For MAX_TIER=8 => tiers 5-8 heated
    var HEATED_FROM_TIER = Math.floor(MAX_TIER / 2) + 1

    for (var bi = 0; bi < BASES.length; bi++) {
        var base = String(BASES[bi])

        for (var tier = 1; tier <= MAX_TIER; tier++) {
            var outId = crateId(base, tier)
            if (!itemExists(outId)) { missing++; continue }

            var inId = (tier === 1) ? base : crateId(base, tier - 1)
            if (!itemExists(inId)) { missing++; continue }

            // PACK: 9x in -> 1x out (Create Compacting)
            var packRecipe = {
                type: "create:compacting",
                ingredients: [
                    { item: inId }, { item: inId }, { item: inId },
                    { item: inId }, { item: inId }, { item: inId },
                    { item: inId }, { item: inId }, { item: inId }
                ],
                results: [{ item: outId }]
            }

            // Add blaze burner heat requirement for top half tiers
            if (tier >= HEATED_FROM_TIER) {
                packRecipe.heatRequirement = "heated"
            }

            event.custom(packRecipe).id('kubejs:crates/pack/' + idPath(base) + '/t' + tier)
            addedPack++

            // UNPACK: 1x out -> 9x in (Create Crushing Wheels only)
            // (Crusher wheels use create:crushing, NOT milling)
            event.custom({
                type: "create:crushing",
                ingredients: [{ item: outId }],
                results: [{ item: inId, count: 9 }]
            }).id('kubejs:crates/unpack/' + idPath(base) + '/t' + tier)

            addedUnpack++
        }
    }

    console.info('[crates] recipes done; pack=' + addedPack + ' unpack=' + addedUnpack + ' skipped(missing items)=' + missing)

    if (addedPack + addedUnpack === 0) {
        console.warn('[crates] WARNING: no recipes registered. Likely crate items are not present (ID mismatch, startup script not running, or assets/registration failure).')
        console.warn('[crates] quick check IDs like: ' + crateId('minecraft:cobblestone', 1))
    }
})
