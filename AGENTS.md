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
- `generated/runtime-dumps/`, `generated/mod-sync-backup/`, `generated/ftbquests/`
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

## Screenshot Composition
- Follow `tools/screenshot_composition.md` for polished Minecraft screenshots.
- Keep diagnostic captures distinct from marketing candidates.
- Worldgen marketing screenshots require active shaders and the selected shader pack, corrected client graphics settings, deterministic shot metadata, Distant Horizons LOD-settle evidence (`stable` preferred; explicit bounded `low-tail-stable` allowed only with recorded tail evidence), and mandatory vision-capable AI review.
- Use `tools/btm test scenario-headful worldgen_marketing_screenshots` for deterministic recapture unless the user explicitly asks for an exploratory/manual capture.
- A screenshot is not publishable until its final export and target crops pass the AI gate and have machine-readable review sidecars.

## Supported Tool Surface
- Launcher: `tools/btm`
- Validation: `tools/btm test static`
- Existing runtime validation: `tools/btm test runtime --instance /path/to/fresh/runtime`
- Fresh smoke validation: `tools/btm test smoke --server-dir /tmp/btm-agent-validate-smoke --port 25565 --reset-runtime`
- Headless scenario validation: `tools/btm test scenario opening_progression --cycles 1`
- Headful scenario validation: `tools/btm test scenario-headful client_smoke --profile quick --bootstrap-mode once`
- Kotlin test runner: `tools/btm test kotlin`
- Graph adjacency query: `tools/btm graph item ITEM_ID [--producers|--consumers|--all] [--limit N] [--type RECIPE_TYPE] [--graph PATH]`
- Graph route query: `tools/btm graph route ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH]`
- Graph blocker query: `tools/btm graph blockers ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH] [--limit N]`
- Runtime dump refresh: `tools/btm build dumps --server-dir /tmp/btm-dump-refresh --port 25565 --reset-runtime`
- Server sync dry run: `tools/btm build sync server --dir server-instance --dry-run`
- Server sync apply: `tools/btm build sync server --dir server-instance --apply`
- Client sync dry run: `tools/btm build sync client --dir /path/to/client --dry-run`
- Client sync apply: `tools/btm build sync client --dir /path/to/client --apply`
- CurseForge bundle export: `tools/btm build bundle curseforge`
- Complete server bundle export: `tools/btm build bundle server`
- Environment checks: `tools/btm doctor env`
- Repo checks: `tools/btm doctor repo`
- Runtime inspection: `tools/btm doctor runtime --instance /path/to/fresh/runtime`

The supported public contract is the `btm` tree only. Legacy shell, Python, and Node entrypoints remain as internal implementation detail until their Kotlin replacements land; do not teach or depend on them as the front door.
`tools/btm graph ...` is the supported agent-facing graph navigation API. It is Kotlin-backed, JSON-first through the global `--json` envelope, and depends on retained runtime evidence in `generated/runtime-dumps/recipes.json` plus the progression inputs under `kubejs/config/`.
Outside `kubejs/`, JavaScript is transitional only where an existing pack/runtime integration requires it. Do not add new `.js` or `.mjs` entrypoints under `tools/`. New non-KubeJS automation should default to Kotlin under the `btm` surface or to internal Kotlin support scripts it calls.
The active tooling surface is Kotlin-first. If you find legacy Node-era instructions or generated metadata, treat them as cleanup debt and port them to Kotlin instead of extending them.
Original shell/Python tools are quarantined under `tools/quarantine/original-tools/` for archival reference. Do not move them back into the active `tools/` root.

## Tool Prerequisites
- Run `tools/btm doctor env` before claiming the toolchain is usable.
- Current practical prerequisites for supported workflows include:
  - `kotlin`
  - `java` with Java 17
  - `rg`
  - `packwiz` for bundle export flows
- Treat `tools/btm doctor env` as authoritative when a command fails due to missing local dependencies.
- `tools/btm` is the only supported front door. Archived compatibility shims may remain under `tools/quarantine/`, but supported `test`, `build`, and `doctor` flows should not depend on them or be taught as live entrypoints.
- KubeJS scripts are the only normal place for pack-authored JavaScript. Repo tooling should be Kotlin unless the user explicitly asks for a quarantined compatibility path.

## Modular Harnesses
Use the portable harness layer for repeatable runtime tests instead of hand-built local instances.

- Public scenario entrypoints:
  - `tools/btm test scenario NAME [scenario args]` for headless-safe scenarios
  - `tools/btm test scenario-headful NAME [scenario args]` for headful scenarios
- Current public scenarios:
  - `lc_tfth_c2me_dh`
  - `dimension_worldgen`
  - `opening_progression`
  - `pillager_campaigns`
  - `worldgen_sampling`
  - `worldgen_marketing_screenshots`
  - `vs_ships_stability`
  - `vs_ships_matrix`
  - `client_smoke`
  - `vs_ships_client`
  - `vs_ships_release`
- Internal harness/scenario implementation should define only:
  - scenario metadata and default run/docs paths
  - required mod jar patterns
  - fatal log classifiers
  - activity signatures
  - scenario phases and console commands
- Keep scenario scripts deterministic and disposable. They should create fresh server/client runtimes under `/tmp`, use direct launchers only, and write machine summaries under the disposable run root.
- Keep raw logs, crash reports, thread dumps, heap info, generated worlds, and per-run summaries under the `/tmp` run root. Commit only concise conclusions in `docs/runtime_validation.md` or `docs/performance_and_mods.md` when useful.
- Harness scripts are repo tooling, not pack content. `tools/` must stay excluded from packwiz via `.packwizignore`; verify with `rg '^file = "tools/' index.toml` after `packwiz refresh`.
- Do not make a stability harness pass by disabling the feature being tested. Required mods and features must stay enabled unless the user explicitly asks for an exclusion experiment.
- Prefer adding a new scenario wrapper over copying launcher/process code. Keep shared harness behavior internal and expose new cases through `tools/btm test scenario`.
- Use `--cycles`, `--idle-seconds`, `--keep-going`, `--keep-runs`, `--min-free-gb`, and `--max-old-runs` to tune validation runs. Default behavior should prune old `/tmp` runs and fail early if free space is low.
- On stalls, timeouts, watchdogs, JVM exits, or crash reports, capture diagnostics through the harness before stopping processes.

Current LC/DH scenario:
- Run: `tools/btm test scenario lc_tfth_c2me_dh`
- Short smoke: `tools/btm test scenario lc_tfth_c2me_dh --samples 4 --settle-seconds 30 --bootstrap-mode once`
- Full validation expectation: a guarded Lost Cities-only control runtime passes, an otherwise identical unguarded runtime fails with a targeted Lost Cities/C2ME/DH classifier, and the scenario fails as inconclusive if the unguarded repro does not trigger within its fixed workload budget.
This scenario is diagnostic-only. Do not treat it as part of the normal `tools/btm test full` coverage.

Current VS ships diagnostic scenarios:
- Headless stability: `tools/btm test scenario vs_ships_stability --profile quick --cycles 1 --bootstrap-mode once`
- Isolation matrix: `tools/btm test scenario vs_ships_matrix --profile quick --bootstrap-mode once`
- Headful client/render lane: `tools/btm test scenario-headful vs_ships_client --profile quick --bootstrap-mode once`
- Full-family release gate: `tools/btm test scenario-headful vs_ships_release --bootstrap-mode once`

These scenarios are failure-surface discovery lanes for Valkyrien Skies, Eureka, VS: Clockwork, Trackwork, DH, and C2ME interactions. Keep them diagnostic-only: do not add progression integration, quests, balance hooks, or UX expansion as part of this lane.

## Core Rules
- Prototype freeze policy: until the user explicitly says the freeze is released, do not add new features, new progression branches, new content systems, or broad UX/theme expansions. Balance tuning is allowed, but keep it scoped to the existing systems and avoid feature drift. Limit work to stabilization, crash fixes, progression deadlock fixes, balance changes, validation/tooling fixes, packaging, questbook authoring/revision, menu clarity, and other changes required to ship or playtest the frozen prototype.
- Do not invent IDs; mark unknowns as `UNKNOWN`.
- Keep KubeJS Rhino-safe and deterministic (`kubejs:*` IDs).
- Prefer data-driven generation over copy-paste recipes.
- Remove bypasses; do not introduce deadlocks.
- Update docs when progression behavior changes.
- Commit as you make changes: after each coherent completed change, run the relevant validation, commit the finished work, and push the current branch. Do not leave completed work uncommitted or unpushed unless the user explicitly asks to hold it locally.

## Validate Before Shipping
1. `tools/btm internal check-js-syntax` for touched JS scripts.
2. Run `tools/btm doctor env` before validation if the machine/toolchain state is uncertain.
3. Run relevant `tools/btm ...` validation/build flows.
4. Confirm recipe visibility (EMI/JEI-facing paths).
5. Recheck known chokepoints (alloy, casing, grout, gates, coins/trades).
6. Record concise findings in the relevant living doc under `docs/`.

Recommended validation ladder:
1. Static checks: `tools/btm test static`.
2. Existing fresh runtime: `tools/btm test runtime --instance /path/to/fresh/runtime`.
3. Fresh server smoke for recipe/config/content changes: `tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime`.
4. Client/server scenario harnesses for stability, rendering, login, Lost Cities regression repro, or client-only work: `tools/btm test scenario ...`.

Treat runtime validation as authoritative only when it reads logs and KubeJS audit dumps from a fresh or intentionally reused current runtime. `tools/btm test runtime` and `tools/btm test smoke` run the pack suite in strict runtime mode. Add `--strict-data-dumps` only when vanilla `/dump` output such as `dump/data_raw/loot_tables` was intentionally generated; this is separate from KubeJS audit dumps under `kubejs/config`.

After changing the validation surface or evidence claims, verify `tools/btm test ...` behavior and the generated validation reports against a fresh runtime.

For runtime/tooling changes, also run:
1. `tools/btm doctor env`
2. `tools/btm build sync server --dir /tmp/btm-sync-server --dry-run`
3. `tools/btm build sync server --dir /tmp/btm-sync-server --apply`
4. `tools/btm build sync client --dir /tmp/btm-sync-client --dry-run`
5. `tools/btm build sync client --dir /tmp/btm-sync-client --apply`
6. `tools/btm test kotlin`

If `tools/btm doctor env` reports missing prerequisites, do not claim validation parity for commands that depend on them.

## Custom Mods Source (`generated/custom-mod-sources`)
Active pack-critical sources:
- `bound-to-matter-fixes` (`btmfixes`)
- `class-selector` (`classselector`)
- `create-transmission-loss` (`transmissionloss`)
- `dynamic-trees-dimension-compat` (`btmdimtrees`)
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

## Custom Mod Runtime Artifact Rule
- ForgeGradle custom mods must be deployed and validated with a reobfuscated runtime jar, not the plain development `jar` output.
- Treat `build/libs/<mod>.jar` from a plain `jar` task as a dev artifact unless the build explicitly stages the `reobfJar` output there.
- Before copying a custom mod into repo `mods/` or any disposable runtime, build the runtime artifact from `reobfJar` and verify the exact deployed file path.
- If a freshly built custom mod fails at runtime with `NoSuchMethodError`, `NoSuchFieldError`, or similar linkage errors against Minecraft/Forge classes, first suspect a non-reobfuscated jar before adding compatibility shims or source workarounds.
- Keep custom mod Forge versions aligned with the repo runtime default unless an intentional divergence is documented.
