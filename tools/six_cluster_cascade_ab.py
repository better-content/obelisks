#!/usr/bin/env python3
import csv
import json
import os
import re
import subprocess
import zipfile
from collections import defaultdict, deque
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in

require_legacy_live_tool_opt_in()

ROOT = Path("/home/gerald/obelisks")
PRISM_ROOT = Path(os.environ.get("PRISM_ROOT", str(Path.home() / ".local/share/PrismLauncher")))
INSTANCE = os.environ.get("INSTANCE", "Better Content-Playtest 4 - v1")
MODS_DIR = PRISM_ROOT / "instances" / INSTANCE / "minecraft" / "mods"
PROFILE = ROOT / "tools" / "profile_prism_variant.sh"
OUT_BASE = Path(os.environ.get("OUT_BASE", "/tmp/btm-memory-variants"))

from datetime import datetime
STAMP = os.environ.get("STAMP", datetime.now().strftime("%Y%m%d-%H%M%S"))
OUT = OUT_BASE / f"six_cluster_cascade_ab_{STAMP}"
OUT.mkdir(parents=True, exist_ok=True)

BASELINE_RUNS = int(os.environ.get("BASELINE_RUNS", "2"))
FORCE_STOP_AFTER = os.environ.get("FORCE_STOP_AFTER", "120")
MENU_ONLY = os.environ.get("MENU_ONLY", "1")
PROTECTED_PATTERNS = [
    r"kotlinforforge",
    r"framework-",
    r"embeddium-",
    r"sodiumoptionsapi",
    r"architectury-",
    r"cloth-config",
    r"puzzleslib",
    r"resourcefullib",
    r"resourcefulconfig",
    r"curios-",
    r"rhino-",
    r"kubejs-",
    r"ftb-library",
]

CSV = OUT / "results.csv"
MANIFEST = OUT / "clusters.json"
SUMMARY = OUT / "summary.txt"
RUNLOG = OUT / "run.log"

MOD_BLOCK_RE = re.compile(r'(?ms)^\s*\[\[mods\]\]\s*(.*?)(?=^\s*\[\[|\Z)')
MODID_RE = re.compile(r'^\s*modId\s*=\s*"([^"]+)"', re.M)
DEP_BLOCK_RE = re.compile(r'(?ms)^\s*\[\[dependencies\.([A-Za-z0-9_\-\.]+)\]\]\s*(.*?)(?=^\s*\[\[|\Z)')
DEPID_RE = re.compile(r'^\s*modId\s*=\s*"([^"]+)"', re.M)
MAND_RE = re.compile(r'^\s*mandatory\s*=\s*(true|false)', re.M)

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
  ("c3_tech_automation", [r"^create", r"applied", r"ae2", r"oc2r", r"power[-_ ]?grid", r"steam[-_ ]?n[-_ ]?rails", r"little[-_ ]?logistics", r"transmission", r"fission", r"gases", r"heatsync", r"liquid[_-]coolant", r"acid", r"pollution", r"alchem", r"chemlib", r"computerbridge", r"grid"]),
  ("c4_magic", [r"blood", r"ars", r"botania", r"occult", r"malum", r"theurgy", r"reliquary", r"tome[-_ ]?of[-_ ]?blood", r"hex", r"goety", r"mahou", r"eidolon", r"roots", r"mana", r"psi", r"forbidden"]),
  ("c5_adventure_mobs_structures", [r"pillag", r"raid", r"guard", r"ice[-_ ]?and[-_ ]?fire", r"artifacts", r"relic", r"golem", r"savage", r"alex", r"mob", r"village", r"towns", r"ctov", r"choicetheorem", r"starcatcher", r"obelisk", r"settlement", r"walls", r"ships"]),
  ("c6_survival_food_building_qol", [r"delight", r"diet", r"thirst", r"nutrition", r"spice", r"brew", r"respite", r"cold[-_ ]?sweat", r"weather", r"sound", r"footsteps", r"framed", r"building", r"sophisticated", r"storage", r"backpack", r"quark", r"supplementaries", r"immersive[-_ ]?weathering", r"amendments", r"plonk", r"bettergrass", r"mouse", r"controll", r"oculus", r"embeddium", r"entityculling", r"lighty", r"appleskin", r"emi", r"jei", r"ftb[-_ ]?quests", r"ftb[-_ ]?teams", r"wares", r"dotcoin"]),
]

def log(msg):
    print(msg)
    with RUNLOG.open("a") as f:
        f.write(msg + "\n")

def run(cmd, **kwargs):
    return subprocess.run(cmd, text=True, check=False, **kwargs)

def cleanup():
    run(["pkill","-f","PrismLauncher-Linux-x86_64.AppImage"])
    run(["pkill","-f","org.prismlauncher.EntryPoint"])

def parse_jar(jar: Path):
    mod_ids = []
    req = defaultdict(set)
    try:
        with zipfile.ZipFile(jar) as zf:
            raw = zf.read("META-INF/mods.toml").decode("utf-8", "replace")
    except Exception:
        return mod_ids, req
    for blk in MOD_BLOCK_RE.findall(raw):
        m = MODID_RE.search(blk)
        if m:
            mod_ids.append(m.group(1).strip())
    for owner, blk in DEP_BLOCK_RE.findall(raw):
        dm = DEPID_RE.search(blk)
        if not dm:
            continue
        dep = dm.group(1).strip()
        mm = MAND_RE.search(blk)
        mandatory = (mm.group(1).lower() == "true") if mm else True
        if mandatory:
            req[owner].add(dep)
    return mod_ids, req

def assign(jarname: str):
    n = jarname.lower()
    for cname, pats in rules:
        for p in pats:
            if re.search(p, n):
                return cname
    return "c1_core_libs_perf"

def is_protected_jar(jarname: str):
    n = jarname.lower()
    return any(re.search(p, n) for p in PROTECTED_PATTERNS)

def parse_summary(path: Path):
    t = path.read_text() if path.exists() else ""
    marker = re.search(r"marker=([A-Za-z0-9_]+)", t)
    peak = re.search(r"peakRssMiB=([0-9]+)", t)
    return (marker.group(1) if marker else "unknown", int(peak.group(1))*1024 if peak else 0)

def gib(kb): return kb/1024/1024

def run_variant(name, jars):
    cleanup()
    env = os.environ.copy()
    env["BTM_PROFILE_OUT"] = str(OUT)
    env["BTM_PROFILE_MENU_ONLY"] = MENU_ONLY
    env["BTM_FORCE_STOP_AFTER_SECONDS"] = FORCE_STOP_AFTER
    env["BTM_PROFILE_DIAG"] = "0"
    env["BTM_PROFILE_NMT"] = "0"
    env["BTM_SETTLE_SECONDS"] = "0"
    pats = [f"^{re.escape(j)}$" for j in sorted(jars)]
    run([str(PROFILE), name] + pats, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return parse_summary(OUT / f"{name}.summary.txt")

def main():
    jars = sorted([p for p in MODS_DIR.glob("*.jar") if p.is_file()])
    mod_to_jars = defaultdict(set)
    jar_to_mods = defaultdict(set)
    req = defaultdict(set)
    for j in jars:
        mods, deps = parse_jar(j)
        if not mods:
            mods = [f"jar::{j.name}"]
        for m in mods:
            mod_to_jars[m].add(j.name)
            jar_to_mods[j.name].add(m)
        for o, ds in deps.items():
            req[o].update(ds)

    # Normalize req graph to existing mods only
    all_mods = set(mod_to_jars)
    req2 = defaultdict(set)
    rev = defaultdict(set)
    for a, ds in req.items():
        if a not in all_mods: 
            continue
        for d in ds:
            if d in all_mods:
                req2[a].add(d)
                rev[d].add(a)

    for j in jars:
        clusters[assign(j.name)].append(j.name)
    for k in clusters:
        clusters[k] = sorted(set(clusters[k]))

    # Cascade disabled set by required dependents
    cascaded = {}
    for cname, seed_jars in clusters.items():
        seed_mods = set()
        for j in seed_jars:
            seed_mods.update(jar_to_mods.get(j, set()))
        disabled_mods = set(seed_mods)
        q = deque(seed_mods)
        while q:
            m = q.popleft()
            for dep in rev.get(m, set()):
                if dep not in disabled_mods:
                    disabled_mods.add(dep); q.append(dep)
        disabled_jars = set()
        for m in disabled_mods:
            disabled_jars.update(mod_to_jars.get(m, set()))
        # Keep protected runtime jars always enabled to avoid invalid runs.
        cascaded[cname] = sorted(j for j in disabled_jars if not is_protected_jar(j))

    MANIFEST.write_text(json.dumps({
        "total_jars": len(jars),
        "clusters_seed": {k: len(v) for k,v in clusters.items()},
        "clusters_cascaded": {k: len(v) for k,v in cascaded.items()},
        "cascaded_jars": cascaded,
    }, indent=2))

    with CSV.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["type","name","seed_jar_count","disabled_jar_count","marker","peak_kb","peak_gib","delta_vs_baseline_gib"])
        bks = []
        for i in range(1, BASELINE_RUNS+1):
            m, kb = run_variant(f"baseline_{i}", [])
            bks.append(kb)
            w.writerow(["baseline", f"baseline_{i}", "", "", m, kb, f"{gib(kb):.3f}", ""])
            f.flush()
            log(f"baseline_{i}: {gib(kb):.3f} GiB marker={m}")
        b = sorted(bks)[len(bks)//2] if bks else 0
        for cname in clusters:
            m, kb = run_variant(cname, cascaded[cname])
            d = gib(b-kb)
            w.writerow(["cluster", cname, len(clusters[cname]), len(cascaded[cname]), m, kb, f"{gib(kb):.3f}", f"{d:.3f}"])
            f.flush()
            log(f"{cname}: seed={len(clusters[cname])} cascade={len(cascaded[cname])} peak={gib(kb):.3f}GiB delta={d:+.3f} marker={m}")

    rows = list(csv.DictReader(CSV.open()))
    b = sorted(float(r["peak_gib"]) for r in rows if r["type"]=="baseline")
    bmed = b[len(b)//2] if b else 0.0
    cr = [r for r in rows if r["type"]=="cluster"]
    cr.sort(key=lambda r: float(r["delta_vs_baseline_gib"]), reverse=True)
    with SUMMARY.open("w") as f:
        f.write(f"baseline_median_gib={bmed:.3f}\n")
        for r in cr:
            f.write(f"{r['name']}\tseed={r['seed_jar_count']}\tcascade={r['disabled_jar_count']}\tpeak={r['peak_gib']}GiB\tdelta={float(r['delta_vs_baseline_gib']):+.3f}GiB\tmarker={r['marker']}\n")
    print(str(OUT))

if __name__ == "__main__":
    main()
