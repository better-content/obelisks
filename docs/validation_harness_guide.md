# Validation Harness Guide

This repo has two validation layers: quick source checks and disposable Minecraft runtimes. Prefer `/tmp` runtimes for agent work; `server-instance/` is generated state and should not be committed or treated as source truth.

## Routine Content Smoke

Use this for KubeJS recipe, tag, config, data, loot, and progression edits:

```sh
tools/server_content_smoke.sh --server-dir /tmp/btm-content-smoke --port 25566 --reset-runtime
```

The wrapper performs the common end-to-end path:

- bootstrap and sync a disposable dedicated server;
- resolve Packwiz downloads and prune stale runtime mods;
- launch until the Forge dedicated server reaches `Done`;
- stop cleanly;
- scan the runtime log for hard failures;
- run `BTM_INSTANCE=/tmp/btm-content-smoke node tools/pack_test_suite.mjs`.

Full bootstrap and server output is kept under `/tmp/btm-content-smoke/validation-evidence/<stamp>/`. The terminal output is intentionally compact.

## Existing Runtime Checks

When a fresh runtime already exists, use:

```sh
BTM_INSTANCE=/tmp/btm-content-smoke node tools/pack_test_suite.mjs
tools/log_hard_failure_scan.mjs --instance /tmp/btm-content-smoke --log /tmp/btm-content-smoke/logs/latest.log
```

The suite is meaningful only when the runtime log is recent and matches the content being validated. A stale green report is not proof after KubeJS or pack manifest changes.

## Scenario Harnesses

Use `tools/portable_minecraft_harness.py` through scenario wrappers when the test needs both server and client behavior or scripted gameplay pressure. Current LC/DH/TFTH scenario:

```sh
python3 tools/lc_tfth_c2me_dh_stability.py --cycles 1 --idle-seconds 30 --tfth-seconds 30
```

Scenario wrappers should keep raw logs and worlds under `/tmp`, write compact summaries under `docs/<scenario>/<stamp>/`, and avoid disabling the feature being tested.

## Failure Interpretation

Hard failures include KubeJS recipe parse errors, nonzero failed recipe counts, invalid empty fluids, crash report markers, JVM fatal errors, ModernFix watchdogs, and C2ME thread-guard signatures. These are scanned by `tools/log_hard_failure_scan.mjs` and by `tools/pack_test_suite.mjs`.

Common noisy warnings from mixins, optional loot tooltip support, missing optional client classes on a dedicated server, or unsupported AdvancedLootInfo tooltip factories are not automatically fatal unless they match the hard-failure scan.

Some generated recipe graph checks are skipped because the current KubeJS dump is a pre-mutation audit. Use the content smoke wrapper to prove the actual runtime recipe parse phase.
