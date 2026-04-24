// KubeJS 6+ / Forge 1.20.1
// Disables boat / chest boat / raft / chest raft crafting for selected namespaces.
// Rhino-safe: uses var, arrays, while iterators, no fancy JS.

var BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');

var BOAT_NAMESPACES = [
    'minecraft',
'quark',
'undergarden',
'hexerei',
'twilightforest',
'regions_unexplored',
'sophisticatedstorageinmotion',
'forbidden_arcanus',
'malum',
'deeperdarker',
'goety',
'vampirism'
];

function inArray(arr, value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return true;
    }
    return false;
}

function isBoatLikePath(path) {
    return (
        path === 'boat' ||
        path === 'chest_boat' ||
        path === 'raft' ||
        path === 'chest_raft' ||
        path.endsWith('_boat') ||
        path.endsWith('_chest_boat') ||
        path.endsWith('_raft') ||
        path.endsWith('_chest_raft') ||
        path.indexOf('boat_with_chest') !== -1 ||
        path.indexOf('raft_with_chest') !== -1
    );
}

function collectBoatItems() {
    var found = [];
    var keys = BuiltInRegistries.ITEM.keySet().iterator();

    while (keys.hasNext()) {
        var id = String(keys.next());
        var split = id.split(':');

        if (split.length !== 2) continue;

        var namespace = split[0];
        var path = split[1];

        if (!inArray(BOAT_NAMESPACES, namespace)) continue;
        if (!isBoatLikePath(path)) continue;

        found.push(id);
    }

    return found;
}

ServerEvents.recipes(function (event) {
    var boats = collectBoatItems();

    for (var i = 0; i < boats.length; i++) {
        event.remove({ output: boats[i] });
        console.log('[KubeJS] Removed boat recipe output: ' + boats[i]);
    }

    console.log('[KubeJS] Total boat-like recipe outputs removed: ' + boats.length);
});
