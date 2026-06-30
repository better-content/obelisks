#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ROOT:-${SCRIPT_DIR%/tools}}"
source "$SCRIPT_DIR/legacy_live_tool_guard.sh"
btm_require_legacy_live_tool_opt_in
PRISM_ROOT="${PRISM_ROOT:-$HOME/.local/share/PrismLauncher}"
PRISM_INSTANCE="${PRISM_INSTANCE:-Better Content-Playtest 4 - v1}"
PRISM_LAUNCH="${PRISM_LAUNCH:-$ROOT/tools/launch_prism_instance.sh}"
SERVER_DIR="${SERVER_DIR:-$ROOT/server-instance}"
SERVER_HOST="${SERVER_HOST:-127.0.0.1}"
SERVER_PORT="${SERVER_PORT:-25565}"
OUT_DIR="${OUT_DIR:-/tmp/btm-client-join-probe}"
START_TIMEOUT_SEC="${START_TIMEOUT_SEC:-180}"
JOIN_TIMEOUT_SEC="${JOIN_TIMEOUT_SEC:-600}"
SETTLE_SEC="${SETTLE_SEC:-60}"
KEEP_CLIENT="${KEEP_CLIENT:-0}"
CLIENT_OFFLINE="${CLIENT_OFFLINE:-0}"
CLIENT_USERNAME="${CLIENT_USERNAME:-ProbeClient}"
EXTRA_PRISM_ARGS="${EXTRA_PRISM_ARGS:-}"
CLIENT_PROFILE_OUT="${CLIENT_PROFILE_OUT:-}"

INSTANCE_DIR="$PRISM_ROOT/instances/$PRISM_INSTANCE"
MC_DIR="$INSTANCE_DIR/minecraft"
CLIENT_LOG="$MC_DIR/logs/latest.log"
SERVER_LOG="$SERVER_DIR/logs/latest.log"
CRASH_DIR="$SERVER_DIR/crash-reports"
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$OUT_DIR/$STAMP"
SUMMARY="$RUN_DIR/summary.txt"
PRISM_STDOUT="$RUN_DIR/prism-stdout.log"
PROCESS_CSV="$RUN_DIR/processes.csv"

JOIN_PATTERNS='joined the game|logged in with entity id|UUID of player|ServerboundHelloPacket|is now connected'
CLIENT_READY_PATTERNS='Connecting to|Connecting to server|Joining world|Started serving on|Loaded [0-9]+ advancements|Reloaded EMI|Created: .*minecraft:textures/atlas'
CLIENT_FATAL_PATTERNS='Crash report|Mod Loading has failed|Failed to start|OutOfMemoryError|A fatal error has been detected|Preparing crash report|This crash report has been saved'
SERVER_FATAL_PATTERNS='Encountered an unexpected exception|Preparing crash report|This crash report has been saved|Mod Loading has failed|FAILED TO BIND TO PORT|Error: Failed to initialize'

launcher_pid=""
client_java_pid=""

mkdir -p "$RUN_DIR"
: > "$SUMMARY"
: > "$RUN_DIR/.probe-start"
echo "elapsed,root_pid,client_java_pid,root_rss_kb,client_rss_kb,client_log_mtime,server_joined" > "$PROCESS_CSV"

children_of() {
  local roots=("$@") next=() p c
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

stop_pid_tree() {
  local root="$1"
  [[ -n "$root" ]] || return 0
  local pids=("$root")
  mapfile -t descendants < <(children_of "$root" | sort -nu)
  pids+=("${descendants[@]}")
  kill -TERM "${pids[@]}" 2>/dev/null || true
  sleep 2
  kill -KILL "${pids[@]}" 2>/dev/null || true
}

sum_rss_tree() {
  local root="$1" sum=0 p rss
  [[ -n "$root" ]] || { echo 0; return; }
  for p in "$root" $(children_of "$root" | sort -nu); do
    rss="$(ps -p "$p" -o rss= 2>/dev/null | awk '{print $1}' || true)"
    [[ "$rss" =~ ^[0-9]+$ ]] || continue
    sum=$((sum + rss))
  done
  echo "$sum"
}

pick_client_java() {
  local root="$1" p row
  [[ -n "$root" ]] || return 1
  for p in "$root" $(children_of "$root" | sort -nu); do
    row="$(ps -p "$p" -o args= 2>/dev/null || true)"
    if echo "$row" | rg -q 'java .*org\.prismlauncher\.EntryPoint|java .*NewLaunch\.jar|java .*minecraft-1\.20\.1-client\.jar'; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

newest_prism_log() {
  find "$PRISM_ROOT/logs" -maxdepth 1 -type f -name 'PrismLauncher-*.log' -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr \
    | awk 'NR==1 {print $2}'
}

copy_evidence() {
  local prism_log
  prism_log="$(newest_prism_log || true)"
  [[ -n "$prism_log" && -f "$prism_log" ]] && cp "$prism_log" "$RUN_DIR/prism-latest.log" || true
  [[ -f "$CLIENT_LOG" ]] && cp "$CLIENT_LOG" "$RUN_DIR/client-latest.log" || true
  [[ -f "$SERVER_LOG" ]] && cp "$SERVER_LOG" "$RUN_DIR/server-latest.log" || true
  if [[ -d "$CRASH_DIR" ]]; then
    find "$CRASH_DIR" -maxdepth 1 -type f -name 'crash-*-server.txt' -newer "$RUN_DIR/.probe-start" -print0 2>/dev/null \
      | while IFS= read -r -d '' crash; do
          cp "$crash" "$RUN_DIR/$(basename "$crash")" || true
        done
  fi
}

profile_client() {
  [[ -n "$CLIENT_PROFILE_OUT" ]] || return 0
  [[ -n "${client_java_pid:-}" ]] || return 0
  kill -0 "$client_java_pid" 2>/dev/null || return 0
  mkdir -p "$CLIENT_PROFILE_OUT"
  {
    date -Iseconds
    ps -o pid,ppid,stat,etime,rss,vsz,args -p "$client_java_pid"
  } > "$CLIENT_PROFILE_OUT/process_snapshot.txt" 2>&1 || true
  cp "/proc/$client_java_pid/status" "$CLIENT_PROFILE_OUT/proc_status.txt" 2>/dev/null || true
  cp "/proc/$client_java_pid/smaps_rollup" "$CLIENT_PROFILE_OUT/smaps_rollup.txt" 2>/dev/null || true
  cp "/proc/$client_java_pid/limits" "$CLIENT_PROFILE_OUT/limits.txt" 2>/dev/null || true
  pmap -x "$client_java_pid" > "$CLIENT_PROFILE_OUT/pmap_x.txt" 2>&1 || true
  jcmd "$client_java_pid" VM.command_line > "$CLIENT_PROFILE_OUT/jcmd_command_line.txt" 2>&1 || true
  jcmd "$client_java_pid" VM.flags > "$CLIENT_PROFILE_OUT/jcmd_flags.txt" 2>&1 || true
  jcmd "$client_java_pid" GC.heap_info > "$CLIENT_PROFILE_OUT/jcmd_heap_info.txt" 2>&1 || true
  jcmd "$client_java_pid" VM.native_memory summary scale=MB > "$CLIENT_PROFILE_OUT/jcmd_native_memory_summary.txt" 2>&1 || true
  jcmd "$client_java_pid" VM.metaspace > "$CLIENT_PROFILE_OUT/jcmd_metaspace.txt" 2>&1 || true
  jstat -gc "$client_java_pid" > "$CLIENT_PROFILE_OUT/jstat_gc.txt" 2>&1 || true
  jcmd "$client_java_pid" GC.class_histogram > "$CLIENT_PROFILE_OUT/jcmd_class_histogram.txt" 2>&1 || true
}

finish() {
  local status="$1" reason="$2"
  copy_evidence
  {
    echo "status=$status"
    echo "reason=$reason"
    echo "run_dir=$RUN_DIR"
    echo "instance=$PRISM_INSTANCE"
    echo "server=$SERVER_HOST:$SERVER_PORT"
    echo "client_java_pid=${client_java_pid:-}"
    echo "launcher_pid=${launcher_pid:-}"
  } | tee -a "$SUMMARY"
  if [[ "$KEEP_CLIENT" != "1" ]]; then
    [[ -n "${client_java_pid:-}" ]] && stop_pid_tree "$client_java_pid"
    [[ -n "${launcher_pid:-}" ]] && stop_pid_tree "$launcher_pid"
  fi
  [[ "$status" == "PASS" ]]
}

trap 'finish FAIL interrupted >/dev/null || true' INT TERM

if [[ ! -x "$PRISM_LAUNCH" ]]; then
  echo "Missing Prism launch helper: $PRISM_LAUNCH" | tee -a "$SUMMARY"
  exit 1
fi
if [[ ! -d "$MC_DIR" ]]; then
  echo "Missing Prism instance minecraft dir: $MC_DIR" | tee -a "$SUMMARY"
  exit 1
fi
server_listener_pid="$(ss -ltnp 2>/dev/null | awk -v port=":${SERVER_PORT}" '$4 ~ port "$" {print $0}' | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -n1)"
if ! ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${SERVER_PORT}$"; then
  echo "Server is not listening on $SERVER_PORT" | tee -a "$SUMMARY"
  exit 1
fi

client_before="$(stat -c %Y "$CLIENT_LOG" 2>/dev/null || echo 0)"
server_before_size="$(stat -c %s "$SERVER_LOG" 2>/dev/null || echo 0)"
server_join_count_before="$(rg -c "$JOIN_PATTERNS" "$SERVER_LOG" 2>/dev/null || echo 0)"
start_epoch="$(date +%s)"

args=("--server" "$SERVER_HOST:$SERVER_PORT")
if [[ "$CLIENT_OFFLINE" == "1" ]]; then
  args+=("--offline" "$CLIENT_USERNAME")
fi
if [[ -n "$EXTRA_PRISM_ARGS" ]]; then
  read -r -a extra <<< "$EXTRA_PRISM_ARGS"
  args+=("${extra[@]}")
fi

{
  echo "launch=$(date -Iseconds)"
  echo "command=$PRISM_LAUNCH $PRISM_INSTANCE ${args[*]}"
} | tee -a "$SUMMARY"

"$PRISM_LAUNCH" "$PRISM_INSTANCE" "${args[@]}" >"$PRISM_STDOUT" 2>&1 &
launcher_pid=$!

fresh_client_log=0
server_joined=0
client_ready=0

for ((elapsed=0; elapsed<=JOIN_TIMEOUT_SEC; elapsed++)); do
  now="$(date +%s)"
  elapsed=$((now - start_epoch))
  client_java_pid="$(pick_client_java "$launcher_pid" || true)"
  client_mtime="$(stat -c %Y "$CLIENT_LOG" 2>/dev/null || echo 0)"
  if [[ "$client_mtime" -gt "$client_before" ]]; then
    fresh_client_log=1
  fi

  if [[ "$elapsed" -ge "$START_TIMEOUT_SEC" && -z "${client_java_pid:-}" && "$fresh_client_log" == "0" ]]; then
    finish FAIL "client_did_not_start_jvm_or_log" || exit 1
    exit 1
  fi

  if [[ -f "$CLIENT_LOG" && "$fresh_client_log" == "1" ]] && rg -q "$CLIENT_FATAL_PATTERNS" "$CLIENT_LOG"; then
    finish FAIL "client_fatal_log_signature" || exit 1
    exit 1
  fi
  if [[ -f "$SERVER_LOG" ]] && tail -c +"$((server_before_size + 1))" "$SERVER_LOG" 2>/dev/null | rg -q "$SERVER_FATAL_PATTERNS"; then
    finish FAIL "server_fatal_log_signature" || exit 1
    exit 1
  fi
  if [[ -d "$CRASH_DIR" ]] && find "$CRASH_DIR" -maxdepth 1 -type f -name 'crash-*-server.txt' -newer "$RUN_DIR/.probe-start" -print -quit 2>/dev/null | rg -q .; then
    finish FAIL "server_crash_report_created" || exit 1
    exit 1
  fi
  if [[ -n "${server_listener_pid:-}" ]] && ! kill -0 "$server_listener_pid" 2>/dev/null; then
    finish FAIL "server_listener_process_exited" || exit 1
    exit 1
  fi
  if ! ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${SERVER_PORT}$"; then
    finish FAIL "server_stopped_listening" || exit 1
    exit 1
  fi

  if [[ -f "$CLIENT_LOG" && "$fresh_client_log" == "1" ]] && rg -q "$CLIENT_READY_PATTERNS" "$CLIENT_LOG"; then
    client_ready=1
  fi
  server_join_count_now="$server_join_count_before"
  if [[ -f "$SERVER_LOG" ]]; then
    server_join_count_now="$(rg -c "$JOIN_PATTERNS" "$SERVER_LOG" 2>/dev/null || echo 0)"
  fi
  if [[ "$server_join_count_now" =~ ^[0-9]+$ && "$server_join_count_before" =~ ^[0-9]+$ && "$server_join_count_now" -gt "$server_join_count_before" ]]; then
    server_joined=1
  elif [[ -f "$SERVER_LOG" ]] && tail -c +"$((server_before_size + 1))" "$SERVER_LOG" 2>/dev/null | rg -q "$JOIN_PATTERNS"; then
    server_joined=1
  fi

  root_rss="$(sum_rss_tree "$launcher_pid")"
  client_rss=0
  [[ -n "${client_java_pid:-}" ]] && client_rss="$(sum_rss_tree "$client_java_pid")"
  echo "$elapsed,${launcher_pid:-},${client_java_pid:-},$root_rss,$client_rss,$client_mtime,$server_joined" >> "$PROCESS_CSV"

  if [[ "$server_joined" == "1" ]]; then
    if [[ "$SETTLE_SEC" =~ ^[0-9]+$ && "$SETTLE_SEC" -gt 0 ]]; then
      sleep "$SETTLE_SEC"
      if [[ -f "$SERVER_LOG" ]] && tail -c +"$((server_before_size + 1))" "$SERVER_LOG" 2>/dev/null | rg -q "$SERVER_FATAL_PATTERNS"; then
        finish FAIL "server_fatal_during_settle" || exit 1
        exit 1
      fi
      if [[ -f "$CLIENT_LOG" ]] && rg -q "$CLIENT_FATAL_PATTERNS" "$CLIENT_LOG"; then
        finish FAIL "client_fatal_during_settle" || exit 1
        exit 1
      fi
    fi
    profile_client
    finish PASS "client_joined_server" || exit 1
    exit 0
  fi

  if ! kill -0 "$launcher_pid" 2>/dev/null && [[ -z "${client_java_pid:-}" ]]; then
    if [[ "$fresh_client_log" == "0" ]]; then
      finish FAIL "launcher_exited_before_client_log" || exit 1
      exit 1
    fi
    if [[ "$client_ready" == "0" ]]; then
      finish FAIL "launcher_exited_before_client_ready" || exit 1
      exit 1
    fi
  fi

  sleep 1
done

finish FAIL "client_join_timeout" || exit 1
