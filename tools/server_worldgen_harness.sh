#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_ROOT="${SCRIPT_DIR%/tools}"
source "${SCRIPT_DIR}/legacy_live_tool_guard.sh"
btm_require_legacy_live_tool_opt_in

SERVER_DIR="${1:-/home/gerald/obelisks/server-instance}"
CYCLES="${2:-100}"
TIMEOUT_SEC="${3:-420}"
BASE_PORT="${4:-25565}"
SERVER_TEMPLATE_DIR="${BTM_SERVER_TEMPLATE:-${PACK_ROOT}/server-template}"
POST_DONE_WAIT_SEC="${BTM_POST_DONE_WAIT_SEC:-60}"
WITH_CLIENT="${WITH_CLIENT:-0}"
PRISM_ROOT="${PRISM_ROOT:-${HOME}/.local/share/PrismLauncher}"
PRISM_INSTANCE="${PRISM_INSTANCE:-Better Content-Playtest 4 - v1}"
PRISM_LAUNCH="${PRISM_LAUNCH:-${SCRIPT_DIR}/launch_prism_instance.sh}"
CLIENT_CONNECT_HOST="${CLIENT_CONNECT_HOST:-127.0.0.1}"
CLIENT_CONNECT_TIMEOUT_SEC="${CLIENT_CONNECT_TIMEOUT_SEC:-420}"
CLIENT_STARTUP_SEC="${CLIENT_STARTUP_SEC:-120}"
CLIENT_CONNECT_MODE="${CLIENT_CONNECT_MODE:-auto}"
CLIENT_CONNECT_ARGS="${CLIENT_CONNECT_ARGS:-}"
CLIENT_USERNAME_PREFIX="${CLIENT_USERNAME_PREFIX:-AutoHarness}"
CLIENT_OFFLINE="${CLIENT_OFFLINE:-0}"
CLIENT_JOIN_PATTERNS='joined the game|logged in with entity id|Game mode|Successfully connected to the server'
CRASH_PATTERNS='Missing or unsupported mandatory dependencies|Failed to complete lifecycle event|Mod Loading has failed|\[main/FATAL\]|FAILED TO BIND TO PORT|Encountered an unexpected exception|Preparing crash report|This crash report has been saved|Error: Failed to initialize'
SERVER_JOIN_PATTERNS='joined the game|logged in with entity id|UUID of player|logged in with entity id|Starting integrated server for'

port_in_use() {
  local port="$1"
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$"
}

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
  if ((${#pids[@]})); then
    echo "Stopping process tree rooted at $root: ${pids[*]}"
    kill -INT "${pids[@]}" 2>/dev/null || true
    sleep 2
    kill -TERM "${pids[@]}" 2>/dev/null || true
    sleep 2
    kill -KILL "${pids[@]}" 2>/dev/null || true
  fi
}

pick_java_child() {
  local root="$1"
  local p row
  for p in "$root" $(children_of "$root" | sort -nu); do
    row="$(ps -p "$p" -o args= 2>/dev/null || true)"
    if echo "$row" | rg -q 'java .*minecraft|java .*forge|java .*org\.prismlauncher|NewLaunch\.jar|org\.prismlauncher\.EntryPoint|--quickPlay| -Xmx|--server'; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

start_client() {
  local phase="$1"
  local port="$2"
  local username="$3"

  if [[ ! -x "$PRISM_LAUNCH" ]]; then
    echo "Prism launcher helper missing or not executable: $PRISM_LAUNCH"
    return 1
  fi
  if [[ -z "${PRISM_INSTANCE:-}" ]]; then
    echo "No PRISM_INSTANCE configured for client launch"
    return 1
  fi

  local client_log="harness-logs/${phase}-client.log"
  local minecraft_log="$PRISM_ROOT/instances/$PRISM_INSTANCE/minecraft/logs/latest.log"
  local before_mtime
  local host="$CLIENT_CONNECT_HOST"
  local launcher_args=()
  local extra_args=()
  local fresh_client_log=0
  local connect_args=()
  local legacy_args=()
  local mode="${CLIENT_CONNECT_MODE:-auto}"

  # Prism supports --server for launch-time join on this environment.
  if [[ "$mode" == "auto" || "$mode" == "quickplay" || "$mode" == "legacy" ]]; then
    connect_args=("--server" "${host}:${port}")
    if [[ "$mode" == "quickplay" ]]; then
      echo "Quick-play requested, mapped to Prism --server for compatibility."
    fi
  fi
  if [[ "${CLIENT_OFFLINE:-0}" == "1" && -n "$username" ]]; then
    connect_args+=("--offline" "$username")
  fi
  if [[ -n "${CLIENT_CONNECT_ARGS:-}" ]]; then
    read -r -a extra_args <<< "$CLIENT_CONNECT_ARGS"
    connect_args+=("${extra_args[@]}")
  fi

  # Avoid stale Prism IPC/socket conflicts when launching consecutive clients.
  # Older runs can leave launcher processes behind and block the local launcher socket.
  cleanup_stale_prism_processes

  if (( ${#connect_args[@]} > 0 )); then
    launcher_args=("${connect_args[@]}")
  else
    # Always keep a deterministic connect arg in case caller requested only
    # launch-side defaults.
    launcher_args=("--server" "${host}:${port}")
  fi

  # Emit chosen args for post-run diagnosis.
  {
    echo "Client connect mode=$mode"
    echo "Client launch args: ${launcher_args[*]}"
  } >> "$client_log"

  before_mtime="$(stat -c %Y "$minecraft_log" 2>/dev/null || echo 0)"
  "$PRISM_LAUNCH" "$PRISM_INSTANCE" "${launcher_args[@]}" > "$client_log" 2>&1 &
  client_root_pid=$!
  client_log_file="$client_log"

  local t
  for ((t=1; t<=CLIENT_STARTUP_SEC; t++)); do
    if [[ "$(stat -c %Y "$minecraft_log" 2>/dev/null || echo 0)" -gt "$before_mtime" ]]; then
      fresh_client_log=1
    fi
    if ! kill -0 "$client_root_pid" 2>/dev/null && [[ "$fresh_client_log" == "0" ]]; then
      return 1
    fi
    client_pid="$(pick_java_child "$client_root_pid" || true)"
    if [[ -n "${client_pid:-}" ]]; then
      return 0
    fi
    if [[ "$fresh_client_log" == "1" ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

cleanup_stale_prism_processes() {
  local me="$BASHPID"
  local p
  # Best-effort: only target prism launcher processes for the configured root.
  while IFS= read -r p; do
    [[ -n "$p" ]] || continue
    [[ "$p" == "$me" ]] && continue
    if ps -p "$p" -o comm= 2>/dev/null | rg -q 'prismlauncher|PrismLauncher|java'; then
      stop_pid_tree "$p"
    fi
  done < <(
    pgrep -af "PrismLauncher\|prismlauncher|org\.prismlauncher" 2>/dev/null \
      | awk '{print $1}'
  )
  # Also clear lingering minecraft clients spawned through launcher args for this instance.
  while IFS= read -r p; do
    [[ -n "$p" ]] || continue
    [[ "$p" == "$me" ]] && continue
    if ps -p "$p" -o cmd= 2>/dev/null | rg -q 'Prism|prismlauncher|--server|--offline|--quickPlay'; then
      stop_pid_tree "$p"
    fi
  done < <(
    pgrep -af "--server .*${PRISM_INSTANCE}" 2>/dev/null \
      | awk '{print $1}'
  )
}

wait_for_join() {
  local username="$1"
  local timeout="$2"
  local server_log="$3"
  local client_log="$4"
  local t
  local joined=0

  for ((t=0; t<=timeout; t++)); do
    if [[ -f "$server_log" ]] && rg -q "logged in with entity id|joined the game|UUID of player|is now connected|Preparing to join|Game mode" "$server_log"; then
      joined=1
      break
    fi
    if [[ -f "$client_log" ]] && rg -q "Joining world|Connected to|Successfully connected to server|logged in|joined the game|Game mode" "$client_log"; then
      joined=1
      break
    fi
    if [[ -n "$username" ]] && [[ -f "$server_log" ]] && rg -q " ${username}[[:space:]]|\\[${username}\\]|${username} joined the game|UUID of player ${username}" "$server_log"; then
      joined=1
      break
    fi
    if [[ -n "$username" ]] && [[ -f "$client_log" ]] && rg -q "${username}" "$client_log"; then
      joined=1
      break
    fi
    sleep 1
  done
  echo "$joined"
}

prepare_server_dir() {
  if [[ -x "$SERVER_DIR/run.sh" ]]; then
    return 0
  fi
  if [[ ! -d "$SERVER_TEMPLATE_DIR" || ! -x "$SERVER_TEMPLATE_DIR/run.sh" ]]; then
    SERVER_TEMPLATE_DIR="${BTM_SERVER_TEMPLATE:-$HOME/.local/share/Trash/files/server-instance}"
  fi
  if [[ ! -d "$SERVER_TEMPLATE_DIR" || ! -x "$SERVER_TEMPLATE_DIR/run.sh" ]]; then
    echo "Server template missing or incomplete: $SERVER_TEMPLATE_DIR" >&2
    echo "Set BTM_SERVER_TEMPLATE to a prepared server root containing run.sh" >&2
    exit 1
  fi
  echo "Preparing server dir from template: $SERVER_TEMPLATE_DIR"
  mkdir -p "$SERVER_DIR"
  rsync -a --delete \
    --exclude 'harness-logs/' \
    --exclude 'logs/' \
    --exclude 'world/' \
    --exclude 'world_nether/' \
    --exclude 'world_the_end/' \
    "$SERVER_TEMPLATE_DIR"/ "$SERVER_DIR"/
}

cleanup_lingering_server_pids() {
  local pids
  pids="$(pgrep -f "$(printf '%s' "$SERVER_DIR" | sed 's/[.[\*^$(){}+?|]/\\&/g').*unix_args.txt nogui" || true)"
  if [[ -n "${pids:-}" ]]; then
    echo "Cleaning lingering server java pids: $pids"
    for p in $pids; do
      stop_pid_tree "$p"
    done
  fi
}

cleanup_client() {
  local pids=()
  if [[ -n "${client_pid:-}" ]]; then
    mapfile -t pids < <(children_of "${client_pid}" | sort -nu)
    if ((${#pids[@]})); then
      stop_pid_tree "${client_pid}"
    fi
    stop_pid_tree "$client_pid"
    client_pid=""
  fi
  if [[ -n "${client_root_pid:-}" ]]; then
    stop_pid_tree "$client_root_pid"
    client_root_pid=""
  fi
}

terminate_current_cycle() {
  set +e
  stop_pid_tree "${launcher_pid:-}"
  cleanup_client
  exit 130
}

trap terminate_current_cycle INT TERM
prepare_server_dir
cd "$SERVER_DIR"

mkdir -p harness-logs
SUMMARY="harness-logs/summary-$(date +%Y%m%d-%H%M%S).csv"
ln -sfn "$(basename "$SUMMARY")" harness-logs/latest-summary.csv
: > harness-logs/progress.log

echo "cycle,start_ts,end_ts,status,status_reason,done_seconds,server_port,server_pid,client_pid,client_status,joined,log_file" > "$SUMMARY"

level_name=$(awk -F'=' '/^level-name=/{print $2}' server.properties | tr -d '\r' || true)
[[ -z "${level_name:-}" ]] && level_name="world"
orig_port=$(awk -F'=' '/^server-port=/{print $2}' server.properties | tr -d '\r' || true)
[[ -z "${orig_port:-}" ]] && orig_port="$BASE_PORT"

for ((i=1; i<=CYCLES; i++)); do
  start_ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  tag=$(printf "%03d" "$i")
  log_file="harness-logs/cycle-${tag}.log"
  runtime_log="logs/latest.log"
  server_port=$((BASE_PORT + i))
  cleanup_lingering_server_pids
  while port_in_use "$server_port"; do
    echo "Port $server_port busy, incrementing."
    server_port=$((server_port + 1))
  done

  if grep -q '^server-port=' server.properties; then
    sed -i "s/^server-port=.*/server-port=${server_port}/" server.properties
  else
    printf '\nserver-port=%s\n' "$server_port" >> server.properties
  fi

  rm -rf "$level_name" "${level_name}_nether" "${level_name}_the_end"
  rm -f "$runtime_log"

  echo "===== CYCLE ${i} START (port=${server_port}) ====="
  # Stream directly to tmux pane; parse Forge's canonical runtime log for state.
  launcher_pid=""
  client_root_pid=""
  client_pid=""
  client_log_file=""
  client_joined=0
  client_status="not_started"
  ./run.sh nogui &
  launcher_pid=$!

  status="TIMEOUT"
  status_reason="timeout_waiting_for_done"
  done_seconds=""
  done_at_tick=""

  for ((t=1; t<=TIMEOUT_SEC; t++)); do
    if [[ -f "$runtime_log" ]] && grep -q 'Done (' "$runtime_log"; then
      status="OK"
      status_reason="ready_done"
      done_seconds=$(sed -nE 's/.*Done \(([0-9.]+)s\).*/\1/p' "$runtime_log" | tail -n 1)
      done_at_tick="$t"
      if [[ "${WITH_CLIENT}" == "1" ]]; then
        status="SERVER_OK_WAIT_CLIENT"
        status_reason="server_done_wait_client"
      fi
      break
    fi
    if [[ -f "$runtime_log" ]] && grep -qE "$CRASH_PATTERNS" "$runtime_log"; then
      status="CRASH"
      status_reason="$(grep -oE "$CRASH_PATTERNS" "$runtime_log" | head -n 1)"
      break
    fi
    if ! kill -0 "$launcher_pid" 2>/dev/null; then
      status="CRASH"
      status_reason="launcher_process_exited"
      break
    fi
    sleep 1
  done

  if [[ "${status}" == "SERVER_OK_WAIT_CLIENT" ]]; then
    client_status="starting"
    username="${CLIENT_USERNAME_PREFIX}_${tag}"
    if start_client "cycle-${tag}" "$server_port" "$username"; then
      client_status="running"
      join_wait_sec=0
      for ((join_wait_sec=0; join_wait_sec<=CLIENT_CONNECT_TIMEOUT_SEC; join_wait_sec++)); do
        if [[ -f "$runtime_log" ]] && rg -q 'The command was cancelled as it had no effect|Disconnected' "$runtime_log"; then
          client_status="server_disconnect_error"
          break
        fi
        if ! kill -0 "$client_root_pid" 2>/dev/null; then
          client_status="client_process_exit"
          break
        fi
        if ! kill -0 "$launcher_pid" 2>/dev/null; then
          client_status="server_process_exit"
          break
        fi
        client_joined="$(wait_for_join "$username" 1 "$runtime_log" "$client_log_file")"
        if (( client_joined == 1 )); then
          status="OK_WITH_CLIENT"
          status_reason="server_done_client_joined"
          break
        fi
        if [[ -f "$runtime_log" ]] && rg -q "$CRASH_PATTERNS" "$runtime_log"; then
          status="CRASH"
          status_reason="server_crashed_while_waiting_client"
          break
        fi
        if [[ -f "$client_log_file" ]] && rg -q 'error|fatal|CRASH|java.lang' "$client_log_file"; then
          client_status="client_error_detected"
          break
        fi
        sleep 1
      done
      if (( join_wait_sec >= CLIENT_CONNECT_TIMEOUT_SEC )); then
        status="CLIENT_TIMEOUT"
        status_reason="client_join_timeout"
      fi
    else
      client_status="start_failed"
      status="CLIENT_FAIL"
      status_reason="client_failed_to_start"
    fi
  fi

  if [[ "$status" == "OK" && "$POST_DONE_WAIT_SEC" =~ ^[0-9]+$ && "$POST_DONE_WAIT_SEC" -gt 0 ]]; then
    echo "Post-Done settle: waiting ${POST_DONE_WAIT_SEC}s before teardown"
    sleep "$POST_DONE_WAIT_SEC"
  elif [[ "${status}" == "OK_WITH_CLIENT" && "$POST_DONE_WAIT_SEC" =~ ^[0-9]+$ && "$POST_DONE_WAIT_SEC" -gt 0 ]]; then
    echo "Post-Done + client settle: waiting ${POST_DONE_WAIT_SEC}s before teardown"
    sleep "$POST_DONE_WAIT_SEC"
  fi

  if [[ -n "${client_pid:-}" ]]; then
    stop_pid_tree "${client_pid}"
  fi
  if [[ -n "${client_root_pid:-}" ]]; then
    stop_pid_tree "${client_root_pid}"
  fi
  if [[ "${status}" != "OK_WITH_CLIENT" ]]; then
    client_joined=0
  fi
  if (( ${client_joined:-0} == 0 )) && [[ -n "${client_root_pid:-}" ]] && [[ "${client_status}" != "not_started" ]]; then
    if [[ -f "${client_log_file:-}" ]]; then
      if rg -q "joined the game|logged in with entity id" "${client_log_file:-}"; then
        client_joined=1
      fi
    fi
  fi

  stop_pid_tree "${launcher_pid}"
  launcher_exit_code=""
  if [[ -n "${launcher_pid:-}" ]]; then
    set +e
    wait "$launcher_pid" 2>/dev/null
    launcher_exit_code="$?"
    set -e
  fi
  [[ -f "$runtime_log" ]] && cp "$runtime_log" "$log_file" || true
  end_ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "$i,$start_ts,$end_ts,$status,$status_reason,$done_seconds,$server_port,${launcher_pid:-},${client_pid:-},${client_status:-},${client_joined:-},$log_file" >> "$SUMMARY"
  echo "[$(date +%H:%M:%S)] cycle=$i status=$status reason=$status_reason port=$server_port done_s=${done_seconds:-} client=${client_status:-} joined=$client_joined" | tee -a harness-logs/progress.log
  echo "===== CYCLE ${i} END status=${status} done_s=${done_seconds:-} ====="
done

if grep -q '^server-port=' server.properties; then
  sed -i "s/^server-port=.*/server-port=${orig_port}/" server.properties
else
  printf '\nserver-port=%s\n' "$orig_port" >> server.properties
fi

echo "Completed $CYCLES cycles. Summary: $SUMMARY"
