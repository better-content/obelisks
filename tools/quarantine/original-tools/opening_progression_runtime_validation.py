#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import subprocess
import time
from pathlib import Path

from portable_minecraft_harness import HarnessConfig, HarnessFailure, PortableMinecraftHarness, send_command, tail_text


CONFIG = HarnessConfig(
    name="Opening Progression Runtime Validation",
    slug="opening_progression_runtime_validation",
    description="Bootstraps a disposable pack server and runs the pillagercampaigns opening progression runtime validation.",
    docs_subdir="opening_progression_runtime_validation",
    default_run_parent=Path("/tmp/btm-opening-progression"),
    default_cycles=1,
    default_boot_timeout=900,
    required_jars={
        "pillagercampaigns": re.compile(r"pillagercampaigns.*\.jar$", re.I),
    },
    fatal_patterns={
        "crash_report": re.compile(r"crash report|this crash report has been saved|preparing crash report", re.I),
        "runtime_validation_failure": re.compile(r"OPENING_PROGRESSION_VALIDATION FAIL|Unknown or incomplete command", re.I),
        "jvm_fatal": re.compile(r"OutOfMemoryError|hs_err_pid|fatal error has been detected", re.I),
    },
)

PASS_PATTERN = re.compile(r"OPENING_PROGRESSION_VALIDATION PASS", re.I)
START_PATTERN = re.compile(r"validate_opening_progression|OPENING_PROGRESSION_VALIDATION", re.I)


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[3]
    harness = PortableMinecraftHarness(root, CONFIG, args)
    harness.prepare()

    for idx in range(1, args.cycles + 1):
        result, server_dir, client_dir, evidence_dir = harness.new_cycle(idx)
        server_proc = None
        try:
            harness.bootstrap_cycle(result, server_dir, client_dir, evidence_dir)
            harness.verify_required_jars(result, server_dir, client_dir)
            server_proc = start_server(root, server_dir, evidence_dir)
            harness.wait_for_server_boot(result, server_dir, server_proc)
            run_opening_progression_suite(harness, result, server_dir, evidence_dir, server_proc, args.timeout)
            if not harness.mark_crash_reports(result, server_dir, client_dir):
                harness.pass_cycle(result)
        except HarnessFailure as exc:
            harness.fail_cycle(result, exc.failure_class, exc.reason)
            if exc.failure_class in {"no_progress_stall", "process_exit"}:
                harness.capture_diagnostics(evidence_dir, server_proc)
        except Exception as exc:
            harness.fail_cycle(result, "harness_exception", str(exc))
            harness.capture_diagnostics(evidence_dir, server_proc)
        finally:
            harness.finalize_cycle(result, server_dir, client_dir, evidence_dir, server_proc, None)
            harness.write_summary({"timeout": args.timeout})

        if result.status != "PASS" and not args.keep_going:
            break

    harness.write_summary({"timeout": args.timeout})
    print(f"summary: {harness.summary_dir / 'summary.md'}")
    print(f"raw run root: {harness.run_root}")
    passed = all(result.status == "PASS" for result in harness.results) and len(harness.results) == args.cycles
    return 0 if passed else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=CONFIG.description)
    parser.add_argument("--cycles", type=int, default=CONFIG.default_cycles)
    parser.add_argument("--run-root")
    parser.add_argument("--port", type=int, default=CONFIG.default_port)
    parser.add_argument("--boot-timeout", type=int, default=CONFIG.default_boot_timeout)
    parser.add_argument("--timeout", type=int, default=240)
    parser.add_argument("--keep-going", action="store_true")
    parser.add_argument("--keep-runs", action="store_true")
    parser.add_argument("--skip-bootstrap", action="store_true")
    parser.add_argument("--min-free-gb", type=float, default=CONFIG.default_min_free_gb)
    parser.add_argument("--max-old-runs", type=int, default=CONFIG.default_max_old_runs)
    parser.add_argument("--server-only", action="store_true", default=True)
    return parser.parse_args()


def start_server(root: Path, server_dir: Path, evidence_dir: Path) -> subprocess.Popen[str]:
    return subprocess.Popen(
        [str(root / "tools/quarantine/original-tools/launch_server_direct.sh"), "--server-dir", str(server_dir), "--", "nogui"],
        cwd=root,
        stdin=subprocess.PIPE,
        stdout=(evidence_dir / "server-console.log").open("w", encoding="utf-8"),
        stderr=subprocess.STDOUT,
        text=True,
    )


def run_opening_progression_suite(
    harness: PortableMinecraftHarness,
    result,
    server_dir: Path,
    evidence_dir: Path,
    server_proc: subprocess.Popen[str],
    timeout: int,
) -> None:
    server_log = server_dir / "logs/latest.log"
    console_log = evidence_dir / "server-console.log"
    logs = [server_log, console_log]

    send_command(server_proc, "sam validate_opening_progression")
    deadline = time.monotonic() + timeout
    started = False
    while time.monotonic() < deadline:
        if server_proc.poll() is not None:
            raise HarnessFailure("process_exit", f"server exited with {server_proc.returncode}")
        harness.scan_for_failures(result, logs)
        text = "\n".join(filter(None, (tail_text(server_log), tail_text(console_log))))
        if not started and START_PATTERN.search(text):
            started = True
            result.phases.append("gametest_started")
        if PASS_PATTERN.search(text):
            result.phases.append("gametest_pass")
            return
        time.sleep(1)
    raise HarnessFailure("no_progress_stall", f"opening progression runtime validation timed out after {timeout}s")


if __name__ == "__main__":
    raise SystemExit(main())
