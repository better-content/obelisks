# AGENTS.md

## Scope
This repo is the expert-pack content layer for Forge 1.20.1: KubeJS recipes/gates, quest content, config balancing, and validation tooling.

## Headlining Systems
- Bounded matter economy: geological deposits, Y-band locality, processing ladders.
- Dual crafting spines: Tinkers/Create tech spine and Blood Magic-parented magic spine.
- Adventure spine: dimension_drink/dimensions/combat feeding progression.
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
- the tracked repo-root `options.txt`, which is the curated client-default baseline and must ship in client/CurseForge bundles
- `docs/` five living Markdown summaries only
- `tools/`

Treat these as generated or runtime state:
- `server-instance/`
- `server-template/`
- local client game directories
- `generated/runtime-dumps/`, `generated/mod-sync-backup/`, `generated/ftbquests/`
- worlds, saves, logs, crash reports, screenshots, profiler dumps, launcher account/cache files, and runtime-generated `options.txt` files outside the repo root

Do not sync or delete player/runtime state by default. The tracked repo-root `options.txt` is the explicit exception: preserve it as source and include it in client-facing pack exports. Use explicit reset flags only when the user asks for a disposable runtime.

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
- `tools/`: source validation, build, and packaging tooling
- `server-instance/`: generated dedicated server runtime; sync from source before launching

## Supported Tool Surface
- Launcher: `tools/bc`
- Validation: `tools/bc test static`
- Kotlin test runner: `tools/bc test kotlin`
- Fast workspace checks: `tools/bc test fast`
- One-world server/client smoke: `tools/bc test smoke --bootstrap-mode always`
- Graph adjacency query: `tools/bc graph item ITEM_ID [--producers|--consumers|--all] [--limit N] [--type RECIPE_TYPE] [--graph PATH]`
- Graph route query: `tools/bc graph route ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH]`
- Graph blocker query: `tools/bc graph blockers ITEM_ID [--graph PATH] [--sources PATH] [--spine PATH] [--limit N]`
- Server sync dry run: `tools/bc build sync server --dir server-instance --dry-run`
- Server sync apply: `tools/bc build sync server --dir server-instance --apply`
- Client sync dry run: `tools/bc build sync client --dir /path/to/client --dry-run`
- Client sync apply: `tools/bc build sync client --dir /path/to/client --apply`
- CurseForge bundle export: `tools/bc build bundle curseforge`
- Complete server bundle export: `tools/bc build bundle server`
- Release bundle export: `tools/bc build bundle release --exports-dir /path/to/exports`
- Environment checks: `tools/bc doctor env`
- Repo checks: `tools/bc doctor repo`
- Runtime inspection: `tools/bc doctor runtime --instance /path/to/fresh/runtime`

The supported public contract is the `bc` tree only. Legacy shell, Python, and Node entrypoints remain as internal implementation detail until their Kotlin replacements land; do not teach or depend on them as the front door.
`tools/bc graph ...` is the supported agent-facing graph navigation API. It is Kotlin-backed, JSON-first through the global `--json` envelope, and depends on retained runtime evidence in `generated/runtime-dumps/recipes.json` plus the progression inputs under `kubejs/config/`.
Outside `kubejs/`, JavaScript is transitional only where an existing pack/runtime integration requires it. Do not add new `.js` or `.mjs` entrypoints under `tools/`. New non-KubeJS automation should default to Kotlin under the `bc` surface or to internal Kotlin support scripts it calls.
The active tooling surface is Kotlin-first. If you find legacy Node-era instructions or generated metadata, treat them as cleanup debt and port them to Kotlin instead of extending them.
Original shell/Python tools are quarantined under `tools/quarantine/original-tools/` for archival reference. Do not move them back into the active `tools/` root.

## Release Bundle Workflow
- Use `tools/bc build bundle release --exports-dir /path/to/exports` as the normal front door when the user asks for fresh or tested ZIPs. Do not reproduce this workflow with a disposable Git worktree, direct `packwiz` calls, manual archive assembly, or copied ignored artifacts.
- Keep the persistent pack version in `pack.toml` as `Playtest v<N>`. The full release command must reserve the next integer before building and name the matched outputs `better-content-playtest-v<N>-curseforge.zip` and `better-content-playtest-v<N>-server.zip`. Never reuse or overwrite a release number, never hand-edit a release ZIP back to an earlier version, and report the reserved version with both artifacts.
- If the full workflow fails after reserving a version but before creating either matched archive, repair the source failure and resume that exact reservation with `tools/bc build bundle release --resume-current ...`. The resume path must refuse to run if either archive already exists; do not increment again merely to recover from a pre-export validation failure.
- The release command operates on the current source tree intentionally. It refreshes packwiz metadata, runs static validation, builds the CurseForge/client and complete-server ZIPs, and verifies required archive entries (including the tracked root `options.txt`).
- Keep release outputs under `generated/exports/` or another path outside the repo. Repo-root `exports/` is ignored and contract-forbidden from `index.toml` so packwiz cannot recursively package previous ZIPs or server trees.
- Review the working tree before running it. Packwiz refresh updates `index.toml` and `pack.toml` to match all current indexed source files. Preserve unrelated edits, and commit the source changes together with their refreshed manifest hashes; never commit manifest hashes that refer to source changes left outside the commit.
- Do not call ZIP integrity or static validation a runtime test.
- The release command uses repo-root ignored prerequisites such as the Forge installer, shader ZIP, and bundled custom jars. If one is missing, repair the real source/prerequisite state; do not construct a partial worktree and discover ignored inputs one at a time.
- On success, report both exact archive paths, sizes, SHA-256 checksums, and which validation tiers actually ran. Keep routine Forge installer output suppressed; surface captured output only on failure.

## Tool Prerequisites
- Run `tools/bc doctor env` before claiming the toolchain is usable.
- Current practical prerequisites for supported workflows include:
  - `kotlin`
  - `java` with Java 17
  - `rg`
  - `packwiz` for bundle export flows
- Treat `tools/bc doctor env` as authoritative when a command fails due to missing local dependencies.
- `tools/bc` is the only supported front door. Archived compatibility shims may remain under `tools/quarantine/`, but supported `test`, `build`, and `doctor` flows should not depend on them or be taught as live entrypoints.
- KubeJS scripts are the only normal place for pack-authored JavaScript. Repo tooling should be Kotlin unless the user explicitly asks for a quarantined compatibility path.

## Runtime Test Surface
The sole runtime test is `tools/bc test smoke`. It uses one disposable dedicated-server world and one Xvfb-backed client, verifies boot, join, a bounded settled connection, clean disconnect/server stop, and hard-log health. Do not add scenario matrices, cloned worlds, multi-cycle runs, or worldgen statistics until separately designed.

## Core Rules
- Prototype freeze policy: until the user explicitly says the freeze is released, do not add new features, new progression branches, new content systems, or broad UX/theme expansions. Balance tuning is allowed, but keep it scoped to the existing systems and avoid feature drift. Limit work to stabilization, crash fixes, progression deadlock fixes, balance changes, validation/tooling fixes, packaging, questbook authoring/revision, menu clarity, and other changes required to ship or playtest the frozen prototype.
- A future runtime validation effort may use at most one Minecraft save/world. Do not add it until the replacement suite is designed.
- Do not invent IDs; mark unknowns as `UNKNOWN`.
- Keep KubeJS Rhino-safe and deterministic (`kubejs:*` IDs).
- Prefer data-driven generation over copy-paste recipes.
- Remove bypasses; do not introduce deadlocks.
- Update docs when progression behavior changes.
- Commit as you make changes: after each coherent completed change, run the relevant validation, commit the finished work, and push the current branch. Do not leave completed work uncommitted or unpushed unless the user explicitly asks to hold it locally.

## Validate Before Shipping
1. `tools/bc internal check-js-syntax` for touched JS scripts.
2. Run `tools/bc doctor env` before validation if the machine/toolchain state is uncertain.
3. Run relevant `tools/bc ...` validation/build flows.
4. Confirm recipe visibility (EMI/JEI-facing paths).
5. Recheck known chokepoints (alloy, casing, grout, gates, coins/trades).
6. Record concise findings in the relevant living doc under `docs/`.

Recommended validation ladder:
1. Static checks: `tools/bc test static`.
2. Kotlin checks: `tools/bc test kotlin`.
3. Fast source workspace checks when relevant: `tools/bc test fast`.

Treat the smoke as lifecycle/network evidence only; it is not a gameplay, worldgen-distribution, or visual-quality claim.

For runtime/tooling changes, also run:
1. `tools/bc doctor env`
2. `tools/bc build sync server --dir ~/.cache/bc/sync-server --dry-run`
3. `tools/bc build sync server --dir ~/.cache/bc/sync-server --apply`
4. `tools/bc build sync client --dir ~/.cache/bc/sync-client --dry-run`
5. `tools/bc build sync client --dir ~/.cache/bc/sync-client --apply`
6. `tools/bc test kotlin`

If `tools/bc doctor env` reports missing prerequisites, do not claim validation parity for commands that depend on them.

## Custom Mods Source (`generated/custom-mod-sources`)
Active pack-critical sources:
- `better-content-fixes` (`bcfixes`)
- `class-selector` (`classselector`)
- `create-transmission-loss` (`transmissionloss`)
- `dynamic-trees-dimension-compat` (`bcdimtrees`)
- `dynamic-trees-hexerei` (`dthexerei`)
- `dynamic-trees-malum` (`dtmalum`)
- `heat-sync` (`heatsync`)
- `latent_chemlib` (`latent_chemlib`)
- `dimension-drink` (`dimension_drink`)
- `oc2r-create-bridge` (`computerbridge`)
- `oc2rwireless-global-pubsub-addon` (`oc2rwireless`)
- `pillager-campaigns` (`pillagercampaigns`)
- `procedural-bouquets` (`procedural_bouquets`)
- `realistic-ores` (`realisticores`)
- `revival` (`revival`)
- `rpg-stats` (`rpgstats`)
- `settlement-roads` (`settlementroads`)
- `tcon-affixes` (`tconaffixes`)
- `village-walls` (`villagewalls`)

Note: `settlementroads` appears in multiple dirs; use `generated/custom-mod-sources/settlement-roads` as canonical unless explicitly told otherwise.

Override source root for alternate environments with `BC_CUSTOM_MODS_DIR`.

## Custom Mod Runtime Artifact Rule
- ForgeGradle custom mods must be deployed and validated with a reobfuscated runtime jar, not the plain development `jar` output.
- Treat `build/libs/<mod>.jar` from a plain `jar` task as a dev artifact unless the build explicitly stages the `reobfJar` output there.
- Before copying a custom mod into repo `mods/` or any disposable runtime, build the runtime artifact from `reobfJar` and verify the exact deployed file path.
- If a freshly built custom mod fails at runtime with `NoSuchMethodError`, `NoSuchFieldError`, or similar linkage errors against Minecraft/Forge classes, first suspect a non-reobfuscated jar before adding compatibility shims or source workarounds.
- Keep custom mod Forge versions aligned with the repo runtime default unless an intentional divergence is documented.
