// Baseline combat income belongs to pack content, not to any encounter mod.
// DamageSource.entity credits both direct player kills and player-fired projectiles.
EntityEvents.death(function (event) {
    var victim = event.entity
    var killer = event.source.entity

    if (victim.isPlayer() || !killer || !killer.isPlayer()) {
        return
    }

    victim.spawnAtLocation(Item.of('createdeco:copper_coin'))
})
