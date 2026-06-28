# AGENTS.md

## Scope
This repo is the expert-pack content layer for Forge 1.20.1: KubeJS recipes/gates, quest content, config balancing, and validation tooling.

## Headlining Systems
- Bounded matter economy: geological deposits, Y-band locality, processing ladders.
- Dual crafting spines: Tinkers/Create tech spine and Blood Magic-parented magic spine.
- Adventure spine: obelisks/dimensions/combat feeding progression.
- Coin + villager/wares economy as a core progression lane.
- Local logistics thesis: trains/physical logistics first, AE2 local, OC2R intersite.
- Pillager campaign pressure as ongoing surface threat.
- Body systems loop: food, water quality, nutrition, and still-beating-heart bridge into Blood Magic.
- Tiered machine casing progression across mods.

## Source Of Truth
The repo is the authoritative content layer, not a live Minecraft instance. Treat these as source:
- `kubejs/`
- `config/`
- `defaultconfigs/`
- `datapacks/`
- `globalresources/`
- `resourcepacks/`
- `shaderpacks/`
- `mods/*.pw.toml`
- custom bundled jars in `mods/`
- `docs/` five living Markdown summaries only
- `tools/`

Treat these as generated or runtime state:
- `server-instance/`
- `server-template/`
- local client game directories
- `generated/pack-site/`, `generated/runtime-dumps/`, `generated/mod-sync-backup/`, `generated/ftbquests/`
- worlds, saves, logs, crash reports, screenshots, profiler dumps, launcher account/cache files, and `options.txt`

Do not sync or delete player/runtime state by default. Use explicit reset flags only when the user asks for a disposable runtime.

## Runtime Defaults
- Minecraft: `1.20.1`
- Forge: `47.4.13`
- Local server port: `25565`
- Offline local testing usernames are allowed for agent validation.

## Where To Work
- `kubejs/server_scripts/`: progression and recipe overrides (authoritative)
- `kubejs/startup_scripts/`: startup hooks only
- `config/`, `defaultconfigs/`: mod behavior + server/world defaults
- `docs/`: five living Markdown docs; concise current conclusions only
- `tools/`: test/profiling/worldgen harness scripts
- `server-instance/`: generated dedicated server runtime; sync from source before launching

## Sync And Launch
- Server dry run: `tools/sync_to_server.sh --dry-run`
- Server apply: `tools/sync_to_server.sh --apply --server-dir server-instance`
- Client dry run: `tools/sync_to_client.sh --dry-run --client-dir /path/to/client`
- Client apply: `tools/sync_to_client.sh --apply --client-dir /path/to/client`
- Bootstrap server: `tools/bootstrap_server.sh --server-dir /tmp/btm-server --port 25565`
- Launch server: `tools/launch_server_direct.sh --server-dir /tmp/btm-server -- nogui`
- Bootstrap client: `tools/bootstrap_client_runtime.sh --client-dir /tmp/btm-client`
- Launch direct client: `tools/launch_client_direct.sh --client-dir /tmp/btm-client --username AgentClient --server 127.0.0.1:25565`
- Direct join probe: `tools/client_join_probe_direct.sh --client-dir /tmp/btm-client --server 127.0.0.1:25565`
- Agent static validation: `tools/agent_validate.sh --static`
- Agent existing-runtime validation: `tools/agent_validate.sh --runtime --instance /path/to/fresh/runtime`
- Agent fresh smoke validation: `tools/agent_validate.sh --smoke --server-dir /tmp/btm-agent-validate-smoke --port 25565 --reset-runtime`
- Content smoke: `tools/server_content_smoke.sh --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime`
- Prism fallback: `tools/launch_prism_instance.sh "Bound to Matter"`

The sync scripts use managed source path lists and excludes for runtime state. Server sync also excludes known client-only mod entries so client-only jars do not enter the dedicated server runtime. Bootstrap scripts resolve current `.pw.toml` downloads into generated server/client roots; use `tools/resolve_packwiz_downloads.mjs --dry-run --pack-root . --target-dir /tmp/btm-server --side server` to inspect that step directly.

## Modular Harnesses
Use the portable harness layer for repeatable runtime tests instead of hand-built local instances.

- Shared mechanics live in `tools/portable_minecraft_harness.py`.
- Scenario scripts, such as `tools/lc_tfth_c2me_dh_stability.py`, should define only:
  - scenario metadata and default run/docs paths,
  - required mod jar patterns,
  - fatal log classifiers,
  - activity signatures,
  - scenario phases and console commands.
- Keep scenario scripts deterministic and disposable. They should create fresh server/client runtimes under `/tmp`, use direct launchers only, and write machine summaries under the disposable run root.
- Keep raw logs, crash reports, thread dumps, heap info, generated worlds, and per-run summaries under the `/tmp` run root. Commit only concise conclusions in `docs/runtime_validation.md` or `docs/performance_and_mods.md` when useful.
- Harness scripts are repo tooling, not pack content. `tools/` must stay excluded from packwiz via `.packwizignore`; verify with `rg '^file = "tools/' index.toml` after `packwiz refresh`.
- Do not make a stability harness pass by disabling the feature being tested. Required mods and features must stay enabled unless the user explicitly asks for an exclusion experiment.
- Prefer adding a new scenario wrapper over copying launcher/process code. If a new test needs generic behavior, add it to `portable_minecraft_harness.py` and keep scenario-specific behavior in the scenario file.
- Use `--cycles`, `--idle-seconds`, `--keep-going`, `--keep-runs`, `--min-free-gb`, and `--max-old-runs` to tune validation runs. Default behavior should prune old `/tmp` runs and fail early if free space is low.
- On stalls, timeouts, watchdogs, JVM exits, or crash reports, capture diagnostics through the harness before stopping processes.

Current LC/DH scenario:
- Run: `python3 tools/lc_tfth_c2me_dh_stability.py`
- Short smoke: `python3 tools/lc_tfth_c2me_dh_stability.py --cycles 1 --idle-seconds 30 --tfth-seconds 30`
- Full validation expectation: 3 clean boot/join/LC teleport/DH generation/TFTH pressure cycles, required jars present on server and client, no crash reports, no ModernFix watchdog, no C2ME thread-guard failures, and DH activity observed.

## Core Rules
- Do not invent IDs; mark unknowns as `UNKNOWN`.
- Keep KubeJS Rhino-safe and deterministic (`kubejs:*` IDs).
- Prefer data-driven generation over copy-paste recipes.
- Remove bypasses; do not introduce deadlocks.
- Update docs when progression behavior changes.
- Commit as you make changes: after each coherent completed change, run the relevant validation, commit the finished work, and push the current branch. Do not leave completed work uncommitted or unpushed unless the user explicitly asks to hold it locally.

## Validate Before Shipping
1. `node --check` for touched JS scripts.
2. Run relevant `tools/` harness/tests.
3. Confirm recipe visibility (EMI/JEI-facing paths).
4. Recheck known chokepoints (alloy, casing, grout, gates, coins/trades).
5. Record concise findings in the relevant living doc under `docs/`.

Recommended validation ladder:
1. Static checks: `tools/agent_validate.sh --static`.
2. Existing fresh runtime: `tools/agent_validate.sh --runtime --instance /path/to/fresh/runtime`.
3. Fresh server smoke for recipe/config/content changes: `tools/agent_validate.sh --smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime`.
4. Client/server scenario harnesses for stability, rendering, login, LC/DH/TFTH, or client-only work.

Treat runtime validation as authoritative only when it reads logs and KubeJS audit dumps from a fresh or intentionally reused current runtime. `--runtime` and `--smoke` run the pack suite in strict runtime mode. Add `--strict-data-dumps` only when vanilla `/dump` output such as `dump/data_raw/loot_tables` was intentionally generated; this is separate from KubeJS audit dumps under `kubejs/config`.

After changing agent validation entry points or evidence claims, run `tools/test_agent_validate_surfaces.sh`. Use `tools/test_agent_validate_surfaces.sh --include-static --runtime /path/to/fresh/runtime` when changing static isolation, runtime claims, report summaries, or strict data-dump behavior.

For runtime/tooling changes, also run:
1. `bash -n tools/*.sh`
2. Sync scripts in `--dry-run`
3. Sync scripts in `--apply` against temporary server/client directories
4. Runtime probes against temporary directories when launch assets are available
5. `python3 -m py_compile` for touched Python tools

## Custom Mods Source (`generated/custom-mod-sources`)
Active pack-critical sources:
- `bound-to-matter-fixes` (`btmfixes`)
- `class-selector` (`classselector`)
- `create-transmission-loss` (`transmissionloss`)
- `dynamic-trees-hexerei` (`dthexerei`)
- `dynamic-trees-malum` (`dtmalum`)
- `heat-sync` (`heatsync`)
- `latent_chemlib` (`latent_chemlib`)
- `dimensional-fonts` (`obelisks`)
- `oc2r-create-bridge` (`computerbridge`)
- `oc2rwireless-global-pubsub-addon` (`oc2rwireless`)
- `pillager-campaigns` (`pillagercampaigns`)
- `procedural-bouquets` (`procedural_bouquets`)
- `realistic-ores` (`realisticores`)
- `rpg-stats` (`rpgstats`)
- `settlement-roads` (`settlementroads`)
- `village-walls` (`villagewalls`)

Note: `settlementroads` appears in multiple dirs; use `generated/custom-mod-sources/settlement-roads` as canonical unless explicitly told otherwise.

Override source root for alternate environments with `BTM_CUSTOM_MODS_DIR`.
