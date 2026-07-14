# Performance And Mods

## Active Pack State

Active downloaded mods are the current `mods/*.pw.toml` files. Active custom bundled jars in `mods/` include:

Pinned Valkyrien Skies family diagnostic manifests are active and side `both`:

- Valkyrien Skies `valkyrienskies-120-2.4.11.jar`
- Eureka `eureka-1201-1.6.3.jar`
- VS: Clockwork `clockwork-0.5.6.jar`
- Trackwork `trackwork-1.20.1-1.2.4.jar`

All four mods ship as diagnostic-active surfaces. They do not yet have pack recipes, quests, progression gates, or balance integration. Shoulder Surfing remains removed because its own compatibility warning identifies Valkyrien Skies as incompatible.

- `bcfixes-0.1.0.jar`
- `classselector-1.0.0.jar`
- `computerbridge-0.1.0.jar`
- `create-train-fuel-scaling-0.1.0.jar`
- `create-transmission-loss-0.1.0.jar`
- `dimensiondrink-1.0.0.jar`
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

Disposable runtimes can inherit stale jars from `server-template/`, `server-instance/`, or launcher caches. The supported cleanup surface is `tools/bc build sync ...` plus `tools/bc test smoke`; internal runtime pruning still derives from the staged mod set and server-side client-only exclusions so stale jars are removed before strict runtime claims.

If a runtime dump mentions a mod not present in current manifests or bundled jars, treat it as contaminated until the runtime is rebuilt and pruned.

Current heat authority: `heatsync` owns industrial heat storage, transfer, pipe ambient bridge behavior, hot water, and the coolant exchanger. The former standalone coolant jar and redundant fission reactor jar are retired from the active pack; `latent_chemlib` remains the nuclear/fission authority and emits process heat into HeatSync.

## Memory Findings

Historical profiling showed that strict low-memory targets are profile decisions, not JVM-flag tweaks:

- A useful full-pack shape did not reach a strict 10 GiB peak RSS world-entry target in the old measurements.
- A 6 GiB-class profile required a separate lite pack shape that kept the tech/survival/Blood Magic/AE2/OC2R skeleton and removed broad adventure, magic, decorative, client visual, and model-heavy content.
- Client memory pressure was dominated by model, texture, atlas, and native/render caches more than by one Java heap collection.
- Removing large worldgen/decorative/model surfaces gave larger wins than small JVM adjustments.

Current full-pack work should assume a higher memory budget unless the user explicitly asks for a lite profile. Do not delete active content for memory reasons without a new measured A/B against current manifests.

Current server-side memory attribution lane: `tools/bc test scenario mod_ram_partition --bootstrap-mode once`. It is the supported unattended path for disposable dedicated-server RAM triage against the current mod pool. The lane clones one prepared runtime per branch, removes dependency-closed halves, records `/proc` RSS/HWM plus `jcmd` heap/native-memory summaries, and persists resumable queue/results state under `/tmp/bc-mod-ram-partition` by default. Treat grouped deltas as branch-attribution evidence, not perfect isolated per-jar truth, especially when forced dependency closure removes additional jars beyond the requested seed set.

## C2ME, DH, LC, And TFTH

Current source state keeps C2ME, Distant Horizons, Lost Cities, and The Flesh That Hates active. The focused Lost Cities regression harness entrypoint is `tools/bc test scenario lc_tfth_c2me_dh`. For reusable prepared runtimes, prefer `tools/bc test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once`. This is a targeted diagnostic repro, not part of the default `tools/bc test full` or `tools/bc test full --workspace` coverage.

Historical conclusions to preserve:

- C2ME had real previous watchdog/deadlock risk during login and chunk access.
- Spectator/creative-style fast flight rubberbanding on dedicated servers should be diagnosed as chunk delivery and server tick pressure first when `allow-flight=true` is already present. Fresh logs should be checked for `moved too quickly`, `moved wrongly`, `Can't keep up`, chunk stalls, DH queue pressure, and C2ME no-tick view-distance behavior before attributing it to client controls.
- DH should remain enabled for stability validation rather than being disabled to make the test easier.
- DH server generation request radii must stay constrained. A fresh dedicated runtime with `maxSyncOnLoadRequestDistance = 512` and `maxGenerationRequestDistance = 512` produced a C2ME chunk-read stall during DH `PRE_EXISTING_ONLY` import. Current source state keeps `maxGenerationRequestDistance = 16`, trims `maxSyncOnLoadRequestDistance` to `32`, caps DH per-player upload to `256` KB/s, and enables adaptive transfer speed to reduce client movement rubberbanding while flying on dedicated servers.
- Lost Cities, Twilight Forest, and Fallout Wastelands are routed through Creating Space datapack entries under `kubejs/data/*/creatingspace/rocket_accessible_dimension/`.
- TFTH now has an active manifest/config state; any older claim that no TFTH mod was identified is stale.

Revalidate with the current harness after touching `config/c2me.toml`, `config/DistantHorizons.toml`, `config/bcfixes-common.toml`, Creating Space dimension routes, Lost Cities worldgen, custom worldgen mods, or portable harness logic.

## Valkyrien Skies Family

Valkyrien Skies, Eureka, VS: Clockwork, and Trackwork are active as pinned diagnostic surfaces, not integrated progression content. Current entry points:

```bash
tools/bc test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once
tools/bc test scenario vs_ships_matrix --profile quick --bootstrap-mode once
tools/bc test scenario-headful vs_ships_client --profile quick --bootstrap-mode once
tools/bc test scenario-headful vs_ships_client --profile stress --fixture combined --bootstrap-mode once
tools/bc test scenario-headful vs_ships_release --bootstrap-mode once
```

Use these to classify boot, dependency/mixin, ship assembly, transform/reconnect/restart lifecycle, dimension, C2ME/DH/threading, Flywheel/render, add-on removal, partial-save corruption, client backlog stress, and suspected ship object leaks. They write raw evidence under `/tmp/bc-vs-*`; keep durable conclusions here only after a fresh run. Do not add quests, balance hooks, or progression gates around this family until the stability failure surface is understood.

Current evidence from 2026-07-10: `/tmp/bc-vs-stability-expanded-3cycle` passed three fresh DH-enabled quick lifecycle cycles, and `/tmp/bc-vs-matrix-expanded-direct` passed three paired current-config/DH-disabled boots cloned from identical disposable baselines. The old DH-disabled startup stall did not reproduce with the corrected matrix launcher, so it is not current evidence of a DH-off-only defect.

The source-guided Xvfb lane drives Eureka's exact helm menu and Assemble packet, records server-confirmed assembly and explicit ship translation, and supports core, Clockwork, Trackwork, and combined fixtures. The `vs_ships_release` orchestrator runs the headless lifecycle and isolation matrices, all four current-config client fixtures, and combined DH/C2ME isolation variants. It deliberately excludes mount/camera, controlled movement, and observer-sync automation; those are manual-playtest checks. Server state, transforms, reconnect, and restart lifecycle are authoritative; screenshots and hardware rendering are supplemental. Do not claim the family playable-stable until this release lane passes with fresh evidence.

Current full-family activation evidence from 2026-07-11: `/tmp/bc-vs-full-family-activation` passed a fresh quick server lifecycle with Clockwork and Trackwork registry/component checks, save/restart persistence, removal/unload, and clean shutdown; 37 physics-queue warnings remained non-fatal. `/tmp/bc-vs-combined-activation` then passed combined client preparation, join/render, six-component Eureka assembly, one-ship registration, reconnect visibility, and explicit translation, but failed `mount_movement` because the pilot could not mount the assembled helm. That run is classified `mount_camera_failure`; it also retained Dimension Drink/C2ME far-chunk-write errors for compatibility follow-up. Clockwork bearing actuation and Trackwork propulsion are therefore not yet proven, and `vs_ships_release` remains a blocking gate rather than passing evidence.

Full release evidence from `/tmp/bc-vs-release-all` on 2026-07-11 completed all nine orchestrated lanes. The multi-dimension server lifecycle and all ten isolation variants passed with no crash report, JVM fatal error, dependency/mixin failure, or save corruption. Current full-family startup produced 40 physics-queue warnings; disabling C2ME raised this to 82, and disabling both DH and C2ME raised it to 91. All seven client lanes failed before release acceptance: core and both C2ME-disabled combined fixtures reached assembly/translation but failed helm mounting; Clockwork failed to produce Eureka's assembly packet log; Trackwork was blocked by onboarding; current and DH-disabled combined clients timed out from the server. The timeouts were not client crashes and reproduced without DH. ModernFix also reported wrong-thread reload-listener registration, and Moonlight reported applying its VS forced-crash prevention workaround. Specialized add-on mechanics, observer sync, and restart persistence remain unproven.

After removing automated mount/movement/observer control, `/tmp/bc-vs-release-simplified` completed all nine lanes on 2026-07-12. The server lifecycle and all ten matrix variants again passed. Clockwork, combined C2ME-disabled, and combined DH+C2ME-disabled clients completed assembly, translation, reconnect, and server-restart lifecycle assertions; their only classification was `render_environment_inconclusive` under Xvfb/llvmpipe. Core, Trackwork, combined current, and combined DH-disabled failed before assembly because the software client did not meet the source-fixture visibility score. No crash report or JVM fatal error was produced. The remaining automated blocker is therefore the Xvfb visual oracle, not player-control automation or a reproduced VS-family crash. Client/integrated-server runs now disable ModernFix's integrated-server watchdog in `config/modernfix-mixins.properties` so VS/DH/worldgen backlog experiments do not create misleading 40-second integrated tick failures. A render-thread frame in Thirst or Forge HUD overlay code inside such a dump is only a sampled thread state unless the server thread also points there.

## Custom Mod Notes

Canonical custom mod sources live under `generated/custom-mod-sources`. Use `generated/custom-mod-sources/settlement-roads` for settlement roads unless explicitly told otherwise. `generated/custom-mod-sources/dynamic-trees-dimension-compat` is the canonical `bcdimtrees` source checkout for pack-owned dimension forest Dynamic Trees coverage.

Set `BC_CUSTOM_MODS_DIR` to use a different custom-mod checkout when running validation in another environment.

Prior repairs worth retaining as current expectations:

- Forest generation in fresh server runtimes depends on repo datapacks being present in `world/datapacks`; the current `tools/bc test smoke` path injects source datapacks into disposable server tests before strict validation. `dt_forest_worldgen_fix` disables reliance on Nature's Spirit modified vanilla biome packs and adds explicit Dynamic Trees selectors for vanilla forest biomes. Dark forests remove the vanilla `minecraft:dark_forest_vegetation` feature and replace its huge mushrooms through Dynamic Trees Plus brown/red mushroom species in the dark forest selector. Hyle/Unearthed dirt replacement stays enabled; `bcfixes` registers 37 Unearthed regolith/overgrown surface blocks as Dynamic Trees dirt-like soil aliases. Do not restore Unearthed DT soil-property JSON files, because they make Dynamic Trees expect unregistered `rooty_unearthed_*` blocks during worldgen. Fixed-seed radius-3 evidence from `/tmp/bc-forest-audit-regolith-alias/result-radius3-regolith-on-alias.json`: forest 5280 expected DT branch blocks, old-growth birch 2238, dark forest 1305, and jungle 2369, all with zero missing chunks and all passing. The external DT Nature's Spirit addon still logs bad redwood species growth-logic ids; treat that as an addon bug unless patched in a custom jar.
- Dimension forest coverage now includes CurseForge DT addons for Aether and Twilight Forest plus bundled `bcdimtrees` species/decorator coverage for Undergarden. The removed sky-dimension mod, Finley, and Call From The Depths are no longer active pack content. Current retained radius-2 evidence before this refactor included Aether skyroot grove 154 `dtaether:skyroot_branch`, Twilight dense forest 3528 DT branch blocks, and Undergarden wigglewood 398 `bcdimtrees:wigglewood_branch`; refresh dimension forest evidence after the next worldgen scenario pass.
- `bcfixes` no longer attempts Dynamic Trees fallen-log reconstruction. Dynamic Trees falling trees should remain item-drop only until there is a reconstruction path that produces stable, believable world results rather than sparse misplaced logs.
- Burnt grass compatibility is pack-owned in `bcfixes`. Burnt still hardcodes generic `burnt:burnt_grass` in its spread path, so `bcfixes` now intercepts those final placements for the full pack burnable grass-like source set, keeps native Burnt outputs where they exist, and supplies `bcfixes:burnt_*` variants for the remaining modded surfaces including Unearthed overgrown stone and grassy regolith blocks. The authoritative source list is `generated/custom-mod-sources/better-content-fixes/src/main/resources/data/bcfixes/burnt_grass_replacements.json`, and the generated palette assets come from the paired tool scripts in that module.
- Regolith farming now also lives in `bcfixes`. The pack registers 17 `bcfixes:*_regolith_farmland` blocks matching the Unearthed grassy regolith surface set, hoes grassy regolith directly into those variants when the space above is clear, and makes each farmland revert to its matching plain regolith instead of minting vanilla dirt on dehydration or support failure. The pack-side farmland tag is `#c:farmland`, which now includes vanilla farmland plus the full regolith farmland palette for downstream dirt/farmland consumers such as RBP block categorization.
- `settlementroads` should avoid unbounded tick-time work and clean level-unload state.
- `villagewalls` should cap automatic wall generation work and avoid endless retries for failed village cells.
- `pillagercampaigns` placement and materialization scans should use already-loaded `LevelChunk` data via `getChunkNow`, not blocking `ServerLevel.getHeight` or `getBlockState` calls from chunk-load paths.
- `bcfixes` includes compatibility behavior for C2ME safe-random guard noise around EMI tooltip indexing.
- Worldgen C2ME compatibility fixes now include a pack datapack no-op for PVJ Nether `charred_bones` groundcover, and `dimension_drink_ore_relocation` routes relocated Malum cthonic gold through vanilla `minecraft:ore` instead of Malum's custom cross-chunk writer.
- `bcdimtrees`, `dtmalum`, and `dthexerei` are active Dynamic Trees extension jars in `mods/`; rebuild and run their unit tests and Forge game tests before redeploying them.
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
