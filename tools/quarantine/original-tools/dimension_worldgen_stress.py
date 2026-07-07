#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import time
from pathlib import Path

from portable_minecraft_harness import HarnessConfig, HarnessFailure, PortableMinecraftHarness


DIMENSIONS = [
    "minecraft:overworld",
    "minecraft:the_nether",
    "minecraft:the_end",
    "aether:the_aether",
    "undergarden:undergarden",
    "twilightforest:twilight_forest",
    "deeperdarker:otherside",
    "lostcities:lostcity",
    "fallout_wastelands_:wastelands",
    "the_finley_dimension_remastered:finley_dimension",
    "callfromthedepth_:depth",
    "creatingspace:earth_orbit",
    "creatingspace:moon_orbit",
    "creatingspace:mars_orbit",
    "creatingspace:the_moon",
    "creatingspace:mars",
    "creatingspace:venus",
    "ae2:spatial_storage",
    "bloodmagic:dungeon",
    "irons_spellbooks:pocket_dimension",
]


CONFIG = HarnessConfig(
    name="All Dimension Worldgen Stress",
    slug="all_dimension_worldgen",
    description="Generates chunk squares in every authored pack dimension with C2ME, Distant Horizons, and btmfixes enabled.",
    docs_subdir="dimension_worldgen_stress",
    default_run_parent=Path("/tmp/btm-dimension-worldgen"),
    default_cycles=1,
    default_boot_timeout=900,
    default_join_timeout=900,
    required_jars={
        "c2me": re.compile(r"c2me.*\.jar$", re.I),
        "DistantHorizons": re.compile(r"distanthorizons.*\.jar$", re.I),
        "btmfixes": re.compile(r"btmfixes.*\.jar$", re.I),
    },
    fatal_patterns={
        "invalid_dimension": re.compile(r"argument\.dimension\.invalid|Unknown dimension|Can't find dimension", re.I),
        "modernfix_watchdog": re.compile(r"modernfix.*watchdog|watchdog.*modernfix|server thread dump", re.I),
        "crash_report": re.compile(r"crash report|this crash report has been saved|preparing crash report", re.I),
        "client_internal_disconnect": re.compile(
            r"lost connection: Internal Exception|Terminating connection with server, mismatched mod list|FluidStack cannot be empty",
            re.I,
        ),
        "c2me_thread_guard": re.compile(
            r"(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested).*\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b|"
            r"\b(Exception|Error|FATAL|ReportedException|IllegalStateException)\b.*(ThreadingDetector|PalettedContainer|BulkSectionAccess|safe.?random|random.*wrong thread|accessing legacyrandomsource|CheckedThreadLocalRandom|Chunk not there when requested)",
            re.I,
        ),
        "c2me_far_chunk_write": re.compile(r"Detected setBlock in a far chunk", re.I),
        "dh_worldgen_exception": re.compile(
            r"\[[^/\]]+/(?:ERROR|FATAL)\] \[(?:DistantHorizons-(?:LOD World Gen|DistantHorizons-[^\]]*(?:GeneratedFullDataSourceProvider|BatchGenerator|WorldGenerationQueue|DhServerLevel|AbstractDhServerLevel|DhClientLevel))|LOD World Gen)[^\]]*\]|"
            r"\b(?:[A-Za-z0-9_.]+Exception|[A-Za-z0-9_.]+Error|Throwable)\b.*(?:DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue)|"
            r"(?:DistantHorizons|LOD World Gen|DhServerLevel|BatchGenerator|WorldGenerationQueue).*\b(?:Exception|Throwable)\b",
            re.I,
        ),
        "worldgen_exception": re.compile(
            r"\[(?:[^\]/]+/)?(?:ERROR|FATAL)\].*(Feature|ChunkGenerator|ChunkStatus|WorldGen|Noise|Structure).*\b(ReportedException|IllegalStateException|ConcurrentModificationException|ArrayIndexOutOfBoundsException|NullPointerException|Exception|Error)\b|"
            r"(Feature|ChunkGenerator|ChunkStatus|WorldGen|Noise|Structure|Biome).*"
            r"\b(ReportedException|IllegalStateException|ConcurrentModificationException|ArrayIndexOutOfBoundsException|NullPointerException)\b|"
            r"\b(ReportedException|IllegalStateException|ConcurrentModificationException|ArrayIndexOutOfBoundsException|NullPointerException)\b.*"
            r"(Feature|ChunkGenerator|ChunkStatus|WorldGen|Noise|Structure|Biome)",
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
            if not args.server_only:
                client_proc = harness.start_client(client_dir, evidence_dir, result.port or args.port)
                harness.wait_for_join(result, server_dir, client_dir, client_proc)
                prepare_player(harness, server_proc)
            run_dimension_generation(harness, result, server_proc, client_proc, server_dir, client_dir, evidence_dir, args)

            if not harness.mark_crash_reports(result, server_dir, client_dir):
                if not result.activity_seen.get("distant_horizons"):
                    harness.fail_cycle(result, "missing_dh_activity", "no Distant Horizons activity signature observed")
                else:
                    harness.pass_cycle(result)
        except HarnessFailure as exc:
            harness.fail_cycle(result, exc.failure_class, exc.reason)
            if exc.failure_class in {"no_progress_stall", "process_exit"}:
                harness.capture_diagnostics(evidence_dir, server_proc, client_proc)
        except Exception as exc:
            harness.fail_cycle(result, "harness_exception", str(exc))
            harness.capture_diagnostics(evidence_dir, server_proc, client_proc)
        finally:
            harness.finalize_cycle(result, server_dir, client_dir, evidence_dir, server_proc, client_proc)
            harness.write_summary({"dimensions": selected_dimensions(args), "radius": args.radius, "samples": args.samples})

        if result.status != "PASS" and not args.keep_going:
            break

    harness.write_summary({"dimensions": selected_dimensions(args), "radius": args.radius, "samples": args.samples})
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
    parser.add_argument("--radius", type=int, default=7, help="Chunk square radius. Radius 7 generates 225 chunks per sample.")
    parser.add_argument("--samples", type=int, default=2, help="Number of separated chunk squares per dimension.")
    parser.add_argument("--settle-seconds", type=int, default=45)
    parser.add_argument("--dimensions", help="Comma-separated dimension id override.")
    parser.add_argument("--keep-going", action="store_true")
    parser.add_argument("--keep-runs", action="store_true")
    parser.add_argument("--server-only", action="store_true")
    parser.add_argument("--skip-bootstrap", action="store_true")
    parser.add_argument("--min-free-gb", type=float, default=CONFIG.default_min_free_gb)
    parser.add_argument("--max-old-runs", type=int, default=CONFIG.default_max_old_runs)
    return parser.parse_args()


def selected_dimensions(args: argparse.Namespace) -> list[str]:
    if args.dimensions:
        return [entry.strip() for entry in args.dimensions.split(",") if entry.strip()]
    return DIMENSIONS


def runtime_logs(server_dir: Path, client_dir: Path, evidence_dir: Path) -> list[Path]:
    return [
        server_dir / "logs/latest.log",
        client_dir / "logs/latest.log",
        evidence_dir / "server-console.log",
        evidence_dir / "client-console.log",
    ]


def prepare_player(harness: PortableMinecraftHarness, server_proc) -> None:
    commands = [
        f"gamemode spectator {CONFIG.username}",
        f"effect give {CONFIG.username} minecraft:night_vision 999999 0 true",
        f"gamerule doDaylightCycle false",
        f"gamerule doWeatherCycle false",
    ]
    for command in commands:
        harness.send_command(server_proc, command)


def run_dimension_generation(
    harness: PortableMinecraftHarness,
    result,
    server_proc,
    client_proc,
    server_dir: Path,
    client_dir: Path,
    evidence_dir: Path,
    args: argparse.Namespace,
) -> None:
    logs = runtime_logs(server_dir, client_dir, evidence_dir)
    radius = max(0, min(args.radius, 7))
    samples = max(1, args.samples)
    for dimension in selected_dimensions(args):
        for sample in range(samples):
            cx = sample * (radius * 4 + 24)
            cz = sample * (radius * -3 - 21)
            x = cx * 16 + 8
            z = cz * 16 + 8
            harness.send_command(server_proc, f"execute in {dimension} run forceload add {cx - radius} {cz - radius} {cx + radius} {cz + radius}")
            if not args.server_only:
                harness.send_command(server_proc, f"execute in {dimension} run tp {CONFIG.username} {x} 128 {z}")
            harness.idle_until(time.monotonic() + args.settle_seconds, result, logs, server_proc, client_proc)
            harness.update_activity(result, logs)
            result.phases.append(f"{dimension}[{sample + 1}]")
        harness.send_command(server_proc, f"execute in {dimension} run forceload remove all")


if __name__ == "__main__":
    raise SystemExit(main())
