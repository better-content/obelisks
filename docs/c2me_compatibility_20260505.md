# C2ME Compatibility - 2026-05-05

C2ME is required for the finished product. It should not be treated as permanently removed.

## Installed Version

- Jar: `c2meF-0.2.0+alpha.13-all.jar`
- Mod ID/version in runtime logs: `c2me`, `0.2.0+alpha.13`
- SHA-1: `f70f85cfd8bfdc94bf608c7f527bb5f1fa8d1776`
- SHA-256: `d654177296bfcc4ab936c3d6d59816e6bc1ffd42c81cd60728c553aef18a62c9`

## Failure Evidence

Full/default C2ME caused login deadlock/watchdog failures in this pack.

Known failing signature:

- `PlayerRespawnLogic -> ServerChunkCache.redirect$zim000$beforeAwaitChunk`
- `server-instance/crash-reports/crash-2026-05-05_20.24.43-server.txt`
- Client join probe: `docs/client_join_probe/20260505-202147`

Earlier logs also showed repeated C2ME world-random thread ownership warnings from:

- `com.ishland.c2me.fixes.worldgen.threading_issues.common.CheckedThreadLocalRandom`

## Current Passing Configuration

C2ME is present and the full-risk feature combination is currently enabled in:

- `config/c2me.toml`

Enabled:

- `generalOptimizations.optimizeAsyncChunkRequest`
- `threadedWorldGen.enabled`
- `threadedWorldGen.allowThreadedFeatures`
- `threadedWorldGen.reduceLockRadius`
- `threadedWorldGen.asyncScheduling`
- `ioSystem.async`
- `noTickViewDistance.enabled`
- `fixes.enforceSafeWorldRandomAccess`

Validated:

- Constrained baseline client join passed: `docs/client_join_probe/20260505-214732`.
- `threaded_worldgen_no_features` client join passed: `docs/client_join_probe/20260505-215001`.
- `threaded_worldgen_features` client join passed: `docs/client_join_probe/20260505-215228`.
- `safe_world_random_enforcement` client join passed: `docs/client_join_probe/20260505-215451`.
- Combined `all_risky_features` client join passed: `docs/client_join_probe/20260505-215735`.
- Full C2ME + DH + all custom mods passed two fresh-world server/client cycles:
  - `server-instance/harness-logs/summary-20260505-215931.csv`
  - cycle 1: `OK_WITH_CLIENT`, server done `53.893s`, joined.
  - cycle 2: `OK_WITH_CLIENT`, server done `54.779s`, joined.
- The fresh-world stress logs did not contain `CheckedThreadLocalRandom`, `handleNotOwner`, `ServerHangWatchdog`, `beforeAwaitChunk`, or custom-mod crash stack traces.
- DH config was not changed.

## Current Diagnosis

No custom mod is currently identified as incompatible with C2ME from the clean repro sequence.

The earlier watchdog remains real evidence, but it is not currently reproducible after the latest custom-mod jar deployments and clean harness runs. The most likely explanations are:

1. The earlier crash was fixed by subsequent custom-mod jar changes.
2. The earlier crash was an intermittent C2ME/DH/chunk-access race that needs longer stress to reproduce.
3. The earlier crash depended on stale world/chunk state that was not present in the fresh-world harness.

## Follow-Up Isolation Rule

Only run one-custom-mod-disabled isolation after a failing full-C2ME baseline is reproduced. Passing-with-disabled-mod does not identify a culprit unless the same test fails with all custom mods enabled.

Use:

```bash
C2ME_VARIANTS=all_risky_features C2ME_DISABLED_MODS=villagewalls python3 tools/c2me_feature_matrix.py
```

or rerun fresh-world stress:

```bash
python3 - <<'PY'
from tools.c2me_feature_matrix import sync_config, render_config, VARIANTS
sync_config(render_config(VARIANTS['all_risky_features']))
PY
WITH_CLIENT=1 BTM_POST_DONE_WAIT_SEC=45 CLIENT_STARTUP_SEC=240 CLIENT_CONNECT_TIMEOUT_SEC=540 tools/server_worldgen_harness.sh /home/gerald/obelisks/server-instance 2 480 25565
```

Do not blame a custom mod without a fail/pass contrast from the same C2ME variant.
