# Runtime Validation

## Policy

Raw logs, crash reports, generated worlds, and machine summaries belong in `~/.cache/bc`, disposable runtime roots, `server-instance/`, `server-template/`, or `generated/`. Keep `docs/` to concise conclusions and current operating guidance.

Do not treat stale client/server logs or stale jar caches as evidence. Re-sync or re-bootstrap before making runtime claims.

Generated Markdown reports under `generated/` are temporary evidence products. Fold durable conclusions into these five living docs, then archive the reports under `quarantine/docs/` if they must remain available for archaeology.

## Agent Entry Points

```bash
tools/bc test fast
tools/bc test full
tools/bc test full --workspace
tools/bc test static
tools/bc test runtime --instance /path/to/fresh/runtime
tools/bc test runtime --instance /path/to/fresh/runtime --strict-data-dumps
tools/bc test unearthed-replacement --instance /path/to/fresh/runtime
tools/bc test smoke --server-dir ~/.cache/bc/bc-agent-validate-smoke --port 25565 --reset-runtime
tools/bc graph item minecraft:glass
tools/bc graph route kubejs:seared_machine_casing
tools/bc graph blockers minecraft:bedrock
tools/bc build dumps --server-dir ~/.cache/bc/bc-dump-refresh --port 25565 --reset-runtime
tools/bc test scenario-headful dimension_worldgen --cycles 1 --radius 1 --samples 1 --bootstrap-mode once
tools/bc test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once
tools/bc test scenario mod_ram_partition --bootstrap-mode once
tools/bc test scenario opening_progression --cycles 1 --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile local --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile quick --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile release --bootstrap-mode once
tools/bc test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once
tools/bc test scenario vs_ships_matrix --profile quick --bootstrap-mode once
tools/bc test scenario-headful client_smoke --profile quick --bootstrap-mode once
tools/bc test scenario-headful client_smoke --profile release --bootstrap-mode once
tools/bc test scenario-headful vs_ships_client --profile quick --bootstrap-mode once
tools/bc test scenario-headful vs_ships_client --profile stress --fixture combined --bootstrap-mode once
tools/bc test scenario-headful vs_ships_release --bootstrap-mode once
tools/bc test kotlin
tools/bc doctor env
tools/bc doctor repo
tools/bc doctor runtime --instance /path/to/fresh/runtime
```

- `fast`: root-pack fast lane plus workspace repo `verifyFast` fan-out from `tools/workspace_test_inventory.json`. Use `--repo ID|PATH` to target a subset and `--list-repos` to inspect the resolved order without running commands.
- `full`: root-pack full lane only. This is the default heavier local release-confidence lane.
- `full --workspace`: root-pack full lane plus only inventory repos whose `verifyFull` lane adds distinct signal beyond `fast`.
- `--static`: source plus retained generated-dump checks. No fresh runtime claim.
- `--runtime`: strict validation of an existing fresh runtime's logs and KubeJS audit dumps.
- `--strict-data-dumps`: additionally requires vanilla `/dump` output such as `dump/data_raw/loot_tables`; this is separate from KubeJS audit dumps under `kubejs/config`.
- `--smoke`: fresh disposable server bootstrap, boot, hard-log scan, and strict runtime suite.
- `tools/bc graph ...`: supported retained-runtime graph API for item adjacency, one deterministic progression route, and blocker hints. It requires a current retained `generated/runtime-dumps/recipes.json` and reads progression manifests from `kubejs/config/`.
- `build dumps`: fresh disposable server bootstrap plus refresh of the full retained runtime-dump surface, including direct runtime JSON, retained Burnt coverage tables, functional-block audits, and KubeJS config dumps.
- `tools/bc test scenario` is the supported front door for headless-safe harness-backed runtime scenarios.
- `tools/bc test scenario-headful` is the supported front door for headful harness-backed runtime scenarios.
- `--bootstrap-mode always|once|never` controls scenario/runtime bootstrap reuse. `always` rebuilds each cycle, `once` prepares one reusable runtime per invocation, and `never` requires a prepared runtime and fails fast if it is missing.
- `worldgen_sampling` is the normal worldgen confidence lane.
- `worldgen_marketing_screenshots` defaults to bounded one-shot segments for resilient shader captures. Its large disposable Minecraft runtime defaults to `~/.cache/bc/worldgen-marketing-screenshots` rather than the small `~/.cache/bc` tmpfs; use `--run-root` to override it. It applies screenshot-only prompt suppression, hidden chat, fixed 80-degree FOV, elevated spectator camera anchors to avoid underground-terrain xray captures, a deterministic `locate biome` anchor pass, and a local camera sweep that previews and scores nearby viewpoints before choosing a final frame. The screenshot lane aligns DH render, generation-request, and sync-on-load distances to the same default 32-chunk capture radius; use `--dh-capture-radius` only for explicit experiments. The server pre-capture forceload radius defaults to 3 chunks and is recorded in sidecars/manifests; use `--server-forceload-radius` only for explicit experiments because the earlier 7-chunk region can trip the server watchdog around generation-heavy anchors. Screenshot runtimes disable Cold Sweat's `cold_sweat:biomes` temperature modifier only in the disposable server config because its structure-temperature lookup can synchronously request chunks during distant joins. Earlier experiments with shorter generation/sync distances produced visible LOD holes despite clean UI. Live 2026-07-13 screenshot experiments showed strict 32- and 24-chunk captures timing out on a persistent 32-chunk DH tail, while 16 chunks could produce a visually promising low-tail exploratory frame but still required nonzero DH dwell evidence before publication. Live `locate structure` feature anchoring is available only through explicit `--anchor-search locate-feature`; it is not the default because structure locate can hang the server tick long enough to trip the watchdog under the current Structurify/C2ME stack. The technical gate rejects non-world/prompt-contaminated frames, flat frames, weak depth layering, excessive blank foreground, zero-dwell low-tail captures, and similar non-publishable captures before promotion. Candidate sweeps write per-shot previews and `candidate-report.json` under the generated output tree. Default publishable acceptance now requires a stable DH quiet window; bounded low-tail evidence must be opted into with `--allow-low-tail-dh` and remains review-risky if visual LOD gaps are present. Use `--anchor-search off` to force authored coordinates, `--anchor-search locate-feature` for experimental nearby structure anchors, and `--camera-search off` to force the original authored camera. Accepted technical captures remain pending mandatory vision review.
- `dimension_worldgen` is the explicit all-dimension stress/debug lane.
- `mod_ram_partition` is the dedicated-server mod-pool RAM attribution and rescue-search lane.
- `lc_tfth_c2me_dh` is a diagnostic-only regression repro, not part of `tools/bc test full`.
- `vs_ships_stability`, `vs_ships_matrix`, and `vs_ships_client` are diagnostic-only Valkyrien Skies family failure-surface lanes, not progression or balance integration lanes.
- `worldgen_sampling` and `client_smoke` are versioned scenario lanes with checked-in contracts at `tools/worldgen_sampling_contract.json` and `tools/client_smoke_contract.json`.
- `tools/bc doctor ...` is the supported front door for prerequisite, repo-surface, and runtime-shape checks.
- `tools/bc internal validate-kotlin-tool-surface` fails if active `tools/` contains `.py` or `.sh` files outside `tools/quarantine/`.
- `tools/bc internal validate-lc-tfth-dh-contracts` is a source-level Lost Cities/C2ME/DH guard contract and is included in `tools/bc test static`; it does not launch Minecraft.

Realistic Hands static regressions now cover explicit `bcfixes:realistic_hands/*` tag coverage for primitive loose-earth surfaces, representative knife/sword separation, first-class tool coverage, primitive flint/bone/rock butcher knife and hand axe recipes, Farmer's Delight straw-harvester knife tags, and ore/deepslate hardness probe coverage. The retained runtime hardness assertion currently expects deepslate ore variants at `+1.5` destroy-time over their stone counterparts when `generated/runtime-dumps/block_hardness_probe.json` exists.

Player progression regressions are data-driven by `kubejs/config/player_progression_regression.json` plus the authoritative parenting/acquisition manifests in `kubejs/config/tech_parenting.json`, `magic_parenting.json`, `economy_acquisition.json`, and `surface_registry.json`. `tools/bc internal validate-player-progression-contracts` now checks the primitive tool route, the full machine casing ladder, Blood Magic heart/orb/slate authority, Creating Space dimension routes, reward-surface bypass bans, direct coin-crafting bans, Font coin-only payouts, registered recipe/acquisition surfaces, and parenting coverage for retained craftable outputs. Effective recipe graph route reachability still requires a refreshed strict runtime dump.

Core wood-tag regressions now fail the pack suite when repo-owned risky `minecraft` block/item tags drift, when runtime recipe evidence shows an item-tag consumer without the matching owned item tag, or when representative generic and wood-specific wood recipes disappear or lose their intended wood identity.

Completionist quest validation is part of the pack suite. It parses chapter SNBT quest blocks directly, then compares item tasks, effect source quests, enchantment quests, and plant entries against current runtime/source dumps without broad regex block slicing. This keeps large generated chapter files fast enough to remain in normal validation.

After changing validation entry points or evidence claims, re-run the relevant `tools/bc test ...` modes and confirm the generated validation report still matches the intended evidence level.

## Routine Checks

For normal content work:

```bash
tools/bc doctor env
tools/bc test fast
tools/bc test kotlin
tools/bc doctor repo
```

For runtime-facing content changes:

```bash
tools/bc doctor env
tools/bc test full
```

`tools/bc test full` now covers the routine runtime lanes only: smoke, opening progression, `worldgen_sampling --profile local`, and quick `client_smoke`. It intentionally does not include the Lost Cities repro or all-dimension stress lane.

For workspace-wide full verification:

```bash
tools/bc doctor env
tools/bc test full --workspace
```

For retained runtime dump refresh:

```bash
tools/bc doctor env
tools/bc build dumps --server-dir ~/.cache/bc/bc-dump-refresh --port 25565 --reset-runtime
tools/bc test static
```

`tools/bc build dumps` is the supported front door for rebuilding the repo-carried runtime dump set. It boots a fresh disposable server runtime, waits for the KubeJS dump passes, promotes the runtime outputs back into `generated/runtime-dumps/`, regenerates the retained Burnt coverage and functional-block audit surfaces, and refreshes the retained tag-policy Realistic Hands audit from the new block-hardness probe.

For toolchain/build changes:

```bash
tools/bc doctor env
tools/bc build sync server --dir ~/.cache/bc/bc-sync-server --dry-run
tools/bc build sync client --dir ~/.cache/bc/bc-sync-client --dry-run
tools/bc test kotlin
```

## Runtime Smoke

```bash
tools/bc build sync server --dir server-instance --dry-run
tools/bc build sync server --dir server-instance --apply
tools/bc test smoke --server-dir ~/.cache/bc/bc-content-smoke --port 25565 --reset-runtime
```

`tools/bc test smoke` bootstraps a fresh server, prunes stale runtime mods, boots the server, scans hard log failures, runs the Unearthed replacement regression guard, and runs the strict runtime suite. The guard reads full Overworld Anvil chunks directly and treats Y 64 as the band boundary: below it, vanilla stone-family residue must remain under the bounded geology ratio; at and above it, Unearthed rock replacement and regolith/overgrown surface evidence must both be present while vanilla rock and surface-host ratios remain bounded. It writes `unearthed-replacement-audit.json` into the run evidence directory. `worldgen_sampling` reruns the guard after each Overworld sampling cycle, and the same guard can be run independently with `tools/bc test unearthed-replacement --instance /path/to/fresh/runtime`.

Current guard baseline from `~/.cache/bc/unearthed-comprehensive-smoke` on 2026-07-16 covers 529 full chunks: underground vanilla-rock ratio `0.0000191063`, Y64+ vanilla-rock ratio `0.000247882`, and Y64+ vanilla dirt/grass-family host ratio `0.0260328`; all seven evidence and threshold checks pass.

Current smoke evidence: `~/.cache/bc/content-smoke` passed `tools/bc test smoke --server-dir ~/.cache/bc/content-smoke --port 25565 --reset-runtime` on 2026-07-16 with the reobfuscated RPG Stats death-level snapshot fix deployed; hard runtime checks were clean, with one soft engine/world log-analysis budget overage (`896.36 ms` against `750 ms`). `~/.cache/bc/bc-pc-coin-smoke` passed `tools/bc test smoke --server-dir ~/.cache/bc/bc-pc-coin-smoke --port 25565 --reset-runtime` on 2026-07-09 after rebuilding and restaging `pillagercampaigns-0.2.0.jar` so player kills on campaign followers, captains, and warlords award strength-scaled coin bundles through the bundled runtime artifact. Hard runtime checks were clean with 0 soft findings. `~/.cache/bc/bc-pc-drops-smoke` also passed `tools/bc test smoke --server-dir ~/.cache/bc/bc-pc-drops-smoke --port 25565 --reset-runtime` on 2026-07-09 after rebuilding and restaging `pillagercampaigns-0.2.0.jar` so campaign-spawned pillagers always drop all carried equipment through the bundled runtime artifact. `~/.cache/bc/bc-pc-smoke` also passed `tools/bc test smoke --server-dir ~/.cache/bc/bc-pc-smoke --port 25565 --reset-runtime` on 2026-07-08 after rebuilding and restaging `pillagercampaigns-0.2.0.jar` so loaded-chunk warlords stay anchored and rally drift remains blocked through loaded chunk paths. `~/.cache/bc/bc-content-smoke` also passed `tools/bc test smoke --server-dir ~/.cache/bc/bc-content-smoke --port 25565 --reset-runtime` on 2026-07-06 with `bcdimtrees-0.1.0.jar` restored as a bundled custom jar and `generated/custom-mod-sources/dynamic-trees-dimension-compat` restored as the canonical source checkout. `~/.cache/bc/bc-content-smoke` also passed the same lane on 2026-07-02 after the magic-order, dimension-proof, and late-crafting reauthoring pass; that earlier run's only finding was a soft startup-performance overage for engine/world log analysis (`533.86 ms` against the `250 ms` budget).

## Scenario Harnesses

`tools/bc test scenario` and `tools/bc test scenario-headful` are the supported front doors for portable harness scenarios. Use `scenario` for headless-safe lanes and `scenario-headful` for headful lanes. Scenario runs should create disposable server/client runtimes under `~/.cache/bc` and keep raw evidence there.

VS quick/release lanes delete successful copied runtimes by default after preserving summaries, metrics, logs, screenshots, and registry evidence. Failed runs and brutal profiles retain their runtime/world for diagnosis; use `--keep-runs` to retain successful runtimes explicitly. Server bootstrap also removes its temporary `.bundle-work` export and extraction tree after completion.

Older Prism/server-instance profiling tools that mutate live mod directories or kill broad launcher/java processes are guarded by `BC_ALLOW_LEGACY_LIVE_MUTATION=1`. Use them only for intentional archival profiling; current validation should use disposable runtimes and the portable harness layer.

The supported public tool surface is `tools/bc`. Kotlin-backed `bc test`, `bc build`, `bc doctor`, and `bc internal` flows are the front door. Active repo tooling under `tools/` is Kotlin-first; Python and shell sources live only under `tools/quarantine/original-tools/` as archival compatibility backends while migration remains in progress.

All-dimension worldgen stress:

```bash
tools/bc test scenario-headful dimension_worldgen --cycles 1 --radius 1 --samples 1 --bootstrap-mode once
```

Use this only for explicit cross-dimension worldgen stress/debug, dimension-routing churn, or when `worldgen_sampling` is too narrow for the issue under investigation.

Current clean evidence before the latest dimension removals: `~/.cache/bc/bc-dimension-worldgen/cycle-1` passed `tools/bc test scenario-headful dimension_worldgen --cycles 1` on 2026-07-06, including successful sampled passes through Undergarden, Finley, and Call From The Depths. Finley and Call From The Depths have since been removed from the active pack, the removed sky-dimension mod and End font access remain inactive, and Dimension Drink site spacing changed to 30/9 for roughly double frequency; refresh this scenario evidence after the next full worldgen validation. `~/.cache/bc/bc-dimension-worldgen/20260701-041811` also passed two server-only Overworld cycles with 8 samples at radius 4 after Dimension Drink site generation was moved from biome-modifier feature placement to vanilla structure-set placement. Dimension Drink sites are now ancient interdimensional reliquaries without grave-soil tiles. `~/.cache/bc/bc-dimension-worldgen/20260604-215117` remains the older all-dimension radius-1 baseline. The harness treats C2ME far-chunk writes, DH worldgen exceptions, crash reports, watchdogs, internal disconnects, and C2ME thread-guard failures as fatal.

Current pack mitigation: Quark `Shiba` spawns are disabled in checked-in `config/quark-common.toml` after repeated 2026-07-01 client-side entity metadata desyncs (`field 22`, `Integer` vs `ItemStack`) during normal play.

Current LC/DH/C2ME regression repro:

```bash
tools/bc test scenario lc_tfth_c2me_dh
tools/bc test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once
```

LC/C2ME/DH correctness contract: `tools/bc test static` runs `tools/bc internal validate-lc-tfth-dh-contracts`, which verifies the Lost Cities, TFTH, C2ME, Distant Horizons, and `bcfixes` source contracts without launching Minecraft. The contract checks active manifests/custom jars, parseable `config/c2me.toml`, `config/DistantHorizons.toml`, `config/TFTH.toml`, and `config/TFTH-Data.toml`, Lost Cities Creating Space route ownership, and that the harness compares a guarded control runtime against an unguarded runtime by toggling only `serializeDhC2meFeaturePlacement`.

This lane is now a targeted regression repro for the `bcfixes` Lost Cities serialization guard, not a broad TFTH pressure cycle. Run it after touching C2ME, Distant Horizons, Lost Cities, `bcfixes`, dimension routing, custom worldgen jars, or scenario harness logic:

```bash
tools/bc test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once
```

Expected validation: a guarded Lost Cities-only control runtime passes with no targeted fatal signatures, an otherwise identical unguarded runtime fails with a targeted Lost Cities/C2ME/DH classifier, and the scenario fails as inconclusive if the repro run does not trigger within its fixed sample budget.

Dedicated-server RAM partitioning:

```bash
tools/bc test scenario mod_ram_partition --bootstrap-mode once
tools/bc test scenario mod_ram_partition --bootstrap-mode once --seed-strategy smallest_islands
tools/bc test scenario mod_ram_partition --bootstrap-mode once --seed-strategy balanced_halves --exclude-mod-id distanthorizons
tools/bc test scenario mod_ram_partition --bootstrap-mode once --max-depth 2 --settle-seconds 20 --sample-count 3 --keep-runs
```

This lane prepares one disposable dedicated-server runtime, clones it per branch, and measures steady-state server memory from `/proc/<pid>/status` plus `jcmd` heap/native-memory snapshots. The default `bisect` seed strategy removes dependency-closed halves of the active `mods/` pool and recursively narrows high-signal branches. `--seed-strategy smallest_islands` queues direct dependency-island comparisons, while `balanced_halves` emits and measures one weighted dependency-safe 50/50 split. Repeatable `--exclude-mod-id` values and their reverse mandatory-dependency closure are removed from the baseline and every arm; `balanced-halves.json` records each preflight-validated split. The lane persists `inventory.json`, `dependency-closure.json`, `queue.json`, `results.json`, `resume-state.json`, `summary.json`, and per-branch evidence under its run root so long searches can resume unattended with `--resume`. Successful branches report median `VmRSS` deltas against the current baseline; if the baseline cannot boot at the default 6 GiB heap, the lane retries at 8 GiB and records that the pack exceeded the default envelope. If the full-pack baseline still cannot boot, the lane switches to rescue-mode and searches for small removal sets that restore boot instead of reporting RAM deltas.
The lane now fails fast when the selected run-root filesystem does not meet its free-space floor (`--min-free-gb`, default `3`). If the default cache root is constrained, point `--run-root` at a larger disk-backed path such as `~/.cache/bc/mod-ram-partition`.

Opening progression runtime validation:

```bash
tools/bc test scenario opening_progression --cycles 1 --bootstrap-mode once
```

Expected validation: a fresh disposable pack server boots normally, then the `sam validate_opening_progression` runtime validator proves gravel hand-breakability, hand denial on stone and logs, live flint availability from placed gravel, straw drops from placed tall grass cut with the primitive butcher knife, runtime primitive recipe presence for the butcher knife and hand axe, and first log access with the crafted primitive hand axe.

Worldgen sampling:

```bash
tools/bc test scenario worldgen_sampling --profile quick --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile release --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile local --bootstrap-mode once
```

`local` is the cheapest single-cycle local confidence lane, `quick` is the short seeded Overworld lane, and `release` broadens the dimension set and sample count. All profiles are validated against `tools/worldgen_sampling_contract.json` before the runtime backend starts.
Use `worldgen_sampling` for routine worldgen confidence. Escalate to `dimension_worldgen` only when the issue needs explicit all-dimension stress coverage.

Client smoke:

```bash
tools/bc test scenario-headful client_smoke --profile quick --bootstrap-mode once
tools/bc test scenario-headful client_smoke --profile release --bootstrap-mode once
```

`client_smoke` is a headful-only lane. Its checked-in contract lives at `tools/client_smoke_contract.json`; run it through `scenario-headful` only.

Worldgen marketing screenshots:

```bash
tools/bc test scenario-headful worldgen_marketing_screenshots --start-shot 02-overworld-jungle --end-shot 02-overworld-jungle --anchor-search locate-biome-sweep --run-root /home/dev/.cache/bc/worldgen-marketing-experiment --output-dir generated/cache/worldgen-marketing-experiment --dh-capture-radius 16 --server-forceload-radius 3 --dh-min-settle 60 --dh-quiet 20 --dh-timeout 240 --dh-low-tail-max 48 --dh-low-tail-seconds 30 --allow-low-tail-dh
```

Fresh evidence from 2026-07-13: the jungle rerun produced an accepted current candidate at `generated/cache/worldgen-marketing-experiment/final-corrected/02-overworld-jungle.png` with prompt suppression clean, shader pack active, fixed FOV 80, low-tail-stable DH evidence (`tailChunksLeft=32` for 30 seconds after 90 seconds), and a passing visual sidecar. The lane now supports `--anchor-search locate-biome-sweep`, writes anchor-preview reports, rejects one-sided blank/fog and xray-like frames more aggressively, uses safe elevated anchor probe poses, carries DH/forceload radius through bounded runs, and patches Cold Sweat screenshot overrides idempotently. Earlier failed captures remain debugging evidence, including xray/translucent geometry from unsafe low valley-dive anchors.

Fresh forest/redwood evidence from 2026-07-13: the old `01-overworld-forest` authored capture technically rendered cleanly but was rejected as a marketing candidate because it read as generic canopy/fog, had weak subject separation, and scored only `519.65`. The lane now refuses to promote camera candidates below the publishable score threshold. A redwood retarget (`natures_spirit:redwood_forest`) located deterministic centers at roughly `1472,-1362` and `1568,-1138`, but every safe elevated probe was rejected for low terrain visibility, flat/fog-heavy composition, or low entropy. The sweep now fails closed after bounded unique centers or on locate timeout instead of falling back to weak authored coordinates. This is intentional: current automated forest composition still needs a better target or lower-risk authored scout spot before publication.

Additional composition evidence from 2026-07-13: authored badlands capture at `04-overworld-badlands` reached a valid technical gate (`low-tail-stable`, `tailChunksLeft=32`, fixed FOV 80, prompt suppression clean) and produced `generated/cache/worldgen-marketing-experiment/final-corrected/04-overworld-badlands.png`, but manual visual review failed it because the camera was too close to a vertical cliff, creating xray-like wall/cutaway artifacts and fog-washed basin readability. The sidecar is marked `decision=failed`, and the scoring gate now rejects the same near-terrain-wall signature. Authored `05-overworld-snowy-plains` reached `low-tail-stable` with `tailChunksLeft=16` but every candidate was rejected for blank sky/fog or weak layering, so no final was promoted. Authored `06-overworld-cherry-grove` timed out before capture with `tailChunksLeft=144`, correctly failing the DH gate. These outcomes support keeping authored biome coordinates as evidence only until better manually scouted or structure-aware anchors exist.

VS ships diagnostics:

```bash
tools/bc test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once
tools/bc test scenario vs_ships_matrix --profile quick --bootstrap-mode once
tools/bc test scenario-headful vs_ships_client --profile quick --bootstrap-mode once
tools/bc test scenario-headful vs_ships_client --profile stress --fixture combined --bootstrap-mode once
```

These lanes exercise pinned Valkyrien Skies `valkyrienskies-120-2.4.11.jar`, Eureka `eureka-1201-1.6.3.jar`, VS: Clockwork `clockwork-0.5.6.jar`, and Trackwork `trackwork-1.20.1-1.2.4.jar` as stability-discovery surfaces only; they are not progression content. Shoulder Surfing remains removed as VS-incompatible. Raw evidence stays under `~/.cache/bc/bc-vs-*`. Automated hard assertions cover assembly, transforms, reconnect, restart lifecycle, and server state. Mount/camera, controlled movement, driving, and observer synchronization are manual-playtest checks. Screenshots and hardware rendering are supplemental. Xvfb/llvmpipe or unsupported GLSL runs remain `render_environment_inconclusive`, not confirmed rendering failures and not a reason to discard otherwise valid server-state evidence.

`vs_ships_client --profile stress` keeps the normal headful client lifecycle path, then runs a bounded client backlog phase with far player teleports, server-confirmed ship teleports, screenshots, and connection probes. It records `stress_physics_queue_warnings`, `stress_modernfix_watchdogs`, `stress_disconnects`, sample count, and duration in `metrics.json`/`summary.json`. Physics-frame queue warnings remain diagnostic load evidence; watchdog or disconnect signatures fail the stress phase.

`vs_ships_matrix` mutates only copied disposable runtimes under `~/.cache/bc` and covers core, each add-on, the full family, and DH/C2ME isolation. `vs_ships_release` composes that matrix with release lifecycle runs for core, Clockwork, Trackwork, and combined client fixtures. Do not make these lanes pass by disabling the VS feature family in source.

Current VS evidence from 2026-07-10: `~/.cache/bc/bc-vs-stability-expanded-3cycle` passed three fresh DH-enabled quick cycles. Each cycle completed two dedicated-server boots, registry discovery, component placement, save/reload persistence, removal/unload, and clean shutdown; physics queue warnings remained non-fatal. `~/.cache/bc/bc-vs-matrix-expanded-direct` then passed three paired `current_config` and `dh_disabled` boots cloned from the same disposable baseline. The earlier DH-disabled startup stall did not reproduce under the corrected direct-boot matrix and should be treated as transient or old-harness evidence, not a current DH-on/off difference.

The retained 2026-07-10 evidence covers VS/Eureka only and predates reactivation of Clockwork and Trackwork. It does not establish full-family stability. Fresh `vs_ships_release` evidence is required before a playable-stability claim; until then the four mods remain diagnostic-active and intentionally absent from progression integration.

Fresh activation evidence from 2026-07-11: `~/.cache/bc/bc-vs-full-family-activation` passed the quick full-family server lifecycle, including Clockwork and Trackwork registry/component assertions, save/restart persistence, removal/unload, and clean shutdown. `~/.cache/bc/bc-vs-combined-activation` passed preparation, join/render, combined six-component assembly, registered-ship reconnect, and explicit translation, then failed at `mount_movement` because `AgentPilot` did not mount the helm. The hard classifier is `mount_camera_failure`; repeated Dimension Drink/C2ME far-chunk writes were also captured. Do not claim specialized Clockwork or Trackwork mechanics, observer sync, restart persistence from a real client, or release-gate success from this evidence.

`~/.cache/bc/bc-vs-release-all` completed the full nine-lane release orchestrator on 2026-07-11. Server lifecycle passed across Overworld, Lost Cities, and Earth orbit, and all ten server isolation variants passed. No crash report, JVM fatal error, dependency/mixin failure, or save corruption was produced. All seven release client lanes failed cleanly: `mount_camera_failure` for core and both C2ME-disabled combined fixtures, `menu_packet_failure` for Clockwork, `onboarding_failure` for Trackwork, and network-timeout `client_disconnect_failure` for current and DH-disabled combined fixtures. Disabling DH did not remove the timeout; disabling C2ME allowed combined assembly/translation but did not remove the mount failure. Retained logs also contain Dimension Drink far-chunk writes, ModernFix wrong-thread reload-listener warnings, and Moonlight's VS forced-crash prevention message. The stack remains diagnostic-active and release-blocked.

`~/.cache/bc/bc-vs-release-simplified` reran all nine release lanes on 2026-07-12 after removing automated mount/camera, movement, and observer tests. Server lifecycle and all ten isolation variants passed. Clockwork plus combined C2ME-disabled and DH+C2ME-disabled clients passed all server-authoritative assembly, transform, reconnect, and restart assertions, with only `render_environment_inconclusive` under Xvfb/llvmpipe. Core, Trackwork, combined current, and combined DH-disabled stopped at the source-fixture visibility threshold before assembly. No crash report, JVM fatal error, dependency/mixin failure, or player-control failure occurred. The remaining automated failure is the software-renderer visibility oracle; manual playtests own camera, control, driving, and observer behavior. On 2026-07-14 the source config disabled ModernFix's integrated-server watchdog for client/singleplayer runs because VS physics backlog, DH generation, and heavy worldgen experiments can trip its 40-second integrated tick report without identifying a pack crash. This does not mark the VS family stable; physics-frame queue warnings remain diagnostic evidence, and dedicated-server validation still treats watchdogs/thread dumps as fatal.

Current fresh smoke/runtime evidence: `~/.cache/bc/bc-content-smoke` passed `tools/bc test smoke --server-dir ~/.cache/bc/bc-content-smoke --port 25565 --reset-runtime` and `tools/bc test runtime --instance ~/.cache/bc/bc-content-smoke` on 2026-07-02 after removing unsupported KubeJS startup `.asset(...)` builder calls and restoring the missing `A` key in seven `171_k_turrets_electrical_gates.js` shaped recipes. The fresh runtime now loads all 10 startup scripts and 86 server scripts with 0 KubeJS errors/warnings, and the runtime recipe audit reports no failed recipes.

## Current Follow-Ups

- Confirm Creating Space travel UI and Earth orbit routes to Lost Cities, Twilight Forest, and Fallout Wastelands.
- Validate long settlement-roads and village-walls generation beyond boot/join.
- Confirm Unearthed/Hyle deepslate replacement in fresh terrain.
- Re-run the LC/DH/C2ME guard repro after mod, config, worldgen, or custom jar changes affecting those systems.
- Add deterministic seed sampling for deposits, Y-bands, villages, roads, walls, structures, forageables, and spawn viability, then define acceptable distribution bounds.
- Capture playtest telemetry for time-to-tier, deaths, lookup stalls, travel distance, recovery loops, and player confusion before setting friction budgets.
