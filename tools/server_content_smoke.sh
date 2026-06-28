#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=tools/_runtime_common.sh
source "$ROOT/tools/_runtime_common.sh"

server_dir="${SERVER_DIR:-/tmp/btm-content-smoke}"
port="$BTM_SERVER_PORT"
timeout=900
reset=0
skip_bootstrap=0
keep_running=0

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--server-dir PATH] [--port PORT] [--reset-runtime] [--skip-bootstrap] [--keep-running] [--timeout SECONDS]

Runs the standard server-only content smoke validation:
  bootstrap/sync/prune -> boot dedicated server -> stop cleanly -> hard log scan -> pack test suite.

Full bootstrap and server output is written under <server-dir>/validation-evidence/.
USAGE
}

while (($#)); do
  case "$1" in
    --server-dir) server_dir="${2:-}"; [[ -n "$server_dir" ]] || btm_usage_error "--server-dir needs a path"; shift 2 ;;
    --port) port="${2:-}"; [[ "$port" =~ ^[0-9]+$ ]] || btm_usage_error "--port needs a number"; shift 2 ;;
    --timeout) timeout="${2:-}"; [[ "$timeout" =~ ^[0-9]+$ ]] || btm_usage_error "--timeout needs a number"; shift 2 ;;
    --reset-runtime) reset=1; shift ;;
    --skip-bootstrap) skip_bootstrap=1; shift ;;
    --keep-running) keep_running=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) btm_usage_error "unknown argument: $1" ;;
  esac
done

stamp="$(date +%Y%m%d-%H%M%S)"
evidence_dir="$server_dir/validation-evidence/$stamp"
mkdir -p "$evidence_dir"

bootstrap_log="$evidence_dir/bootstrap-server.log"
prune_log="$evidence_dir/prune-dry-run.log"
server_log="$evidence_dir/server-console.log"
scan_log="$evidence_dir/hard-failure-scan.log"
suite_log="$evidence_dir/pack-test-suite.log"
latest_log="$server_dir/logs/latest.log"
fatal_patterns='Missing or unsupported mandatory dependencies|Mod Loading has failed|Failed to start the minecraft server|Encountered an unexpected exception|Preparing crash report|This crash report has been saved|\[main/FATAL\]'

server_pid=""
server_stdin_fd=""

kill_leftover_server_processes() {
  local pids pid
  pids="$(pgrep -f -- "$server_dir/run.sh nogui" 2>/dev/null || true)"
  [[ -n "$pids" ]] || return 0
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    [[ "$pid" != "$$" && "$pid" != "${BASHPID:-}" ]] || continue
    kill "$pid" 2>/dev/null || true
  done <<<"$pids"
}

cleanup() {
  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then
    if [[ "$keep_running" == "0" && -n "$server_stdin_fd" ]]; then
      printf 'stop\n' >&"$server_stdin_fd" || true
      exec {server_stdin_fd}>&- || true
      for _ in {1..30}; do
        kill -0 "$server_pid" 2>/dev/null || break
        sleep 1
      done
      if kill -0 "$server_pid" 2>/dev/null; then
        kill "$server_pid" 2>/dev/null || true
      fi
      wait "$server_pid" || true
    fi
  fi
  if [[ "$keep_running" == "0" ]]; then
    kill_leftover_server_processes
  fi
}
trap cleanup EXIT

echo "content smoke: server_dir=$server_dir port=$port evidence=$evidence_dir"

if [[ "$skip_bootstrap" == "0" ]]; then
  echo "content smoke: bootstrap started"
  bootstrap_args=(--server-dir "$server_dir" --port "$port")
  [[ "$reset" == "1" ]] && bootstrap_args+=(--reset-runtime)
  if "$ROOT/tools/bootstrap_server.sh" "${bootstrap_args[@]}" >"$bootstrap_log" 2>&1; then
    echo "content smoke: bootstrap ok ($bootstrap_log)"
  else
    echo "content smoke: bootstrap failed; tail follows ($bootstrap_log)" >&2
    tail -80 "$bootstrap_log" >&2 || true
    exit 1
  fi
else
  echo "content smoke: bootstrap skipped"
fi

echo "content smoke: verifying runtime mod prune"
if "$ROOT/tools/prune_runtime_mods.mjs" --pack-root "$ROOT" --target-dir "$server_dir" --side server --dry-run >"$prune_log" 2>&1; then
  cat "$prune_log"
else
  cat "$prune_log" >&2 || true
  exit 1
fi

echo "content smoke: launching server"
coproc SERVER_CONTENT_SMOKE {
  "$ROOT/tools/launch_server_direct.sh" --server-dir "$server_dir" -- nogui >"$server_log" 2>&1
}
server_pid="$SERVER_CONTENT_SMOKE_PID"
exec {server_stdin_fd}>&${SERVER_CONTENT_SMOKE[1]}

deadline=$((SECONDS + timeout))
while (( SECONDS < deadline )); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid" || true
    echo "content smoke: server exited before Done marker; tail follows ($server_log)" >&2
    tail -120 "$server_log" >&2 || true
    exit 1
  fi
  if [[ -f "$server_log" ]] && rg -q "$fatal_patterns" "$server_log"; then
    echo "content smoke: server emitted a hard startup failure; tail follows ($server_log)" >&2
    tail -160 "$server_log" >&2 || true
    exit 1
  fi
  if [[ -f "$server_log" ]] && rg -q 'Done \([\d.]+s\)! For help, type "help"' "$server_log"; then
    echo "content smoke: server reached Done"
    break
  fi
  sleep 2
done

if [[ ! -f "$server_log" ]] || ! rg -q 'Done \([\d.]+s\)! For help, type "help"' "$server_log"; then
  echo "content smoke: timed out waiting for server Done marker after ${timeout}s" >&2
  tail -120 "$server_log" >&2 || true
  exit 1
fi

if [[ "$keep_running" == "1" ]]; then
  echo "content smoke: --keep-running set; server pid=$server_pid log=$server_log"
  "$ROOT/tools/log_hard_failure_scan.mjs" --instance "$server_dir" --log "$latest_log" | tee "$scan_log"
  trap - EXIT
  exit 0
fi

echo "content smoke: stopping server"
printf 'stop\n' >&"$server_stdin_fd"
exec {server_stdin_fd}>&-
wait "$server_pid"
server_pid=""

echo "content smoke: scanning hard log failures"
"$ROOT/tools/log_hard_failure_scan.mjs" --instance "$server_dir" --log "$latest_log" | tee "$scan_log"

echo "content smoke: running pack test suite"
if BTM_INSTANCE="$server_dir" BTM_STRICT_RUNTIME=1 node "$ROOT/tools/pack_test_suite.mjs" >"$suite_log" 2>&1; then
  rg '^(pack test suite passed|ok - KubeJS recipe parse health|FAIL -|MUST -|SHOULD -)' "$suite_log" || true
else
  echo "content smoke: pack test suite failed; tail follows ($suite_log)" >&2
  tail -160 "$suite_log" >&2 || true
  exit 1
fi

echo "content smoke: passed"
echo "content smoke: evidence=$evidence_dir"
