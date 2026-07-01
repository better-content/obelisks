#!/usr/bin/env bash
set -Eeuo pipefail

TOOL_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/quarantine/original-tools/_runtime_common.sh
source "$TOOL_ROOT/_runtime_common.sh"

server_dir="${SERVER_DIR:-$BTM_DEFAULT_SERVER_DIR}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--server-dir PATH] [--] [run.sh args...]

Launches a generated Forge dedicated server root with Java 17 forced into PATH.
Additional arguments are passed to Forge's generated run.sh. Defaults to nogui.
USAGE
}

while (($#)); do
  case "$1" in
    --server-dir) server_dir="${2:-}"; [[ -n "$server_dir" ]] || btm_usage_error "--server-dir needs a path"; shift 2 ;;
    --) shift; break ;;
    -h|--help) usage; exit 0 ;;
    *) break ;;
  esac
done

[[ -d "$server_dir" ]] || btm_usage_error "server directory does not exist: $server_dir"
[[ -x "$server_dir/run.sh" ]] || btm_usage_error "missing executable run.sh in $server_dir; run tools/bootstrap_server.sh first"

java_bin="$(btm_java17)"
java_dir="$(cd -- "$(dirname -- "$java_bin")" && pwd)"
if (($# == 0)); then
  set -- nogui
fi

cd "$server_dir"
PATH="$java_dir:$PATH" exec ./run.sh "$@"
