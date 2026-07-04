# Runtime Validation

## Policy

Raw logs, crash reports, generated worlds, and machine summaries belong in `/tmp`, disposable runtime roots, `server-instance/`, `server-template/`, or `generated/`. Keep `docs/` to concise conclusions and current operating guidance.

Do not treat stale client/server logs or stale jar caches as evidence. Re-sync or re-bootstrap before making runtime claims.

Generated Markdown reports under `generated/` are temporary evidence products. Fold durable conclusions into these five living docs, then archive the reports under `quarantine/docs/` if they must remain available for archaeology.

## Agent Entry Points

```bash
tools/btm test static
tools/btm test runtime --instance /path/to/fresh/runtime
tools/btm test runtime --instance /path/to/fresh/runtime --strict-data-dumps
tools/btm test smoke --server-dir /tmp/btm-agent-validate-smoke --port 25565 --reset-runtime
tools/btm build dumps --server-dir /tmp/btm-dump-refresh --port 25565 --reset-runtime
tools/btm test scenario dimension_worldgen --cycles 1 --radius 1 --samples 1
tools/btm test scenario lc_tfth_c2me_dh --cycles 1 --idle-seconds 30 --tfth-seconds 30
tools/btm test scenario opening_progression --cycles 1
tools/btm test scenario worldgen_sampling --profile quick
tools/btm test scenario worldgen_sampling --profile release
tools/btm test scenario-headful client_smoke --profile quick
tools/btm test scenario-headful client_smoke --profile release
tools/btm test kotlin
tools/btm doctor env
tools/btm doctor repo
tools/btm doctor runtime --instance /path/to/fresh/runtime
```

- `--static`: source plus retained generated-dump checks. No fresh runtime claim.
- `--runtime`: strict validation of an existing fresh runtime's logs and KubeJS audit dumps.
- `--strict-data-dumps`: additionally requires vanilla `/dump` output such as `dump/data_raw/loot_tables`; this is separate from KubeJS audit dumps under `kubejs/config`.
- `--smoke`: fresh disposable server bootstrap, boot, hard-log scan, and strict runtime suite.
- `build dumps`: fresh disposable server bootstrap plus refresh of the full retained runtime-dump surface, including direct runtime JSON, retained Burnt coverage tables, functional-block audits, and KubeJS config dumps.
- `tools/btm test scenario` is the supported front door for harness-backed runtime scenarios.
- `worldgen_sampling` and `client_smoke` are versioned scenario lanes with checked-in contracts at `tools/worldgen_sampling_contract.json` and `tools/client_smoke_contract.json`.
- `tools/btm doctor ...` is the supported front door for prerequisite, repo-surface, and runtime-shape checks.
- `tools/btm internal validate-kotlin-tool-surface` fails if active `tools/` contains `.py` or `.sh` files outside `tools/quarantine/`.
- `tools/btm internal validate-lc-tfth-dh-contracts` is a source-level LC/TFTH/DH correctness contract and is included in `tools/btm test static`; it does not launch Minecraft.

Realistic Hands static regressions now cover primitive loose-earth hand breakability, representative knife/sword separation, first-class tool coverage, primitive flint/bone/rock butcher knife and hand axe recipes, Farmer's Delight straw-harvester knife tags, and ore/deepslate hardness probe coverage. The retained runtime hardness assertion currently expects deepslate ore variants at `+1.5` destroy-time over their stone counterparts when `generated/runtime-dumps/block_hardness_probe.json` exists.

Player progression regressions are data-driven by `kubejs/config/player_progression_regression.json` plus the authoritative parenting/acquisition manifests in `kubejs/config/tech_parenting.json`, `magic_parenting.json`, `economy_acquisition.json`, and `surface_registry.json`. `tools/btm internal validate-player-progression-contracts` now checks the primitive tool route, the full machine casing ladder, Blood Magic heart/orb/slate authority, Creating Space dimension routes, reward-surface bypass bans, direct coin-crafting bans, Font coin-only payouts, registered recipe/acquisition surfaces, and parenting coverage for retained craftable outputs. Effective recipe graph route reachability still requires a refreshed strict runtime dump.

Completionist quest validation is part of the pack suite. It parses chapter SNBT quest blocks directly, then compares item tasks, effect source quests, enchantment quests, and plant entries against current runtime/source dumps without broad regex block slicing. This keeps large generated chapter files fast enough to remain in normal validation.

After changing validation entry points or evidence claims, re-run the relevant `tools/btm test ...` modes and confirm the generated validation report still matches the intended evidence level.

## Routine Checks

For normal content work:

```bash
tools/btm doctor env
tools/btm test kotlin
tools/btm test static
tools/btm doctor repo
```

For runtime-facing content changes:

```bash
tools/btm doctor env
tools/btm build dumps --server-dir /tmp/btm-dump-refresh --port 25565 --reset-runtime
tools/btm test kotlin
tools/btm test static
tools/btm test runtime --instance /path/to/fresh/runtime
tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime
```

For retained runtime dump refresh:

```bash
tools/btm doctor env
tools/btm build dumps --server-dir /tmp/btm-dump-refresh --port 25565 --reset-runtime
tools/btm test static
```

`tools/btm build dumps` is the supported front door for rebuilding the repo-carried runtime dump set. It boots a fresh disposable server runtime, waits for the KubeJS dump passes, promotes the runtime outputs back into `generated/runtime-dumps/`, regenerates the retained Burnt coverage and functional-block audit surfaces, and refreshes the retained Realistic Hands audit from the new block-hardness probe.

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

Current smoke evidence: `/tmp/btm-content-smoke` passed `tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime` on 2026-07-02 after the magic-order, dimension-proof, and late-crafting reauthoring pass. Hard runtime checks were clean; the only finding was a soft startup-performance overage for engine/world log analysis (`533.86 ms` against the `250 ms` budget).

## Scenario Harnesses

`tools/btm test scenario` is the supported front door for portable harness scenarios. Scenario runs should create disposable server/client runtimes under `/tmp` and keep raw evidence there.

Older Prism/server-instance profiling tools that mutate live mod directories or kill broad launcher/java processes are guarded by `BTM_ALLOW_LEGACY_LIVE_MUTATION=1`. Use them only for intentional archival profiling; current validation should use disposable runtimes and the portable harness layer.

The supported public tool surface is `tools/btm`. Kotlin-backed `btm test`, `btm build`, `btm doctor`, and `btm internal` flows are the front door. Active repo tooling under `tools/` is Kotlin-first; Python and shell sources live only under `tools/quarantine/original-tools/` as archival compatibility backends while migration remains in progress.

All-dimension worldgen stress:

```bash
tools/btm test scenario dimension_worldgen --cycles 1 --radius 1 --samples 1
```

Current clean evidence: `/tmp/btm-dimension-worldgen/20260701-041811` passed two server-only Overworld cycles with 8 samples at radius 4 after Dimensional Fonts site generation was moved from biome-modifier feature placement to vanilla structure-set placement. Dimensional Fonts sites are now ancient interdimensional reliquaries without grave-soil tiles; a fresh worldgen validation should refresh this evidence after the next scenario run. `/tmp/btm-dimension-worldgen/20260604-215117` remains the last recorded all-dimension radius-1 baseline. The harness treats C2ME far-chunk writes, DH worldgen exceptions, crash reports, watchdogs, internal disconnects, and C2ME thread-guard failures as fatal.

Current pack mitigation: Quark `Shiba` spawns are disabled in checked-in `config/quark-common.toml` after repeated 2026-07-01 client-side entity metadata desyncs (`field 22`, `Integer` vs `ItemStack`) during normal play.

Current LC/DH/C2ME/TFTH scenario:

```bash
tools/btm test scenario lc_tfth_c2me_dh
tools/btm test scenario lc_tfth_c2me_dh --cycles 1 --idle-seconds 30 --tfth-seconds 30
```

LC/TFTH/DH correctness contract: `tools/btm test static` runs `tools/btm internal validate-lc-tfth-dh-contracts`, which verifies the Lost Cities, TFTH, C2ME, Distant Horizons, and `btmfixes` source contracts without launching Minecraft. The contract checks active manifests/custom jars, parseable `config/c2me.toml`, `config/DistantHorizons.toml`, `config/TFTH.toml`, and `config/TFTH-Data.toml`, Lost Cities Creating Space route ownership, required scenario fatal classifiers, and the requirement that Distant Horizons activity is observed before the scenario can pass.

LC/TFTH/DH runtime stability is a targeted lane, not a default correctness gate. Run the short profile after touching C2ME, Distant Horizons, Lost Cities, TFTH, dimension routing, custom worldgen jars, entity/worldgen behavior, or scenario harness logic:

```bash
tools/btm test scenario lc_tfth_c2me_dh --cycles 1 --idle-seconds 30 --tfth-seconds 30
```

Run the default three-cycle profile for release candidates or after high-risk fixes in those systems:

```bash
tools/btm test scenario lc_tfth_c2me_dh
```

Expected full validation: three clean boot/join/space-routed dimension teleport/Distant Horizons generation/TFTH pressure cycles, required jars present, no crash reports, no ModernFix watchdog, no C2ME thread-guard failures, no DH/Lost Cities/TFTH exceptions, and Distant Horizons activity observed.

Opening progression runtime validation:

```bash
tools/btm test scenario opening_progression --cycles 1
```

Expected validation: a fresh disposable pack server boots normally, then the `sam validate_opening_progression` runtime validator proves gravel hand-breakability, hand denial on stone and logs, live flint availability from placed gravel, straw drops from placed tall grass cut with the primitive butcher knife, runtime primitive recipe presence for the butcher knife and hand axe, and first log access with the crafted primitive hand axe.

Worldgen sampling:

```bash
tools/btm test scenario worldgen_sampling --profile quick
tools/btm test scenario worldgen_sampling --profile release
```

`quick` is the short seeded Overworld lane; `release` broadens the dimension set and sample count. Both profiles are validated against `tools/worldgen_sampling_contract.json` before the runtime backend starts.

Client smoke:

```bash
tools/btm test scenario-headful client_smoke --profile quick
tools/btm test scenario-headful client_smoke --profile release
```

`client_smoke` is a headful-only lane. Its checked-in contract lives at `tools/client_smoke_contract.json`; run it through `scenario-headful` only.

Current fresh smoke/runtime evidence: `/tmp/btm-content-smoke` passed `tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime` and `tools/btm test runtime --instance /tmp/btm-content-smoke` on 2026-07-02 after removing unsupported KubeJS startup `.asset(...)` builder calls and restoring the missing `A` key in seven `171_k_turrets_electrical_gates.js` shaped recipes. The fresh runtime now loads all 10 startup scripts and 86 server scripts with 0 KubeJS errors/warnings, and the runtime recipe audit reports no failed recipes.

## Current Follow-Ups

- Confirm Creating Space travel UI and Earth orbit routes to Lost Cities, Twilight Forest, Fallout Wastelands, Finley, and Call From The Depths.
- Validate long settlement-roads and village-walls generation beyond boot/join.
- Confirm Unearthed/Hyle deepslate replacement in fresh terrain.
- Re-run LC/DH/C2ME/TFTH after mod, config, worldgen, or custom jar changes affecting those systems.
- Add deterministic seed sampling for deposits, Y-bands, villages, roads, walls, structures, forageables, and spawn viability, then define acceptable distribution bounds.
- Capture playtest telemetry for time-to-tier, deaths, lookup stalls, travel distance, recovery loops, and player confusion before setting friction budgets.
