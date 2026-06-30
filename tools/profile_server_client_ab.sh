#!/usr/bin/env bash
set -Eeuo pipefail

# Dedicated server + real Prism client A/B profiler.
# A = baseline (fake player disabled), B = fake player enabled.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ROOT:-${SCRIPT_DIR%/tools}}"
source "$SCRIPT_DIR/legacy_live_tool_guard.sh"
btm_require_legacy_live_tool_opt_in
SERVER_DIR="${SERVER_DIR:-$ROOT/server-instance}"
PRISM_ROOT="${PRISM_ROOT:-$HOME/.local/share/PrismLauncher}"
PRISM_INSTANCE="${PRISM_INSTANCE:-Better Content-Playtest 4 - v1}"
CLIENT_CONNECT_HOST="${CLIENT_CONNECT_HOST:-127.0.0.1}"
OUT_DIR="${OUT_DIR:-/tmp/btm-memory-variants}"
SAMPLE_SEC="${SAMPLE_SEC:-2}"
BOOT_TIMEOUT_SEC="${BOOT_TIMEOUT_SEC:-600}"
JOIN_TIMEOUT_SEC="${JOIN_TIMEOUT_SEC:-420}"
POST_JOIN_SETTLE_SEC="${POST_JOIN_SETTLE_SEC:-90}"
BASE_PORT="${BASE_PORT:-27200}"
CLIENT_USERNAME_PREFIX="${CLIENT_USERNAME_PREFIX:-AutoTester}"
CLIENT_CONNECT_MODE="${CLIENT_CONNECT_MODE:-auto}"
CLIENT_CONNECT_ARGS="${CLIENT_CONNECT_ARGS:-}"
CLIENT_OFFLINE="${CLIENT_OFFLINE:-0}"
RUN_FAKE_PHASE="${RUN_FAKE_PHASE:-1}"

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
CSV="$OUT_DIR/server_client_ab_${STAMP}.csv"
SUMMARY="$OUT_DIR/server_client_ab_${STAMP}.summary.txt"

PRISM_LAUNCH="$ROOT/tools/launch_prism_instance.sh"
[[ -x "$PRISM_LAUNCH" ]] || { echo "Missing launcher helper: $PRISM_LAUNCH"; exit 1; }

SERVER_LOG="$SERVER_DIR/logs/latest.log"
SERVER_PROPS="$SERVER_DIR/server.properties"
SERVER_MODS="$SERVER_DIR/mods"
PRISM_MODS="$PRISM_ROOT/instances/$PRISM_INSTANCE/minecraft/mods"

echo "phase,elapsed_sec,server_rss_kb,client_rss_kb,total_rss_kb,server_pid,client_pid,joined" > "$CSV"

server_launcher_pid=""
server_java_pid=""
client_root_pid=""
client_java_pid=""
disabled_files=()
orig_port=""

cleanup() {
  set +e
  if [[ -n "${client_java_pid:-}" ]]; then kill -TERM "$client_java_pid" 2>/dev/null; fi
  if [[ -n "${client_root_pid:-}" ]]; then kill -TERM "$client_root_pid" 2>/dev/null; fi
  if [[ -n "${server_java_pid:-}" ]]; then
    kill -INT "$server_java_pid" 2>/dev/null
    sleep 2
    kill -TERM "$server_java_pid" 2>/dev/null
  fi
  if [[ -n "${server_launcher_pid:-}" ]]; then kill -TERM "$server_launcher_pid" 2>/dev/null; fi
  sleep 2
  if [[ -n "${client_java_pid:-}" ]]; then kill -KILL "$client_java_pid" 2>/dev/null; fi
  if [[ -n "${client_root_pid:-}" ]]; then kill -KILL "$client_root_pid" 2>/dev/null; fi
  if [[ -n "${server_java_pid:-}" ]]; then kill -KILL "$server_java_pid" 2>/dev/null; fi
  if [[ -n "${server_launcher_pid:-}" ]]; then kill -KILL "$server_launcher_pid" 2>/dev/null; fi
  for f in "${disabled_files[@]}"; do
    [[ -f "$f" ]] && mv "$f" "${f%.disabled}"
  done
  if [[ -n "${orig_port:-}" ]]; then
    sed -i "s/^server-port=.*/server-port=${orig_port}/" "$SERVER_PROPS"
  fi
}
trap cleanup EXIT

children_of() {
  local roots=("$@")
  local next=() p c
  while ((${#roots[@]})); do
    next=()
    for p in "${roots[@]}"; do
      [[ -n "$p" ]] || continue
      while IFS= read -r c; do
        [[ -n "$c" ]] || continue
        echo "$c"
        next+=("$c")
      done < <(pgrep -P "$p" 2>/dev/null || true)
    done
    roots=("${next[@]}")
  done
}

sum_rss_tree() {
  local root_pid="$1"
  local sum=0
  local p row rss
  [[ -n "$root_pid" ]] || { echo 0; return; }
  for p in "$root_pid" $(children_of "$root_pid" | sort -nu); do
    row="$(ps -p "$p" -o rss= 2>/dev/null || true)"
    rss="$(echo "$row" | awk '{print $1}')"
    [[ "$rss" =~ ^[0-9]+$ ]] || continue
    sum=$((sum + rss))
  done
  echo "$sum"
}

pick_java_child() {
  local root="$1"
  local p row
  for p in "$root" $(children_of "$root" | sort -nu); do
    row="$(ps -p "$p" -o args= 2>/dev/null || true)"
    if echo "$row" | rg -q 'java .*unix_args.txt|java .*org\.prismlauncher|java .*minecraft'; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

set_fake_player_enabled() {
  local enabled="$1"
  local mod_paths=()
  while IFS= read -r -d '' f; do mod_paths+=("$f"); done < <(find "$SERVER_MODS" "$PRISM_MODS" -maxdepth 1 -type f \( -iname 'players-forge-*.jar' -o -iname 'fakeplayers-*.jar' \) -print0 2>/dev/null || true)

  if [[ "$enabled" == "0" ]]; then
    for f in "${mod_paths[@]}"; do
      if [[ -f "$f" ]]; then
        mv "$f" "$f.disabled"
        disabled_files+=("$f.disabled")
      fi
    done
  else
    local d
    for d in "${disabled_files[@]}"; do
      [[ -f "$d" ]] && mv "$d" "${d%.disabled}"
    done
    disabled_files=()
  fi
}

start_server() {
  local phase="$1"
  local port="$2"
  SERVER_LOG="$OUT_DIR/${phase}.server.log"
  rm -f "$SERVER_LOG"
  rm -rf "$SERVER_DIR/world" "$SERVER_DIR/world_nether" "$SERVER_DIR/world_the_end"

  if [[ -z "${orig_port:-}" ]]; then
    orig_port="$(awk -F'=' '/^server-port=/{print $2}' "$SERVER_PROPS" | tr -d '\r' || true)"
    [[ -n "$orig_port" ]] || orig_port="25565"
  fi
  if grep -q '^server-port=' "$SERVER_PROPS"; then
    sed -i "s/^server-port=.*/server-port=${port}/" "$SERVER_PROPS"
  else
    printf '\nserver-port=%s\n' "$port" >> "$SERVER_PROPS"
  fi

  (
    cd "$SERVER_DIR"
    ./run.sh nogui
  ) > "$SERVER_LOG" 2>&1 &
  server_launcher_pid=$!

  local t
  for ((t=0; t<BOOT_TIMEOUT_SEC; t++)); do
    if [[ -f "$SERVER_LOG" ]] && rg -q 'Done \(' "$SERVER_LOG"; then
      server_java_pid="$(pick_java_child "$server_launcher_pid" || true)"
      return 0
    fi

    if [[ -f "$SERVER_LOG" ]] && rg -q 'FAILED TO BIND TO PORT|Mod Loading has failed|Error: Failed to initialize|Encountered an unexpected exception|Preparing crash report|This crash report has been saved' "$SERVER_LOG"; then
      return 1
    fi

    if ! kill -0 "$server_launcher_pid" 2>/dev/null; then
      return 1
    fi
    sleep 1
  done
  return 1
}

start_client() {
  local phase="$1"
  local port="$2"
  local username="$3"
  local client_log="$OUT_DIR/${phase}.client.log"
  local minecraft_log="$PRISM_ROOT/instances/$PRISM_INSTANCE/minecraft/logs/latest.log"
  local before_mtime
  local fresh_client_log=0
  local host="$CLIENT_CONNECT_HOST"
  local quick_play_args=()
  local args=()
  local extra_args=()
  local mode="${CLIENT_CONNECT_MODE:-auto}"

  if [[ -n "${CLIENT_CONNECT_ARGS}" ]]; then
    read -r -a extra_args <<< "$CLIENT_CONNECT_ARGS"
    args+=("${extra_args[@]}")
  fi
  if [[ "${CLIENT_OFFLINE:-0}" == "1" && -n "$username" ]]; then
    args+=("--offline" "$username")
  fi

  if [[ "$mode" == "auto" || "$mode" == "quickplay" || "$mode" == "legacy" ]]; then
    if [[ "$mode" == "quickplay" ]]; then
      echo "Quick-play requested, mapped to Prism --server for compatibility." >> "$client_log"
    fi
    quick_play_args=("--server" "${host}:${port}")
  fi

  if [[ "${#quick_play_args[@]}" -gt 0 ]]; then
    args=("${quick_play_args[@]}" "${args[@]}")
  fi
  if [[ "${#args[@]}" -eq 0 ]]; then
    args=("--server" "${host}:${port}")
  fi

  if [[ -n "${CLIENT_CONNECT_ARGS:-}" || "${CLIENT_OFFLINE:-0}" == "1" ]]; then
    echo "Client args: ${args[*]}" >> "$client_log"
  fi

  before_mtime="$(stat -c %Y "$minecraft_log" 2>/dev/null || echo 0)"
  "$PRISM_LAUNCH" "$PRISM_INSTANCE" "${args[@]}" > "$client_log" 2>&1 &
  client_root_pid=$!
  local t
  for ((t=0; t<120; t++)); do
    if [[ "$(stat -c %Y "$minecraft_log" 2>/dev/null || echo 0)" -gt "$before_mtime" ]]; then
      fresh_client_log=1
    fi
    if ! kill -0 "$client_root_pid" 2>/dev/null && [[ "$fresh_client_log" == "0" ]]; then
      return 1
    fi
    client_java_pid="$(pick_java_child "$client_root_pid" || true)"
    [[ -n "$client_java_pid" ]] && return 0
    [[ "$fresh_client_log" == "1" ]] && return 0
    sleep 1
  done
  return 1
}

run_phase() {
  local phase="$1"       # baseline | fakeplayer
  local fake_enabled="$2" # 0|1
  local port="$3"
  local username="${CLIENT_USERNAME_PREFIX}_${phase}_${port}"
  local server_log="$OUT_DIR/${phase}.server.log"
  local client_log="$OUT_DIR/${phase}.client.log"
  local combined_log="$OUT_DIR/${phase}.combined.log"

  echo "=== phase=$phase fake_player_enabled=$fake_enabled port=$port ===" | tee -a "$SUMMARY"
  set_fake_player_enabled "$fake_enabled"

  start_server "$phase" "$port" || { echo "Server failed in $phase" | tee -a "$SUMMARY"; return 1; }
  start_client "$phase" "$port" "$username" || { echo "Client failed in $phase" | tee -a "$SUMMARY"; return 1; }

  local start now elapsed joined=0
  local joined_at=-1
  local peak_total=0 peak_server=0 peak_client=0
  start="$(date +%s)"

  while true; do
    now="$(date +%s)"
    elapsed=$((now - start))
    local s_rss c_rss total
    s_rss="$(sum_rss_tree "$server_launcher_pid")"
    c_rss="$(sum_rss_tree "$client_root_pid")"
    total=$((s_rss + c_rss))
    (( total > peak_total )) && peak_total="$total"
    (( s_rss > peak_server )) && peak_server="$s_rss"
    (( c_rss > peak_client )) && peak_client="$c_rss"

    if [[ -f "$SERVER_LOG" ]] && rg -q 'joined the game|logged in with entity id' "$SERVER_LOG"; then
      joined=1
      if (( joined_at < 0 )); then joined_at="$elapsed"; fi
    fi
    if [[ -f "$client_log" ]] && rg -q 'Connecting to|connected to|joined server' "$client_log"; then
      joined=1
      if (( joined_at < 0 )); then joined_at="$elapsed"; fi
    fi

    echo "$phase,$elapsed,$s_rss,$c_rss,$total,${server_java_pid:-},${client_java_pid:-},$joined" >> "$CSV"

    if (( joined == 1 && elapsed - joined_at >= POST_JOIN_SETTLE_SEC )); then
      break
    fi
    if (( joined == 0 && elapsed >= JOIN_TIMEOUT_SEC )); then
      break
    fi
    if ! kill -0 "$server_launcher_pid" 2>/dev/null; then break; fi
    if ! kill -0 "$client_root_pid" 2>/dev/null; then break; fi
    sleep "$SAMPLE_SEC"
  done

  printf '%s peak_total_gib=%.2f peak_server_gib=%.2f peak_client_gib=%.2f joined=%s joined_at_sec=%s\n' \
    "$phase" \
    "$(awk -v k="$peak_total" 'BEGIN{print k/1024/1024}')" \
    "$(awk -v k="$peak_server" 'BEGIN{print k/1024/1024}')" \
    "$(awk -v k="$peak_client" 'BEGIN{print k/1024/1024}')" \
    "$joined" "$joined_at" | tee -a "$SUMMARY"

  # Stop processes before next phase
  if [[ -n "${client_java_pid:-}" ]]; then kill -TERM "$client_java_pid" 2>/dev/null || true; fi
  if [[ -n "${client_root_pid:-}" ]]; then kill -TERM "$client_root_pid" 2>/dev/null || true; fi
  if [[ -n "${server_java_pid:-}" ]]; then kill -INT "$server_java_pid" 2>/dev/null || true; fi
  sleep 3
  if [[ -n "${server_java_pid:-}" ]]; then kill -TERM "$server_java_pid" 2>/dev/null || true; fi
  if [[ -n "${server_launcher_pid:-}" ]]; then kill -TERM "$server_launcher_pid" 2>/dev/null || true; fi
  sleep 2
  if [[ -n "${client_root_pid:-}" ]]; then kill -KILL "$client_root_pid" 2>/dev/null || true; fi
  if [[ -n "${server_launcher_pid:-}" ]]; then kill -KILL "$server_launcher_pid" 2>/dev/null || true; fi

  client_root_pid=""
  client_java_pid=""
  server_launcher_pid=""
  server_java_pid=""

  if [[ -f "$server_log" || -f "$client_log" ]]; then
    {
      echo "===== SERVER LOG (${server_log}) ====="
      cat "$server_log"
      echo "===== CLIENT LOG (${client_log}) ====="
      cat "$client_log"
    } > "$combined_log"
  fi
  echo "combined_log=$combined_log" | tee -a "$SUMMARY"
}

run_phase baseline 0 "$BASE_PORT"

if [[ "$RUN_FAKE_PHASE" != "0" ]]; then
  run_phase fakeplayer 1 "$((BASE_PORT + 1))"
fi

echo "CSV: $CSV" | tee -a "$SUMMARY"
echo "Summary: $SUMMARY" | tee -a "$SUMMARY"
