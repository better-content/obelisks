#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import time
from pathlib import Path

from portable_minecraft_harness import HarnessConfig, HarnessFailure, PortableMinecraftHarness


LC_DIMENSION = "lostcities:lostcity"

CONFIG = HarnessConfig(
    name="LC + TFTH + C2ME + DH Stability",
    slug="lc_tfth_c2me_dh",
    description="Portable server/client runtime scenario for Lost Cities, The Flesh That Hates, C2ME, and Distant Horizons.",
    docs_subdir="lc_tfth_c2me_dh_stability",
    default_run_parent=Path("/tmp/btm-lc-tfth-c2me-dh"),
    default_cycles=3,
    required_jars={
        "lostcities": re.compile(r"lostcities.*\.jar$", re.I),
        "the_flesh_that_hates": re.compile(r"(tfth|flesh.*hates).*\.jar$", re.I),
        "c2me": re.compile(r"c2me.*\.jar$", re.I),
        "DistantHorizons": re.compile(r"distanthorizons.*\.jar$", re.I),
        "btmfixes": re.compile(r"btmfixes.*\.jar$", re.I),
    },
    fatal_patterns={
        "modernfix_watchdog": re.compile(r"modernfix.*watchdog|watchdog.*modernfix|server thread dump", re.I),
        "crash_report": re.compile(r"crash report|this crash report has been saved|preparing crash report", re.I),
        "c2me_thread_guard": re.compile(
            r"(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b|"
            r"\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)",
            re.I,
        ),
        "dh_worldgen_exception": re.compile(
            r"\[[^/\]]+/(?:ERROR|FATAL)\] \[(?:DistantHorizons-(?:LOD World Gen|DistantHorizons-[^\]]*(?:GeneratedFullDataSourceProvider|BatchGenerator|WorldGenerationQueue|DhServerLevel|AbstractDhServerLevel|DhClientLevel))|LOD World Gen)[^\]]*\]|"
            r"\b(?:[A-Za-z0-9_.]+Exception|[A-Za-z0-9_.]+Error|Throwable)\b.*(?:DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue)|"
            r"(?:DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue).*\b(?:Exception|Throwable)\b",
            re.I,
        ),
        "lostcities_exception": re.compile(
            r"(lostcities|LostCityFeature|LostCityTerrainFeature).*\b(Exception|Error)\b|"
            r"\b(Exception|Error)\b.*(lostcities|LostCityFeature|LostCityTerrainFeature)",
            re.I,
        ),
        "tfth_exception": re.compile(
            r"(the_flesh_that_hates|FleshBlockSpread|net\.mcreator\.thefleshthathates).*\b(Exception|Error)\b|"
            r"\b(Exception|Error)\b.*(the_flesh_that_hates|FleshBlockSpread|net\.mcreator\.thefleshthathates)",
            re.I,
        ),
        "jvm_fatal": re.compile(r"OutOfMemoryError|hs_err_pid|fatal error has been detected", re.I),
    },
    activity_patterns={
        "distant_horizons": re.compile(r"distanthorizons|lod|full data|world generation", re.I),
    },
)


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[3]
    harness = PortableMinecraftHarness(root, CONFIG, args)
    harness.prepare()

    for idx in range(1, args.cycles + 1):
        result, server_dir, client_dir, evidence_dir = harness.new_cycle(idx)
        server_proc = None
        client_proc = None
        try:
            harness.bootstrap_cycle(result, server_dir, client_dir, evidence_dir)
            harness.verify_required_jars(result, server_dir, client_dir)

            server_proc = harness.start_server(server_dir, evidence_dir, result.port or args.port)
            harness.wait_for_server_boot(result, server_dir, server_proc)

            client_proc = harness.start_client(client_dir, evidence_dir, result.port or args.port)
            harness.wait_for_join(result, server_dir, client_dir, client_proc)

            run_lc_teleport_phase(harness, result, server_proc, server_dir, client_dir, evidence_dir)
            run_lc_dh_generation_phase(harness, result, server_proc, client_proc, server_dir, client_dir, evidence_dir, args.idle_seconds)
            run_tfth_pressure_phase(harness, result, server_proc, client_proc, server_dir, client_dir, evidence_dir, args.tfth_seconds)

            if not harness.mark_crash_reports(result, server_dir, client_dir):
                if not result.activity_seen.get("distant_horizons"):
                    harness.fail_cycle(result, "missing_dh_activity", "no Distant Horizons activity signature observed")
                else:
                    harness.pass_cycle(result)
            result.phases.append("repeat")
        except HarnessFailure as exc:
            harness.fail_cycle(result, exc.failure_class, exc.reason)
            if exc.failure_class in {"no_progress_stall", "process_exit"}:
                harness.capture_diagnostics(evidence_dir, server_proc, client_proc)
        except Exception as exc:
            harness.fail_cycle(result, "harness_exception", str(exc))
            harness.capture_diagnostics(evidence_dir, server_proc, client_proc)
        finally:
            harness.finalize_cycle(result, server_dir, client_dir, evidence_dir, server_proc, client_proc)
            harness.write_summary()

        if result.status != "PASS" and not args.keep_going:
            break

    harness.write_summary()
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
    parser.add_argument("--join-timeout", type=int, default=CONFIG.default_join_timeout)
    parser.add_argument("--idle-seconds", type=int, default=180)
    parser.add_argument("--tfth-seconds", type=int, default=120)
    parser.add_argument("--keep-going", action="store_true")
    parser.add_argument("--keep-runs", action="store_true")
    parser.add_argument("--skip-bootstrap", action="store_true")
    parser.add_argument("--min-free-gb", type=float, default=CONFIG.default_min_free_gb)
    parser.add_argument("--max-old-runs", type=int, default=CONFIG.default_max_old_runs)
    return parser.parse_args()


def runtime_logs(server_dir: Path, client_dir: Path, evidence_dir: Path) -> list[Path]:
    return [
        server_dir / "logs/latest.log",
        client_dir / "logs/latest.log",
        evidence_dir / "server-console.log",
        evidence_dir / "client-console.log",
    ]


def run_lc_teleport_phase(
    harness: PortableMinecraftHarness,
    result,
    server_proc,
    server_dir: Path,
    client_dir: Path,
    evidence_dir: Path,
) -> None:
    harness.send_command(server_proc, f"execute in {LC_DIMENSION} run tp {CONFIG.username} 0 120 0")
    harness.send_command(server_proc, f"execute in {LC_DIMENSION} run forceload add -8 -8 8 8")
    time.sleep(15)
    harness.scan_for_failures(result, runtime_logs(server_dir, client_dir, evidence_dir))
    result.phases.append("lc_teleport")


def run_lc_dh_generation_phase(
    harness: PortableMinecraftHarness,
    result,
    server_proc,
    client_proc,
    server_dir: Path,
    client_dir: Path,
    evidence_dir: Path,
    idle_seconds: int,
) -> None:
    logs = runtime_logs(server_dir, client_dir, evidence_dir)
    harness.idle_until(time.monotonic() + idle_seconds, result, logs, server_proc, client_proc)
    harness.update_activity(result, logs)
    result.phases.append("lc_dh_generation")


def run_tfth_pressure_phase(
    harness: PortableMinecraftHarness,
    result,
    server_proc,
    client_proc,
    server_dir: Path,
    client_dir: Path,
    evidence_dir: Path,
    tfth_seconds: int,
) -> None:
    seed_tfth_pressure(harness, server_proc)
    logs = runtime_logs(server_dir, client_dir, evidence_dir)
    harness.idle_until(time.monotonic() + tfth_seconds, result, logs, server_proc, client_proc)
    harness.update_activity(result, logs)
    result.phases.append("lc_tfth_pressure")


def seed_tfth_pressure(harness: PortableMinecraftHarness, server_proc) -> None:
    commands = [
        f"execute at {CONFIG.username} run setblock ~2 ~ ~2 the_flesh_that_hates:flesh_block",
        f"execute at {CONFIG.username} run setblock ~3 ~ ~2 the_flesh_that_hates:tumor",
        f"execute at {CONFIG.username} run setblock ~2 ~ ~3 the_flesh_that_hates:purulent_tumor",
        f"execute at {CONFIG.username} run summon the_flesh_that_hates:plaquecontaminator ~4 ~ ~4",
        f"execute at {CONFIG.username} run summon the_flesh_that_hates:flesh_human ~5 ~ ~4",
        f"execute at {CONFIG.username} run summon the_flesh_that_hates:flesh_howler ~6 ~ ~4",
    ]
    for command in commands:
        harness.send_command(server_proc, command)


if __name__ == "__main__":
    raise SystemExit(main())
