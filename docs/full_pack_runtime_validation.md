# Full-Pack Runtime Validation

This is the current isolation loop for crash and disconnect repairs. It keeps the pack intact: DH remains enabled, and fixes are validated against a dedicated server plus Prism client rather than a degraded pack.

## Current Target

- Repo: `/home/gerald/obelisks`
- Dedicated server: `/home/gerald/obelisks/server-instance`
- Live Prism instance: `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1`
- Server port: `25566`

`Connection refused` usually means the client was pointed at the wrong port or the dedicated server is not listening yet. The local server for this instance is not on the default `25565`.

## Server Start

```bash
cd /home/gerald/obelisks/server-instance
./run.sh nogui
```

Confirm the port:

```bash
ss -ltnp | rg ':25566'
```

## Prism Quickplay Join

Use the repo helper:

```bash
cd /home/gerald/obelisks
tools/launch_prism_instance.sh "Bound to Matter-Playtest 3 - v1" --server 127.0.0.1:25566
```

Equivalent live-instance helper:

```bash
bash "/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/tools/launch_prism_instance.sh" "Bound to Matter-Playtest 3 - v1" --server 127.0.0.1:25566
```

## Client Join Probe

Use this for autonomous client-side validation. It requires the dedicated server to already be listening on `25566`.

```bash
cd /home/gerald/obelisks
START_TIMEOUT_SEC=120 JOIN_TIMEOUT_SEC=360 SETTLE_SEC=30 KEEP_CLIENT=0 tools/client_join_probe.sh
```

## Current Baseline Evidence

On 2026-05-05, the full pack was started with the live client and dedicated server using the same repaired content set. The client joined successfully after the KubeJS fluid-output fix, the AOE trading-post recipe gate, custom-mod jar repairs, and C2ME reintroduction.

Observed server-side success markers:

- `olGerald logged in`
- `olGerald joined the game`
- DH server API player join message
- No repeat of the `FluidStack cannot be empty` disconnect after the recipe fix
- Client remained connected for at least 60 seconds
- Client join probe passed at `docs/client_join_probe/20260505-180333`
- Client join probe passed at `docs/client_join_probe/20260505-202914` after temporary C2ME removal from the repo, server template, server instance, and live Prism instance
- Client join probe passed at `docs/client_join_probe/20260505-204349` after rebuilt `settlementroads` and `villagewalls` jars were deployed
- Client join probe passed at `docs/client_join_probe/20260505-205014` after the Unearthed tag sync and Creating Space/Lost Cities datapack route were deployed
- Client join probe passed at `docs/client_join_probe/20260505-205626` after the village-walls geometry safety patch was deployed
- C2ME constrained baseline passed at `docs/client_join_probe/20260505-214732`
- C2ME combined full-risk feature set passed at `docs/client_join_probe/20260505-215735`
- C2ME full-risk fresh-world server/client stress passed two cycles at `server-instance/harness-logs/summary-20260505-215931.csv`
- Server remained listening on `25566` after the probe
- No new server crash report was created during the passing probe

Previous failing signature fixed:

- The server watchdog previously hung during login in `PlayerRespawnLogic -> ServerChunkCache.redirect$zim000$beforeAwaitChunk`.
- Narrow C2ME config changes (`generalOptimizations.optimizeAsyncChunkRequest = false` and `ioSystem.async = false`) were not sufficient. Probe `docs/client_join_probe/20260505-202147` still produced `server-instance/crash-reports/crash-2026-05-05_20.24.43-server.txt`.
- Removing only C2ME from `server-instance` while leaving DH enabled made the same client join pass at `docs/client_join_probe/20260505-202657`.
- Removing C2ME from the live client and server content made the final live-state probe pass at `docs/client_join_probe/20260505-202914`.
- DH configuration was not changed.

Current C2ME decision:

- C2ME is required for the finished pack.
- Installed version tested: `c2meF-0.2.0+alpha.13-all.jar`.
- Earlier full/default C2ME deadlocked login in `PlayerRespawnLogic -> ServerChunkCache.redirect$zim000$beforeAwaitChunk`.
- Current clean repro attempts no longer reproduce that watchdog after the latest custom-mod jar deployments.
- `config/c2me.toml` currently enables the full-risk C2ME feature combination.
- Individual feature probes and the combined full-risk probe passed.
- Fresh-world stress with DH enabled and all custom mods loaded passed two server/client cycles.
- No custom mod is currently identified as incompatible with C2ME. Per-mod disable isolation should only be run after a failing full-C2ME baseline is reproduced.

## Content Sync Notes

Server-only correctness removals from dedicated server dirs:

- `holdmyitems-1.20.1v2.1.jar`
- `BetterGrassify-1.4.4+forge.1.20.1.jar`

These are client-side jars that reference client-only classes on a dedicated server. Removing them from the dedicated server is not a degraded-pack test; it is required server/client separation.

Relevant repaired custom mod jars were copied into:

- `/home/gerald/obelisks/mods/`
- `/home/gerald/obelisks/server-template/mods/`
- `/home/gerald/obelisks/server-instance/mods/`
- `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/mods/`
- `/home/gerald/.local/share/PrismLauncher/instances/Bound to Matter-Playtest 3 - v1/minecraft/server-template/mods/`

Current repaired jar hashes:

- `settlementroads-0.1.0.jar`: `c764ea4c2768e3c574415a824728b66dcb68916143cdc5d65a5fd491b47df3ce`
- `villagewalls-1.0.0.jar`: `d8dd86e9e3823cb62a16020709b6626b10fa5a47e0369e2586232489307b2efa`

The deployed copies in `mods/`, `server-template/mods/`, and `server-instance/mods/` matched these hashes when validated.

## Current Validation Commands

Last run on 2026-05-05 after the latest live/server sync:

```bash
python3 -m json.tool kubejs/data/creatingspace/creatingspace/rocket_accessible_dimension/earth_orbit.json >/dev/null
python3 -m json.tool kubejs/data/lostcities/creatingspace/rocket_accessible_dimension/lostcity.json >/dev/null
node --check kubejs/server_scripts/10_tags/20_replaceable_deepslate.js
node --check kubejs/server_scripts/30_recipe_replace/100_high_value_mod_progression_gates.js
packwiz refresh
python3 tools/packsite/build.py
START_TIMEOUT_SEC=120 JOIN_TIMEOUT_SEC=360 SETTLE_SEC=30 KEEP_CLIENT=0 tools/client_join_probe.sh
```

Pack-site summary from fresh dedicated-server runtime dumps:

```text
errors: 0
warnings: 9814
unparsed recipes: 0
missing icons: 14690
policy violation count: 0
```

## Stop

Dedicated server console:

```text
stop
```

If only process cleanup is available, identify first:

```bash
pgrep -af 'minecraft_server|net.minecraftforge.server'
pgrep -af 'PrismLauncher|prismlauncher|java.*minecraft'
```

Do not kill the live client if someone is actively using the instance.
