#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import shutil
import signal
import socket
import subprocess
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Pattern


@dataclass(frozen=True)
class HarnessConfig:
    name: str
    slug: str
    description: str
    docs_subdir: str
    default_run_parent: Path
    required_jars: dict[str, Pattern[str]]
    fatal_patterns: dict[str, Pattern[str]]
    activity_patterns: dict[str, Pattern[str]] = field(default_factory=dict)
    username: str = "AgentClient"
    default_port: int = 25565
    default_cycles: int = 1
    default_boot_timeout: int = 900
    default_join_timeout: int = 900
    default_min_free_gb: float = 8.0
    default_max_old_runs: int = 3


@dataclass
class CycleResult:
    index: int
    status: str = "FAIL"
    phases: list[str] = field(default_factory=list)
    failure_class: str | None = None
    reason: str | None = None
    server_dir: str | None = None
    client_dir: str | None = None
    evidence_dir: str | None = None
    port: int | None = None
    required_jars: dict[str, dict[str, str]] = field(default_factory=dict)
    activity_seen: dict[str, bool] = field(default_factory=dict)
    crash_reports: list[str] = field(default_factory=list)


class HarnessFailure(RuntimeError):
    def __init__(self, failure_class: str, reason: str):
        super().__init__(reason)
        self.failure_class = failure_class
        self.reason = reason


class PortableMinecraftHarness:
    done_pattern = re.compile(r"\]: Done \(|For help, type \"help\"", re.I)

    def __init__(self, repo_root: Path, config: HarnessConfig, args) -> None:
        self.repo_root = repo_root.resolve()
        self.config = config
        self.args = args
        self.stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        self.run_root = Path(args.run_root or config.default_run_parent / self.stamp).resolve()
        self.summary_dir = self.run_root / "summary"
        self.results: list[CycleResult] = []

    def prepare(self) -> None:
        prune_old_runs(self.run_root.parent, self.args.max_old_runs)
        ensure_free_space(self.run_root.parent, self.args.min_free_gb)
        self.summary_dir.mkdir(parents=True, exist_ok=True)
        self.run_root.mkdir(parents=True, exist_ok=True)

    def new_cycle(self, index: int) -> tuple[CycleResult, Path, Path, Path]:
        cycle_dir = self.run_root / f"cycle-{index:02d}"
        server_dir = cycle_dir / "server"
        client_dir = cycle_dir / "client"
        evidence_dir = cycle_dir / "evidence"
        evidence_dir.mkdir(parents=True, exist_ok=True)

        result = CycleResult(index=index)
        result.server_dir = str(server_dir)
        result.client_dir = str(client_dir)
        result.evidence_dir = str(evidence_dir)
        result.port = choose_port(self.args.port)
        result.activity_seen = {key: False for key in self.config.activity_patterns}
        self.results.append(result)
        return result, server_dir, client_dir, evidence_dir

    def bootstrap_cycle(self, result: CycleResult, server_dir: Path, client_dir: Path, evidence_dir: Path) -> None:
        tool_root = self.repo_root / "tools" / "quarantine" / "original-tools"
        if not self.args.skip_bootstrap:
            shutil.rmtree(server_dir, ignore_errors=True)
            if not getattr(self.args, "server_only", False):
                shutil.rmtree(client_dir, ignore_errors=True)
            self.run_checked(
                [
                    str(tool_root / "bootstrap_server.sh"),
                    "--server-dir",
                    str(server_dir),
                    "--port",
                    str(result.port),
                    "--reset-runtime",
                ],
                evidence_dir / "bootstrap-server.log",
            )
            if not getattr(self.args, "server_only", False):
                self.run_checked(
                    [str(tool_root / "bootstrap_client_runtime.sh"), "--client-dir", str(client_dir)],
                    evidence_dir / "bootstrap-client.log",
                )
        result.phases.append("bootstrap")

    def verify_required_jars(self, result: CycleResult, server_dir: Path, client_dir: Path) -> None:
        result.required_jars = {"server": verify_required_jars(server_dir / "mods", self.config.required_jars)}
        if not getattr(self.args, "server_only", False):
            result.required_jars["client"] = verify_required_jars(client_dir / "mods", self.config.required_jars)
        result.phases.append("jar_verification")

    def start_server(self, server_dir: Path, evidence_dir: Path, port: int) -> subprocess.Popen[str]:
        tool_root = self.repo_root / "tools" / "quarantine" / "original-tools"
        return subprocess.Popen(
            [str(tool_root / "launch_server_direct.sh"), "--server-dir", str(server_dir), "--", "nogui"],
            cwd=self.repo_root,
            stdin=subprocess.PIPE,
            stdout=(evidence_dir / "server-console.log").open("w", encoding="utf-8"),
            stderr=subprocess.STDOUT,
            text=True,
            env=env_for_port(port),
        )

    def start_client(self, client_dir: Path, evidence_dir: Path, port: int) -> subprocess.Popen[str]:
        tool_root = self.repo_root / "tools" / "quarantine" / "original-tools"
        return subprocess.Popen(
            [
                str(tool_root / "launch_client_direct.sh"),
                "--client-dir",
                str(client_dir),
                "--username",
                self.config.username,
                "--server",
                f"127.0.0.1:{port}",
            ],
            cwd=self.repo_root,
            stdout=(evidence_dir / "client-console.log").open("w", encoding="utf-8"),
            stderr=subprocess.STDOUT,
            text=True,
            env=env_for_port(port),
        )

    def wait_for_server_boot(self, result: CycleResult, server_dir: Path, proc: subprocess.Popen[str]) -> None:
        self.wait_for_log(server_dir / "logs/latest.log", self.done_pattern, self.args.boot_timeout, proc, result, "boot")
        result.phases.append("boot")

    def wait_for_join(
        self,
        result: CycleResult,
        server_dir: Path,
        client_dir: Path,
        proc: subprocess.Popen[str],
    ) -> None:
        joined = re.compile(
            rf"{re.escape(self.config.username)}.*joined the game|UUID of player {re.escape(self.config.username)}|{re.escape(self.config.username)}\[/",
            re.I,
        )
        self.wait_for_log(
            server_dir / "logs/latest.log",
            joined,
            self.args.join_timeout,
            proc,
            result,
            "join",
            extra_logs=[client_dir / "logs/latest.log"],
        )
        result.phases.append("join")

    def wait_for_log(
        self,
        log_path: Path,
        pattern: Pattern[str],
        timeout: int,
        proc: subprocess.Popen[str],
        result: CycleResult,
        phase: str,
        extra_logs: list[Path] | None = None,
    ) -> None:
        deadline = time.monotonic() + timeout
        logs = [log_path] + (extra_logs or [])
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                raise HarnessFailure("process_exit", f"{phase} process exited with {proc.returncode}")
            self.scan_for_failures(result, logs)
            if any_log_matches([log_path], pattern):
                return
            time.sleep(1)
        raise HarnessFailure("no_progress_stall", f"{phase} timed out after {timeout}s")

    def idle_until(self, deadline: float, result: CycleResult, logs: list[Path], *procs: subprocess.Popen[str] | None) -> None:
        while time.monotonic() < deadline:
            for proc in procs:
                if proc and proc.poll() is not None:
                    raise HarnessFailure("process_exit", f"process exited with {proc.returncode}")
            self.scan_for_failures(result, logs)
            time.sleep(2)

    def scan_for_failures(self, result: CycleResult, logs: list[Path]) -> None:
        for log in logs:
            text = tail_text(log)
            if not text:
                continue
            for name, pattern in self.config.fatal_patterns.items():
                if pattern.search(text):
                    raise HarnessFailure(name, f"{name} signature in {log}")

    def update_activity(self, result: CycleResult, logs: list[Path]) -> None:
        for name, pattern in self.config.activity_patterns.items():
            if not result.activity_seen.get(name):
                result.activity_seen[name] = any_log_matches(logs, pattern)

    def mark_crash_reports(self, result: CycleResult, server_dir: Path, client_dir: Path) -> bool:
        result.crash_reports = collect_crash_reports(server_dir, client_dir)
        if result.crash_reports:
            result.status = "FAIL"
            result.failure_class = "crash_report"
            result.reason = "crash report generated"
            return True
        return False

    def pass_cycle(self, result: CycleResult, reason: str = "clean cycle") -> None:
        result.status = "PASS"
        result.reason = reason

    def fail_cycle(self, result: CycleResult, failure_class: str, reason: str) -> None:
        result.status = "FAIL"
        result.failure_class = failure_class
        result.reason = reason

    def finalize_cycle(
        self,
        result: CycleResult,
        server_dir: Path,
        client_dir: Path,
        evidence_dir: Path,
        server_proc: subprocess.Popen[str] | None,
        client_proc: subprocess.Popen[str] | None,
    ) -> None:
        copy_evidence(evidence_dir, server_dir, client_dir)
        stop_process(server_proc, "stop")
        stop_process(client_proc)
        if not self.args.keep_runs and result.status == "PASS":
            shutil.rmtree(evidence_dir.parent, ignore_errors=True)

    def capture_diagnostics(
        self,
        evidence_dir: Path,
        *procs: subprocess.Popen[str] | None,
    ) -> None:
        capture_diagnostics(evidence_dir, *procs)

    def send_command(self, proc: subprocess.Popen[str] | None, command: str) -> None:
        send_command(proc, command)

    def run_checked(self, cmd: list[str], log_file: Path) -> None:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with log_file.open("w", encoding="utf-8") as log:
            proc = subprocess.run(cmd, cwd=self.repo_root, stdout=log, stderr=subprocess.STDOUT, text=True)
        if proc.returncode != 0:
            raise HarnessFailure("bootstrap_failed", f"{cmd[0]} failed; see {log_file}")

    def write_summary(self, extra: dict | None = None) -> None:
        payload = {
            "name": self.config.name,
            "slug": self.config.slug,
            "description": self.config.description,
            "run_root": str(self.run_root),
            "cycles_requested": self.args.cycles,
            "cycles": [asdict(result) for result in self.results],
        }
        if extra:
            payload["extra"] = extra
        self.summary_dir.mkdir(parents=True, exist_ok=True)
        (self.summary_dir / "summary.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

        lines = [
            f"# {self.config.name} Summary",
            "",
            f"- Run root: `{self.run_root}`",
            f"- Cycles requested: `{self.args.cycles}`",
            "",
            "| Cycle | Port | Status | Phases | Failure | Reason |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for result in self.results:
            lines.append(
                f"| {result.index} | {result.port or ''} | {result.status} | {', '.join(result.phases)} | {result.failure_class or ''} | {result.reason or ''} |"
            )
        (self.summary_dir / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def prune_old_runs(parent: Path, max_old_runs: int) -> None:
    if max_old_runs < 0 or not parent.is_dir():
        return
    runs = sorted((path for path in parent.iterdir() if path.is_dir()), key=lambda path: path.stat().st_mtime, reverse=True)
    for old_run in runs[max_old_runs:]:
        shutil.rmtree(old_run, ignore_errors=True)


def ensure_free_space(path: Path, min_free_gb: float) -> None:
    path.mkdir(parents=True, exist_ok=True)
    usage = shutil.disk_usage(path)
    free_gb = usage.free / (1024**3)
    if free_gb < min_free_gb:
        raise HarnessFailure("insufficient_space", f"not enough free space under {path}: {free_gb:.1f} GiB free, need at least {min_free_gb:.1f} GiB")


def verify_required_jars(mods_dir: Path, required_jars: dict[str, Pattern[str]]) -> dict[str, str]:
    if not mods_dir.is_dir():
        raise HarnessFailure("missing_mods_dir", f"missing mods dir: {mods_dir}")
    jars = [path for path in mods_dir.iterdir() if path.is_file()]
    disabled = [path.name for path in jars if path.name.endswith(".disabled")]
    if disabled:
        raise HarnessFailure("disabled_jar", f"disabled jars found in {mods_dir}: {', '.join(disabled)}")
    found: dict[str, str] = {}
    for key, pattern in required_jars.items():
        match = next((path.name for path in jars if pattern.search(path.name)), None)
        if not match:
            raise HarnessFailure("missing_required_jar", f"required jar absent from {mods_dir}: {key}")
        found[key] = match
    return found


def any_log_matches(logs: list[Path], pattern: Pattern[str]) -> bool:
    return any(pattern.search(tail_text(log, 512_000)) for log in logs)


def tail_text(path: Path, limit: int = 256_000) -> str:
    try:
        with path.open("rb") as fh:
            fh.seek(0, os.SEEK_END)
            size = fh.tell()
            fh.seek(max(0, size - limit))
            return fh.read().decode("utf-8", "replace")
    except FileNotFoundError:
        return ""


def send_command(proc: subprocess.Popen[str] | None, command: str) -> None:
    if not proc or not proc.stdin:
        return
    proc.stdin.write(command + "\n")
    proc.stdin.flush()


def collect_crash_reports(server_dir: Path, client_dir: Path) -> list[str]:
    reports: list[str] = []
    for root in [server_dir / "crash-reports", client_dir / "crash-reports"]:
        if root.is_dir():
            reports.extend(str(path) for path in sorted(root.glob("*.txt")))
    return reports


def capture_diagnostics(evidence_dir: Path, *procs: subprocess.Popen[str] | None) -> None:
    pids = sorted({pid for proc in procs if proc for pid in process_tree(proc.pid)})
    (evidence_dir / "process-pids.txt").write_text("\n".join(str(pid) for pid in pids) + "\n", encoding="utf-8")
    run_diag(["ps", "-eo", "pid,ppid,stat,etime,args"], evidence_dir / "process-table.txt")
    for pid in pids:
        run_diag(["jcmd", str(pid), "Thread.print"], evidence_dir / f"jcmd-{pid}-Thread.print.txt")
        run_diag(["jcmd", str(pid), "GC.heap_info"], evidence_dir / f"jcmd-{pid}-GC.heap_info.txt")


def process_tree(root_pid: int) -> set[int]:
    try:
        output = subprocess.check_output(["ps", "-eo", "pid=,ppid="], text=True)
    except Exception:
        return {root_pid}
    children: dict[int, list[int]] = {}
    for line in output.splitlines():
        parts = line.split()
        if len(parts) == 2:
            pid, ppid = int(parts[0]), int(parts[1])
            children.setdefault(ppid, []).append(pid)
    seen = {root_pid}
    stack = [root_pid]
    while stack:
        pid = stack.pop()
        for child in children.get(pid, []):
            if child not in seen:
                seen.add(child)
                stack.append(child)
    return seen


def run_diag(cmd: list[str], out: Path) -> None:
    try:
        with out.open("w", encoding="utf-8") as fh:
            subprocess.run(cmd, stdout=fh, stderr=subprocess.STDOUT, text=True, timeout=30)
    except Exception as exc:
        out.write_text(f"diagnostic failed: {exc}\n", encoding="utf-8")


def copy_evidence(evidence_dir: Path, server_dir: Path, client_dir: Path) -> None:
    for label, path in {
        "server-latest.log": server_dir / "logs" / "latest.log",
        "client-latest.log": client_dir / "logs" / "latest.log",
    }.items():
        if path.is_file():
            shutil.copy2(path, evidence_dir / label)
    for root, prefix in [(server_dir / "crash-reports", "server"), (client_dir / "crash-reports", "client")]:
        if root.is_dir():
            for report in root.glob("*.txt"):
                shutil.copy2(report, evidence_dir / f"{prefix}-{report.name}")


def stop_process(proc: subprocess.Popen[str] | None, command: str | None = None) -> None:
    if not proc or proc.poll() is not None:
        return
    if command:
        try:
            send_command(proc, command)
            proc.wait(timeout=60)
            return
        except Exception:
            pass
    try:
        proc.terminate()
        proc.wait(timeout=20)
    except Exception:
        try:
            os.kill(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def env_for_port(port: int) -> dict[str, str]:
    env = os.environ.copy()
    env["BTM_SERVER_PORT"] = str(port)
    return env


def choose_port(preferred: int) -> int:
    if preferred > 0 and port_available(preferred):
        return preferred
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False
