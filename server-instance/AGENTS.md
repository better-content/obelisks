# Server Runtime Notes

## Scope
This directory is a generated dedicated-server runtime for the Bound To Matter Forge 1.20.1 pack. It can be distributed or launched, but it is not the authoritative content source.

Authoritative pack content lives in the repo root under `kubejs/`, `config/`, `defaultconfigs/`, `datapacks/`, `globalresources/`, `resourcepacks/`, `shaderpacks/`, `mods/*.pw.toml`, bundled custom jars in `mods/`, the five living docs under `docs/`, and `tools/`.

## Runtime State
Treat worlds, saves, logs, crash reports, profiler output, local launcher/cache files, and player options as runtime state. Do not delete or sync them back to source unless the user explicitly asks for a disposable reset or a runtime investigation.

Some `.txt` files in this tree are real config or launcher inputs. Classify files by path and purpose, not by extension.

## Supported Operations
Use the root `tools/btm` commands from the repository root:

- Sync dry run: `tools/btm build sync server --dir server-instance --dry-run`
- Sync apply: `tools/btm build sync server --dir server-instance --apply`
- Runtime inspection: `tools/btm doctor runtime --instance server-instance`
- Fresh smoke validation: `tools/btm test smoke --server-dir /tmp/btm-content-smoke --port 25565 --reset-runtime`

Do not rely on retired shell, Python, or Node launch/sync scripts as the public workflow.

## Editing Guidance
Prefer editing source files at the repo root and syncing this runtime afterward. Direct edits in `server-instance/` are appropriate only for local diagnosis, temporary server operation, or explicitly requested distributable cleanup.

Keep KubeJS deterministic and Rhino-safe. Keep config files strict to their mod format; many mods silently fall back to defaults after malformed JSON/TOML/TXT config.
