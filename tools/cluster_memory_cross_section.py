#!/usr/bin/env python3
import csv
import json
import os
import re
import subprocess
import sys
import tempfile
import zipfile
from collections import defaultdict, deque
from pathlib import Path

ROOT = Path(os.environ.get("ROOT", "/home/gerald/obelisks"))
PRISM_ROOT = Path(os.environ.get("PRISM_ROOT", str(Path.home() / ".local/share/PrismLauncher")))
INSTANCE = os.environ.get("INSTANCE", "Better Content-Playtest 4 - v1")
MODS_DIR = PRISM_ROOT / "instances" / INSTANCE / "minecraft" / "mods"
PROFILE = ROOT / "tools" / "profile_prism_variant.sh"

OUT_BASE = Path(os.environ.get("OUT_BASE", "/tmp/btm-memory-variants"))
STAMP = os.environ.get("STAMP")
if not STAMP:
    from datetime import datetime
    STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
OUT = OUT_BASE / f"cluster_cross_section_{STAMP}"
OUT.mkdir(parents=True, exist_ok=True)

BASELINE_RUNS = int(os.environ.get("BASELINE_RUNS", "2"))
FORCE_STOP_AFTER = os.environ.get("FORCE_STOP_AFTER", "90")
MENU_ONLY = os.environ.get("MENU_ONLY", "1")
MIN_CLUSTER_SIZE = int(os.environ.get("MIN_CLUSTER_SIZE", "2"))

CSV_PATH = OUT / "cluster_cross_section.csv"
JSON_PATH = OUT / "clusters.json"
RANK_PATH = OUT / "cluster_ranked.txt"
LOG_PATH = OUT / "run.log"

MODS_TOML_MOD_RE = re.compile(r'(?ms)^\s*\[\[mods\]\]\s*(.*?)(?=^\s*\[\[|\Z)')
MOD_ID_RE = re.compile(r'^\s*modId\s*=\s*"([^"]+)"', re.M)
DISPLAY_RE = re.compile(r'^\s*displayName\s*=\s*"([^"]+)"', re.M)
DEP_RE = re.compile(r'(?ms)^\s*\[\[dependencies\.([A-Za-z0-9_\-\.]+)\]\]\s*(.*?)(?=^\s*\[\[|\Z)')
DEP_MODID_RE = re.compile(r'^\s*modId\s*=\s*"([^"]+)"', re.M)
DEP_MAND_RE = re.compile(r'^\s*mandatory\s*=\s*(true|false)', re.M)

def log(msg: str):
    print(msg)
    with LOG_PATH.open("a") as f:
        f.write(msg + "\n")

def run(cmd, **kwargs):
    return subprocess.run(cmd, text=True, check=False, **kwargs)

def cleanup_processes():
    run(["pkill", "-f", "PrismLauncher-Linux-x86_64.AppImage"])
    run(["pkill", "-f", "org.prismlauncher.EntryPoint"])

def parse_mod_jar(path: Path):
    mod_ids = []
    display = {}
    req_deps = defaultdict(set)
    try:
        with zipfile.ZipFile(path) as zf:
            try:
                raw = zf.read("META-INF/mods.toml").decode("utf-8", "replace")
            except KeyError:
                return mod_ids, display, req_deps
    except zipfile.BadZipFile:
        return mod_ids, display, req_deps

    for blk in MODS_TOML_MOD_RE.findall(raw):
        m = MOD_ID_RE.search(blk)
        if not m:
            continue
        modid = m.group(1).strip()
        mod_ids.append(modid)
        d = DISPLAY_RE.search(blk)
        if d:
            display[modid] = d.group(1).strip()

    for owner, blk in DEP_RE.findall(raw):
        dep_id_m = DEP_MODID_RE.search(blk)
        if not dep_id_m:
            continue
        dep_id = dep_id_m.group(1).strip()
        mand_m = DEP_MAND_RE.search(blk)
        mandatory = (mand_m.group(1).lower() == "true") if mand_m else True
        if mandatory:
            req_deps[owner].add(dep_id)
    return mod_ids, display, req_deps

def build_graph():
    jars = sorted([p for p in MODS_DIR.glob("*.jar") if p.is_file()])
    mod_to_jar = {}
    jar_to_mods = defaultdict(list)
    req = defaultdict(set)
    display = {}
    for jar in jars:
        mod_ids, disp, deps = parse_mod_jar(jar)
        if not mod_ids:
            pseudo = f"jar::{jar.name}"
            mod_ids = [pseudo]
        for m in mod_ids:
            mod_to_jar[m] = jar.name
            jar_to_mods[jar.name].append(m)
        display.update(disp)
        for owner, ds in deps.items():
            for d in ds:
                req[owner].add(d)
    # Keep only deps that exist in current graph
    nodes = set(mod_to_jar)
    req2 = defaultdict(set)
    for a, bs in req.items():
        if a not in nodes:
            continue
        for b in bs:
            if b in nodes:
                req2[a].add(b)
    # Undirected graph for connected components
    und = defaultdict(set)
    for n in nodes:
        und[n]
    for a, bs in req2.items():
        for b in bs:
            und[a].add(b)
            und[b].add(a)
    return jars, mod_to_jar, jar_to_mods, und

def connected_components(und):
    seen = set()
    comps = []
    for n in und:
        if n in seen:
            continue
        q = deque([n])
        seen.add(n)
        comp = []
        while q:
            x = q.popleft()
            comp.append(x)
            for y in und[x]:
                if y not in seen:
                    seen.add(y); q.append(y)
        comps.append(sorted(comp))
    return comps

def cluster_from_component(comp, mod_to_jar):
    jars = sorted(set(mod_to_jar[m] for m in comp))
    return jars

def extract_summary_metrics(summary_path: Path):
    txt = summary_path.read_text() if summary_path.exists() else ""
    marker = re.search(r"marker=([A-Za-z0-9_]+)", txt)
    elapsed = re.search(r"elapsed=([0-9]+)", txt)
    peak_mib = re.search(r"peakRssMiB=([0-9]+)", txt)
    peak_kb = int(peak_mib.group(1)) * 1024 if peak_mib else 0
    return {
        "marker": marker.group(1) if marker else "unknown",
        "elapsed": int(elapsed.group(1)) if elapsed else 0,
        "peak_kb": peak_kb,
        "peak_gib": peak_kb / 1024 / 1024
    }

def run_variant(out_dir: Path, variant: str, jar_names):
    cleanup_processes()
    patterns = [f"^{re.escape(j)}$" for j in jar_names]
    env = os.environ.copy()
    env.update({
        "BTM_PROFILE_OUT": str(out_dir),
        "BTM_PROFILE_MENU_ONLY": MENU_ONLY,
        "BTM_FORCE_STOP_AFTER_SECONDS": FORCE_STOP_AFTER,
        "BTM_PROFILE_DIAG": "0",
        "BTM_PROFILE_NMT": "0",
        "BTM_SETTLE_SECONDS": "0",
    })
    cmd = [str(PROFILE), variant] + patterns
    res = run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    with LOG_PATH.open("a") as f:
        f.write(f"\n=== {variant} ===\n")
        f.write(res.stdout)
    summary = out_dir / f"{variant}.summary.txt"
    return extract_summary_metrics(summary), summary

def median(nums):
    if not nums: return 0
    s = sorted(nums)
    n = len(s)
    if n % 2 == 1:
        return s[n//2]
    return (s[n//2-1] + s[n//2]) // 2

def main():
    if not PROFILE.exists():
        print(f"missing {PROFILE}", file=sys.stderr)
        sys.exit(1)
    cleanup_processes()

    jars, mod_to_jar, jar_to_mods, und = build_graph()
    comps = connected_components(und)
    clusters = []
    for i, comp in enumerate(comps, 1):
        cj = cluster_from_component(comp, mod_to_jar)
        if len(cj) < MIN_CLUSTER_SIZE:
            continue
        clusters.append({
            "id": f"cluster_{i:03d}",
            "mods": comp,
            "jars": cj,
        })
    # ensure every jar in at least one cluster; add singletons for leftovers
    covered = set()
    for c in clusters:
        covered.update(c["jars"])
    for j in sorted(p.name for p in jars):
        if j not in covered:
            clusters.append({
                "id": f"cluster_single_{len(clusters)+1:03d}",
                "mods": jar_to_mods.get(j, [f"jar::{j}"]),
                "jars": [j],
            })

    JSON_PATH.write_text(json.dumps({
        "cluster_count": len(clusters),
        "clusters": clusters
    }, indent=2))

    with CSV_PATH.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["run_type", "cluster_id", "cluster_size_jars", "cluster_size_mods", "marker", "elapsed_s", "peak_rss_kb", "peak_rss_gib", "delta_vs_baseline_gib", "summary_file"])

        base_peaks = []
        for i in range(1, BASELINE_RUNS + 1):
            v = f"baseline_{i}"
            m, sfile = run_variant(OUT, v, [])
            base_peaks.append(m["peak_kb"])
            w.writerow(["baseline", v, "", "", m["marker"], m["elapsed"], m["peak_kb"], f"{m['peak_gib']:.3f}", "", str(sfile)])
            log(f"baseline {i}/{BASELINE_RUNS}: {m['peak_gib']:.3f} GiB marker={m['marker']}")
        base_kb = median(base_peaks)
        base_gib = base_kb / 1024 / 1024
        log(f"baseline median: {base_gib:.3f} GiB")

        for idx, c in enumerate(clusters, 1):
            v = c["id"]
            m, sfile = run_variant(OUT, v, c["jars"])
            delta = base_gib - m["peak_gib"]
            w.writerow(["cluster", c["id"], len(c["jars"]), len(c["mods"]), m["marker"], m["elapsed"], m["peak_kb"], f"{m['peak_gib']:.3f}", f"{delta:.3f}", str(sfile)])
            log(f"{idx}/{len(clusters)} {c['id']} jars={len(c['jars'])} peak={m['peak_gib']:.3f}GiB delta={delta:+.3f} marker={m['marker']}")

    # ranking
    rows = list(csv.DictReader(CSV_PATH.open()))
    crows = [r for r in rows if r["run_type"] == "cluster"]
    crows.sort(key=lambda r: float(r["delta_vs_baseline_gib"]), reverse=True)
    with RANK_PATH.open("w") as f:
        f.write(f"Baseline median GiB: {base_gib:.3f}\n")
        f.write("Top savings when disabled:\n")
        for r in crows:
            f.write(f"{r['cluster_id']}\tpeak={r['peak_rss_gib']}GiB\tdelta={float(r['delta_vs_baseline_gib']):+.3f}GiB\tjars={r['cluster_size_jars']}\tmarker={r['marker']}\n")
    log(f"done: {CSV_PATH}")
    log(f"ranked: {RANK_PATH}")

if __name__ == "__main__":
    main()
