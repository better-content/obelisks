// kubejs/startup_scripts/thats_crate.js
// Forge 1.20.1 + KubeJS 2001.6.5-build.16 (Rhino ES5)
// Registers crate blocks/items: kubejs:crate_<basePath>_t01..t16
// Exposes the resolved base list as global.CRATE_BASES (ready after postInit)

var MAX_TIER = 16;

var VANILLA_SIMPLE = [
    'minecraft:cobblestone',
'minecraft:stone',
'minecraft:deepslate',
'minecraft:netherrack',
'minecraft:end_stone',
'minecraft:dirt',
'minecraft:sand',
'minecraft:gravel',
'minecraft:clay',
'minecraft:obsidian',
'minecraft:ice',
'minecraft:packed_ice',
'minecraft:blue_ice',
'minecraft:soul_sand',
'minecraft:soul_soil'
];

var EXTRA = ['minecraft:nether_star'];

var BigInteger = Java.loadClass('java.math.BigInteger');

function itemExists(id) { try { return Item.exists(id); } catch (e) { return false; } }
function idPath(itemId) {
    var s = String(itemId), i = s.indexOf(':');
    return i >= 0 ? s.substring(i + 1) : s;
}
function namespace(itemId) {
    var s = String(itemId), i = s.indexOf(':');
    return i >= 0 ? s.substring(0, i) : 'minecraft';
}
function titleCaseWords(s) {
    var parts = String(s).split('_');
    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        parts[i] = p.length ? (p.charAt(0).toUpperCase() + p.substring(1)) : p;
    }
    return parts.join(' ');
}
function pow9String(tier) { return BigInteger.valueOf(9).pow(tier).toString(); }

function hasAnyInTag(tagId) {
    try {
        var arr = Ingredient.of(tagId).itemIds.toArray()
        return arr && arr.length > 0
    } catch (e) {
        return false
    }
}

function detectNuggetIngotBlockBases() {
    var out = []
    var ingots = Ingredient.of('#forge:ingots').itemIds.toArray()

    for (var i = 0; i < ingots.length; i++) {
        var ingot = String(ingots[i])
        var path = idPath(ingot)
        if (!path.endsWith('_ingot')) continue

            var key = path.substring(0, path.length - '_ingot'.length)

            // Validate by tags, not by item ID naming
            // (These are the canonical Forge conventions)
            var nugTag = '#forge:nuggets/' + key
            var blkTag = '#forge:storage_blocks/' + key

            if (hasAnyInTag(nugTag) && hasAnyInTag(blkTag)) {
                out.push(ingot)
            }
    }

    return out
}


function dedupe(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) {
        var v = String(arr[i]);
        if (seen[v]) continue;
        seen[v] = true;
        out.push(v);
    }
    return out;
}

function buildBaseList() {
    var bases = [];

    // Metals: ingot + nugget + block in same namespace
    var metals = detectNuggetIngotBlockBases();
    for (var i = 0; i < metals.length; i++) bases.push(metals[i]);

    // Simple blocks
    for (var j = 0; j < VANILLA_SIMPLE.length; j++) {
        if (itemExists(VANILLA_SIMPLE[j])) bases.push(VANILLA_SIMPLE[j]);
    }

    // Extras
    for (var k = 0; k < EXTRA.length; k++) {
        if (itemExists(EXTRA[k])) bases.push(EXTRA[k]);
    }

    return dedupe(bases);
}

// Exposed for server_scripts (recipes). Populated after postInit.
global.CRATE_BASES = [];

StartupEvents.postInit(function () {
    global.CRATE_BASES = buildBaseList();
    console.info('[crates] postInit bases=' + global.CRATE_BASES.length);
    if (!global.CRATE_BASES.length) {
        console.warn('[crates] WARNING: base list resolved to 0; check tags (#forge:ingots) and item registry availability');
    }
});

StartupEvents.registry('block', function (event) {
    // Use the same resolver here so the blocks definitely exist even if global.CRATE_BASES is empty at this moment.
    var bases = buildBaseList();
    console.info('[crates] registry bases=' + bases.length);

    for (var bi = 0; bi < bases.length; bi++) {
        var baseId = String(bases[bi]);
        var basePath = idPath(baseId);

        for (var tier = 1; tier <= MAX_TIER; tier++) {
            var tierStr = tier < 10 ? ('0' + tier) : String(tier);

            // registry builder takes PATH (no namespace)
            var crateIdPath = 'crate_' + basePath + '_t' + tierStr;

            var countStr = pow9String(tier);
            var name = 'Crate of ' + countStr + ' of ' + titleCaseWords(basePath);

            event.create(crateIdPath)
            .displayName(name)
            .hardness(0.4)
            .soundType('wood')
            // All crates share tier models (ensure kubejs:block/box_tXX exists)
            .model('kubejs:block/box_t' + tierStr);
        }
    }
});
