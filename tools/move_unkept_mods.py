#!/usr/bin/env python3
"""Move unkept repo mod files into ~/oldmods.

The keep set is seeded from a curated list of content jars and expanded by
mandatory dependencies declared in installed jar metadata.
"""

from __future__ import annotations

import re
import shutil
import zipfile
import os
from dataclasses import dataclass, field
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in

require_legacy_live_tool_opt_in()


ROOT = Path("/home/gerald/obelisks")
OLDMODS = Path.home() / "oldmods"
MODS_DIR = ROOT / "mods"
SERVER_MODS_DIR = ROOT / "server-instance" / "mods"

IGNORED_DEP_IDS = {
    "forge",
    "minecraft",
    "java",
}

SEED_PATTERNS = [
    r"^BrewinAndChewin-.*\.jar$",
    r"^BuildingWands-.*\.jar$",
    r"^Cobble-Gen-Haters-.*\.jar$",
    r"^ColdSweat-.*\.jar$",
    r"^DistantHorizons-.*\.jar$",
    r"^DynamicTrees-.*\.jar$",
    r"^DynamicTreesArsNouveau-.*\.jar$",
    r"^DynamicTreesPlus-.*\.jar$",
    r"^DynamicTreesQuark-.*\.jar$",
    r"^Explosion-Overhaul-.*\.jar$",
    r"^Fallout Wasteland .*\.jar$",
    r"^FarmersDelight-.*\.jar$",
    r"^GlobalGameRules-.*\.jar$",
    r"^HangGlider-.*\.jar$",
    r"^Hyle-.*\.jar$",
    r"^K-Turrets-.*\.jar$",
    r"^KubeJS Blood Magic-.*\.jar$",
    r"^NaturesCompass-.*\.jar$",
    r"^PlayerRevive_.*\.jar$",
    r"^Quark-.*\.jar$",
    r"^SereneSeasons-.*\.jar$",
    r"^SleepingOverhaul-.*\.jar$",
    r"^TConstruct-.*\.jar$",
    r"^The_Undergarden-.*\.jar$",
    r"^ThirstWasTaken-.*\.jar$",
    r"^TinkerBetterCombat .*\.jar$",
    r"^Towns-and-Towers-.*\.jar$",
    r"^TradingPost-.*\.jar$",
    r"^TravelersTitles-.*\.jar$",
    r"^UnEarthed-.*\.jar$",
    r"^\[forge\]ctov-.*\.jar$",
    r"^aether-.*\.jar$",
    r"^alchemistry-.*\.jar$",
    r"^alekiNiftyShips-.*\.jar$",
    r"^appleskin-.*\.jar$",
    r"^appliedenergistics2-.*\.jar$",
    r"^ars_nouveau-.*\.jar$",
    r"^bettercombat-.*\.jar$",
    r"^bloodmagic-.*\.jar$",
    r"^blue_skies-.*\.jar$",
    r"^btmfixes-.*\.jar$",
    r"^buildinggadgets2-.*\.jar$",
    r"^classselector-.*\.jar$",
    r"^compressedcreativity-.*\.jar$",
    r"^computerbridge-.*\.jar$",
    r"^create-[0-9].*\.jar$",
    r"^create-transmission-loss-.*\.jar$",
    r"^create_cold_sweat-.*\.jar$",
    r"^createbigcannons-.*\.jar$",
    r"^createdieselgenerators-.*\.jar$",
    r"^creatingspace-.*\.jar$",
    r"^cursedbiomes-.*\.jar$",
    r"^darkness-.*\.jar$",
    r"^deeperdarker-.*\.jar$",
    r"^diet-forge-.*\.jar$",
    r"^dotcoinmod-.*\.jar$",
    r"^dtnatures_spirit-.*\.jar$",
    r"^dynamicvillagertrades-.*\.jar$",
    r"^everythingcopper-.*\.jar$",
    r"^excavatedvariants-.*\.jar$",
    r"^farsighted-mobs-.*\.jar$",
    r"^fiahi-.*\.jar$",
    r"^findme-.*\.jar$",
    r"^finite_water-.*\.jar$",
    r"^ftb-quests-.*\.jar$",
    r"^golemoverhaul-.*\.jar$",
    r"^guardvillagers-.*\.jar$",
    r"^heatsync-.*\.jar$",
    r"^holdmyitems-.*\.jar$",
    r"^iceandfire-.*\.jar$",
    r"^immersive_weathering-.*\.jar$",
    r"^incontrol-.*\.jar$",
    r"^inventorysorter-.*\.jar$",
    r"^jei-.*\.jar$",
    r"^citadel-.*\.jar$",
    r"^kotlinforforge-.*\.jar$",
    r"^kubejs-create-.*\.jar$",
    r"^kubejs-forge-.*\.jar$",
    r"^littlelogistics-.*\.jar$",
    r"^looot-.*\.jar$",
    r"^lootjs-.*\.jar$",
    r"^lootr-.*\.jar$",
    r"^lostcities-.*\.jar$",
    r"^markdown_manual-.*\.jar$",
    r"^mob-ai-tweaks-.*\.jar$",
    r"^modonomicon-.*\.jar$",
    # KubeJS scripts use MoreJSEvents directly, so this is a functional pack
    # dependency even though it is not declared by the loader metadata.
    r"^morejs-forge-.*\.jar$",
    r"^morered-.*\.jar$",
    r"^natures_spirit-.*\.jar$",
    r"^nomobfarm-.*\.jar$",
    r"^notreepunching-.*\.jar$",
    r"^obelisks-.*\.jar$",
    r"^oc2r-.*\.jar$",
    r"^particular-.*\.jar$",
    r"^pillagercampaigns-.*\.jar$",
    r"^pneumaticcraft-repressurized-.*\.jar$",
    r"^polymorph-.*\.jar$",
    r"^powergrid-.*\.jar$",
    r"^procedural_bouquets-.*\.jar$",
    r"^protection_pixel-.*\.jar$",
    r"^realisticores-.*\.jar$",
    r"^realisticphysics-.*\.jar$",
    r"^rpgstats-.*\.jar$",
    r"^rsgauges-.*\.jar$",
    r"^savage_and_ravage-.*\.jar$",
    r"^settlementroads-.*\.jar$",
    r"^solcarrot-.*\.jar$",
    r"^sophisticatedbackpacks-.*\.jar$",
    r"^sophisticatedstorage-.*\.jar$",
    r"^staaaaaaaaaaaack-.*\.jar$",
    r"^starcatcher-.*\.jar$",
    r"^takesapillage-.*\.jar$",
    r"^tconjei-.*\.jar$",
    r"^tectonic-.*\.jar$",
    r"^the_finley_dimension_remastered-.*\.jar$",
    r"^theoneprobe-.*\.jar$",
    r"^tntutils-.*\.jar$",
    r"^tomeofblood-.*\.jar$",
    r"^tponder-.*\.jar$",
    r"^twilightforest-.*\.jar$",
    r"^villagespawnpoint-.*\.jar$",
    r"^villagewalls-.*\.jar$",
    r"^wares-.*\.jar$",
    r"^weather2-.*\.jar$",
]


@dataclass
class JarInfo:
    path: Path
    mod_ids: set[str] = field(default_factory=set)
    mandatory_deps: set[str] = field(default_factory=set)


def parse_mods_toml(text: str) -> tuple[set[str], set[str]]:
    mod_text = re.split(r"(?m)^\s*\[\[dependencies\.[^\]]+\]\]\s*$", text, maxsplit=1)[0]
    mod_ids = set(re.findall(r'(?m)^\s*modId\s*=\s*"([^"]+)"', mod_text))
    deps = set()
    for block in re.split(r"(?m)^\s*\[\[dependencies\.[^\]]+\]\]\s*$", text)[1:]:
        mod = re.search(r'(?m)^\s*modId\s*=\s*"([^"]+)"', block)
        mandatory = re.search(r"(?m)^\s*mandatory\s*=\s*(true|false)", block)
        if mod and mandatory is not None and mandatory.group(1) == "true":
            deps.add(mod.group(1))
    return mod_ids, deps


def jar_info(path: Path) -> JarInfo:
    info = JarInfo(path)
    try:
        with zipfile.ZipFile(path) as zf:
            names = set(zf.namelist())
            if "META-INF/mods.toml" in names:
                ids, deps = parse_mods_toml(zf.read("META-INF/mods.toml").decode("utf-8", "replace"))
                info.mod_ids.update(ids)
                info.mandatory_deps.update(deps)
            if "META-INF/neoforge.mods.toml" in names:
                ids, deps = parse_mods_toml(zf.read("META-INF/neoforge.mods.toml").decode("utf-8", "replace"))
                info.mod_ids.update(ids)
                info.mandatory_deps.update(deps)
    except zipfile.BadZipFile:
        pass
    return info


def repo_filename_for_packwiz(path: Path) -> str | None:
    text = path.read_text(errors="replace")
    match = re.search(r'(?m)^\s*filename\s*=\s*"([^"]+)"', text)
    return match.group(1) if match else None


def move_to_oldmods(path: Path) -> None:
    rel = path.relative_to(ROOT)
    dest = OLDMODS / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        suffix = 1
        while True:
            candidate = dest.with_name(f"{dest.name}.old{suffix}")
            if not candidate.exists():
                dest = candidate
                break
            suffix += 1
    shutil.move(str(path), str(dest))


def main() -> int:
    jar_paths = sorted(SERVER_MODS_DIR.glob("*.jar"))
    infos = {path.name: jar_info(path) for path in jar_paths}
    by_mod_id: dict[str, set[str]] = {}
    for name, info in infos.items():
        for mod_id in info.mod_ids:
            by_mod_id.setdefault(mod_id, set()).add(name)

    seed_res = [re.compile(pattern) for pattern in SEED_PATTERNS]
    keep = {name for name in infos if any(regex.search(name) for regex in seed_res)}
    changed = True
    while changed:
        changed = False
        for name in list(keep):
            for dep in infos[name].mandatory_deps:
                if dep in IGNORED_DEP_IDS:
                    continue
                for dep_name in by_mod_id.get(dep, set()):
                    if dep_name not in keep:
                        keep.add(dep_name)
                        changed = True

    server_move = [path for path in jar_paths if path.name not in keep]

    root_files = sorted([p for p in MODS_DIR.iterdir() if p.is_file() and p.suffix in {".jar", ".toml"}])
    root_move = []
    kept_root = []
    for path in root_files:
        if path.suffix == ".jar":
            keep_file = path.name in keep
        else:
            filename = repo_filename_for_packwiz(path)
            keep_file = filename in keep if filename else False
        if keep_file:
            kept_root.append(path)
        else:
            root_move.append(path)

    report = Path(os.environ.get("REPORT_PATH", str(ROOT / "generated" / "validation" / "oldmods_move_plan_20260506.txt")))
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(
        "\n".join(
            [
                f"keep_jars={len(keep)}",
                f"move_server_jars={len(server_move)}",
                f"move_root_files={len(root_move)}",
                "",
                "[KEEP JARS]",
                *sorted(keep),
                "",
                "[MOVE server-instance/mods]",
                *[str(p.relative_to(ROOT)) for p in server_move],
                "",
                "[MOVE mods]",
                *[str(p.relative_to(ROOT)) for p in root_move],
                "",
            ]
        )
    )

    if os.environ.get("DRY_RUN") != "1":
        for path in server_move + root_move:
            if path.exists():
                move_to_oldmods(path)

    print(f"keep_jars={len(keep)}")
    print(f"moved_server_jars={len(server_move)}")
    print(f"moved_root_files={len(root_move)}")
    print(f"report={report}")
    if os.environ.get("DRY_RUN") == "1":
        print("dry_run=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
