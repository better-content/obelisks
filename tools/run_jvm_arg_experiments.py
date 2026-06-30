#!/usr/bin/env python3
"""Run joined RSS profiles for JVM-args-only variants.

The script temporarily edits the Prism instance memory/JVM settings and the
dedicated server user_jvm_args.txt, runs the existing joined profile harness,
then restores the original files.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in

require_legacy_live_tool_opt_in()


ROOT = Path("/home/gerald/obelisks")
INSTANCE = Path.home() / ".local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1"
INSTANCE_CFG = INSTANCE / "instance.cfg"
SERVER_JVM_ARGS = ROOT / "server-instance/user_jvm_args.txt"
PHASES_FILE = Path(os.environ.get("PHASES_FILE", str(ROOT / "generated" / "validation" / "trimmed_repo_stack_join_phase_20260506.json")))
OUT_BASE = Path(os.environ.get("OUT_BASE", "/tmp/btm-ram-profile"))


@dataclass(frozen=True)
class Variant:
    name: str
    min_mem_mb: int
    max_mem_mb: int
    extra_args: str


VARIANTS = [
    Variant(
        "xmx7g_thp_off",
        2000,
        7168,
        "-XX:-UseTransparentHugePages",
    ),
    Variant(
        "xmx6g_thp_off",
        2000,
        6144,
        "-XX:-UseTransparentHugePages",
    ),
    Variant(
        "xmx5g_thp_off",
        2000,
        5120,
        "-XX:-UseTransparentHugePages",
    ),
    Variant(
        "xmx6g_thp_off_string_dedup",
        2000,
        6144,
        "-XX:-UseTransparentHugePages -XX:+UseStringDeduplication",
    ),
    Variant(
        "xmx7g_thp_off_g1_early",
        2000,
        7168,
        "-XX:-UseTransparentHugePages -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=30",
    ),
]


def set_cfg_value(lines: list[str], key: str, value: str) -> list[str]:
    prefix = key + "="
    for i, line in enumerate(lines):
        if line.startswith(prefix):
            lines[i] = prefix + value
            return lines
    lines.append(prefix + value)
    return lines


def write_instance_cfg(variant: Variant) -> None:
    lines = INSTANCE_CFG.read_text().splitlines()
    updates = {
        "OverrideMemory": "true",
        "MinMemAlloc": str(variant.min_mem_mb),
        "MaxMemAlloc": str(variant.max_mem_mb),
        "OverrideJavaArgs": "true",
        "JvmArgs": variant.extra_args,
    }
    for key, value in updates.items():
        lines = set_cfg_value(lines, key, value)
    INSTANCE_CFG.write_text("\n".join(lines) + "\n")


def write_server_args(variant: Variant) -> None:
    args = [
        f"-Xms{variant.min_mem_mb}M",
        f"-Xmx{variant.max_mem_mb}M",
        *variant.extra_args.split(),
    ]
    SERVER_JVM_ARGS.write_text("\n".join(args) + "\n")


def run_variant(variant: Variant) -> dict[str, object]:
    write_instance_cfg(variant)
    write_server_args(variant)
    env = os.environ.copy()
    env.update(
        {
            "PHASES_FILE": str(PHASES_FILE),
            "STAMP": f"jvm_{variant.name}_20260506",
            "BASELINE_REPEATS": "1",
            "SETTLE_SEC": "75",
            "JOIN_TIMEOUT_SEC": "660",
            "BOOT_TIMEOUT_SEC": "480",
            "CLIENT_OFFLINE": "1",
            "CLIENT_USERNAME": "RamProbe",
        }
    )
    subprocess.run(
        ["python3", "tools/joined_memory_cross_section.py"],
        cwd=ROOT,
        env=env,
        text=True,
        check=False,
    )
    summary_path = OUT_BASE / f"joined_cross_section_jvm_{variant.name}_20260506/joined_cross_section_summary.json"
    if not summary_path.exists():
        return {"variant": variant.name, "status": "NO_SUMMARY"}
    summary = json.loads(summary_path.read_text())
    result = summary[0] if summary else {"status": "EMPTY_SUMMARY"}
    result["variant"] = variant.name
    result["client_min_mb"] = variant.min_mem_mb
    result["client_max_mb"] = variant.max_mem_mb
    result["extra_args"] = variant.extra_args
    return result


def main() -> int:
    backup_dir = OUT_BASE / "jvm_arg_experiment_backups_20260506"
    backup_dir.mkdir(parents=True, exist_ok=True)
    cfg_backup = backup_dir / "instance.cfg.original"
    server_backup = backup_dir / "user_jvm_args.txt.original"
    shutil.copy2(INSTANCE_CFG, cfg_backup)
    shutil.copy2(SERVER_JVM_ARGS, server_backup)
    results = []
    try:
        variant_filter = os.environ.get("VARIANT_FILTER", "")
        variants = VARIANTS
        if variant_filter:
            regex = re.compile(variant_filter)
            variants = [variant for variant in variants if regex.search(variant.name)]
        for variant in variants:
            print(f"variant={variant.name}", flush=True)
            results.append(run_variant(variant))
    finally:
        shutil.copy2(cfg_backup, INSTANCE_CFG)
        shutil.copy2(server_backup, SERVER_JVM_ARGS)
    out = OUT_BASE / "jvm_arg_experiment_results_20260506.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"results={out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
