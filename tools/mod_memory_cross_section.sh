#!/usr/bin/env bash
set -Eeuo pipefail

# Exhaustive mod memory cross-section (client/Prism side).
# Method: baseline repeats + disable exactly one mod jar per run.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ROOT:-${SCRIPT_DIR%/tools}}"
source "$SCRIPT_DIR/legacy_live_tool_guard.sh"
btm_require_legacy_live_tool_opt_in
PRISM_ROOT="${PRISM_ROOT:-$HOME/.local/share/PrismLauncher}"
INSTANCE="${INSTANCE:-Better Content-Playtest 4 - v1}"
MC_DIR="$PRISM_ROOT/instances/$INSTANCE/minecraft"
MODS_DIR="$MC_DIR/mods"
OUT_BASE="${OUT_BASE:-/tmp/btm-memory-variants}"
STAMP="${STAMP:-$(date +%Y%m%d-%H%M%S)}"
OUT_DIR="$OUT_BASE/mod_cross_section_$STAMP"

PROFILE_SCRIPT="$ROOT/tools/profile_prism_variant.sh"
[[ -x "$PROFILE_SCRIPT" ]] || { echo "Missing profile script: $PROFILE_SCRIPT"; exit 1; }
[[ -d "$MODS_DIR" ]] || { echo "Missing mods dir: $MODS_DIR"; exit 1; }

MENU_ONLY="${MENU_ONLY:-1}"
FORCE_STOP_AFTER="${FORCE_STOP_AFTER:-180}"
SETTLE_SECONDS="${SETTLE_SECONDS:-0}"
BASELINE_RUNS="${BASELINE_RUNS:-3}"
LIMIT="${LIMIT:-0}"      # 0 = all
OFFSET="${OFFSET:-0}"    # start index
ONLY_REGEX="${ONLY_REGEX:-}" # optional jar filename regex filter

mkdir -p "$OUT_DIR"
CSV="$OUT_DIR/mod_cross_section.csv"
RUNLOG="$OUT_DIR/run.log"

echo "run_type,variant,jar,marker,elapsed_s,peak_rss_kb,peak_rss_gib,delta_vs_baseline_gib,summary_file" > "$CSV"

cleanup_processes() {
  pkill -f PrismLauncher-Linux-x86_64.AppImage 2>/dev/null || true
  pkill -f org.prismlauncher.EntryPoint 2>/dev/null || true
  sleep 2
}

extract_peak_kb() {
  local summary="$1"
  if [[ ! -f "$summary" ]]; then echo 0; return; fi
  local mib
  mib="$(rg -o 'peakRssMiB=[0-9]+' "$summary" | tail -1 | awk -F= '{print $2}')"
  if [[ "$mib" =~ ^[0-9]+$ ]]; then
    echo $((mib * 1024))
  else
    local gib
    gib="$(rg -o 'peakRssGiB=[0-9]+(\\.[0-9]+)?' "$summary" | tail -1 | awk -F= '{print $2}')"
    if [[ "$gib" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
      awk -v g="$gib" 'BEGIN{printf "%.0f\n", g*1024*1024}'
    else
      echo 0
    fi
  fi
}

extract_marker() {
  local summary="$1"
  awk -F'[ =]' '/^marker=/{print $2}' "$summary" | tail -1
}

extract_elapsed() {
  local summary="$1"
  awk -F'[ =]' '/^marker=/{for(i=1;i<=NF;i++) if($i=="elapsed") {print $(i+1); exit}}' "$summary" | tail -1
}

gib_from_kb() { awk -v k="${1:-0}" 'BEGIN{printf "%.3f", k/1024/1024}'; }

run_variant() {
  local variant="$1"; shift || true
  local pattern_args=("$@")
  echo "[$(date +%H:%M:%S)] RUN $variant ${pattern_args[*]-}" >> "$RUNLOG"
  cleanup_processes

  BTM_PROFILE_OUT="$OUT_DIR" \
  BTM_PROFILE_MENU_ONLY="$MENU_ONLY" \
  BTM_FORCE_STOP_AFTER_SECONDS="$FORCE_STOP_AFTER" \
  BTM_SETTLE_SECONDS="$SETTLE_SECONDS" \
  BTM_PROFILE_DIAG=0 \
  BTM_PROFILE_NMT=0 \
  "$PROFILE_SCRIPT" "$variant" "${pattern_args[@]}" >> "$RUNLOG" 2>&1 || true

  local summary="$OUT_DIR/${variant}.summary.txt"
  local peak_kb marker elapsed
  peak_kb="$(extract_peak_kb "$summary")"
  marker="$(extract_marker "$summary")"
  elapsed="$(extract_elapsed "$summary")"
  printf '%s|%s|%s|%s\n' "$summary" "$peak_kb" "${marker:-unknown}" "${elapsed:-0}"
}

# Build jar list from live instance mods.
mapfile -t jars < <(find "$MODS_DIR" -maxdepth 1 -type f -name '*.jar' -printf '%f\n' | sort)
if [[ -n "$ONLY_REGEX" ]]; then
  mapfile -t jars < <(printf "%s\n" "${jars[@]}" | rg -N "$ONLY_REGEX" || true)
fi
if (( OFFSET > 0 )); then
  jars=("${jars[@]:$OFFSET}")
fi
if (( LIMIT > 0 )) && (( ${#jars[@]} > LIMIT )); then
  jars=("${jars[@]:0:$LIMIT}")
fi

echo "Total jars to test: ${#jars[@]}" | tee -a "$RUNLOG"

# Baseline repeats
baseline_kbs=()
for i in $(seq 1 "$BASELINE_RUNS"); do
  v="baseline_$i"
  result="$(run_variant "$v")"
  IFS='|' read -r summary peak marker elapsed <<< "$result"
  baseline_kbs+=("${peak:-0}")
  echo "baseline,$v,,${marker:-unknown},${elapsed:-0},${peak:-0},$(gib_from_kb "${peak:-0}"),,${summary}" >> "$CSV"
done

# Median baseline KB
baseline_kb="$(printf "%s\n" "${baseline_kbs[@]}" | sort -n | awk ' {a[NR]=$1} END { if (NR==0) print 0; else if (NR%2==1) print a[(NR+1)/2]; else print int((a[NR/2]+a[NR/2+1])/2) }')"
baseline_gib="$(gib_from_kb "$baseline_kb")"
echo "Baseline median: ${baseline_kb} KB (${baseline_gib} GiB)" | tee -a "$RUNLOG"

idx=0
for jar in "${jars[@]}"; do
  idx=$((idx + 1))
  safe="$(echo "$jar" | sed -E 's/[^A-Za-z0-9]+/_/g' | sed -E 's/_+/_/g' | sed -E 's/^_|_$//g' | cut -c1-80)"
  variant="xmod_${idx}_${safe}"
  escaped="$(printf '%s' "$jar" | sed -E 's/[][(){}.^$*+?|\\-]/\\&/g')"
  pattern="^${escaped}$"
  result="$(run_variant "$variant" "$pattern")"
  IFS='|' read -r summary peak marker elapsed <<< "$result"
  peak="${peak:-0}"
  delta_gib="$(awk -v b="$baseline_kb" -v p="$peak" 'BEGIN{printf "%.3f", (b-p)/1024/1024}')"
  echo "mod,$variant,$jar,${marker:-unknown},${elapsed:-0},$peak,$(gib_from_kb "$peak"),$delta_gib,$summary" >> "$CSV"
  echo "[$(date +%H:%M:%S)] ${idx}/${#jars[@]} $jar peak=$(gib_from_kb "$peak")GiB delta=${delta_gib}GiB marker=${marker:-unknown}" | tee -a "$RUNLOG"
done

python3 - "$CSV" "$OUT_DIR" "$baseline_kb" <<'PY'
import csv, sys, os
csv_path, out_dir, baseline_kb = sys.argv[1], sys.argv[2], int(sys.argv[3])
rows = list(csv.DictReader(open(csv_path)))
mods = [r for r in rows if r['run_type'] == 'mod']
mods_ok = [r for r in mods if r.get('peak_rss_kb','0').isdigit()]
mods_ok.sort(key=lambda r: float(r['delta_vs_baseline_gib']), reverse=True)
report = os.path.join(out_dir, "mod_cross_section_ranked.txt")
with open(report, "w") as f:
    f.write(f"Baseline median: {baseline_kb/1024/1024:.3f} GiB\n")
    f.write("Top memory savers when disabled:\n")
    for r in mods_ok[:120]:
        f.write(f"{r['jar']}\tpeak={float(r['peak_rss_gib']):.3f}GiB\tdelta={float(r['delta_vs_baseline_gib']):+.3f}GiB\tmarker={r['marker']}\n")
print(report)
PY

echo "Done. CSV: $CSV" | tee -a "$RUNLOG"
