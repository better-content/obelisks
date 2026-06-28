#!/usr/bin/env bash

btm_require_legacy_live_tool_opt_in() {
  if [[ "${BTM_ALLOW_LEGACY_LIVE_MUTATION:-0}" != "1" ]]; then
    cat >&2 <<'MSG'
ERROR: this legacy tool mutates live Prism/server-instance state or kills broad launcher/java processes.
Set BTM_ALLOW_LEGACY_LIVE_MUTATION=1 only for an intentional archival profiling run.
Prefer disposable runtimes and tools/portable_minecraft_harness.py for current validation.
MSG
    exit 2
  fi
}
