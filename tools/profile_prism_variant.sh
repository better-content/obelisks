#!/usr/bin/env bash
set -Eeuo pipefail

variant="${1:?variant name required}"
shift || true
patterns=("$@")
root="${PRISM_ROOT:-$HOME/.local/share/PrismLauncher}"
instance_name="${BTM_PRISM_INSTANCE:-Better Content-Playtest 4 - v1}"
mc="$root/instances/$instance_name/minecraft"
instance_cfg="$root/instances/$instance_name/instance.cfg"
perf_probe_cfg="$mc/kubejs/config/perf_probe.json"
mods="$mc/mods"
log="$mc/logs/latest.log"
prism="${PRISM_BIN:-$HOME/PrismLauncher-Linux-x86_64.AppImage}"
out_dir="${BTM_PROFILE_OUT:-/tmp/btm-memory-variants}"
mkdir -p "$out_dir"
profile="$out_dir/${variant}.jsonl"
launch_log="$out_dir/${variant}.prism.log"
summary="$out_dir/${variant}.summary.txt"
diag_dir="$out_dir/${variant}_diagnostics"
java_home="${BTM_JAVA_HOME:-$root/java/java-runtime-gamma}"
jcmd="$java_home/bin/jcmd"
restore_list=()
cfg_backup=""
perf_probe_backup=""
cleanup() {
  for disabled in "${restore_list[@]:-}"; do
    if [[ -f "$disabled" ]]; then mv "$disabled" "${disabled%.disabled}"; fi
  done
  if [[ -n "$cfg_backup" && -f "$cfg_backup" ]]; then cp "$cfg_backup" "$instance_cfg"; fi
  if [[ -n "$perf_probe_backup" && -f "$perf_probe_backup" ]]; then cp "$perf_probe_backup" "$perf_probe_cfg"; fi
}
trap cleanup EXIT

: > "$summary"
mkdir -p "$diag_dir"
if [[ "${BTM_PROFILE_NMT:-1}" == "1" || -n "${BTM_JVM_ARGS:-}" || -n "${BTM_MAX_MEM:-}" || -n "${BTM_MIN_MEM:-}" ]]; then
  cfg_backup="$(mktemp)"
  cp "$instance_cfg" "$cfg_backup"
  python3 - "$instance_cfg" <<'PY'
import os
from pathlib import Path
import sys
p = Path(sys.argv[1])
extra = "-XX:NativeMemoryTracking=summary -XX:+UnlockDiagnosticVMOptions"
if os.environ.get("BTM_PROFILE_NMT", "1") != "1":
    extra = ""
extra = (extra + " " + os.environ.get("BTM_JVM_ARGS", "")).strip()
max_mem = os.environ.get("BTM_MAX_MEM")
min_mem = os.environ.get("BTM_MIN_MEM")

lines = p.read_text().splitlines()
sections = {}
current = None
order = []
for line in lines:
    if line.startswith("[") and line.endswith("]"):
        current = line[1:-1]
        sections.setdefault(current, [])
        if current not in order:
            order.append(current)
    elif current is None:
        sections.setdefault("", []).append(line)
        if "" not in order:
            order.append("")
    else:
        sections.setdefault(current, []).append(line)
if "General" not in sections:
    sections["General"] = []
    order.insert(0, "General")

updates = {
    "OverrideJavaArgs": "true",
}
if extra:
    existing = ""
    for line in sections["General"]:
        if line.startswith("JvmArgs="):
            existing = line.split("=", 1)[1].strip()
            break
    value = existing
    for arg in extra.split():
        if arg not in value.split():
            value = (value + " " + arg).strip()
    updates["JvmArgs"] = value
if max_mem or min_mem:
    updates["OverrideMemory"] = "true"
if max_mem:
    updates["MaxMemAlloc"] = max_mem
if min_mem:
    updates["MinMemAlloc"] = min_mem

new_general = []
seen = set()
for line in sections["General"]:
    key = line.split("=", 1)[0] if "=" in line else None
    if key in updates:
        if key not in seen:
            new_general.append(f"{key}={updates[key]}")
            seen.add(key)
    else:
        new_general.append(line)
for key, value in updates.items():
    if key not in seen:
        new_general.append(f"{key}={value}")
sections["General"] = new_general

out = []
for section in order:
    if section:
        out.append(f"[{section}]")
    out.extend(sections.get(section, []))
p.write_text("\n".join(out) + "\n")
PY
fi
if [[ "${BTM_PERF_PROBE:-0}" == "1" ]]; then
  perf_probe_backup="$(mktemp)"
  cp "$perf_probe_cfg" "$perf_probe_backup"
  cat > "$perf_probe_cfg" <<'JSON'
{
  "enabled": true,
  "intervalTicks": 100
}
JSON
fi
if ((${#patterns[@]})); then
  while IFS= read -r -d '' jar; do
    base="$(basename "$jar")"
    for pattern in "${patterns[@]}"; do
      if [[ "$base" =~ $pattern ]]; then
        mv "$jar" "$jar.disabled"
        restore_list+=("$jar.disabled")
        printf 'disabled %s\n' "$base" | tee -a "$summary"
        break
      fi
    done
  done < <(find "$mods" -maxdepth 1 -type f -name '*.jar' -print0)
fi

rm -f "$profile" "$launch_log"
before_mtime=$(stat -c %Y "$log" 2>/dev/null || echo 0)
start_epoch=$(date +%s)
world_name="${BTM_PROFILE_WORLD:-New World}"
launch_cmd=("$prism" --dir "$root" --launch "$instance_name" --offline Dev)
if [[ "${BTM_PROFILE_MENU_ONLY:-0}" != "1" ]]; then
  launch_cmd+=(--world "$world_name")
fi
if [[ "${BTM_DISABLE_THP_PRCTL:-0}" == "1" ]]; then
  launch_cmd=("$(dirname "$0")/disable_thp_exec.py" "${launch_cmd[@]}")
fi
"${launch_cmd[@]}" >"$launch_log" 2>&1 &
root_pid=$!
java_pid=""
marker=""
settled_after_marker=0

children_of() {
  local roots=("$@") next=() p kids
  while ((${#roots[@]})); do
    next=()
    for p in "${roots[@]}"; do
      [[ -n "$p" ]] || continue
      while IFS= read -r kids; do
        [[ -n "$kids" ]] || continue
        echo "$kids"
        next+=("$kids")
      done < <(pgrep -P "$p" 2>/dev/null || true)
    done
    roots=("${next[@]}")
  done
}

for i in $(seq 1 420); do
  now=$(date +%s)
  pids=("$root_pid")
  mapfile -t descendants < <(children_of "$root_pid" | sort -nu)
  pids+=("${descendants[@]}")
  rss=0; max_rss=0; count=0
  for pid in "${pids[@]}"; do
    [[ -n "$pid" ]] || continue
    if row=$(ps -p "$pid" -o pid=,rss=,comm=,args= 2>/dev/null); then
      count=$((count+1))
      r=$(awk '{print $2}' <<<"$row")
      rss=$((rss + r))
      (( r > max_rss )) && max_rss=$r
      if [[ -z "$java_pid" ]] && rg -q 'java .*org\.prismlauncher\.EntryPoint|java .*minecraft' <<<"$row"; then java_pid="$pid"; fi
    fi
  done
  printf '{"variant":"%s","t":%s,"elapsed":%s,"processes":%s,"rssKb":%s,"maxProcessRssKb":%s}\n' "$variant" "$now" "$((now-start_epoch))" "$count" "$rss" "$max_rss" >> "$profile"

  force_stop_after="${BTM_FORCE_STOP_AFTER_SECONDS:-}"
  if [[ "$force_stop_after" =~ ^[0-9]+$ && "$force_stop_after" -gt 0 && "$((now-start_epoch))" -ge "$force_stop_after" ]]; then
    marker="sampled_timeout"
    break
  fi

  mt=$(stat -c %Y "$log" 2>/dev/null || echo 0)
  if [[ "$mt" -gt "$before_mtime" ]]; then
    if rg -q 'Time from main menu to in-game was|Started serving on' "$log"; then
      marker="in_game"
      settle="${BTM_SETTLE_SECONDS:-20}"
      if [[ "$settled_after_marker" == "0" && "$settle" =~ ^[0-9]+$ && "$settle" -gt 0 ]]; then
        settled_after_marker=1
        sleep "$settle"
        continue
      fi
      break
    fi
    if rg -q 'Crash report|Mod Loading has failed|Failed to start|OutOfMemoryError|A fatal error has been detected' "$log"; then marker="failed"; break; fi
  fi
  if ! kill -0 "$root_pid" 2>/dev/null && ((${#descendants[@]} == 0)); then marker="exited"; break; fi
  sleep 2
done

end_epoch=$(date +%s)
printf 'marker=%s elapsed=%s java_pid=%s profile=%s log=%s\n' "${marker:-timeout}" "$((end_epoch-start_epoch))" "${java_pid:-}" "$profile" "$log" | tee -a "$summary"
if [[ -n "${java_pid:-}" && -x "$jcmd" && "${BTM_PROFILE_DIAG:-1}" == "1" ]]; then
  "$jcmd" "$java_pid" VM.native_memory summary scale=MB > "$diag_dir/native_memory_summary.txt" 2>&1 || true
  "$jcmd" "$java_pid" GC.heap_info > "$diag_dir/heap_info.txt" 2>&1 || true
  "$jcmd" "$java_pid" VM.metaspace basic > "$diag_dir/metaspace.txt" 2>&1 || true
  "$jcmd" "$java_pid" GC.class_histogram > "$diag_dir/class_histogram.txt" 2>&1 || true
  "$jcmd" "$java_pid" Thread.print > "$diag_dir/threads.txt" 2>&1 || true
  pmap -x "$java_pid" > "$diag_dir/pmap.txt" 2>&1 || true
  cat "/proc/$java_pid/smaps_rollup" > "$diag_dir/smaps_rollup.txt" 2>&1 || true
  if [[ "${BTM_PROFILE_POST_GC:-1}" == "1" ]]; then
    "$jcmd" "$java_pid" GC.run > "$diag_dir/gc_run.txt" 2>&1 || true
    sleep 5
    "$jcmd" "$java_pid" VM.native_memory summary scale=MB > "$diag_dir/post_gc_native_memory_summary.txt" 2>&1 || true
    "$jcmd" "$java_pid" GC.heap_info > "$diag_dir/post_gc_heap_info.txt" 2>&1 || true
    "$jcmd" "$java_pid" GC.class_histogram > "$diag_dir/post_gc_class_histogram.txt" 2>&1 || true
    pmap -x "$java_pid" > "$diag_dir/post_gc_pmap.txt" 2>&1 || true
    cat "/proc/$java_pid/smaps_rollup" > "$diag_dir/post_gc_smaps_rollup.txt" 2>&1 || true
    if row=$(ps -p "$java_pid" -o rss= 2>/dev/null); then
      printf 'postGcJavaRssKb=%s postGcJavaRssMiB=%s\n' "$row" "$((row/1024))" | tee "$diag_dir/post_gc_rss.txt" | tee -a "$summary"
    fi
  fi
  printf 'diagnostics=%s\n' "$diag_dir" | tee -a "$summary"
fi
rg -n 'Loading [0-9]+ mods:|Initial datapack load took|Time from main menu to in-game was|Total time to load game and open world was|Reloaded EMI in|Started serving on|Crash report|Mod Loading has failed|OutOfMemoryError|A fatal error has been detected|Preparing spawn area|Time elapsed:' "$log" | tail -80 | tee -a "$summary" || true
tick_warnings=$(rg "Can't keep up!" "$log" | wc -l || true)
max_tick_ms=$(rg "Can't keep up!.*Running ([0-9]+)ms" -or '$1' "$log" | sort -n | tail -1 || true)
fps_lines=$(rg "\\[BTM-PERF-PROBE\\].*(renderFps=|mcFps=|fps=)" "$log" || true)
if [[ -n "$fps_lines" ]]; then
  fps_count=$(printf '%s\n' "$fps_lines" | wc -l)
else
  fps_count=0
fi
fps_values=$(awk '{
  if (match($0, /renderFps=[0-9.]+/)) {
    v = substr($0, RSTART + 10, RLENGTH - 10)
    print v
  } else if (match($0, /mcFps=[0-9.]+/)) {
    v = substr($0, RSTART + 6, RLENGTH - 6)
    if (v >= 0) print v
  } else if (match($0, /fps=[0-9.]+/)) {
    v = substr($0, RSTART + 4, RLENGTH - 4)
    print v
  }
}' <<<"$fps_lines")
if [[ -n "$fps_values" ]]; then
  fps_min=$(sort -n <<<"$fps_values" | head -1)
  fps_max=$(sort -n <<<"$fps_values" | tail -1)
  fps_avg=$(awk '{s+=$1; n++} END{if(n) printf "%.1f", s/n}' <<<"$fps_values")
else
  fps_min=""
  fps_max=""
  fps_avg=""
fi
printf 'tickBehindWarnings=%s maxTickBehindMs=%s fpsSamples=%s fpsMin=%s fpsAvg=%s fpsMax=%s\n' "$tick_warnings" "${max_tick_ms:-0}" "$fps_count" "${fps_min:-}" "${fps_avg:-}" "${fps_max:-}" | tee -a "$summary"
peak=$(awk -F'[:,}]' '{for(i=1;i<=NF;i++) if($i ~ /rssKb/) print $(i+1)}' "$profile" | sort -n | tail -1)
printf 'peakRssMiB=%s peakRssGiB=%.2f\n' "$((peak/1024))" "$(awk -v p="$peak" 'BEGIN{print p/1024/1024}')" | tee -a "$summary"

if [[ -n "${java_pid:-}" ]]; then kill -TERM "$java_pid" 2>/dev/null || true; fi
kill -TERM "$root_pid" 2>/dev/null || true
sleep 2
if [[ -n "${java_pid:-}" ]]; then kill -KILL "$java_pid" 2>/dev/null || true; fi
kill -KILL "$root_pid" 2>/dev/null || true
