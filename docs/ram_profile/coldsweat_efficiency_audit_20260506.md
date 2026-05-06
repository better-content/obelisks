# Cold Sweat Efficiency Audit - 2026-05-06

## Scope

Audit target:

- `ColdSweat-2.4.jar`
- `fiahi-3.1.6.jar`
- installed pack configs under `config/coldsweat/` and `config/fiahi-common.toml`
- Cold Sweat source branch `1.20.1-FG` cloned to `/tmp/cold-sweat-audit`

This audit follows the joined server/client RAM and watchdog diagnostics in:

- `docs/ram_profile/joined_ram_cross_section_20260506.md`

## Finding

Cold Sweat's normal player temperature system is not the main efficiency problem. It uses modifier tick rates and the pack config sets:

- `config/coldsweat/main.toml`: `Modifier Tick Rate = 0.1`

The inefficient path is the integration API usage by FIAHI.

FIAHI scans loaded block entities and calls Cold Sweat's exact uncached temperature API once per container:

```text
ForgeEventHandler.tickContainer(...)
  -> WorldHelper.getTemperatureAt(level, pos)
```

This happens before FIAHI checks whether the container slots actually contain frozen/rotten food capability stacks.

## Evidence

FIAHI `onLevelTick` behavior from `fiahi-3.1.6.jar` bytecode:

- runs on server level tick end
- throttles overworld scans with `TEMPERATURE_CHECKER_INTERVAL = 120`
- iterates visible/loaded chunks through `ServerChunkCache.chunkMap.getChunks()`
- copies each chunk block entity map
- visits each block entity
- for container block entities, calls `tickContainer`
- `tickContainer` calls `WorldHelper.getTemperatureAt(level, pos)` before slot inspection

Relevant pack FIAHI config:

```toml
ENABLE_FROZEN = true
ENABLE_ROTTEN = true
TEMPERATURE_CHECKER_INTERVAL = 120
STABLE_TEMPERATURE_CONTAINERS = ["cold_sweat:boiler", "cold_sweat:icebox"]
```

Cold Sweat has two relevant APIs:

```java
WorldHelper.getTemperatureAt(Level level, BlockPos pos)
WorldHelper.getRoughTemperatureAt(Level level, BlockPos pos, int flags)
```

`getTemperatureAt`:

- uses a `DummyPlayer`
- moves it to the requested position
- copies player-grade world temperature modifiers
- calls `Temperature.apply(..., true)`
- does not use the rough temperature cache

`getRoughTemperatureAt`:

- uses a `DummyEntity`
- caches by dimension and 8-block segment
- reuses values for 1000 ticks normally, or 200 ticks with the sensitive flag
- uses reduced sample/range defaults compared with the player dummy path

Cold Sweat `WorldHelper.getStructureAt` uses:

```java
level.getChunk(sectionpos.x(), sectionpos.z(), ChunkStatus.STRUCTURE_STARTS)
```

That can force or await chunk work. This is consistent with the watchdog stack involving Cold Sweat biome temperature calculation and C2ME chunk wait code.

## Cost Centers

`BiomeTempModifier`:

- exact dummy player path uses player-grade samples, commonly 49
- samples nearby biomes through `level.getBiomeManager().getBiome(blockPos)`
- checks structure temperature first through `WorldHelper.getStructureAt`

`BlockTempModifier`:

- pack config has `Block Range = 7`
- exact player path scans roughly `14 * 14 * 14 = 2744` block positions per calculation
- uses block-state cache per modifier instance, cleared per calculation
- raycasts from player/dummy to temperature-affecting blocks
- keeps a small chunk cache inside the modifier instance

Pack config makes block temperature meaningful because `world.toml` adds heat sources such as Create blaze burners, Farmer's Delight stove, and Tinkers blocks. That is useful gameplay data, but it makes broad exact temperature scans more expensive.

## Interpretation

The joined-client A/B data showed:

- removing FIAHI alone was neutral or worse for retained RSS
- removing Cold Sweat plus FIAHI saved about 1962 MiB in the tested run
- a failed run produced a watchdog stack through FIAHI `tickContainer` and Cold Sweat `WorldHelper.getTemperatureAt`

This means FIAHI is probably not the retained heap owner by itself. FIAHI is the trigger pattern that repeatedly exercises Cold Sweat's expensive exact temperature API across loaded containers.

The root design problem is eager world scanning:

```text
loaded chunks -> every block entity -> every container -> exact Cold Sweat temperature -> then inspect slots
```

That scales with loaded world/container count, not with actual food movement or food visibility.

## Recommended Fix Direction

Replace FIAHI-style eager scanning with a lazy food spoilage/freezing mod.

Recommended architecture:

- store `last_checked_time` on food item stacks
- store `last_checked_temp` on food item stacks
- update when food is moved, inserted, extracted, opened, visualized, hovered, eaten, or otherwise interacted with
- compute elapsed time since the last check
- sample current ambient temperature at the food's current context
- use the average of previous and current temperature over elapsed duration
- convert to rotten/frozen when thresholds are crossed

Temperature sampling should prefer:

```java
WorldHelper.getRoughTemperatureAt(level, pos)
```

or an internal cache with similar granularity. It should not bulk-call:

```java
WorldHelper.getTemperatureAt(level, pos)
```

## Short-Term Mitigation Options

If FIAHI must remain temporarily:

1. Skip Cold Sweat temperature lookup unless a container slot contains a FIAHI food capability stack.
2. Replace `WorldHelper.getTemperatureAt` with `WorldHelper.getRoughTemperatureAt`.
3. Cache sampled temperature by dimension and 8-block or chunk segment.
4. Cap container processing per tick/interval.
5. Avoid scanning all loaded block entities when no player-facing interaction occurred.

These are mitigations, not the preferred final design.

## Conclusion

Cold Sweat is expensive when asked for exact arbitrary-position temperatures in bulk. Its normal player temperature path is comparatively controlled by tick rates and config.

FIAHI uses Cold Sweat in the worst possible shape for this pack: background scanning all loaded containers and forcing exact temperature calculations before knowing if the container matters.

The final pack should replace FIAHI with the proposed lazy stack-state system rather than trying to tune global Cold Sweat configs down.
