# Runtime Validation

## Policy

Raw logs, crash reports, generated worlds, and machine summaries belong in `/tmp`, disposable runtime roots, `server-instance/`, `server-template/`, or `generated/`. Keep `docs/` to concise conclusions and current operating guidance.

Do not treat stale client/server logs or stale jar caches as evidence. Re-sync or re-bootstrap before making runtime claims.

Generated Markdown reports under `generated/` are temporary evidence products. Fold durable conclusions into these five living docs, then archive the reports under `quarantine/docs/` if they must remain available for archaeology.

## Agent Entry Points

```bash
tools/btm test fast
tools/btm test full
tools/btm test full --workspace
tools/btm test static
tools/btm test runtime --instance /path/to/fresh/runtime
tools/btm test runtime --instance /path/to/fresh/runtime --strict-data-dumps
tools/btm test smoke --server-dir /tmp/btm-agent-validate-smoke --port 25565 --reset-runtime
tools/btm graph item minecraft:glass
tools/btm graph route kubejs:seared_machine_casing
tools/btm graph blockers minecraft:bedrock
tools/btm build dumps --server-dir /tmp/btm-dump-refresh --port 25565 --reset-runtime
tools/btm test scenario-headful dimension_worldgen --cycles 1 --radius 1 --samples 1 --bootstrap-mode once
tools/btm test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once
tools/btm test scenario opening_progression --cycles 1 --bootstrap-mode once
tools/btm test scenario worldgen_sampling --profile local --bootstrap-mode once
tools/btm test scenario worldgen_sampling --profile quick --bootstrap-mode once
tools/btm test scenario worldgen_sampling --profile release --bootstrap-mode once
tools/btm test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once
tools/btm test scenario vs_ships_matrix --profile quick --bootstrap-mode once
tools/btm test scenario-headful client_smoke --profile quick --bootstrap-mode once
tools/btm test scenario-headful client_smoke --profile release --bootstrap-mode once
tools/btm test scenario-headful vs_ships_client --profile quick --bootstrap-mode once
tools/btm test scenario-headful vs_ships_release --bootstrap-mode once
tools/btm test kotlin
tools/btm doctor env
tools/btm doctor repo
tools/btm doctor runtime --instance /path/to/fresh/runtime
```

- `fast`: root-pack fast lane plus workspace repo `verifyFast` fan-out from `tools/workspace_test_inventory.json`. Use `--repo ID|PATH` to target a subset and `--list-repos` to inspect the resolved order without running commands.
- `full`: root-pack full lane only. This is the default heavier local release-confidence lane.
- `full --workspace`: root-pack full lane plus only inventory repos whose `verifyFull` lane adds distinct signal beyond `fast`.
- `--static`: source plus retained generated-dump checks. No fresh runtime claim.
- `--runtime`: strict validation of an existing fresh runtime's logs and KubeJS audit dumps.
- `--strict-data-dumps`: additionally requires vanilla `/dump` output such as `dump/data_raw/loot_tables`; this is separate from KubeJS audit dumps under `kubejs/config`.
- `--smoke`: fresh disposable server bootstrap, boot, hard-log scan, and strict runtime suite.
- `tools/btm graph ...`: supported retained-runtime graph API for item adjacency, one deterministic progression route, and blocker hints. It requires a current retained `generated/runtime-dumps/recipes.json` and reads progression manifests from `kubejs/config/`.
- `build dumps`: fresh disposable server bootstrap plus refresh of the full retained runtime-dump surface, including direct runtime JSON, retained Burnt coverage tables, functional-block audits, and KubeJS config dumps.
- `tools/btm test scenario` is the supported front door for headless-safe harness-backed runtime scenarios.
- `tools/btm test scenario-headful` is the supported front door for headful harness-backed runtime scenarios.
- `--bootstrap-mode always|once|never` controls scenario/runtime bootstrap reuse. `always` rebuilds each cycle, `once` prepares one reusable runtime per invocation, and `never` requires a prepared runtime and fails fast if it is missing.
- `worldgen_sampling` is the normal worldgen confidence lane.
- `worldgen_marketing_screenshots` defaults to bounded one-shot segments for resilient shader captures. Its large disposable Minecraft runtime defaults to `~/.cache/btm/worldgen-marketing-screenshots` rather than the small `/tmp` tmpfs; use `--run-root` to override it. It applies screenshot-only prompt suppression, fixed 80-degree FOV, elevated spectator camera anchors to avoid underground-terrain xray captures, a deterministic `locate biome` anchor pass, and a local camera sweep that previews and scores nearby viewpoints before choosing a final frame. The technical gate rejects non-world/prompt-contaminated frames, flat frames, weak depth layering, excessive blank sky/foreground, and similar non-publishable captures before promotion. Use `--anchor-search off` to force authored coordinates and `--camera-search off` to force the original authored camera. Accepted technical captures remain pending mandatory vision review.
- `dimension_worldgen` is the explicit all-dimension stress/debug lane.
- `lc_tfth_c2me_dh` is a diagnostic-only regression repro, not part of `tools/btm test full`.
- `vs_ships_stability`, `vs_ships_matrix`, and `vs_ships_client` are diagnostic-only Valkyrien Skies family failure-surface lanes, not progression or balance integration lanes.
- `worldgen_sampling` and `client_smoke` are versioned scenario lanes with checked-in contracts at `tools/worldgen_sampling_contract.json` and `tools/client_smoke_contract.json`.
- `tools/btm doctor ...` is the supported front door for prerequisite, repo-surface, and runtime-shape checks.
- `tools/btm internal validate-kotlin-tool-surface` fails if active `tools/` contains `.py` or `.sh` files outside `tools/quarantine/`.
- `tools/btm internal validate-lc-tfth-dh-contracts` is a source-level Lost Cities/C2ME/DH guard contract and is included in `tools/btm test static`; it does not launch Minecraft.

Realistic Hands static regressions now cover explicit `btmfixes:realistic_hands/*` tag coverage for primitive loose-earth surfaces, representative knife/sword separation, first-class tool coverage, primitive flint/bone/rock butcher knife and hand axe recipes, Farmer's Delight straw-harvester knife tags, and ore/deepslate hardness probe coverage. The retained runtime hardness assertion currently expects deepslate ore variants at `+1.5` destroy-time over their stone counterparts when `generated/runtime-dumps/block_hardness_probe.json` exists.

Player progression regressions are data-driven by `kubejs/config/player_progression_regression.json` plus the authoritative parenting/acquisition manifests in `kubejs/config/tech_parenting.json`, `magic_parenting.json`, `economy_acquisition.json`, and `surface_registry.json`. `tools/btm internal validate-player-progression-contracts` now checks the primitive tool route, the full machine casing ladder, Blood Magic heart/orb/slate authority, Creating Space dimension routes, reward-surface bypass bans, direct coin-crafting bans, Font coin-only payouts, registered recipe/acquisition surfaces, and parenting coverage for retained craftable outputs. Effective recipe graph route reachability still requires a refreshed strict runtime dump.

Core wood-tag regressions now fail the pack suite when repo-owned risky `minecraft` block/item tags drift, when runtime recipe evidence shows an item-tag consumer without the matching owned item tag, or when representative generic and wood-specific wood recipes disappear or lose their intended wood identity.

Completionist quest validation is part of the pack suite. It parses chapter SNBT quest blocks directly, then compares item tasks, effect source quests, enchantment quests, and plant entries against current runtime/source dumps without broad regex block slicing. This keeps large generated chapter files fast enough to remain in normal validation.

After changing validation entry points or evidence claims, re-run the relevant `tools/btm test ...` modes and confirm the generated validation report still matches the intended evidence level.

## Routine Checks

For normal content work:

```bash
tools/btm doctor env
tools/btm test fast
tools/btm test kotlin
tools/btm doctor repo
```

For runtime-facing content changes:

```bash
tools/btm doctor env
tools/btm test full
```

`tools/btm test full` now covers the routine runtime lanes only: smoke, opening progression, `worldgen_sampling --profile local`, and quick `client_smoke`. It intentionally does not include the Lost Cities repro or all-dimension stress lane.

For workspace-wide full verification:

```bash
tools/btm doctor env
tools/btm test full --workspace
```

For retained runtime dump refresh:

```bash
tools/btm doctor env
tools/btm build dumps --server-dir /tmp/btm-dump-refresh --port 25565 --reset-runtime
tools/btm test static
```

`tools/btm build dumps` is the supported front door for rebuilding the repo-carried runtime dump set. It boots a fresh disposable server runtime, waits for the KubeJS dump passes, promotes the runtime outputs back into `generated/runtime-dumps/`, regenerates the retained Burnt coverage and functional-block audit surfaces, and refreshes the retained tag-policy Realistic Hands audit from the new block-hardness probe.

For toolchain/build changes:

```bash
tools/btm doctor env
tools/btm build sync server --dir /tmp/btm-sync-server --dry-run
tools/btm build sync client --dir /tmp/btm-sync-client --dry-run
tools/btm test kotlin
```

## Runtime Smoke

```bash
tools/btm build sync server --dir server-instance --dry-run
tools/btm build sync server --dir server-instance --apply
tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime
```

`tools/btm test smoke` bootstraps a fresh server, prunes stale runtime mods, boots the server, scans hard log failures, and runs the strict runtime suite.

Current smoke evidence: `/tmp/btm-pc-coin-smoke` passed `tools/btm test smoke --server-dir /tmp/btm-pc-coin-smoke --port 25565 --reset-runtime` on 2026-07-09 after rebuilding and restaging `pillagercampaigns-0.2.0.jar` so player kills on campaign followers, captains, and warlords award strength-scaled coin bundles through the bundled runtime artifact. Hard runtime checks were clean with 0 soft findings. `/tmp/btm-pc-drops-smoke` also passed `tools/btm test smoke --server-dir /tmp/btm-pc-drops-smoke --port 25565 --reset-runtime` on 2026-07-09 after rebuilding and restaging `pillagercampaigns-0.2.0.jar` so campaign-spawned pillagers always drop all carried equipment through the bundled runtime artifact. `/tmp/btm-pc-smoke` also passed `tools/btm test smoke --server-dir /tmp/btm-pc-smoke --port 25565 --reset-runtime` on 2026-07-08 after rebuilding and restaging `pillagercampaigns-0.2.0.jar` so loaded-chunk warlords stay anchored and rally drift remains blocked through loaded chunk paths. `/tmp/btm-content-smoke` also passed `tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime` on 2026-07-06 with `btmdimtrees-0.1.0.jar` restored as a bundled custom jar and `generated/custom-mod-sources/dynamic-trees-dimension-compat` restored as the canonical source checkout. `/tmp/btm-content-smoke` also passed the same lane on 2026-07-02 after the magic-order, dimension-proof, and late-crafting reauthoring pass; that earlier run's only finding was a soft startup-performance overage for engine/world log analysis (`533.86 ms` against the `250 ms` budget).

## Scenario Harnesses

`tools/btm test scenario` and `tools/btm test scenario-headful` are the supported front doors for portable harness scenarios. Use `scenario` for headless-safe lanes and `scenario-headful` for headful lanes. Scenario runs should create disposable server/client runtimes under `/tmp` and keep raw evidence there.

VS quick/release lanes delete successful copied runtimes by default after preserving summaries, metrics, logs, screenshots, and registry evidence. Failed runs and brutal profiles retain their runtime/world for diagnosis; use `--keep-runs` to retain successful runtimes explicitly. Server bootstrap also removes its temporary `.bundle-work` export and extraction tree after completion.

Older Prism/server-instance profiling tools that mutate live mod directories or kill broad launcher/java processes are guarded by `BTM_ALLOW_LEGACY_LIVE_MUTATION=1`. Use them only for intentional archival profiling; current validation should use disposable runtimes and the portable harness layer.

The supported public tool surface is `tools/btm`. Kotlin-backed `btm test`, `btm build`, `btm doctor`, and `btm internal` flows are the front door. Active repo tooling under `tools/` is Kotlin-first; Python and shell sources live only under `tools/quarantine/original-tools/` as archival compatibility backends while migration remains in progress.

All-dimension worldgen stress:

```bash
tools/btm test scenario-headful dimension_worldgen --cycles 1 --radius 1 --samples 1 --bootstrap-mode once
```

Use this only for explicit cross-dimension worldgen stress/debug, dimension-routing churn, or when `worldgen_sampling` is too narrow for the issue under investigation.

Current clean evidence before the dimension refactor: `/tmp/btm-dimension-worldgen/cycle-1` passed `tools/btm test scenario-headful dimension_worldgen --cycles 1` on 2026-07-06, including successful sampled passes through Undergarden, Finley, and Call From The Depths. The removed sky-dimension mod and End font access have since been removed, and Dimensional Fonts site spacing changed to 30/9 for roughly double frequency; refresh this scenario evidence after the next full worldgen validation. `/tmp/btm-dimension-worldgen/20260701-041811` also passed two server-only Overworld cycles with 8 samples at radius 4 after Dimensional Fonts site generation was moved from biome-modifier feature placement to vanilla structure-set placement. Dimensional Fonts sites are now ancient interdimensional reliquaries without grave-soil tiles. `/tmp/btm-dimension-worldgen/20260604-215117` remains the older all-dimension radius-1 baseline. The harness treats C2ME far-chunk writes, DH worldgen exceptions, crash reports, watchdogs, internal disconnects, and C2ME thread-guard failures as fatal.

Current pack mitigation: Quark `Shiba` spawns are disabled in checked-in `config/quark-common.toml` after repeated 2026-07-01 client-side entity metadata desyncs (`field 22`, `Integer` vs `ItemStack`) during normal play.

Current LC/DH/C2ME regression repro:

```bash
tools/btm test scenario lc_tfth_c2me_dh
tools/btm test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once
```

LC/C2ME/DH correctness contract: `tools/btm test static` runs `tools/btm internal validate-lc-tfth-dh-contracts`, which verifies the Lost Cities, TFTH, C2ME, Distant Horizons, and `btmfixes` source contracts without launching Minecraft. The contract checks active manifests/custom jars, parseable `config/c2me.toml`, `config/DistantHorizons.toml`, `config/TFTH.toml`, and `config/TFTH-Data.toml`, Lost Cities Creating Space route ownership, and that the harness compares a guarded control runtime against an unguarded runtime by toggling only `serializeDhC2meFeaturePlacement`.

This lane is now a targeted regression repro for the `btmfixes` Lost Cities serialization guard, not a broad TFTH pressure cycle. Run it after touching C2ME, Distant Horizons, Lost Cities, `btmfixes`, dimension routing, custom worldgen jars, or scenario harness logic:

```bash
tools/btm test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once
```

Expected validation: a guarded Lost Cities-only control runtime passes with no targeted fatal signatures, an otherwise identical unguarded runtime fails with a targeted Lost Cities/C2ME/DH classifier, and the scenario fails as inconclusive if the repro run does not trigger within its fixed sample budget.

Opening progression runtime validation:

```bash
tools/btm test scenario opening_progression --cycles 1 --bootstrap-mode once
```

Expected validation: a fresh disposable pack server boots normally, then the `sam validate_opening_progression` runtime validator proves gravel hand-breakability, hand denial on stone and logs, live flint availability from placed gravel, straw drops from placed tall grass cut with the primitive butcher knife, runtime primitive recipe presence for the butcher knife and hand axe, and first log access with the crafted primitive hand axe.

Worldgen sampling:

```bash
tools/btm test scenario worldgen_sampling --profile quick --bootstrap-mode once
tools/btm test scenario worldgen_sampling --profile release --bootstrap-mode once
tools/btm test scenario worldgen_sampling --profile local --bootstrap-mode once
```

`local` is the cheapest single-cycle local confidence lane, `quick` is the short seeded Overworld lane, and `release` broadens the dimension set and sample count. All profiles are validated against `tools/worldgen_sampling_contract.json` before the runtime backend starts.
Use `worldgen_sampling` for routine worldgen confidence. Escalate to `dimension_worldgen` only when the issue needs explicit all-dimension stress coverage.

Client smoke:

```bash
tools/btm test scenario-headful client_smoke --profile quick --bootstrap-mode once
tools/btm test scenario-headful client_smoke --profile release --bootstrap-mode once
```

`client_smoke` is a headful-only lane. Its checked-in contract lives at `tools/client_smoke_contract.json`; run it through `scenario-headful` only.

VS ships diagnostics:

```bash
tools/btm test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once
tools/btm test scenario vs_ships_matrix --profile quick --bootstrap-mode once
tools/btm test scenario-headful vs_ships_client --profile quick --bootstrap-mode once
```

These lanes exercise pinned Valkyrien Skies `valkyrienskies-120-2.4.11.jar`, Eureka `eureka-1201-1.6.3.jar`, VS: Clockwork `clockwork-0.5.6.jar`, and Trackwork `trackwork-1.20.1-1.2.4.jar` as stability-discovery surfaces only; they are not progression content. Shoulder Surfing remains removed as VS-incompatible. Raw evidence stays under `/tmp/btm-vs-*`. Automated hard assertions cover assembly, transforms, reconnect, restart lifecycle, and server state. Mount/camera, controlled movement, driving, and observer synchronization are manual-playtest checks. Screenshots and hardware rendering are supplemental. Xvfb/llvmpipe or unsupported GLSL runs remain `render_environment_inconclusive`, not confirmed rendering failures and not a reason to discard otherwise valid server-state evidence.

`vs_ships_matrix` mutates only copied disposable runtimes under `/tmp` and covers core, each add-on, the full family, and DH/C2ME isolation. `vs_ships_release` composes that matrix with release lifecycle runs for core, Clockwork, Trackwork, and combined client fixtures. Do not make these lanes pass by disabling the VS feature family in source.

Current VS evidence from 2026-07-10: `/tmp/btm-vs-stability-expanded-3cycle` passed three fresh DH-enabled quick cycles. Each cycle completed two dedicated-server boots, registry discovery, component placement, save/reload persistence, removal/unload, and clean shutdown; physics queue warnings remained non-fatal. `/tmp/btm-vs-matrix-expanded-direct` then passed three paired `current_config` and `dh_disabled` boots cloned from the same disposable baseline. The earlier DH-disabled startup stall did not reproduce under the corrected direct-boot matrix and should be treated as transient or old-harness evidence, not a current DH-on/off difference.

The retained 2026-07-10 evidence covers VS/Eureka only and predates reactivation of Clockwork and Trackwork. It does not establish full-family stability. Fresh `vs_ships_release` evidence is required before a playable-stability claim; until then the four mods remain diagnostic-active and intentionally absent from progression integration.

Fresh activation evidence from 2026-07-11: `/tmp/btm-vs-full-family-activation` passed the quick full-family server lifecycle, including Clockwork and Trackwork registry/component assertions, save/restart persistence, removal/unload, and clean shutdown. `/tmp/btm-vs-combined-activation` passed preparation, join/render, combined six-component assembly, registered-ship reconnect, and explicit translation, then failed at `mount_movement` because `AgentPilot` did not mount the helm. The hard classifier is `mount_camera_failure`; repeated Dimensional Fonts/C2ME far-chunk writes were also captured. Do not claim specialized Clockwork or Trackwork mechanics, observer sync, restart persistence from a real client, or release-gate success from this evidence.

`/tmp/btm-vs-release-all` completed the full nine-lane release orchestrator on 2026-07-11. Server lifecycle passed across Overworld, Lost Cities, and Earth orbit, and all ten server isolation variants passed. No crash report, JVM fatal error, dependency/mixin failure, or save corruption was produced. All seven release client lanes failed cleanly: `mount_camera_failure` for core and both C2ME-disabled combined fixtures, `menu_packet_failure` for Clockwork, `onboarding_failure` for Trackwork, and network-timeout `client_disconnect_failure` for current and DH-disabled combined fixtures. Disabling DH did not remove the timeout; disabling C2ME allowed combined assembly/translation but did not remove the mount failure. Retained logs also contain Dimensional Fonts far-chunk writes, ModernFix wrong-thread reload-listener warnings, and Moonlight's VS forced-crash prevention message. The stack remains diagnostic-active and release-blocked.

`/tmp/btm-vs-release-simplified` reran all nine release lanes on 2026-07-12 after removing automated mount/camera, movement, and observer tests. Server lifecycle and all ten isolation variants passed. Clockwork plus combined C2ME-disabled and DH+C2ME-disabled clients passed all server-authoritative assembly, transform, reconnect, and restart assertions, with only `render_environment_inconclusive` under Xvfb/llvmpipe. Core, Trackwork, combined current, and combined DH-disabled stopped at the source-fixture visibility threshold before assembly. No crash report, JVM fatal error, dependency/mixin failure, or player-control failure occurred. The remaining automated failure is the software-renderer visibility oracle; manual playtests own camera, control, driving, and observer behavior.

Current fresh smoke/runtime evidence: `/tmp/btm-content-smoke` passed `tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime` and `tools/btm test runtime --instance /tmp/btm-content-smoke` on 2026-07-02 after removing unsupported KubeJS startup `.asset(...)` builder calls and restoring the missing `A` key in seven `171_k_turrets_electrical_gates.js` shaped recipes. The fresh runtime now loads all 10 startup scripts and 86 server scripts with 0 KubeJS errors/warnings, and the runtime recipe audit reports no failed recipes.

## Current Follow-Ups

- Confirm Creating Space travel UI and Earth orbit routes to Lost Cities, Twilight Forest, Fallout Wastelands, Finley, and Call From The Depths.
- Validate long settlement-roads and village-walls generation beyond boot/join.
- Confirm Unearthed/Hyle deepslate replacement in fresh terrain.
- Re-run the LC/DH/C2ME guard repro after mod, config, worldgen, or custom jar changes affecting those systems.
- Add deterministic seed sampling for deposits, Y-bands, villages, roads, walls, structures, forageables, and spawn viability, then define acceptable distribution bounds.
- Capture playtest telemetry for time-to-tier, deaths, lookup stalls, travel distance, recovery loops, and player confusion before setting friction budgets.
