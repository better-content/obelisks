#!/usr/bin/env python3
"""Dedicated-server + joined-client RAM cross-section runner.

Each phase temporarily disables matched jars in both the live Prism instance and
server-instance, starts the dedicated server, joins with a Prism quick-play
client, captures post-join memory evidence, then restores the jars.
"""

from __future__ import annotations

import csv
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in
from pack_mod_source import bundled_mod_regexes

require_legacy_live_tool_opt_in()


ROOT = Path(os.environ.get("ROOT", "/home/gerald/obelisks"))
SERVER_DIR = Path(os.environ.get("SERVER_DIR", str(ROOT / "server-instance")))
PRISM_ROOT = Path(os.environ.get("PRISM_ROOT", str(Path.home() / ".local/share/PrismLauncher")))
PRISM_INSTANCE = os.environ.get("PRISM_INSTANCE", "Better Content-Playtest 4 - v1")
LIVE_MODS = PRISM_ROOT / "instances" / PRISM_INSTANCE / "minecraft" / "mods"
SERVER_MODS = SERVER_DIR / "mods"
CLIENT_JOIN_PROBE = ROOT / "tools" / "client_join_probe.sh"
OUT_BASE = Path(os.environ.get("OUT_BASE", "/tmp/btm-ram-profile"))
STAMP = os.environ.get("STAMP") or datetime.now().strftime("%Y%m%d-%H%M%S")
OUT_DIR = OUT_BASE / f"joined_cross_section_{STAMP}"
SERVER_PORT = int(os.environ.get("SERVER_PORT", "25565"))
SETTLE_SEC = int(os.environ.get("SETTLE_SEC", "75"))
JOIN_TIMEOUT_SEC = int(os.environ.get("JOIN_TIMEOUT_SEC", "660"))
BOOT_TIMEOUT_SEC = int(os.environ.get("BOOT_TIMEOUT_SEC", "480"))
PHASE_FILTER = os.environ.get("PHASE_FILTER", "")
BASELINE_REPEATS = int(os.environ.get("BASELINE_REPEATS", "2"))
DISABLED_SUFFIX = ".joined-cross-disabled"
PHASES_FILE = os.environ.get("PHASES_FILE", "")
CUSTOM_JAR_PATTERNS = bundled_mod_regexes(ROOT)


@dataclass
class Phase:
    name: str
    description: str
    disable: list[str]
    keep: list[str] | None = None


DEFAULT_PHASES: list[Phase] = [
    Phase("baseline", "full pack, no jars disabled", []),
    Phase("no_chipped", "asset/model pressure from Chipped", [r"^chipped-forge-.*\.jar$"]),
    Phase(
        "no_ticex",
        "Tinkers addon layer centered on TiCEX",
        [r"^ticex-.*\.jar$"],
    ),
    Phase(
        "no_chipped_no_ticex",
        "combined top two known client RAM contributors",
        [r"^chipped-forge-.*\.jar$", r"^ticex-.*\.jar$"],
    ),
    Phase(
        "no_emi_jei_recipe_index",
        "recipe viewer/indexing pressure",
        [
            r"^emi-.*\.jar$",
            r"^jei-.*\.jar$",
            r"^emitrades-.*\.jar$",
            r"^TConJEI-.*\.jar$",
            r"^tconjei-.*\.jar$",
            r"^Not Enough Recipe Book-.*\.jar$",
            r"^norecipebookreborn-.*\.jar$",
            r"^Searchables-.*\.jar$",
            r"^findme-.*\.jar$",
        ],
    ),
    Phase(
        "no_distant_horizons",
        "Distant Horizons disabled as a diagnostic only",
        [r"^DistantHorizons-.*\.jar$"],
    ),
    Phase(
        "no_steam_rails",
        "Create rail asset/model/content pressure",
        [r"^Steam_Rails-.*\.jar$"],
    ),
    Phase(
        "no_tcon_addon_layer",
        "TConstruct addons and docs around TiCEX, keeping core Mantle/TConstruct absent only if matched",
        [
            r"^ticex-.*\.jar$",
            r"^TinkerBetterCombat .*\.jar$",
            r"^TinkersBattleSpades-.*\.jar$",
            r"^Tinkers Advanced .*\.jar$",
            r"^tinkers_advanced_.*\.jar$",
            r"^tinkersweaponry-.*\.jar$",
            r"^TinkersPonder-.*\.jar$",
            r"^TConJEI-.*\.jar$",
            r"^tconjei-.*\.jar$",
            r"^etstlib-.*\.jar$",
        ],
    ),
    Phase(
        "no_ae2_addons",
        "AE2 addon/client graph pressure, core AE2 retained",
        [
            r"^AE2-Things-.*\.jar$",
            r"^AE2NetworkAnalyzer-.*\.jar$",
            r"^AEAdditions-.*\.jar$",
            r"^AdvancedAE-.*\.jar$",
            r"^ExtendedAE-.*\.jar$",
            r"^mae2-.*\.jar$",
            r"^merequester-.*\.jar$",
            r"^polyeng-forge-.*\.jar$",
            r"^createappliedkinetics-.*\.jar$",
        ],
    ),
    Phase(
        "no_create_addons",
        "Create addon surface, core Create retained",
        [
            r"^compressedcreativity-.*\.jar$",
            r"^create-stuff-additions.*\.jar$",
            r"^create_bb-.*\.jar$",
            r"^create_central_kitchen-.*\.jar$",
            r"^create_cold_sweat-.*\.jar$",
            r"^create_connected-.*\.jar$",
            r"^create_enchantment_industry-.*\.jar$",
            r"^create_more_additions-.*\.jar$",
            r"^create_power_loader-.*\.jar$",
            r"^create_things_and_misc-.*\.jar$",
            r"^createadditionallogistics-.*\.jar$",
            r"^createaddoncompatibility-.*\.jar$",
            r"^createadvlogistics-.*\.jar$",
            r"^createappliedkinetics-.*\.jar$",
            r"^createbigcannons-.*\.jar$",
            r"^createdieselgenerators-.*\.jar$",
            r"^createliquidfuel-.*\.jar$",
            r"^createmoredrillheads-.*\.jar$",
            r"^heatsync-.*\.jar$",
            r"^Steam_Rails-.*\.jar$",
        ],
    ),
    Phase(
        "no_biome_worldgen_dims",
        "biomes, dimensions, and structure/worldgen-heavy content",
        [
            r"^\[forge\]ctov-.*\.jar$",
            r"^aether-.*\.jar$",
            r"^blue_skies-.*\.jar$",
            r"^deeperdarker-.*\.jar$",
            r"^DynamicTrees.*\.jar$",
            r"^dtmalum-.*\.jar$",
            r"^dtnatures_spirit-.*\.jar$",
            r"^Fallout Wasteland .*\.jar$",
            r"^Geophilic .*\.jar$",
            r"^lostcities-.*\.jar$",
            r"^natures_spirit-.*\.jar$",
            r"^TerraBlender-.*\.jar$",
            r"^The_Undergarden-.*\.jar$",
            r"^Towns-and-Towers-.*\.jar$",
            r"^TravelersTitles-.*\.jar$",
            r"^UnEarthed-.*\.jar$",
            r"^YungsApi-.*\.jar$",
            r"^creatingspace-.*\.jar$",
            r"^lithostitched-.*\.jar$",
            r"^tectonic-.*\.jar$",
            r"^cristellib-.*\.jar$",
        ],
    ),
    Phase(
        "no_food_farming",
        "food, cooking, crops, diet, thirst, and farming content",
        [
            r"^FarmersDelight-.*\.jar$",
            r"^BrewinAndChewin-.*\.jar$",
            r"^Delightful-.*\.jar$",
            r"^MyNethersDelight-.*\.jar$",
            r"^VeggiesDelight-.*\.jar$",
            r"^ubesdelight-.*\.jar$",
            r"^undergardendelight-.*\.jar$",
            r"^chefsdelight-.*\.jar$",
            r"^collectorsreap-.*\.jar$",
            r"^corn_delight-.*\.jar$",
            r"^ends_delight-.*\.jar$",
            r"^farmersrespite-.*\.jar$",
            r"^oceansdelight-.*\.jar$",
            r"^rusticdelight-.*\.jar$",
            r"^diet-forge-.*\.jar$",
            r"^solcarrot-.*\.jar$",
            r"^ThirstWasTaken-.*\.jar$",
            r"^appleskin-.*\.jar$",
            r"^cravings-.*\.jar$",
        ],
    ),
    Phase(
        "no_magic_adventure_mobs",
        "magic, adventure dimensions, mobs, relic/artifact systems",
        [
            r"^ars_nouveau-.*\.jar$",
            r"^DynamicTreesArsNouveau-.*\.jar$",
            r"^Botania-.*\.jar$",
            r"^bloodmagic-.*\.jar$",
            r"^KubeJS Blood Magic-.*\.jar$",
            r"^tomeofblood-.*\.jar$",
            r"^malum-.*\.jar$",
            r"^dtmalum-.*\.jar$",
            r"^occultism-.*\.jar$",
            r"^reliquary-.*\.jar$",
            r"^Apotheosis-.*\.jar$",
            r"^ApotheoticAdditions.*\.jar$",
            r"^ApothicAttributes-.*\.jar$",
            r"^Placebo-.*\.jar$",
            r"^FastFurnace-.*\.jar$",
            r"^FastWorkbench-.*\.jar$",
            r"^artifacts-forge-.*\.jar$",
            r"^relics-.*\.jar$",
            r"^iceandfire-.*\.jar$",
            r"^citadel-.*\.jar$",
            r"^savage_and_ravage-.*\.jar$",
            r"^guardvillagers-.*\.jar$",
            r"^golemoverhaul-.*\.jar$",
            r"^SmartBrainLib-.*\.jar$",
        ],
    ),
    Phase(
        "no_custom_mods",
        "active bundled custom jars from the pack mods directory",
        CUSTOM_JAR_PATTERNS,
    ),
    Phase("no_emi_only", "EMI client/server indexing without JEI removal", [r"^emi-.*\.jar$", r"^emitrades-.*\.jar$"]),
    Phase("no_jei_only", "JEI stack without EMI removal", [r"^jei-.*\.jar$", r"^tconjei-.*\.jar$"]),
    Phase("no_fiahi", "Freeze It And Heat It tick/container temperature integration", [r"^fiahi-.*\.jar$"]),
    Phase(
        "no_coldsweat_fiahi",
        "Cold Sweat plus FIAHI temperature/container integration",
        [r"^ColdSweat-.*\.jar$", r"^create_cold_sweat-.*\.jar$", r"^fiahi-.*\.jar$"],
    ),
    Phase(
        "no_quark_supplementaries",
        "Quark/Supplementaries decorative and behavior surface",
        [r"^Quark-.*\.jar$", r"^DynamicTreesQuark-.*\.jar$", r"^supplementaries-.*\.jar$", r"^amendments-.*\.jar$"],
    ),
    Phase(
        "no_natures_spirit_family",
        "Nature's Spirit and direct tree/geophilic adjuncts",
        [r"^natures_spirit-.*\.jar$", r"^dtnatures_spirit-.*\.jar$", r"^Geophilic .*\.jar$"],
    ),
    Phase(
        "no_dynamic_trees_family",
        "Dynamic Trees family and custom Malum bridge",
        [r"^DynamicTrees.*\.jar$", r"^dtmalum-.*\.jar$", r"^dtnatures_spirit-.*\.jar$"],
    ),
    Phase(
        "no_placebo_apotheosis_stack",
        "Placebo dependents: Apotheosis and Fast* libraries",
        [
            r"^Apotheosis-.*\.jar$",
            r"^ApotheoticAdditions.*\.jar$",
            r"^ApothicAttributes-.*\.jar$",
            r"^FastFurnace-.*\.jar$",
            r"^FastWorkbench-.*\.jar$",
            r"^Placebo-.*\.jar$",
        ],
    ),
    Phase("no_coldsweat_only", "Cold Sweat bridge without FIAHI removal", [r"^ColdSweat-.*\.jar$", r"^create_cold_sweat-.*\.jar$"]),
    Phase(
        "no_farmers_delight_stack",
        "Farmer's Delight and direct food addons",
        [
            r"^FarmersDelight-.*\.jar$",
            r"^BrewinAndChewin-.*\.jar$",
            r"^Delightful-.*\.jar$",
            r"^MyNethersDelight-.*\.jar$",
            r"^VeggiesDelight-.*\.jar$",
            r"^ubesdelight-.*\.jar$",
            r"^undergardendelight-.*\.jar$",
            r"^chefsdelight-.*\.jar$",
            r"^collectorsreap-.*\.jar$",
            r"^corn_delight-.*\.jar$",
            r"^ends_delight-.*\.jar$",
            r"^farmersrespite-.*\.jar$",
            r"^oceansdelight-.*\.jar$",
            r"^rusticdelight-.*\.jar$",
        ],
    ),
    Phase(
        "no_body_needs_stack",
        "diet/thirst/cravings/client food HUD helpers",
        [
            r"^diet-forge-.*\.jar$",
            r"^solcarrot-.*\.jar$",
            r"^ThirstWasTaken-.*\.jar$",
            r"^appleskin-.*\.jar$",
            r"^cravings-.*\.jar$",
        ],
    ),
    Phase(
        "no_ars_blood_malum_stack",
        "Ars/Blood/Malum magic stack and direct bridges",
        [
            r"^ars_nouveau-.*\.jar$",
            r"^DynamicTreesArsNouveau-.*\.jar$",
            r"^bloodmagic-.*\.jar$",
            r"^KubeJS Blood Magic-.*\.jar$",
            r"^tomeofblood-.*\.jar$",
            r"^malum-.*\.jar$",
            r"^dtmalum-.*\.jar$",
            r"^occultism-.*\.jar$",
        ],
    ),
    Phase("no_botania_only", "Botania only", [r"^Botania-.*\.jar$"]),
    Phase(
        "no_adventure_mob_stack",
        "adventure mobs, artifacts, relics, and combat-adjacent content",
        [
            r"^artifacts-forge-.*\.jar$",
            r"^relics-.*\.jar$",
            r"^iceandfire-.*\.jar$",
            r"^citadel-.*\.jar$",
            r"^savage_and_ravage-.*\.jar$",
            r"^guardvillagers-.*\.jar$",
            r"^golemoverhaul-.*\.jar$",
            r"^SmartBrainLib-.*\.jar$",
        ],
    ),
    Phase(
        "no_top_visuals",
        "top visual/model suspects together: Chipped, Steam Rails, DH, Quark/Supplementaries",
        [
            r"^chipped-forge-.*\.jar$",
            r"^Steam_Rails-.*\.jar$",
            r"^DistantHorizons-.*\.jar$",
            r"^Quark-.*\.jar$",
            r"^DynamicTreesQuark-.*\.jar$",
            r"^supplementaries-.*\.jar$",
            r"^amendments-.*\.jar$",
        ],
    ),
]


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, check=False, **kwargs)


def log(message: str) -> None:
    print(message, flush=True)
    with (OUT_DIR / "run.log").open("a") as f:
        f.write(message + "\n")


def kill_tree(pid: int) -> None:
    if pid <= 0:
        return
    children = run(["pgrep", "-P", str(pid)], stdout=subprocess.PIPE).stdout.split()
    for child in children:
        kill_tree(int(child))
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.kill(pid, sig)
        except ProcessLookupError:
            return
        time.sleep(0.5)


def children_of(pid: int) -> list[int]:
    children = []
    result = run(["pgrep", "-P", str(pid)], stdout=subprocess.PIPE)
    for child in result.stdout.split():
        child_pid = int(child)
        children.append(child_pid)
        children.extend(children_of(child_pid))
    return children


def sum_rss_tree_kb(pid: int) -> int:
    total = 0
    for proc_id in [pid, *children_of(pid)]:
        result = run(["ps", "-p", str(proc_id), "-o", "rss="], stdout=subprocess.PIPE)
        value = result.stdout.strip()
        if value.isdigit():
            total += int(value)
    return total


def cleanup_minecraft_processes() -> None:
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
            if not parts:
                continue
            pid = int(parts[0])
            if pid == os.getpid():
                continue
            kill_tree(pid)


def all_jars() -> list[Path]:
    jars = []
    for mod_dir in (LIVE_MODS, SERVER_MODS):
        if mod_dir.is_dir():
            jars.extend(sorted(mod_dir.glob("*.jar")))
    return jars


def matches_any(name: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, name) for pattern in patterns)


def matched_jars(phase: Phase) -> list[Path]:
    if phase.keep is not None:
        selected = []
        for jar in all_jars():
            if not matches_any(jar.name, phase.keep):
                selected.append(jar)
        return selected
    return [jar for jar in all_jars() if matches_any(jar.name, phase.disable)]


def disable_jars(paths: list[Path]) -> list[tuple[Path, Path]]:
    moved = []
    for src in paths:
        if not src.exists() or src.name.endswith(DISABLED_SUFFIX):
            continue
        dst = src.with_name(src.name + DISABLED_SUFFIX)
        if dst.exists():
            continue
        src.rename(dst)
        moved.append((dst, src))
    return moved


def restore_jars(moved: list[tuple[Path, Path]]) -> None:
    for disabled, original in reversed(moved):
        if disabled.exists() and not original.exists():
            disabled.rename(original)


def wait_for_server(port: int, log_path: Path) -> str:
    deadline = time.time() + BOOT_TIMEOUT_SEC
    fatal = re.compile(r"FAILED TO BIND TO PORT|Mod Loading has failed|Encountered an unexpected exception|Preparing crash report|This crash report has been saved|Error: Failed to initialize")
    while time.time() < deadline:
        if log_path.exists():
            text = log_path.read_text(errors="replace")
            if "Done (" in text:
                return "PASS"
            if fatal.search(text):
                return "FAIL"
        ss = run(["ss", "-ltn"], stdout=subprocess.PIPE)
        if f":{port}" in ss.stdout and log_path.exists():
            return "PASS"
        time.sleep(1)
    return "TIMEOUT"


def start_server(phase_dir: Path) -> subprocess.Popen[str]:
    log_path = phase_dir / "server-stdout.log"
    with log_path.open("w") as log_file:
        proc = subprocess.Popen(
            ["./run.sh", "nogui"],
            cwd=SERVER_DIR,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )
    return proc


def parse_key_value_summary(summary: Path) -> dict[str, str]:
    data = {}
    if not summary.exists():
        return data
    for line in summary.read_text(errors="replace").splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            data[key.strip()] = value.strip()
    return data


def parse_smaps(path: Path) -> dict[str, float]:
    out = {}
    if not path.exists():
        return out
    for line in path.read_text(errors="replace").splitlines():
        m = re.match(r"^(Rss|Pss|Private_Clean|Private_Dirty|Anonymous|AnonHugePages):\s+(\d+)\s+kB", line)
        if m:
            out[m.group(1).lower() + "_mib"] = round(int(m.group(2)) / 1024, 1)
    return out


def parse_heap(path: Path) -> dict[str, float]:
    out = {}
    if not path.exists():
        return out
    text = path.read_text(errors="replace")
    m = re.search(r"garbage-first heap\s+total\s+(\d+)K,\s+used\s+(\d+)K", text)
    if m:
        out["heap_total_mib"] = round(int(m.group(1)) / 1024, 1)
        out["heap_used_mib"] = round(int(m.group(2)) / 1024, 1)
    return out


def parse_metaspace(path: Path) -> dict[str, float]:
    out = {}
    if not path.exists():
        return out
    text = path.read_text(errors="replace")
    m = re.search(r"Usage:\s+Non-class:\s+([\d.]+)\s+MB.*?Class:\s+([\d.]+)\s+MB", text, re.S)
    if m:
        out["metaspace_used_mib"] = round(float(m.group(1)) + float(m.group(2)), 1)
    return out


def parse_histogram(path: Path) -> dict[str, float]:
    out = {}
    if not path.exists():
        return out
    total_bytes = 0
    interesting = {
        "[B": "byte_arrays_mib",
        "[I": "int_arrays_mib",
        "net.minecraft.client.renderer.block.model.BakedQuad": "baked_quads_mib",
        "dev.emi.emi.api.stack.ItemEmiStack": "emi_item_stacks_mib",
        "net.minecraft.world.item.ItemStack": "item_stacks_mib",
    }
    buckets = {v: 0 for v in interesting.values()}
    for line in path.read_text(errors="replace").splitlines():
        parts = line.split()
        if len(parts) < 4 or not parts[0].rstrip(":").isdigit():
            continue
        try:
            bytes_used = int(parts[2])
        except ValueError:
            continue
        class_name = parts[3]
        total_bytes += bytes_used
        if class_name in interesting:
            buckets[interesting[class_name]] += bytes_used
    out["hist_total_mib"] = round(total_bytes / 1024 / 1024, 1)
    for key, value in buckets.items():
        out[key] = round(value / 1024 / 1024, 1)
    return out


def parse_process_peak(path: Path) -> dict[str, float]:
    if not path.exists():
        return {}
    max_client = 0
    max_root = 0
    joined_at = None
    with path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                client = int(row.get("client_rss_kb") or 0)
                root = int(row.get("root_rss_kb") or 0)
                elapsed = int(row.get("elapsed") or 0)
            except ValueError:
                continue
            max_client = max(max_client, client)
            max_root = max(max_root, root)
            if row.get("server_joined") == "1" and joined_at is None:
                joined_at = elapsed
    return {
        "max_client_mib": round(max_client / 1024, 1),
        "max_root_mib": round(max_root / 1024, 1),
        "joined_at_sec": joined_at,
    }


def extract_log_metrics(run_dir: Path) -> dict[str, object]:
    metrics: dict[str, object] = {}
    client_log = run_dir / "client-latest.log"
    if client_log.exists():
        text = client_log.read_text(errors="replace")
        atlas = re.findall(r"Created: ([^ ]+)x([^ ]+)x([^ ]+) minecraft:textures/atlas/blocks.png-atlas", text)
        if atlas:
            w, h, levels = atlas[-1]
            metrics["block_atlas"] = f"{w}x{h}x{levels}"
        emi = re.findall(r"Reloaded EMI in (\d+)ms", text)
        if emi:
            metrics["emi_reload_ms"] = int(emi[-1])
        loaded = re.findall(r"Loaded (\d+) mods", text)
        if loaded:
            metrics["loaded_mods"] = int(loaded[-1])
    return metrics


def phase_result(phase: Phase, phase_dir: Path) -> dict[str, object]:
    probe_dirs = sorted((phase_dir / "client_join_probe").glob("*"))
    run_dir = probe_dirs[-1] if probe_dirs else phase_dir / "client_join_probe"
    summary = parse_key_value_summary(run_dir / "summary.txt")
    result: dict[str, object] = {
        "phase": phase.name,
        "description": phase.description,
        "status": summary.get("status", "NO_SUMMARY"),
        "reason": summary.get("reason", ""),
        "run_dir": str(run_dir),
    }
    result.update(parse_process_peak(run_dir / "processes.csv"))
    profile_dir = phase_dir / "profile"
    result.update(parse_smaps(profile_dir / "smaps_rollup.txt"))
    result.update(parse_heap(profile_dir / "jcmd_heap_info.txt"))
    result.update(parse_metaspace(profile_dir / "jcmd_metaspace.txt"))
    result.update(parse_histogram(profile_dir / "jcmd_class_histogram.txt"))
    result.update(extract_log_metrics(run_dir))
    return result


def run_phase(phase: Phase, ordinal: int) -> dict[str, object]:
    phase_dir = OUT_DIR / f"{ordinal:02d}_{phase.name}"
    phase_dir.mkdir(parents=True, exist_ok=True)
    selected = matched_jars(phase)
    (phase_dir / "disabled_jars.json").write_text(json.dumps([str(p) for p in selected], indent=2))
    moved: list[tuple[Path, Path]] = []
    server_proc: subprocess.Popen[str] | None = None
    log(f"phase {ordinal}: {phase.name}; disabling {len(selected)} jar files")
    try:
        cleanup_minecraft_processes()
        moved = disable_jars(selected)
        server_proc = start_server(phase_dir)
        server_state = wait_for_server(SERVER_PORT, phase_dir / "server-stdout.log")
        if server_state != "PASS":
            return {
                "phase": phase.name,
                "description": phase.description,
                "status": "FAIL",
                "reason": f"server_{server_state.lower()}",
                "disabled_count": len(selected),
                "run_dir": str(phase_dir),
            }
        env = os.environ.copy()
        env.update(
            {
                "ROOT": str(ROOT),
                "SERVER_DIR": str(SERVER_DIR),
                "PRISM_INSTANCE": PRISM_INSTANCE,
                "SERVER_PORT": str(SERVER_PORT),
                "OUT_DIR": str(phase_dir / "client_join_probe"),
                "SETTLE_SEC": str(SETTLE_SEC),
                "JOIN_TIMEOUT_SEC": str(JOIN_TIMEOUT_SEC),
                "CLIENT_PROFILE_OUT": str(phase_dir / "profile"),
            }
        )
        probe = run([str(CLIENT_JOIN_PROBE)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        (phase_dir / "client_join_probe_stdout.log").write_text(probe.stdout)
        result = phase_result(phase, phase_dir)
        server_rss_kb = sum_rss_tree_kb(server_proc.pid) if server_proc is not None else 0
        result["server_rss_mib"] = round(server_rss_kb / 1024, 1)
        client_rss_mib = result.get("max_client_mib")
        if isinstance(client_rss_mib, int | float):
            result["combined_server_client_rss_mib"] = round(result["server_rss_mib"] + float(client_rss_mib), 1)
        result["disabled_count"] = len(selected)
        return result
    finally:
        if server_proc is not None:
            kill_tree(server_proc.pid)
        cleanup_minecraft_processes()
        restore_jars(moved)
        cleanup_minecraft_processes()


def write_reports(results: list[dict[str, object]]) -> None:
    summary_json = OUT_DIR / "joined_cross_section_summary.json"
    summary_json.write_text(json.dumps(results, indent=2))
    csv_path = OUT_DIR / "joined_cross_section_summary.csv"
    fields = [
        "phase",
        "status",
        "reason",
        "disabled_count",
        "loaded_mods",
        "block_atlas",
        "emi_reload_ms",
        "rss_mib",
        "anonymous_mib",
        "hist_total_mib",
        "heap_total_mib",
        "heap_used_mib",
        "metaspace_used_mib",
        "byte_arrays_mib",
        "int_arrays_mib",
        "baked_quads_mib",
        "emi_item_stacks_mib",
        "item_stacks_mib",
        "max_client_mib",
        "joined_at_sec",
        "run_dir",
    ]
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    baseline = next((r for r in results if r["phase"] == "baseline" and r.get("rss_mib")), None)
    if baseline is None:
        baseline = next((r for r in results if r.get("rss_mib")), None)
    base_rss = float(baseline["rss_mib"]) if baseline else 0.0
    ranked = []
    for row in results:
        rss = row.get("rss_mib")
        if isinstance(rss, (int, float)) and base_rss:
            ranked.append((base_rss - float(rss), row))
    ranked.sort(reverse=True, key=lambda item: item[0])
    report = OUT_DIR / "joined_cross_section_ranked.md"
    lines = [
        "# Joined Client RAM Cross-Section",
        "",
        f"Output: `{OUT_DIR}`",
        "",
        "Method: temporary jar disables in live Prism + server mods, dedicated server start, Prism quick-play client join, post-join smaps/heap/class histogram capture, restore jars.",
        "",
        "| Phase | Status | Disabled | RSS MiB | Delta vs baseline MiB | Hist MiB | Heap used MiB | Atlas | EMI ms | Notes |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |",
    ]
    by_phase = {r["phase"]: r for r in results}
    for phase in [p.name for p in expanded_phases()]:
        row = by_phase.get(phase)
        if not row:
            continue
        rss = row.get("rss_mib")
        delta = ""
        if isinstance(rss, (int, float)) and base_rss:
            delta = f"{base_rss - float(rss):.1f}"
        lines.append(
            "| {phase} | {status} | {disabled} | {rss} | {delta} | {hist} | {heap} | {atlas} | {emi} | {reason} |".format(
                phase=row.get("phase", ""),
                status=row.get("status", ""),
                disabled=row.get("disabled_count", ""),
                rss=row.get("rss_mib", ""),
                delta=delta,
                hist=row.get("hist_total_mib", ""),
                heap=row.get("heap_used_mib", ""),
                atlas=row.get("block_atlas", ""),
                emi=row.get("emi_reload_ms", ""),
                reason=row.get("reason", ""),
            )
        )
    report.write_text("\n".join(lines) + "\n")
    log(f"summary_json={summary_json}")
    log(f"summary_csv={csv_path}")
    log(f"ranked_report={report}")


def expanded_phases() -> list[Phase]:
    if PHASES_FILE:
        phase_data = json.loads(Path(PHASES_FILE).read_text())
        phases = [
            Phase(
                str(item["name"]),
                str(item.get("description", "")),
                list(item.get("disable", [])),
                list(item["keep"]) if item.get("keep") is not None else None,
            )
            for item in phase_data
        ]
        if PHASE_FILTER:
            regex = re.compile(PHASE_FILTER)
            phases = [p for p in phases if regex.search(p.name)]
        return phases

    phases = []
    for i in range(BASELINE_REPEATS):
        if i == 0:
            phases.append(DEFAULT_PHASES[0])
        else:
            phases.append(Phase(f"baseline_repeat_{i + 1}", "full pack repeat for noise check", []))
    phases.extend(DEFAULT_PHASES[1:])
    if PHASE_FILTER:
        regex = re.compile(PHASE_FILTER)
        phases = [p for p in phases if regex.search(p.name)]
    return phases


def main() -> int:
    if not CLIENT_JOIN_PROBE.exists():
        print(f"missing {CLIENT_JOIN_PROBE}", file=sys.stderr)
        return 1
    if not LIVE_MODS.is_dir():
        print(f"missing {LIVE_MODS}", file=sys.stderr)
        return 1
    if not SERVER_MODS.is_dir():
        print(f"missing {SERVER_MODS}", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(__file__, OUT_DIR / "runner_snapshot.py")
    results = []
    phases = expanded_phases()
    try:
        for idx, phase in enumerate(phases, 1):
            result = run_phase(phase, idx)
            results.append(result)
            write_reports(results)
            log(f"phase_complete {phase.name}: {result.get('status')} {result.get('reason')} rss={result.get('rss_mib')}")
    finally:
        cleanup_minecraft_processes()
        leftovers = list(LIVE_MODS.glob(f"*{DISABLED_SUFFIX}")) + list(SERVER_MODS.glob(f"*{DISABLED_SUFFIX}"))
        for disabled in leftovers:
            original = disabled.with_name(disabled.name[: -len(DISABLED_SUFFIX)])
            if not original.exists():
                disabled.rename(original)
        write_reports(results)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
