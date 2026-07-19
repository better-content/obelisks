# TCon Affixes

Forge 1.20.1 mod that adds affixed Tinkers' Construct parts to the global loot pool.

Affixed parts can drop from hostile mobs and appear in chest loot caches. The implementation deliberately keeps the reward surface separate from pack-specific progression or encounter mods.

## Build

Use Java 17 and run:

```sh
./gradlew test reobfJar stageRuntimeJar
```

The deployable reobfuscated jar is written to `build/libs/tconaffixes-<version>.jar`.
