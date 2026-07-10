# Performance And Mods

## Active Pack State

Active downloaded mods are the current `mods/*.pw.toml` files. Active custom bundled jars in `mods/` include:

Pinned Valkyrien Skies diagnostic manifests are active and side `both`:

- Valkyrien Skies `valkyrienskies-120-2.4.11.jar`
- Eureka `eureka-1201-1.6.3.jar`

VS: Clockwork and Trackwork are deferred until the core VS/Eureka client-render gate passes. Shoulder Surfing was removed because its own compatibility warning identifies Valkyrien Skies as incompatible.

- `btmfixes-0.1.0.jar`
- `classselector-1.0.0.jar`
- `computerbridge-0.1.0.jar`
- `create-train-fuel-scaling-0.1.0.jar`
- `create-transmission-loss-0.1.0.jar`
- `dimensionalfonts-1.0.0.jar`
- `dthexerei-1.0.0.jar`
- `dtmalum-1.0.0.jar`
- `heatsync-0.1.0.jar`
- `latent_chemlib-0.1.0.jar`
- `oc2rwireless-1.0.0.jar`
- `pillagercampaigns-0.2.0.jar`
- `procedural_bouquets-0.1.0.jar`
- `realisticores-0.1.0.jar`
- `rpgstats-1.0.0.jar`
- `settlementroads-0.1.0.jar`
- `villagewalls-1.0.0.jar`

Do not infer active state from old RAM cuts or runtime caches. In the current repo, Hexerei, Iron's Spells, Malum, Occultism, Goety, Forbidden and Arcanus, and Reliquary have active manifests. Theurgy, Psi, and Hex Casting do not have active `mods/*.pw.toml` entries and should be treated as inactive/future unless re-added.

## Runtime Pruning

Disposable runtimes can inherit stale jars from `server-template/`, `server-instance/`, or launcher caches. The supported cleanup surface is `tools/btm build sync ...` plus `tools/btm test smoke`; internal runtime pruning still derives from the staged mod set and server-side client-only exclusions so stale jars are removed before strict runtime claims.

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

Current source state keeps C2ME, Distant Horizons, Lost Cities, and The Flesh That Hates active. The focused Lost Cities regression harness entrypoint is `tools/btm test scenario lc_tfth_c2me_dh`. For reusable prepared runtimes, prefer `tools/btm test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once`. This is a targeted diagnostic repro, not part of the default `tools/btm test full` or `tools/btm test full --workspace` coverage.

Historical conclusions to preserve:

- C2ME had real previous watchdog/deadlock risk during login and chunk access.
- Spectator/creative-style fast flight rubberbanding on dedicated servers should be diagnosed as chunk delivery and server tick pressure first when `allow-flight=true` is already present. Fresh logs should be checked for `moved too quickly`, `moved wrongly`, `Can't keep up`, chunk stalls, DH queue pressure, and C2ME no-tick view-distance behavior before attributing it to client controls.
- DH should remain enabled for stability validation rather than being disabled to make the test easier.
- DH server generation request radii must stay constrained. A fresh dedicated runtime with `maxSyncOnLoadRequestDistance = 512` and `maxGenerationRequestDistance = 512` produced a C2ME chunk-read stall during DH `PRE_EXISTING_ONLY` import. Current source state keeps `maxGenerationRequestDistance = 16`, trims `maxSyncOnLoadRequestDistance` to `32`, caps DH per-player upload to `256` KB/s, and enables adaptive transfer speed to reduce client movement rubberbanding while flying on dedicated servers.
- Lost Cities, Twilight Forest, Fallout Wastelands, Finley, and Call From The Depths are routed through Creating Space datapack entries under `kubejs/data/*/creatingspace/rocket_accessible_dimension/`.
- TFTH now has an active manifest/config state; any older claim that no TFTH mod was identified is stale.

Revalidate with the current harness after touching `config/c2me.toml`, `config/DistantHorizons.toml`, `config/btmfixes-common.toml`, Creating Space dimension routes, Lost Cities worldgen, custom worldgen mods, or portable harness logic.

## Valkyrien Skies Family

Valkyrien Skies and Eureka are active as pinned diagnostic surfaces, not integrated progression content. VS: Clockwork and Trackwork remain deferred. Current entry points:

```bash
tools/btm test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once
tools/btm test scenario vs_ships_matrix --profile quick --bootstrap-mode once
tools/btm test scenario-headful vs_ships_client --profile quick --bootstrap-mode once
```

Use these to classify boot, dependency/mixin, ship assembly, movement/collision, save/reload, dimension, C2ME/DH/threading, Flywheel/render, mount/camera, passenger sync, add-on removal, partial-save corruption, and suspected ship object leak failures. They write raw evidence under `/tmp/btm-vs-*`; keep durable conclusions here only after a fresh run. Do not add quests, balance hooks, or progression gates around this family until the stability failure surface is understood.

Current evidence from 2026-07-10: `/tmp/btm-vs-stability-expanded-3cycle` passed three fresh DH-enabled quick lifecycle cycles, and `/tmp/btm-vs-matrix-expanded-direct` passed three paired current-config/DH-disabled boots cloned from identical disposable baselines. The old DH-disabled startup stall did not reproduce with the corrected matrix launcher, so it is not current evidence of a DH-off-only defect.

The source-guided Xvfb lane now drives Eureka's exact 176x166 helm menu and Assemble button, verifies its five-block BFS result, and requires exactly one registered VS ship. Both the current DH-enabled client and `/tmp/btm-vs-core-dh-off-scored` then render no geometry where that ship should be. The scored DH-off repro measured the visible fixture at `0.08176` and the assembled ship at `0.0`, classifying `assembled_render_failure`; this is not a DH-only defect. Movement, mount/camera, reconnect, persisted-ship reload, observer sync, Clockwork, and Trackwork remain gated behind this core render failure. Do not claim playable VS stability yet.

## Custom Mod Notes

Canonical custom mod sources live under `generated/custom-mod-sources`. Use `generated/custom-mod-sources/settlement-roads` for settlement roads unless explicitly told otherwise. `generated/custom-mod-sources/dynamic-trees-dimension-compat` is the canonical `btmdimtrees` source checkout for pack-owned dimension forest Dynamic Trees coverage.

Set `BTM_CUSTOM_MODS_DIR` to use a different custom-mod checkout when running validation in another environment.

Prior repairs worth retaining as current expectations:

- Forest generation in fresh server runtimes depends on repo datapacks being present in `world/datapacks`; the current `tools/btm test smoke` path injects source datapacks into disposable server tests before strict validation. `dt_forest_worldgen_fix` disables reliance on Nature's Spirit modified vanilla biome packs and adds explicit Dynamic Trees selectors for vanilla forest biomes. Dark forests remove the vanilla `minecraft:dark_forest_vegetation` feature and replace its huge mushrooms through Dynamic Trees Plus brown/red mushroom species in the dark forest selector. Hyle/Unearthed dirt replacement stays enabled; `btmfixes` registers 37 Unearthed regolith/overgrown surface blocks as Dynamic Trees dirt-like soil aliases. Do not restore Unearthed DT soil-property JSON files, because they make Dynamic Trees expect unregistered `rooty_unearthed_*` blocks during worldgen. Fixed-seed radius-3 evidence from `/tmp/btm-forest-audit-regolith-alias/result-radius3-regolith-on-alias.json`: forest 5280 expected DT branch blocks, old-growth birch 2238, dark forest 1305, and jungle 2369, all with zero missing chunks and all passing. The external DT Nature's Spirit addon still logs bad redwood species growth-logic ids; treat that as an addon bug unless patched in a custom jar.
- Dimension forest coverage now includes CurseForge DT addons for Aether and Twilight Forest plus bundled `btmdimtrees` species/decorator coverage for Undergarden, Finley, and Call From The Depths. The removed sky-dimension mod is no longer active pack content. Current retained radius-2 evidence before this refactor included Aether skyroot grove 154 `dtaether:skyroot_branch`, Twilight dense forest 3528 DT branch blocks, Undergarden wigglewood 398 `btmdimtrees:wigglewood_branch`, Finley living forest 737 `btmdimtrees:living_wood_branch`, and Call deepforest 587 `btmdimtrees:silent_tree_branch`; refresh dimension forest evidence after the next worldgen scenario pass.
- `btmfixes` no longer attempts Dynamic Trees fallen-log reconstruction. Dynamic Trees falling trees should remain item-drop only until there is a reconstruction path that produces stable, believable world results rather than sparse misplaced logs.
- Burnt grass compatibility is pack-owned in `btmfixes`. Burnt still hardcodes generic `burnt:burnt_grass` in its spread path, so `btmfixes` now intercepts those final placements for the full pack burnable grass-like source set, keeps native Burnt outputs where they exist, and supplies `btmfixes:burnt_*` variants for the remaining modded surfaces including Unearthed overgrown stone and grassy regolith blocks. The authoritative source list is `generated/custom-mod-sources/bound-to-matter-fixes/src/main/resources/data/btmfixes/burnt_grass_replacements.json`, and the generated palette assets come from the paired tool scripts in that module.
- Regolith farming now also lives in `btmfixes`. The pack registers 17 `btmfixes:*_regolith_farmland` blocks matching the Unearthed grassy regolith surface set, hoes grassy regolith directly into those variants when the space above is clear, and makes each farmland revert to its matching plain regolith instead of minting vanilla dirt on dehydration or support failure. The pack-side farmland tag is `#c:farmland`, which now includes vanilla farmland plus the full regolith farmland palette for downstream dirt/farmland consumers such as RBP block categorization.
- `settlementroads` should avoid unbounded tick-time work and clean level-unload state.
- `villagewalls` should cap automatic wall generation work and avoid endless retries for failed village cells.
- `pillagercampaigns` placement and materialization scans should use already-loaded `LevelChunk` data via `getChunkNow`, not blocking `ServerLevel.getHeight` or `getBlockState` calls from chunk-load paths.
- `btmfixes` includes compatibility behavior for C2ME safe-random guard noise around EMI tooltip indexing.
- Worldgen C2ME compatibility fixes now include a pack datapack no-op for PVJ Nether `charred_bones` groundcover, and `meteor_ore_relocation` routes relocated Malum cthonic gold through vanilla `minecraft:ore` instead of Malum's custom cross-chunk writer.
- `btmdimtrees`, `dtmalum`, and `dthexerei` are active Dynamic Trees extension jars in `mods/`; rebuild and run their unit tests and Forge game tests before redeploying them.
- `class-selector` owns the fixed class selection path and spawn lock handoff. `config/classselector/embark.json` is currently set to class mode; keep any inactive embark fallback data small, high-signal, and support-only, and keep spawn-biome selection temperate so the locked-spawn loop starts in intended climates.
- `realisticores` plus Excavated Variants should produce gravel variants for every custom deposit covered by the stone configured features. If deposit ids change in the custom source, regenerate both `defaultresources/excavated_variants/excavated_variants/variants/realisticores.json5` and the matching `datapacks/worldgen_compat_fixes/data/realisticores/worldgen/configured_feature/*_stone.json` overrides.

Rebuild and redeploy custom jars deliberately; then sync, prune, boot, and validate with the relevant harness.

## Heat Authority

Current implementation date: 2026-05-17.

`heatsync` is the pack-owned industrial heat authority. It provides the Forge heat capability, native heat pipe, creative heat/cold sources, coolant exchanger, hot water, coolant data loading, transfer helpers, sync/tooltips, and Cold Sweat ambient bridge behavior.

Create: Power Grid keeps its native electrical and device-overheat simulation. HeatSync provides an optional adapter for Power Grid block entities that expose `ThermalBehaviour`, mapping Power Grid device temperature into the HeatSync capability so HeatSync pipes and exchangers can exchange heat without making Power Grid a second pack heat API.

`latent_chemlib` remains the nuclear and high-energy chemistry authority. Its machines expose HeatSync heat storage and nuclear/process emissions add heat through that capability. Radiation is now an internal event hook owned by `latent_chemlib`, not a dependency on an external reactor API.

PNCR remains separate. Its native heat and thermo-plant recipe semantics should stay PNCR-owned unless an explicit adapter is added for a concrete machine integration.

Retired content: the standalone coolant jar, redundant fission reactor jar, and Create New Age runtime dependency are no longer active pack content. Rebuild disposable runtimes before validating so stale copied jars do not mask missing dependency problems.
