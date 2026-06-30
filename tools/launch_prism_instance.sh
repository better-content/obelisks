#!/usr/bin/env bash
set -Eeuo pipefail

PRISM_ROOT="${PRISM_ROOT:-${HOME}/.local/share/PrismLauncher}"
PRISM_BIN="${PRISM_BIN:-}"

if [[ -z "$PRISM_BIN" ]]; then
  if command -v prismlauncher >/dev/null 2>&1; then
    PRISM_BIN="$(command -v prismlauncher)"
  elif [[ -x "${HOME}/PrismLauncher-Linux-x86_64.AppImage" ]]; then
    PRISM_BIN="${HOME}/PrismLauncher-Linux-x86_64.AppImage"
  else
    echo "ERROR: set PRISM_BIN to PrismLauncher's executable/AppImage" >&2
    exit 1
  fi
fi

instances_dir="${PRISM_ROOT}/instances"
if [[ ! -d "$instances_dir" ]]; then
  echo "ERROR: Prism instances dir not found: $instances_dir" >&2
  exit 1
fi

list_instances() {
  find "$instances_dir" -mindepth 1 -maxdepth 1 -type d ! -name '.tmp' -printf '%f\n' | sort | while read -r id; do
    local cfg="${instances_dir}/${id}/instance.cfg"
    local name="$id"
    if [[ -f "$cfg" ]]; then
      name="$(sed -n 's/^name=//p' "$cfg" | head -n1)"
      [[ -n "$name" ]] || name="$id"
    fi
    printf '%-48s %s\n' "$id" "$name"
  done
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") [list|INSTANCE_QUERY] [-- extra Prism args]

Environment:
  PRISM_ROOT   Prism data root. Default: ${HOME}/.local/share/PrismLauncher
  PRISM_BIN    Prism executable/AppImage. Default: PATH prismlauncher or ~/PrismLauncher-Linux-x86_64.AppImage

Examples:
  tools/launch_prism_instance.sh list
  tools/launch_prism_instance.sh "Better Content"
  tools/launch_prism_instance.sh "Better Content" -- --offline Dev
USAGE
}

if [[ "${1:-}" == "" || "${1:-}" == "list" ]]; then
  list_instances
  exit 0
fi
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

query="$1"
shift || true
if [[ "${1:-}" == "--" ]]; then
  shift
fi

mapfile -t ids < <(find "$instances_dir" -mindepth 1 -maxdepth 1 -type d ! -name '.tmp' -printf '%f\n' | sort)

matches=()
for id in "${ids[@]}"; do
  if [[ "$id" == "$query" ]]; then
    matches=("$id")
    break
  fi
  cfg="${instances_dir}/${id}/instance.cfg"
  name=""
  [[ -f "$cfg" ]] && name="$(sed -n 's/^name=//p' "$cfg" | head -n1)"
  if [[ "$name" == "$query" ]]; then
    matches=("$id")
    break
  fi
done

if (( ${#matches[@]} == 0 )); then
  q_lower="${query,,}"
  for id in "${ids[@]}"; do
    cfg="${instances_dir}/${id}/instance.cfg"
    name=""
    [[ -f "$cfg" ]] && name="$(sed -n 's/^name=//p' "$cfg" | head -n1)"
    haystack="${id} ${name}"
    if [[ "${haystack,,}" == *"$q_lower"* ]]; then
      matches+=("$id")
    fi
  done
fi

if (( ${#matches[@]} == 0 )); then
  echo "ERROR: no Prism instance matches: $query" >&2
  echo >&2
  list_instances >&2
  exit 1
fi
if (( ${#matches[@]} > 1 )); then
  echo "ERROR: multiple Prism instances match: $query" >&2
  printf '  %s\n' "${matches[@]}" >&2
  exit 1
fi

exec "$PRISM_BIN" --dir "$PRISM_ROOT" --launch "${matches[0]}" "$@"
