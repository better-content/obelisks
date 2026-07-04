#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
TOOLS_COMPAT_DIR="$ROOT/tools/quarantine/original-tools"
# shellcheck source=tools/quarantine/original-tools/_runtime_common.sh
source "$TOOLS_COMPAT_DIR/_runtime_common.sh"

client_dir="${CLIENT_DIR:-}"
username="${CLIENT_USERNAME:-AgentClient}"
server="${SERVER_HOST:-127.0.0.1}:${SERVER_PORT:-$BTM_SERVER_PORT}"
extra_jvm="${EXTRA_JVM_ARGS:-}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") --client-dir PATH [--username NAME] [--server HOST:PORT]

Launches the Forge ${BTM_FORGE_COORD} client from a repo-managed game directory with
an offline local username and --server HOST:PORT.

The script intentionally does not use Prism. Run tools/quarantine/original-tools/bootstrap_client_runtime.sh
first to sync pack content, install the Forge client profile, and download pack mods.
USAGE
}

while (($#)); do
  case "$1" in
    --client-dir) client_dir="${2:-}"; [[ -n "$client_dir" ]] || btm_usage_error "--client-dir needs a path"; shift 2 ;;
    --username) username="${2:-}"; [[ -n "$username" ]] || btm_usage_error "--username needs a value"; shift 2 ;;
    --server) server="${2:-}"; [[ "$server" == *:* ]] || btm_usage_error "--server must be HOST:PORT"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) btm_usage_error "unknown argument: $1" ;;
  esac
done

[[ -n "$client_dir" ]] || btm_usage_error "--client-dir is required"
java_bin="$(btm_java17)"
version_id="${BTM_MC_VERSION}-forge-${BTM_FORGE_VERSION}"
version_json=""
for candidate in \
  "$client_dir/versions/$version_id/$version_id.json" \
  "$client_dir/versions/${BTM_FORGE_COORD}/${BTM_FORGE_COORD}.json"
do
  [[ -f "$candidate" ]] && {
    version_json="$candidate"
    break
  }
done

[[ -n "$version_json" ]] || {
  echo "ERROR: Forge client version JSON for $version_id was not found." >&2
  echo "Run: $TOOLS_COMPAT_DIR/bootstrap_client_runtime.sh --client-dir '$client_dir'" >&2
  exit 1
}

argfile="$client_dir/.runtime/launch-${version_id}.args"
mkdir -p "$client_dir/logs" "$client_dir/.runtime"
"$ROOT/tools/btm" internal minecraft-client-argfile --client-dir "$client_dir" --version-id "$version_id" --username "$username" --server "$server" --out "$argfile" >/dev/null

cd "$client_dir"

launch_cmd=("$java_bin")
if [[ -n "${extra_jvm:-}" ]]; then
  # shellcheck disable=SC2206
  extra_jvm_parts=(${extra_jvm})
  launch_cmd+=("${extra_jvm_parts[@]}")
fi
launch_cmd+=("@$argfile")

if [[ -n "${DISPLAY:-}" ]]; then
  exec "${launch_cmd[@]}"
fi

if command -v xvfb-run >/dev/null 2>&1; then
  exec xvfb-run -a "${launch_cmd[@]}"
fi

echo "ERROR: no DISPLAY is set and xvfb-run is unavailable; Forge client launch requires an X display or xvfb." >&2
echo "Install xvfb or run from a graphical session before using tools/quarantine/original-tools/launch_client_direct.sh." >&2
exit 4
