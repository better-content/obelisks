LootJS.modifiers(event => {
    event.addBlockLootModifier(/dynamictrees:.*_leaves/)
    .addLoot("minecraft:stick")
    .randomChance(0.5);    // always drops; lower this for actual randomness
});
LootJS.modifiers(event => {
    const m = event.addBlockLootModifier("minecraft:gravel");

    for (let i = 0; i < 3; i++) {
        m.addLoot("minecraft:gunpowder").randomChance(0.25);
        // ~0–3 drops depending on RNG
    }
});
LootJS.modifiers(event => {
    event.addBlockLootModifier(/dtterralith:.*_leaves/)
    .addLoot("minecraft:stick")
    .randomChance(0.5);    // always drops; lower this for actual randomness
});
