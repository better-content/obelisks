# Tool Migration Matrix

## Supported Front Door

Use `tools/btm` for all supported repo workflows.

Public commands:
- `tools/btm doctor ...`
- `tools/btm test ...`
- `tools/btm build ...`
- `tools/btm internal ...` for checked-in validator and maintenance entrypoints that are intentionally exposed through `btm`

## Repo Policy

The Kotlin-backed `tools/btm` surface is the maintained interface for pack work.

Active repo tooling under `tools/` is Kotlin-first. Active `tools/` source files must not use `.py` or `.sh`; `tools/btm test static` now enforces that through `tools/btm internal validate-kotlin-tool-surface`.

Legacy shell, Python, Node, and one-off generators live under `tools/quarantine/` only. They are not the user-facing contract unless a current Kotlin `tools/btm` command explicitly routes through them as a compatibility backend.

## Current State

| Area | Supported Entry | Notes |
| --- | --- | --- |
| Environment checks | `tools/btm doctor env` | Authoritative prerequisite check |
| Repo checks | `tools/btm doctor repo` | Source-shape and policy checks |
| Runtime checks | `tools/btm doctor runtime --instance ...` | Fresh runtime inspection |
| Static validation | `tools/btm test static` | Source plus retained generated-dump checks |
| Runtime validation | `tools/btm test runtime --instance ...` | Strict runtime evidence |
| Fresh smoke | `tools/btm test smoke --server-dir ... --reset-runtime` | Disposable server bootstrap and strict runtime suite |
| Scenario harnesses | `tools/btm test scenario ...` | Portable server/client scenarios |
| Versioned scenario contracts | `tools/worldgen_sampling_contract.json`, `tools/client_smoke_contract.json` | Checked-in quick/release lane contracts |
| Sync server/client | `tools/btm build sync server ...`, `tools/btm build sync client ...` | Supported sync flows |
| Bundle export | `tools/btm build bundle ...` | Supported export flows |

## Legacy Status

- `tools/quarantine/original-tools/` is archival only.
- Previously active `tools/*.py` and `tools/*.sh` sources have been quarantined.
- Kotlin wrapper scenarios under `tools/kotlin/` are the supported entrypoints for LC/TFTH/DH, dimension worldgen, opening progression, worldgen sampling, and client smoke.
- Validation and documentation should describe the `btm` commands, not the legacy direct entrypoints.
