#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=tools/_runtime_common.sh
source "$ROOT/tools/_runtime_common.sh"

mode=""
server_dir="${SERVER_DIR:-$BTM_DEFAULT_SERVER_DIR}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") --dry-run|--apply [--server-dir PATH]

Syncs repo-managed pack source into a dedicated server root.
Preserves runtime state such as world, logs, crash reports, user caches, and player data.
USAGE
}

while (($#)); do
  case "$1" in
    --dry-run|--apply) mode="$1"; shift ;;
    --server-dir) server_dir="${2:-}"; [[ -n "$server_dir" ]] || btm_usage_error "--server-dir needs a path"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) btm_usage_error "unknown argument: $1" ;;
  esac
done

[[ -n "$mode" ]] || btm_usage_error "choose --dry-run or --apply"
btm_need rsync

mkdir -p "$server_dir"
mapfile -t excludes < <(btm_rsync_server_excludes)
rsync_flags=(-a --delete --prune-empty-dirs)
[[ "$mode" == "--dry-run" ]] && rsync_flags+=(--dry-run --itemize-changes)

for path in "${btm_managed_paths[@]}"; do
  [[ -e "$ROOT/$path" ]] || continue
  if [[ -d "$ROOT/$path" ]]; then
    mkdir -p "$server_dir/$path"
    rsync "${rsync_flags[@]}" "${excludes[@]}" "$ROOT/$path/" "$server_dir/$path/"
  else
    mkdir -p "$server_dir/$(dirname "$path")"
    rsync "${rsync_flags[@]}" "${excludes[@]}" "$ROOT/$path" "$server_dir/$path"
  fi
done

if [[ "$mode" == "--dry-run" ]]; then
  echo "Dry run complete for server target: $server_dir"
else
  echo "Synced server target: $server_dir"
fi
