// KubeJS 6+ / Forge 1.20.1
// Disables vanilla-style boat / chest boat / raft / chest raft crafting.
// Rhino-safe: uses var, arrays, while iterators, no fancy JS.

var BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');

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

        var path = split[1];

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
