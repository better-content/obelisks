# Runtime Validation

This document records the supported validation surface and concise current evidence. Raw worlds, logs, screenshots, crash reports, and machine summaries belong under disposable cache-backed run roots, not in the repository.

## Supported commands

```text
tools/bc doctor env
tools/bc test static
tools/bc test kotlin
tools/bc test fast
tools/bc test full
tools/bc test full --workspace
tools/bc test runtime --instance /path/to/fresh/runtime
tools/bc test unearthed-replacement --instance /path/to/fresh/runtime
tools/bc test smoke --server-dir ~/.cache/bc/content-smoke --port 25565 --reset-runtime
tools/bc test scenario opening_progression --cycles 1 --bootstrap-mode once
tools/bc test scenario progression_milestones --bootstrap-mode once
tools/bc test scenario pillager_campaigns --lane all --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile local --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile quick --bootstrap-mode once
tools/bc test scenario worldgen_sampling --profile release --bootstrap-mode once
```

`tools/bc test scenario` is the supported front door for harness-backed runtime scenarios. The public scenario surface is server/headless only.

Scenario bootstrapping uses `--bootstrap-mode always|once|never`: `always` rebuilds the disposable runtime, `once` prepares it only when absent, and `never` requires an already prepared runtime.

Workspace fanout is defined by `tools/workspace_test_inventory.json`. Use `fast` for bounded checks and `full --workspace` only when every listed source project is in scope.

Every validation effort may use at most one Minecraft save. Compatible checks must reuse that save; dimensions inside it are allowed. Tests that inherently require cloned, multi-seed, multi-cycle, A/B, or per-variant saves are incompatible and must not be run.

## Validation ladder

Run static and Kotlin checks first. For content changes, follow them with a fresh reset-runtime server smoke. Use the focused scenario lanes only where their coverage is relevant. Runtime validation is authoritative only when it reads a fresh or intentionally current runtime and the expected KubeJS audit evidence.

`tools/bc test full` covers routine server lanes: reset-runtime smoke, opening progression, and local worldgen sampling. Diagnostic isolation scenarios are not part of the routine full lane.

The smoke launcher uses a deterministic seed and captures timeout diagnostics before terminating a stalled process. A known benign ModernFix watchdog message is not classified as a pack failure; actual watchdog exits, crash reports, and fatal log signatures remain failures.

## Scenario contracts

- `opening_progression` validates the opening progression path in one disposable world.
- `progression_milestones` checks milestone commands and runtime recipe/gate evidence.
- `pillager_campaigns` covers the campaign lanes in one reusable world when invoked with `--lane all`.
- `worldgen_sampling` is the normal worldgen confidence lane. Its checked-in contract is `tools/worldgen_sampling_contract.json`; its internal server backend is not a separate public scenario.
- Worldgen sampling retains contract coverage for settlement-roads, village-walls, and Hyle generation surfaces in the single disposable world.

Do not make a diagnostic pass by disabling the feature being tested in source.

## Current evidence

On 2026-07-19 the pack passed static validation, Kotlin tooling tests, a fresh reset-runtime server smoke with zero soft findings and zero tick-behind warnings, opening progression, progression milestones, all Pillager Campaigns lanes, local worldgen sampling, and the quick VS server stability lane. The quick VS isolation matrix also passed before the one-world restriction was adopted; retain that result as historical evidence only.

All 20 active custom-mod source projects built their meaningful verification lanes and reobfuscated runtime artifacts successfully. The deployed pack jars were checked against those runtime artifacts before smoke validation.

The Lost Cities guarded control and targeted unguarded reproduction both produced the expected classifiers before the one-world restriction was adopted. This remains historical diagnostic evidence and is not a current runnable contract.

The public headed/client scenario family was removed on 2026-07-19 by explicit direction. It is not part of the supported validation surface or release claims.

## Release evidence

Release bundles must be produced through `tools/bc build bundle release --exports-dir PATH`. The command refreshes packwiz metadata, runs static checks, verifies required archive entries including the tracked root `options.txt`, and normally performs a fresh server smoke. `--skip-smoke` is acceptable only when an equivalent current fresh-runtime result is intentionally reused and must be reported as such.
