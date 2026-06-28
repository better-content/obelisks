#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ROOT:-${SCRIPT_DIR%/tools}}"
cd "$ROOT"
source "$SCRIPT_DIR/legacy_live_tool_guard.sh"
btm_require_legacy_live_tool_opt_in
OUT="${OUT:-/tmp/btm-memory-variants/cluster_ab_$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"
CSV="$OUT/results.csv"
echo "variant,peak_rss_kb,peak_rss_gib" > "$CSV"
run_one() {
  local variant="$1"; shift || true
  echo "=== RUN $variant ==="
  BTM_PROFILE_OUT="$OUT" \
  BTM_PROFILE_MENU_ONLY=1 \
  BTM_FORCE_STOP_AFTER_SECONDS=180 \
  BTM_PROFILE_DIAG=0 \
  BTM_PROFILE_NMT=0 \
  ./tools/profile_prism_variant.sh "$variant" "$@" >/tmp/${variant}.run.log 2>&1 || true
  local profile="$OUT/${variant}.jsonl"
  local peak=0
  if [[ -f "$profile" ]]; then
    peak=$(awk -F'[:,}]' '{for(i=1;i<=NF;i++) if($i ~ /rssKb/) {gsub(/ /,"",$(i+1)); print $(i+1)}}' "$profile" | sort -n | tail -1)
  fi
  [[ -n "$peak" ]] || peak=0
  local gib
  gib=$(awk -v p="$peak" 'BEGIN{printf "%.3f", p/1024/1024}')
  echo "$variant,$peak,$gib" >> "$CSV"
}

# Cleanup any prior launchers
pkill -f PrismLauncher-Linux-x86_64.AppImage || true
pkill -f org.prismlauncher.EntryPoint || true
sleep 2

run_one baseline
run_one no_create '(?i)^create.*\\.jar$'
run_one no_tcon '(?i)^(tconstruct|mantle|ticex|tinkers.*|tconjei).*\\.jar$'
run_one no_food '(?i).*(delight|diet|nutrition|brewin|chewin|spice|thirst|respite|starcatcher).*\\.jar$'
run_one no_dimensions '(?i).*(aether|blue_skies|twilight|undergarden|lostcities|fallout|finley|deeperdarker|otherside|creatingspace).*\\.jar$'
run_one no_village_pillager '(?i).*(villag|pillag|raid|guard|savage|it-takes-a-pillage|ctov|choicetheorem|towns-and-towers|settlementroads|villagewalls|raider).*\\.jar$'
run_one no_ae2_oc '(?i).*(appliedenergistics|ae2|advancedae|megacells|extendedae|polymorphic|oc2r|computer|create-applied-kinetics).*\\.jar$'

python3 - <<'PY'
import csv,sys,os
path=os.environ['CSV']
rows=[]
with open(path) as f:
    r=csv.DictReader(f)
    for x in r: rows.append(x)
base=next((x for x in rows if x['variant']=='baseline'),None)
if not base:
    print('no baseline')
    sys.exit(0)
b=int(base['peak_rss_kb'])
out=[]
for x in rows:
    p=int(x['peak_rss_kb'])
    d=b-p
    out.append((d,x['variant'],p,d/1024/1024))
out.sort(reverse=True)
print('Ranked by memory saved vs baseline (GiB):')
for _,v,p,dg in out:
    if v=='baseline':
        continue
    print(f"{v:24s} peak={p/1024/1024:.3f}GiB  saved={dg:.3f}GiB")
PY
