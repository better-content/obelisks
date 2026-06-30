#!/usr/bin/env python3
"""Disable about half of non-critical mods, then run a server/client join probe.

The split is dependency-aware at two levels:
- Forge mandatory jar dependencies are kept closed.
- Pack-level scripted dependencies are force-kept so KubeJS does not fail for
  reasons unrelated to the mod-isolation target.

All disabled jars are restored before the script exits.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import tomllib
import zipfile
from pathlib import Path

from legacy_live_tool_guard import require_legacy_live_tool_opt_in
from pack_mod_source import bundled_mod_ids

require_legacy_live_tool_opt_in()


ROOT = Path(os.environ.get("ROOT", "/home/gerald/obelisks"))
SERVER = ROOT / "server-instance"
LIVE = Path(
    os.environ.get(
        "LIVE_MC",
        "/home/gerald/.local/share/PrismLauncher/instances/Better Content-Playtest 4 - v1/minecraft",
    )
)
OUT_ROOT = Path(os.environ.get("OUT_ROOT", "/tmp/btm-half-mod-tests"))
OUT = OUT_ROOT / time.strftime("%Y%m%d-%H%M%S")
MOD_DIRS = [SERVER / "mods", LIVE / "mods"]
PORT = int(os.environ.get("SERVER_PORT", "25565"))
TARGET_FRACTION = float(os.environ.get("HALF_MOD_TARGET_FRACTION", "0.5"))
SPLIT_MODE = os.environ.get("HALF_MOD_SPLIT_MODE", "primary")

IGNORED_DEPS = {"minecraft", "forge", "java", "neoforge"}
DISABLED_SUFFIX = ".half-test-disabled"

CUSTOM_MOD_IDS = bundled_mod_ids(ROOT)

CORE_KEEP_IDS = {
    "c2me",
    "kubejs",
    "rhino",
    "morejs",
    "kubejs_create",
    "kubejsbloodmagic",
    "lootjs",
    "jsonthings",
    "ftbquests",
    "ftblibrary",
    "ftbteams",
    "forgeconfigscreens",
}

SYMBOL_KEEP_IDS = {
    "MoreJSEvents": "morejs",
    "CreateEvents": "kubejs_create",
    "LootJS": "lootjs",
    "BloodMagicEvents": "kubejsbloodmagic",
    "JsonThings": "jsonthings",
}


def parse_mods_toml(jar: Path) -> tuple[list[str], dict[str, set[str]]]:
    try:
        with zipfile.ZipFile(jar) as archive:
            target = next((name for name in archive.namelist() if name.endswith("META-INF/mods.toml")), None)
            if target is None:
                return [], {}
            data = tomllib.loads(archive.read(target).decode("utf-8", "replace"))
    except Exception:
        return [], {}

    mods = [mod["modId"] for mod in data.get("mods", []) if mod.get("modId")]
    deps = {mod_id: set() for mod_id in mods}
    for mod_id, entries in (data.get("dependencies", {}) or {}).items():
        if mod_id not in deps:
            continue
        for dep in entries or []:
            if str(dep.get("mandatory", "")).lower() != "true":
                continue
            dep_id = dep.get("modId")
            if dep_id and dep_id not in IGNORED_DEPS:
                deps[mod_id].add(dep_id)
    return mods, deps


def collect_mod_graph(mod_dirs: list[Path]):
    jars: list[str] = []
    mod_to_jar: dict[str, str] = {}
    jar_to_mods: dict[str, list[str]] = {}
    deps: dict[str, set[str]] = {}
    seen_jars: set[str] = set()
    for mod_dir in mod_dirs:
        for jar in sorted(mod_dir.glob("*.jar")):
            mods, jar_deps = parse_mods_toml(jar)
            if not mods:
                continue
            if jar.name not in seen_jars:
                jars.append(jar.name)
                seen_jars.add(jar.name)
            jar_to_mods.setdefault(jar.name, mods)
            for mod_id in mods:
                mod_to_jar[mod_id] = jar.name
                deps.setdefault(mod_id, set()).update(jar_deps.get(mod_id, set()))
    all_mods = set(mod_to_jar)
    deps = {mod_id: {dep for dep in dep_ids if dep in all_mods} for mod_id, dep_ids in deps.items()}
    reverse = {mod_id: set() for mod_id in all_mods}
    for mod_id, dep_ids in deps.items():
        for dep_id in dep_ids:
            reverse.setdefault(dep_id, set()).add(mod_id)
    return jars, mod_to_jar, jar_to_mods, deps, reverse


def script_referenced_mod_ids() -> tuple[set[str], dict[str, list[str]]]:
    roots = [
        ROOT / "kubejs" / "startup_scripts",
        ROOT / "kubejs" / "server_scripts",
        ROOT / "kubejs" / "client_scripts",
        ROOT / "kubejs" / "data",
        ROOT / "config",
        ROOT / "defaultconfigs",
    ]
    refs: set[str] = set()
    evidence: dict[str, list[str]] = {}
    namespace_pattern = re.compile(r"(?<![A-Za-z0-9_.-])([a-z0-9_.-]+):[a-z0-9_./-]+")

    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() in {".png", ".jar", ".zip", ".class"}:
                continue
            try:
                text = path.read_text(errors="replace")
            except OSError:
                continue
            rel = str(path.relative_to(ROOT))
            for match in namespace_pattern.finditer(text):
                refs.add(match.group(1))
                evidence.setdefault(match.group(1), []).append(rel)
            for symbol, mod_id in SYMBOL_KEEP_IDS.items():
                if symbol in text:
                    refs.add(mod_id)
                    evidence.setdefault(mod_id, []).append(rel)
    return refs, {key: sorted(set(value))[:20] for key, value in evidence.items()}


def add_with_deps(mod_id: str, keep_mods: set[str], keep_jars: set[str], mod_to_jar, deps) -> None:
    stack = [mod_id]
    while stack:
        current = stack.pop()
        if current in keep_mods:
            continue
        keep_mods.add(current)
        jar = mod_to_jar.get(current)
        if jar:
            keep_jars.add(jar)
        stack.extend(sorted(deps.get(current, set())))


def choose_split(jars, mod_to_jar, deps, reverse):
    script_refs, script_evidence = script_referenced_mod_ids()
    all_mods = set(mod_to_jar)
    forced_keep = (CORE_KEEP_IDS | CUSTOM_MOD_IDS | script_refs) & all_mods

    keep_mods: set[str] = set()
    keep_jars: set[str] = set()
    for mod_id in sorted(forced_keep):
        add_with_deps(mod_id, keep_mods, keep_jars, mod_to_jar, deps)

    target_keep = max(1, int(len(jars) * TARGET_FRACTION))
    primary_candidates = sorted(
        all_mods - keep_mods,
        key=lambda mod_id: (-len(reverse.get(mod_id, set())), mod_to_jar.get(mod_id, ""), mod_id),
    )
    candidate_jars = []
    seen_candidate_jars = set()
    for mod_id in primary_candidates:
        jar = mod_to_jar.get(mod_id)
        if jar and jar not in seen_candidate_jars:
            candidate_jars.append(jar)
            seen_candidate_jars.add(jar)

    optional_jars = [jar for jar in candidate_jars if jar not in keep_jars]
    midpoint = len(optional_jars) // 2
    if SPLIT_MODE == "forced":
        disabled_jars = set(optional_jars)
    elif SPLIT_MODE == "primary":
        disabled_jars = set(optional_jars[:midpoint])
    elif SPLIT_MODE == "complement":
        disabled_jars = set(optional_jars[midpoint:])
    else:
        raise ValueError(f"Unsupported HALF_MOD_SPLIT_MODE: {SPLIT_MODE}")

    # If an enabled mod requires a disabled mod, keep the dependency rather than
    # disabling more of the pack. The isolation target is broad RSS comparison,
    # not maximizing disabled count at the expense of dependency correctness.
    changed = True
    while changed:
        changed = False
        disabled_mods = {mod_id for mod_id, jar in mod_to_jar.items() if jar in disabled_jars}
        for mod_id, jar in sorted(mod_to_jar.items()):
            if jar in disabled_jars:
                continue
            for dep_id in deps.get(mod_id, set()):
                if dep_id in disabled_mods:
                    dep_jar = mod_to_jar.get(dep_id)
                    if dep_jar in disabled_jars:
                        disabled_jars.remove(dep_jar)
                        changed = True
    keep_jars = set(jars) - disabled_jars
    keep_mods = {mod_id for mod_id, jar in mod_to_jar.items() if jar in keep_jars}
    return keep_mods, keep_jars, forced_keep, script_refs, script_evidence


def run(cmd: list[str], cwd: Path = ROOT, **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, **kwargs)


def kill_lingering() -> None:
    patterns = [
        "java @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.4.13/unix_args.txt nogui",
        "sh ./run.sh nogui",
        "PrismLauncher.*Better Content-Playtest 4 - v1",
    ]
    for pattern in patterns:
        run(["pkill", "-TERM", "-f", pattern], timeout=10)
    time.sleep(5)


def server_listening() -> bool:
    result = run(["ss", "-ltn"], timeout=5)
    return f":{PORT}" in result.stdout


def wait_server(log: Path) -> tuple[bool, str]:
    start = time.time()
    while time.time() - start < 300:
        if log.exists():
            text = log.read_text(errors="replace")
            if "Done (" in text and server_listening():
                return True, "ready"
            if (
                "Mod Loading has failed" in text
                or "Encountered an unexpected exception" in text
                or "This crash report has been saved" in text
            ):
                return False, "server_fatal"
        if server_listening():
            return True, "listening"
        time.sleep(2)
    return False, "server_timeout"


def disable_jars(disable_jar_names: list[str]) -> list[tuple[Path, Path]]:
    disabled: list[tuple[Path, Path]] = []
    for mod_dir in MOD_DIRS:
        for name in disable_jar_names:
            path = mod_dir / name
            if not path.exists():
                continue
            disabled_path = mod_dir / f"{name}{DISABLED_SUFFIX}"
            if disabled_path.exists():
                raise RuntimeError(f"Refusing to overwrite existing disabled jar: {disabled_path}")
            path.rename(disabled_path)
            disabled.append((disabled_path, path))
    return disabled


def restore_jars(disabled: list[tuple[Path, Path]]) -> None:
    for disabled_path, original_path in reversed(disabled):
        if disabled_path.exists():
            disabled_path.rename(original_path)


def peak_rss_from_probe(run_dir: str) -> dict[str, object]:
    processes = Path(run_dir) / "processes.csv" if run_dir else None
    if not processes or not processes.exists():
        return {}
    peak_total = 0
    peak_root = 0
    peak_client = 0
    peak_line = ""
    for line in processes.read_text().splitlines()[1:]:
        columns = line.split(",")
        if len(columns) < 5:
            continue
        root = int(columns[3] or 0)
        client = int(columns[4] or 0)
        total = root + client
        if total > peak_total:
            peak_total = total
            peak_root = root
            peak_client = client
            peak_line = line
    return {
        "peak_root_mib": round(peak_root / 1024, 1),
        "peak_client_mib": round(peak_client / 1024, 1),
        "peak_sampled_sum_mib": round(peak_total / 1024, 1),
        "peak_line": peak_line,
    }


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    jars, mod_to_jar, jar_to_mods, deps, reverse = collect_mod_graph(MOD_DIRS)
    server_jars = {path.name for path in (SERVER / "mods").glob("*.jar")}
    live_jars = {path.name for path in (LIVE / "mods").glob("*.jar")}
    keep_mods, keep_jars, forced_keep, script_refs, script_evidence = choose_split(jars, mod_to_jar, deps, reverse)
    disable_jar_names = sorted(set(jars) - keep_jars)
    keep_jar_names = sorted(keep_jars)
    plan = {
        "server_mod_jar_count": len(jars),
        "server_only_jar_count": len(server_jars - live_jars),
        "live_only_jar_count": len(live_jars - server_jars),
        "keep_jar_count": len(keep_jar_names),
        "disable_jar_count": len(disable_jar_names),
        "target_fraction": TARGET_FRACTION,
        "split_mode": SPLIT_MODE,
        "forced_keep_mod_ids": sorted(forced_keep),
        "script_referenced_mod_ids_present": sorted(script_refs & set(mod_to_jar)),
        "script_reference_evidence": script_evidence,
        "keep_jars": keep_jar_names,
        "disable_jars": disable_jar_names,
        "jar_to_mods": jar_to_mods,
    }
    (OUT / "plan.json").write_text(json.dumps(plan, indent=2))
    (OUT / "disabled-jars.txt").write_text("\n".join(disable_jar_names) + "\n")
    print(
        json.dumps(
            {
                "server_mod_jar_count": plan["server_mod_jar_count"],
                "server_only_jar_count": plan["server_only_jar_count"],
                "live_only_jar_count": plan["live_only_jar_count"],
                "keep_jar_count": plan["keep_jar_count"],
                "disable_jar_count": plan["disable_jar_count"],
                "out": str(OUT),
            },
            indent=2,
        ),
        flush=True,
    )

    proc = None
    disabled: list[tuple[Path, Path]] = []
    try:
        kill_lingering()
        disabled = disable_jars(disable_jar_names)
        latest = SERVER / "logs" / "latest.log"
        if latest.exists():
            latest.unlink()

        with (OUT / "server-console.log").open("w") as server_out:
            proc = subprocess.Popen(
                ["./run.sh", "nogui"],
                cwd=SERVER,
                stdin=subprocess.PIPE,
                stdout=server_out,
                stderr=subprocess.STDOUT,
                text=True,
            )
            ok, reason = wait_server(latest)
            if not ok:
                result = {"status": "FAIL", "reason": reason, "out": str(OUT)}
                (OUT / "result.json").write_text(json.dumps(result, indent=2))
                print(json.dumps(result, indent=2), flush=True)
                return 1

            env = os.environ.copy()
            env.update(
                {
                    "START_TIMEOUT_SEC": "240",
                    "JOIN_TIMEOUT_SEC": "540",
                    "SETTLE_SEC": "30",
                    "KEEP_CLIENT": "0",
                }
            )
            probe = subprocess.run(
                ["tools/client_join_probe.sh"],
                cwd=ROOT,
                env=env,
                text=True,
                capture_output=True,
                timeout=720,
            )
            (OUT / "probe.stdout").write_text(probe.stdout)
            (OUT / "probe.stderr").write_text(probe.stderr)

        reason_line = next(
            (line.split("=", 1)[1] for line in probe.stdout.splitlines() if line.startswith("reason=")),
            "probe_failed",
        )
        run_dir = next(
            (line.split("=", 1)[1] for line in probe.stdout.splitlines() if line.startswith("run_dir=")),
            "",
        )
        result = {
            "status": "PASS" if probe.returncode == 0 else "FAIL",
            "reason": reason_line,
            "probe_returncode": probe.returncode,
            "probe_run_dir": run_dir,
            "rss": peak_rss_from_probe(run_dir),
            "out": str(OUT),
        }
        (OUT / "result.json").write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2), flush=True)
        return 0 if probe.returncode == 0 else 1
    finally:
        if proc and proc.poll() is None:
            try:
                assert proc.stdin is not None
                proc.stdin.write("stop\n")
                proc.stdin.flush()
                proc.wait(timeout=60)
            except Exception:
                proc.terminate()
                try:
                    proc.wait(timeout=15)
                except Exception:
                    proc.kill()
        restore_jars(disabled)
        kill_lingering()


if __name__ == "__main__":
    sys.exit(main())
