// Hide vanilla-style boats/rafts and their chest variants from JEI/EMI.

var BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')

function btmIsBoatLikePath(path) {
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
    )
}

function btmCollectBoatItems() {
    var found = []
    var keys = BuiltInRegistries.ITEM.keySet().iterator()

    while (keys.hasNext()) {
        var id = String(keys.next())
        var split = id.split(':')

        if (split.length !== 2) continue
        if (!btmIsBoatLikePath(split[1])) continue

        found.push(id)
    }

    return found
}

JEIEvents.hideItems(function (event) {
    var boats = btmCollectBoatItems()
    for (var i = 0; i < boats.length; i++) event.hide(boats[i])
})

if (Platform.isLoaded('emi') && typeof EMIEvents !== 'undefined') {
    EMIEvents.hideItems(function (event) {
        var boats = btmCollectBoatItems()
        for (var i = 0; i < boats.length; i++) event.hide(boats[i])
    })
}
