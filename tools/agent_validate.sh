#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=tools/_runtime_common.sh
source "$ROOT/tools/_runtime_common.sh"

tier=""
instance="${BTM_INSTANCE:-}"
instance_arg=0
server_dir="${SERVER_DIR:-/tmp/btm-agent-validate-smoke}"
server_dir_arg=0
port="$BTM_SERVER_PORT"
port_arg=0
reset=0
strict_data_dumps=0

btm_validate_jobs() {
  if [[ -n "${BTM_VALIDATE_JOBS:-}" ]]; then
    [[ "$BTM_VALIDATE_JOBS" =~ ^[0-9]+$ && "$BTM_VALIDATE_JOBS" -gt 0 ]] || btm_usage_error "BTM_VALIDATE_JOBS must be a positive integer"
    echo "$BTM_VALIDATE_JOBS"
    return 0
  fi
  if command -v nproc >/dev/null 2>&1; then
    nproc
  else
    echo 4
  fi
}

run_named_check() {
  local name="$1"
  shift
  echo "agent validate: check=$name"
  "$@"
}

run_static_validators() {
  local tmpdir pids names statuses i status failed
  tmpdir="$(mktemp -d)"
  pids=()
  names=()
  statuses=()
  failed=0

  cleanup_static_validators() {
    local pid
    for pid in "${pids[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
    rm -rf "$tmpdir"
  }
  trap cleanup_static_validators RETURN INT TERM

  run_named_check pack_contract node "$ROOT/tools/validate_pack_contract.mjs" >"$tmpdir/0.log" 2>&1 &
  pids+=("$!")
  names+=("pack_contract")

  run_named_check contract_completeness node "$ROOT/tools/contract_completeness_report.mjs" --check --no-write >"$tmpdir/1.log" 2>&1 &
  pids+=("$!")
  names+=("contract_completeness")

  run_named_check autonomous_contracts env BTM_INSTANCE= node "$ROOT/tools/validate_autonomous_contracts.mjs" >"$tmpdir/2.log" 2>&1 &
  pids+=("$!")
  names+=("autonomous_contracts")

  run_named_check kubejs_assets node "$ROOT/tools/validate_kubejs_assets.mjs" >"$tmpdir/3.log" 2>&1 &
  pids+=("$!")
  names+=("kubejs_assets")

  run_named_check chemistry_identity node "$ROOT/tools/validate_chemistry_identity.mjs" >"$tmpdir/4.log" 2>&1 &
  pids+=("$!")
  names+=("chemistry_identity")

  run_named_check synthesis_pipeline node "$ROOT/tools/validate_synthesis_pipeline.mjs" >"$tmpdir/5.log" 2>&1 &
  pids+=("$!")
  names+=("synthesis_pipeline")

  run_named_check player_progression node "$ROOT/tools/validate_player_progression_contracts.mjs" >"$tmpdir/6.log" 2>&1 &
  pids+=("$!")
  names+=("player_progression")

  run_named_check progression_reachability node "$ROOT/tools/validate_progression_reachability.mjs" >"$tmpdir/7.log" 2>&1 &
  pids+=("$!")
  names+=("progression_reachability")

  run_named_check burnt_coverage node "$ROOT/tools/validate_burnt_coverage.mjs" >"$tmpdir/8.log" 2>&1 &
  pids+=("$!")
  names+=("burnt_coverage")

  set +e
  for i in "${!pids[@]}"; do
    wait "${pids[$i]}"
    statuses[$i]=$?
  done
  set -e

  for i in "${!names[@]}"; do
    cat "$tmpdir/$i.log"
    status="${statuses[$i]}"
    if [[ "$status" != "0" ]]; then
      echo "FAIL - static validator ${names[$i]} exited $status" >&2
      failed=1
    fi
  done

  rm -rf "$tmpdir"
  trap - RETURN INT TERM
  [[ "$failed" == "0" ]]
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") --static
       $(basename "$0") --runtime --instance PATH [--strict-data-dumps]
       $(basename "$0") --smoke [--server-dir PATH] [--port PORT] [--reset-runtime]

Agent-oriented validation entry point with explicit evidence strength:
  --static   Source and retained-dump contract/syntax/asset checks. No fresh runtime pass claim.
  --runtime  Strictly validate an existing fresh runtime's logs and KubeJS dumps.
  --smoke    Bootstrap a disposable server, boot it, scan logs, and run strict runtime checks.

Runtime data evidence:
  --strict-data-dumps requires vanilla /dump output such as dump/data_raw/loot_tables.
  It is intentionally separate from KubeJS audit dumps generated under kubejs/config.

Environment:
  BTM_INSTANCE can provide --runtime's instance path.
  BTM_VALIDATE_JOBS=N caps parallel JS syntax-check workers.
USAGE
}

while (($#)); do
  case "$1" in
    --static|--runtime|--smoke)
      [[ -z "$tier" ]] || btm_usage_error "choose exactly one tier"
      tier="${1#--}"
      shift
      ;;
    --instance)
      instance="${2:-}"
      [[ -n "$instance" ]] || btm_usage_error "--instance needs a path"
      instance_arg=1
      shift 2
      ;;
    --server-dir)
      server_dir="${2:-}"
      [[ -n "$server_dir" ]] || btm_usage_error "--server-dir needs a path"
      server_dir_arg=1
      shift 2
      ;;
    --port)
      port="${2:-}"
      [[ "$port" =~ ^[0-9]+$ ]] || btm_usage_error "--port needs a number"
      port_arg=1
      shift 2
      ;;
    --reset-runtime)
      reset=1
      shift
      ;;
    --strict-data-dumps)
      strict_data_dumps=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      btm_usage_error "unknown argument: $1"
      ;;
  esac
done

[[ -n "$tier" ]] || btm_usage_error "choose --static, --runtime, or --smoke"

case "$tier" in
  static)
    [[ "$instance_arg" == "0" ]] || btm_usage_error "--instance is only valid with --runtime"
    [[ "$server_dir_arg" == "0" ]] || btm_usage_error "--server-dir is only valid with --smoke"
    [[ "$port_arg" == "0" ]] || btm_usage_error "--port is only valid with --smoke"
    [[ "$reset" == "0" ]] || btm_usage_error "--reset-runtime is only valid with --smoke"
    [[ "$strict_data_dumps" == "0" ]] || btm_usage_error "--strict-data-dumps is only valid with --runtime"
    ;;
  runtime)
    [[ "$server_dir_arg" == "0" ]] || btm_usage_error "--server-dir is only valid with --smoke"
    [[ "$port_arg" == "0" ]] || btm_usage_error "--port is only valid with --smoke"
    [[ "$reset" == "0" ]] || btm_usage_error "--reset-runtime is only valid with --smoke"
    ;;
  smoke)
    [[ "$instance_arg" == "0" ]] || btm_usage_error "--instance is only valid with --runtime"
    [[ "$strict_data_dumps" == "0" ]] || btm_usage_error "--strict-data-dumps is only valid with --runtime"
    ;;
esac

run_static() {
  echo "agent validate: tier=static"
  local jobs
  jobs="$(btm_validate_jobs)"
  (cd "$ROOT" && rg --files kubejs tools | rg '\.(js|mjs)$' | tr '\n' '\0' | xargs -0 -r -n 1 -P "$jobs" node --check >/dev/null)
  mapfile -t json_files < <(cd "$ROOT" && {
    rg --files kubejs/data config/classselector 2>/dev/null || true
    printf '%s\n' kubejs/config/btm_expert_graph_catalog.json
  } | rg '\.json$')
  node -e "
const fs = require('fs')
let failures = 0
for (const file of process.argv.slice(1)) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    failures++
    console.error(file + ': ' + error.message)
  }
}
process.exit(failures ? 1 : 0)
" "${json_files[@]/#/$ROOT/}"
  run_static_validators
  echo "agent validate: static passed"
  echo "agent validate: claim=source and retained-dump evidence; no fresh runtime evidence was proven"
}

run_runtime() {
  [[ -n "$instance" ]] || btm_usage_error "--runtime needs --instance PATH or BTM_INSTANCE"
  [[ -d "$instance" ]] || btm_usage_error "runtime instance does not exist: $instance"
  echo "agent validate: tier=runtime instance=$instance strict_data_dumps=$strict_data_dumps"
  if [[ "$strict_data_dumps" == "1" ]]; then
    BTM_INSTANCE="$instance" BTM_STRICT_RUNTIME=1 BTM_STRICT_DATA_DUMPS=1 node "$ROOT/tools/pack_test_suite.mjs"
  else
    BTM_INSTANCE="$instance" BTM_STRICT_RUNTIME=1 node "$ROOT/tools/pack_test_suite.mjs"
  fi
  echo "agent validate: runtime passed"
  echo "agent validate: claim=strict runtime evidence; data dumps strict=$strict_data_dumps"
}

run_smoke() {
  echo "agent validate: tier=smoke server_dir=$server_dir port=$port reset=$reset"
  args=(--server-dir "$server_dir" --port "$port")
  [[ "$reset" == "1" ]] && args+=(--reset-runtime)
  "$ROOT/tools/server_content_smoke.sh" "${args[@]}"
  echo "agent validate: smoke passed"
  echo "agent validate: claim=fresh boot plus strict runtime evidence"
}

case "$tier" in
  static) run_static ;;
  runtime) run_runtime ;;
  smoke) run_smoke ;;
  *) btm_usage_error "unknown tier: $tier" ;;
esac
