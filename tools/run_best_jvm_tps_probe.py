#!/usr/bin/env python3
"""Run a server TPS probe using the best JVM args found so far."""

from __future__ import annotations

import os
import re
import shutil
import signal
import subprocess
import time
from datetime import datetime
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in

require_legacy_live_tool_opt_in()


ROOT = Path("/home/gerald/obelisks")
SERVER_DIR = ROOT / "server-instance"
SERVER_JVM_ARGS = SERVER_DIR / "user_jvm_args.txt"
INSTANCE_NAME = "Better Content-Playtest 4 - v1"
INSTANCE_CFG = Path.home() / ".local/share/PrismLauncher/instances" / INSTANCE_NAME / "instance.cfg"
LIVE_MODS = Path.home() / ".local/share/PrismLauncher/instances" / INSTANCE_NAME / "minecraft/mods"
SERVER_MODS = SERVER_DIR / "mods"
OUT_BASE = Path(os.environ.get("OUT_BASE", "/tmp/btm-ram-profile"))
CLIENT_JOIN_PROBE = ROOT / "tools/client_join_probe.sh"
SERVER_PORT = "25565"
DISABLED_SUFFIX = ".tps-probe-disabled"


BEST_ARGS = os.environ.get("TPS_PROBE_JVM_ARGS", "-XX:-UseTransparentHugePages")
BEST_XMS_MB = int(os.environ.get("TPS_PROBE_XMS_MB", "2000"))
BEST_XMX_MB = int(os.environ.get("TPS_PROBE_XMX_MB", "5120"))
STAMP_LABEL = os.environ.get("TPS_PROBE_LABEL", "best_jvm")
OUT_DIR = OUT_BASE / f"tps_{STAMP_LABEL}_{datetime.now().strftime('%Y%m%d-%H%M%S')}"


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, check=False, **kwargs)


def children_of(pid: int) -> list[int]:
    children: list[int] = []
    result = run(["pgrep", "-P", str(pid)], stdout=subprocess.PIPE)
    for child in result.stdout.split():
        child_pid = int(child)
        children.append(child_pid)
        children.extend(children_of(child_pid))
    return children


def kill_tree(pid: int) -> None:
    if pid <= 0:
        return
    pids = [pid, *children_of(pid)]
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for proc_id in pids:
            try:
                os.kill(proc_id, sig)
            except ProcessLookupError:
                pass
        time.sleep(1)


def cleanup_processes() -> None:
    patterns = [
        r"org\.prismlauncher\.EntryPoint",
        r"PrismLauncher",
        r"minecraft-1\.20\.1-client",
        r"unix_args\.txt",
        r"forgeserver",
    ]
    for pattern in patterns:
        result = run(["pgrep", "-af", pattern], stdout=subprocess.PIPE)
        for line in result.stdout.splitlines():
            parts = line.split(maxsplit=1)
            if parts and parts[0].isdigit() and int(parts[0]) != os.getpid():
                kill_tree(int(parts[0]))


def mirror_client_mods_to_server() -> list[tuple[Path, Path]]:
    """Temporarily disable live-client jars that are absent from server mods."""
    server_jars = {path.name for path in SERVER_MODS.glob("*.jar")}
    moved: list[tuple[Path, Path]] = []
    for jar in sorted(LIVE_MODS.glob("*.jar")):
        if jar.name in server_jars:
            continue
        disabled = jar.with_name(jar.name + DISABLED_SUFFIX)
        if disabled.exists():
            continue
        jar.rename(disabled)
        moved.append((disabled, jar))
    return moved


def restore_client_mods(moved: list[tuple[Path, Path]]) -> None:
    for disabled, original in reversed(moved):
        if disabled.exists() and not original.exists():
            disabled.rename(original)


def set_cfg_value(lines: list[str], key: str, value: str) -> list[str]:
    prefix = key + "="
    for i, line in enumerate(lines):
        if line.startswith(prefix):
            lines[i] = prefix + value
            return lines
    lines.append(prefix + value)
    return lines


def apply_best_jvm_args() -> None:
    lines = INSTANCE_CFG.read_text().splitlines()
    updates = {
        "OverrideMemory": "true",
        "MinMemAlloc": str(BEST_XMS_MB),
        "MaxMemAlloc": str(BEST_XMX_MB),
        "OverrideJavaArgs": "true",
        "JvmArgs": BEST_ARGS,
    }
    for key, value in updates.items():
        lines = set_cfg_value(lines, key, value)
    INSTANCE_CFG.write_text("\n".join(lines) + "\n")
    SERVER_JVM_ARGS.write_text(
        "\n".join([f"-Xms{BEST_XMS_MB}M", f"-Xmx{BEST_XMX_MB}M", BEST_ARGS]) + "\n"
    )


def wait_for_server(log_path: Path, timeout_sec: int = 480) -> bool:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        text = log_path.read_text(errors="replace") if log_path.exists() else ""
        if "Done (" in text:
            return True
        if re.search(r"Mod Loading has failed|Failed to start the minecraft server|Encountered an unexpected exception", text):
            return False
        time.sleep(1)
    return False


def run_client_join() -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.update(
        {
            "ROOT": str(ROOT),
            "SERVER_DIR": str(SERVER_DIR),
            "PRISM_INSTANCE": INSTANCE_NAME,
            "SERVER_PORT": SERVER_PORT,
            "OUT_DIR": str(OUT_DIR / "client_join_probe"),
            "SETTLE_SEC": "10",
            "JOIN_TIMEOUT_SEC": "660",
            "CLIENT_OFFLINE": "1",
            "CLIENT_USERNAME": "TpsProbe",
            "KEEP_CLIENT": "1",
        }
    )
    return run([str(CLIENT_JOIN_PROBE)], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def issue_command(proc: subprocess.Popen[str], command: str) -> None:
    if proc.stdin is None:
        return
    proc.stdin.write(command + "\n")
    proc.stdin.flush()


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cfg_backup = OUT_DIR / "instance.cfg.original"
    server_backup = OUT_DIR / "user_jvm_args.txt.original"
    shutil.copy2(INSTANCE_CFG, cfg_backup)
    shutil.copy2(SERVER_JVM_ARGS, server_backup)

    server_log = OUT_DIR / "server-console.log"
    moved_client_mods: list[tuple[Path, Path]] = []
    try:
        cleanup_processes()
        moved_client_mods = mirror_client_mods_to_server()
        (OUT_DIR / "temporarily_disabled_client_jars.txt").write_text(
            "\n".join(str(original.name) for _, original in moved_client_mods) + "\n"
        )
        apply_best_jvm_args()
        with server_log.open("w") as log_file:
            server = subprocess.Popen(
                ["./run.sh", "nogui"],
                cwd=SERVER_DIR,
                stdin=subprocess.PIPE,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
        try:
            if not wait_for_server(server_log):
                (OUT_DIR / "summary.txt").write_text("status=FAIL\nreason=server_boot_failed\n")
                return 1

            join = run_client_join()
            (OUT_DIR / "client_join_probe_stdout.log").write_text(join.stdout)
            if join.returncode != 0:
                (OUT_DIR / "summary.txt").write_text("status=FAIL\nreason=client_join_failed\n")
                return 1

            samples = 10
            interval_sec = 30
            issue_command(server, "debug start")
            for i in range(samples):
                issue_command(server, f"say TPS probe sample {i + 1}/{samples}")
                issue_command(server, "forge tps")
                time.sleep(interval_sec)
            issue_command(server, "debug stop")
            time.sleep(5)
            (OUT_DIR / "summary.txt").write_text(
                "\n".join(
                    [
                        "status=PASS",
                        "reason=tps_samples_collected",
                        f"samples={samples}",
                        f"interval_sec={interval_sec}",
                        f"jvm_args=-Xms{BEST_XMS_MB}M -Xmx{BEST_XMX_MB}M {BEST_ARGS}",
                        f"server_log={server_log}",
                    ]
                )
                + "\n"
            )
            return 0
        finally:
            kill_tree(server.pid)
            cleanup_processes()
    finally:
        restore_client_mods(moved_client_mods)
        shutil.copy2(cfg_backup, INSTANCE_CFG)
        shutil.copy2(server_backup, SERVER_JVM_ARGS)
        print(f"out_dir={OUT_DIR}")


if __name__ == "__main__":
    raise SystemExit(main())
