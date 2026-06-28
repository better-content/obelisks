# Performance And Mods

## Active Pack State

Active downloaded mods are the current `mods/*.pw.toml` files. Active custom bundled jars in `mods/` include:

- `btmfixes-0.1.0.jar`
- `classselector-1.0.0.jar`
- `computerbridge-0.1.0.jar`
- `create-transmission-loss-0.1.0.jar`
- `dthexerei-1.0.0.jar`
- `dtmalum-1.0.0.jar`
- `heatsync-0.1.0.jar`
- `latent_chemlib-0.1.0.jar`
- `dimensionalfonts-1.0.0.jar`
- `pillagercampaigns-0.2.0.jar`
- `procedural_bouquets-0.1.0.jar`
- `realisticores-0.1.0.jar`
- `rpgstats-1.0.0.jar`
- `settlementroads-0.1.0.jar`
- `villagewalls-1.0.0.jar`

Do not infer active state from old RAM cuts or runtime caches. In the current repo, Botania, Hexerei, Iron's Spells, Malum, Occultism, Goety, Forbidden and Arcanus, and Reliquary have active manifests. Theurgy, Psi, and Hex Casting do not have active `mods/*.pw.toml` entries and should be treated as inactive/future unless re-added.

## Runtime Pruning

Disposable runtimes can inherit stale jars from `server-template/`, `server-instance/`, or launcher caches. `tools/prune_runtime_mods.mjs` is wired into `tools/bootstrap_server.sh` to remove jars not expected from active manifests plus bundled jars, while also respecting server-side client-only exclusions from `tools/_runtime_common.sh`.

If a runtime dump mentions a mod not present in current manifests or bundled jars, treat it as contaminated until the runtime is rebuilt and pruned.

Current heat authority: `heatsync` owns industrial heat storage, transfer, pipe ambient bridge behavior, hot water, and the coolant exchanger. The former standalone coolant jar and redundant fission reactor jar are retired from the active pack; `latent_chemlib` remains the nuclear/fission authority and emits process heat into HeatSync.

## Memory Findings

Historical profiling showed that strict low-memory targets are profile decisions, not JVM-flag tweaks:

- A useful full-pack shape did not reach a strict 10 GiB peak RSS world-entry target in the old measurements.
- A 6 GiB-class profile required a separate lite pack shape that kept the tech/survival/Blood Magic/AE2/OC2R skeleton and removed broad adventure, magic, decorative, client visual, and model-heavy content.
- Client memory pressure was dominated by model, texture, atlas, and native/render caches more than by one Java heap collection.
- Removing large worldgen/decorative/model surfaces gave larger wins than small JVM adjustments.

Current full-pack work should assume a higher memory budget unless the user explicitly asks for a lite profile. Do not delete active content for memory reasons without a new measured A/B against current manifests.

## C2ME, DH, LC, And TFTH

Current source state keeps C2ME, Distant Horizons, Lost Cities, and The Flesh That Hates active. The focused stability harness is `tools/lc_tfth_c2me_dh_stability.py`.

Historical conclusions to preserve:

- C2ME had real previous watchdog/deadlock risk during login and chunk access.
- DH should remain enabled for stability validation rather than being disabled to make the test easier.
- DH server generation request radii must stay constrained. A fresh dedicated runtime with `maxSyncOnLoadRequestDistance = 512` and `maxGenerationRequestDistance = 512` produced a C2ME chunk-read stall during DH `PRE_EXISTING_ONLY` import; `64` sync and `16` generation kept DH active and booted cleanly with zero incomplete DH generation tasks on shutdown.
- Lost Cities, Twilight Forest, Fallout Wastelands, Finley, and Call From The Depths are routed through Creating Space datapack entries under `kubejs/data/*/creatingspace/rocket_accessible_dimension/`.
- TFTH now has an active manifest/config state; any older claim that no TFTH mod was identified is stale.

Revalidate with the current harness after touching `config/c2me.toml`, `config/DistantHorizons.toml`, Creating Space dimension routes, TFTH config, custom worldgen mods, or portable harness logic.

## Custom Mod Notes

Canonical custom mod sources live under `generated/custom-mod-sources`. Use `generated/custom-mod-sources/settlement-roads` for settlement roads unless explicitly told otherwise.

Set `BTM_CUSTOM_MODS_DIR` to use a different custom-mod checkout when running validation in another environment.

Prior repairs worth retaining as current expectations:

- Forest generation in fresh server runtimes depends on repo datapacks being present in `world/datapacks`; `tools/bootstrap_server.sh` now injects source datapacks there for disposable server tests. `dt_forest_worldgen_fix` disables reliance on Nature's Spirit modified vanilla biome packs and adds explicit Dynamic Trees selectors for vanilla forest biomes. Dark forests remove the vanilla `minecraft:dark_forest_vegetation` feature and replace its huge mushrooms through Dynamic Trees Plus brown/red mushroom species in the dark forest selector. Hyle/Unearthed dirt replacement stays enabled; `btmfixes` registers 37 Unearthed regolith/overgrown surface blocks as Dynamic Trees dirt-like soil aliases. Do not restore Unearthed DT soil-property JSON files, because they make Dynamic Trees expect unregistered `rooty_unearthed_*` blocks during worldgen. Fixed-seed radius-3 evidence from `/tmp/btm-forest-audit-regolith-alias/result-radius3-regolith-on-alias.json`: forest 5280 expected DT branch blocks, old-growth birch 2238, dark forest 1305, and jungle 2369, all with zero missing chunks and all passing. The external DT Nature's Spirit addon still logs bad redwood species growth-logic ids; treat that as an addon bug unless patched in a custom jar.
- Dimension forest coverage now includes CurseForge DT addons for Aether and Twilight Forest plus bundled `btmdimtrees` species/decorator coverage for Blue Skies, Undergarden, Finley, and Call From The Depths. Current radius-2 harness evidence: Aether skyroot grove 154 `dtaether:skyroot_branch`, Twilight dense forest 3528 DT branch blocks, Blue Skies sunset maple 1114 `btmdimtrees:maple_branch`, Undergarden wigglewood 398 `btmdimtrees:wigglewood_branch`, Finley living forest 737 `btmdimtrees:living_wood_branch`, and Call deepforest 587 `btmdimtrees:silent_tree_branch`.
- `settlementroads` should avoid unbounded tick-time work and clean level-unload state.
- `villagewalls` should cap automatic wall generation work and avoid endless retries for failed village cells.
- `pillagercampaigns` placement and materialization scans should use already-loaded `LevelChunk` data via `getChunkNow`, not blocking `ServerLevel.getHeight` or `getBlockState` calls from chunk-load paths.
- `btmfixes` includes compatibility behavior for C2ME safe-random guard noise around EMI tooltip indexing.
- Worldgen C2ME compatibility fixes now include a pack datapack no-op for PVJ Nether `charred_bones` groundcover, and `meteor_ore_relocation` routes relocated Malum cthonic gold through vanilla `minecraft:ore` instead of Malum's custom cross-chunk writer.
- `dtmalum` and `dthexerei` are the Dynamic Trees extension jars for Malum and Hexerei; rebuild and run both their unit tests and Forge game tests before redeploying either jar.
- `class-selector` owns the embark point-buy path and spawn lock handoff. Keep `config/classselector/embark.json` broad but support-only, and keep spawn-biome selection temperate so the locked-spawn loop starts in intended climates.
- `realisticores` plus Excavated Variants should produce gravel variants for every custom deposit covered by the stone configured features. If deposit ids change in the custom source, regenerate both `defaultresources/excavated_variants/excavated_variants/variants/realisticores.json5` and the matching `datapacks/worldgen_compat_fixes/data/realisticores/worldgen/configured_feature/*_stone.json` overrides.

Rebuild and redeploy custom jars deliberately; then sync, prune, boot, and validate with the relevant harness.

## Heat Authority

Current implementation date: 2026-05-17.

`heatsync` is the pack-owned industrial heat authority. It provides the Forge heat capability, native heat pipe, creative heat/cold sources, coolant exchanger, hot water, coolant data loading, transfer helpers, sync/tooltips, and Cold Sweat ambient bridge behavior.

Create: Power Grid keeps its native electrical and device-overheat simulation. HeatSync provides an optional adapter for Power Grid block entities that expose `ThermalBehaviour`, mapping Power Grid device temperature into the HeatSync capability so HeatSync pipes and exchangers can exchange heat without making Power Grid a second pack heat API.

`latent_chemlib` remains the nuclear and high-energy chemistry authority. Its machines expose HeatSync heat storage and nuclear/process emissions add heat through that capability. Radiation is now an internal event hook owned by `latent_chemlib`, not a dependency on an external reactor API.

PNCR remains separate. Its native heat and thermo-plant recipe semantics should stay PNCR-owned unless an explicit adapter is added for a concrete machine integration.

Retired content: the standalone coolant jar, redundant fission reactor jar, and Create New Age runtime dependency are no longer active pack content. Rebuild disposable runtimes before validating so stale copied jars do not mask missing dependency problems.
