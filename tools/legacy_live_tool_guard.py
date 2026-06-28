#!/usr/bin/env python3
"""Opt-in guard for legacy tools that mutate live runtime state."""

from __future__ import annotations

import os
import sys


def require_legacy_live_tool_opt_in() -> None:
    if os.environ.get("BTM_ALLOW_LEGACY_LIVE_MUTATION") == "1":
        return
    print(
        "ERROR: this legacy tool mutates live Prism/server-instance state or "
        "kills broad launcher/java processes.\n"
        "Set BTM_ALLOW_LEGACY_LIVE_MUTATION=1 only for an intentional archival "
        "profiling run.\n"
        "Prefer disposable runtimes and tools/portable_minecraft_harness.py for "
        "current validation.",
        file=sys.stderr,
    )
    raise SystemExit(2)
