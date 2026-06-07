# Runtime Validation

## Policy

Raw logs, crash reports, generated worlds, and machine summaries belong in `/tmp`, disposable runtime roots, `server-instance/`, `server-template/`, or `generated/`. Keep `docs/` to concise conclusions and current operating guidance.

Do not treat stale client/server logs or stale jar caches as evidence. Re-sync or re-bootstrap before making runtime claims.

## Agent Entry Points

```bash
tools/agent_validate.sh --static
tools/agent_validate.sh --runtime --instance /path/to/fresh/runtime
tools/agent_validate.sh --runtime --instance /path/to/fresh/runtime --strict-data-dumps
tools/agent_validate.sh --smoke --server-dir /tmp/btm-agent-validate-smoke --port 25566 --reset-runtime
tools/test_agent_validate_surfaces.sh
tools/test_agent_validate_surfaces.sh --include-static --runtime /path/to/fresh/runtime
```

- `--static`: source plus retained generated-dump checks. No fresh runtime claim.
- `--runtime`: strict validation of an existing fresh runtime's logs and KubeJS audit dumps.
- `--strict-data-dumps`: additionally requires vanilla `/dump` output such as `dump/data_raw/loot_tables`; this is separate from KubeJS audit dumps under `kubejs/config`.
- `--smoke`: fresh disposable server bootstrap, boot, hard-log scan, and strict runtime suite.
- `BTM_INSTANCE` can provide the runtime path. `BTM_VALIDATE_JOBS=N` caps parallel JS syntax workers.

Primitive mining static regressions now cover soft-ground hand breakability, representative pick/axe/shovel gates, primitive flint butcher knife and hand axe recipes, Farmer's Delight straw-harvester knife tags, and ore/deepslate hardness probe coverage. The exact deepslate `+1` hardness assertion is enforced when a retained `generated/runtime-dumps/block_hardness_probe.json` exists.

Run `tools/test_agent_validate_surfaces.sh` after changing validation entry points. Add `--include-static --runtime /path/to/fresh/runtime` when changing evidence claims, static isolation, or strict data-dump behavior.

## Routine Checks

For normal content work:

```bash
node --check kubejs/server_scripts/path/to/touched.js
node --check kubejs/startup_scripts/path/to/touched.js
node tools/validate_pack_contract.mjs
node tools/contract_completeness_report.mjs --check
node tools/validate_autonomous_contracts.mjs
node tools/validate_kubejs_assets.mjs
node tools/validate_chemistry_identity.mjs
node tools/validate_synthesis_pipeline.mjs
```

For JSON/datapack edits:

```bash
python3 -m json.tool path/to/file.json >/dev/null
```

For tooling changes:

```bash
bash -n tools/*.sh
python3 -m py_compile tools/*.py
```

## Runtime Smoke

```bash
tools/sync_to_server.sh --dry-run
tools/sync_to_server.sh --apply --server-dir server-instance
tools/server_content_smoke.sh --server-dir /tmp/btm-content-smoke --port 25566 --reset-runtime
```

`tools/server_content_smoke.sh` bootstraps a fresh server, prunes stale runtime mods, boots the server, scans hard log failures, and runs `tools/pack_test_suite.mjs` with `BTM_STRICT_RUNTIME=1`.

Use `BTM_INSTANCE=/path/to/runtime BTM_STRICT_RUNTIME=1 node tools/pack_test_suite.mjs` only when the runtime is fresh or intentionally reused and current.

## Scenario Harnesses

Portable harness mechanics live in `tools/portable_minecraft_harness.py`. Scenario scripts should create disposable server/client runtimes under `/tmp` and keep raw evidence there.

All-dimension worldgen stress:

```bash
python3 tools/dimension_worldgen_stress.py --cycles 1 --radius 1 --samples 1
```

Current clean evidence: `/tmp/btm-dimension-worldgen/20260604-215117` passed radius-1 chunk generation in every authored dimension with C2ME, Distant Horizons, and `btmfixes` enabled. The harness treats C2ME far-chunk writes, DH worldgen exceptions, crash reports, watchdogs, internal disconnects, and C2ME thread-guard failures as fatal.

Current LC/DH/C2ME/TFTH scenario:

```bash
python3 tools/lc_tfth_c2me_dh_stability.py
python3 tools/lc_tfth_c2me_dh_stability.py --cycles 1 --idle-seconds 30 --tfth-seconds 30
```

Expected full validation: three clean boot/join/space-routed dimension teleport/Distant Horizons generation/TFTH pressure cycles, required jars present, no crash reports, no ModernFix watchdog, no C2ME thread-guard failures, and Distant Horizons activity observed.

## Current Follow-Ups

- Confirm Creating Space travel UI and Earth orbit routes to Lost Cities, Twilight Forest, Fallout Wastelands, Finley, and Call From The Depths.
- Validate long settlement-roads and village-walls generation beyond boot/join.
- Confirm Unearthed/Hyle deepslate replacement in fresh terrain.
- Re-run LC/DH/C2ME/TFTH after mod, config, worldgen, or custom jar changes affecting those systems.
