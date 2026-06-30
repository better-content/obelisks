#!/usr/bin/env python3
import csv
import json
import os
import re
import subprocess
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in

require_legacy_live_tool_opt_in()

ROOT = Path("/home/gerald/obelisks")
PRISM_ROOT = Path(os.environ.get("PRISM_ROOT", str(Path.home() / ".local/share/PrismLauncher")))
INSTANCE = os.environ.get("INSTANCE", "Better Content-Playtest 4 - v1")
MODS_DIR = PRISM_ROOT / "instances" / INSTANCE / "minecraft" / "mods"
PROFILE = ROOT / "tools" / "profile_prism_variant.sh"
OUT_BASE = Path(os.environ.get("OUT_BASE", "/tmp/btm-memory-variants"))
STAMP = os.environ.get("STAMP")
if not STAMP:
    from datetime import datetime
    STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
OUT = OUT_BASE / f"six_cluster_ab_{STAMP}"
OUT.mkdir(parents=True, exist_ok=True)

BASELINE_RUNS = int(os.environ.get("BASELINE_RUNS", "2"))
FORCE_STOP_AFTER = os.environ.get("FORCE_STOP_AFTER", "120")
MENU_ONLY = os.environ.get("MENU_ONLY", "1")

CSV = OUT / "results.csv"
MANIFEST = OUT / "clusters.json"
SUMMARY = OUT / "summary.txt"

clusters = {
  "c1_core_libs_perf": [],
  "c2_worldgen_dimensions": [],
  "c3_tech_automation": [],
  "c4_magic": [],
  "c5_adventure_mobs_structures": [],
  "c6_survival_food_building_qol": [],
}

rules = [
  ("c2_worldgen_dimensions", [r"twilight", r"undergarden", r"lost", r"aether", r"blue[-_ ]?skies", r"deeper", r"otherside", r"fallout", r"finley", r"creatingspace", r"tectonic", r"terrablender", r"geophilic", r"litho", r"natures[-_ ]?spirit", r"dynamic[-_ ]?trees", r"unearthed", r"hyle", r"realisticores", r"excavated"]),
  ("c3_tech_automation", [r"^create", r"applied", r"ae2", r"oc2r", r"power[-_ ]?grid", r"steam[-_ ]?n[-_ ]?rails", r"little[-_ ]?logistics", r"transmission", r"fission", r"gases", r"heatsync", r"liquid[_-]coolant", r"acid", r"pollution", r"alchem", r"chemlib", r"computerbridge", r"nucleus", r"grid"]),
  ("c4_magic", [r"blood", r"ars", r"botania", r"occult", r"malum", r"theurgy", r"reliquary", r"tome[-_ ]?of[-_ ]?blood", r"hex", r"goety", r"mahou", r"eidolon", r"roots", r"mana", r"psi", r"forbidden", r"enchan"]),
  ("c5_adventure_mobs_structures", [r"pillag", r"raid", r"guard", r"ice[-_ ]?and[-_ ]?fire", r"artifacts", r"relic", r"golem", r"savage", r"born", r"alex", r"mob", r"village", r"towns", r"ctov", r"choicetheorem", r"starcatcher", r"obelisk", r"settlement", r"walls", r"ships"]),
  ("c6_survival_food_building_qol", [r"delight", r"diet", r"thirst", r"nutrition", r"spice", r"brew", r"respite", r"cold[-_ ]?sweat", r"weather", r"sound", r"footsteps", r"framed", r"building", r"sophisticated", r"storage", r"backpack", r"quark", r"supplementaries", r"immersive[-_ ]?weathering", r"amendments", r"plonk", r"bettergrass", r"mouse", r"controll", r"oculus", r"embeddium", r"entityculling", r"lighty", r"appleskin", r"emi", r"jei", r"ftb[-_ ]?quests", r"ftb[-_ ]?teams", r"wares", r"dotcoin"]),
]

def assign(jar):
    n = jar.lower()
    for cluster, pats in rules:
        for p in pats:
            if re.search(p, n):
                return cluster
    return "c1_core_libs_perf"

def run(cmd, **kwargs):
    return subprocess.run(cmd, text=True, check=False, **kwargs)

def cleanup():
    run(["pkill","-f","PrismLauncher-Linux-x86_64.AppImage"])
    run(["pkill","-f","org.prismlauncher.EntryPoint"])

def parse_summary(path):
    t = path.read_text() if path.exists() else ""
    marker = re.search(r"marker=([A-Za-z0-9_]+)", t)
    peak = re.search(r"peakRssMiB=([0-9]+)", t)
    m = marker.group(1) if marker else "unknown"
    p = int(peak.group(1))*1024 if peak else 0
    return m, p

def gib(kb):
    return kb/1024/1024

def run_variant(name, jars):
    cleanup()
    env = os.environ.copy()
    env["BTM_PROFILE_OUT"] = str(OUT)
    env["BTM_PROFILE_MENU_ONLY"] = MENU_ONLY
    env["BTM_FORCE_STOP_AFTER_SECONDS"] = FORCE_STOP_AFTER
    env["BTM_PROFILE_DIAG"] = "0"
    env["BTM_PROFILE_NMT"] = "0"
    env["BTM_SETTLE_SECONDS"] = "0"
    pats = [f"^{re.escape(j)}$" for j in jars]
    run([str(PROFILE), name] + pats, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    s = OUT / f"{name}.summary.txt"
    return parse_summary(s), s

all_jars = sorted([p.name for p in MODS_DIR.glob("*.jar") if p.is_file()])
for j in all_jars:
    clusters[assign(j)].append(j)
for k in clusters:
    clusters[k] = sorted(clusters[k])

MANIFEST.write_text(json.dumps({
    "total_jars": len(all_jars),
    "clusters": {k: {"count": len(v), "jars": v} for k,v in clusters.items()}
}, indent=2))

with CSV.open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["type","name","jar_count","marker","peak_kb","peak_gib","delta_vs_baseline_gib","summary"])

    baselines = []
    for i in range(1, BASELINE_RUNS+1):
        (m,p), s = run_variant(f"baseline_{i}", [])
        baselines.append(p)
        w.writerow(["baseline", f"baseline_{i}", "", m, p, f"{gib(p):.3f}", "", str(s)])

    b = sorted(baselines)[len(baselines)//2] if baselines else 0
    for cname, jars in clusters.items():
        (m,p), s = run_variant(cname, jars)
        d = gib(b-p)
        w.writerow(["cluster", cname, len(jars), m, p, f"{gib(p):.3f}", f"{d:.3f}", str(s)])

with SUMMARY.open("w") as f:
    rows = list(csv.DictReader(CSV.open()))
    base = [r for r in rows if r["type"]=="baseline"]
    bmed = sorted([float(r["peak_gib"]) for r in base])[len(base)//2] if base else 0.0
    f.write(f"baseline_median_gib={bmed:.3f}\n")
    cr = [r for r in rows if r["type"]=="cluster"]
    cr.sort(key=lambda r: float(r["delta_vs_baseline_gib"]), reverse=True)
    for r in cr:
        f.write(f"{r['name']}\tcount={r['jar_count']}\tpeak={r['peak_gib']}GiB\tdelta={float(r['delta_vs_baseline_gib']):+.3f}GiB\tmarker={r['marker']}\n")

print(str(OUT))
