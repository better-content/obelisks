function btmRealisticHandsLootSet(values) {
    var out = {}
    if (!values) return out
    for (var i = 0; i < values.length; i++) out[String(values[i])] = true
    return out
}

function btmRealisticHandsAssignments() {
    return global.BTM_REALISTIC_HANDS_ASSIGNMENTS || { outcomeFamilies: {}, items: {} }
}

function btmRealisticHandsKnifePredicate(player) {
    if (!player || !player.mainHandItem) return false
    var assignments = btmRealisticHandsAssignments()
    if (!assignments.__knifeItemSet) assignments.__knifeItemSet = btmRealisticHandsLootSet(assignments.items.knife || [])
    return assignments.__knifeItemSet[String(player.mainHandItem.id)] === true
}

LootJS.modifiers(function (event) {
    var grassSeedDrops = [
        'minecraft:wheat_seeds'
    ]
    var knifeFiber = event.addBlockLootModifier(/^(minecraft:grass|minecraft:tall_grass|projectvibrantjourneys:short_grass)$/)
    knifeFiber.playerPredicate(btmRealisticHandsKnifePredicate)
    for (var i = 0; i < grassSeedDrops.length; i++) knifeFiber.removeLoot(grassSeedDrops[i])
    knifeFiber.addLoot('farmersdelight:straw')
})

LootJS.modifiers(function (event) {
    var knifeLeafs = [
        /dynamictrees:.*_leaves/,
        /dtterralith:.*_leaves/
    ]
    for (var i = 0; i < knifeLeafs.length; i++) {
        var modifier = event.addBlockLootModifier(knifeLeafs[i])
        modifier.playerPredicate(btmRealisticHandsKnifePredicate)
        modifier.addLoot('minecraft:stick').randomChance(0.5)
    }
})
