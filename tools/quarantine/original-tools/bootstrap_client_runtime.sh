#!/usr/bin/env bash
set -Eeuo pipefail

TOOL_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$TOOL_ROOT/../../.." && pwd)"
SHIM_ROOT="$REPO_ROOT/tools/quarantine/pruned-non-kts/compat-shims"
# shellcheck source=tools/quarantine/original-tools/_runtime_common.sh
source "$TOOL_ROOT/_runtime_common.sh"

client_dir="${CLIENT_DIR:-}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") --client-dir PATH

Creates/syncs a repo-managed client game directory for direct local tests.
This does not touch Prism instances or player client roots. It prepares managed pack
content and copies the Forge installer so tools/launch_client_direct.sh can use the
local Forge/Minecraft libraries already present on this machine or installed later.
USAGE
}

while (($#)); do
  case "$1" in
    --client-dir) client_dir="${2:-}"; [[ -n "$client_dir" ]] || btm_usage_error "--client-dir needs a path"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) btm_usage_error "unknown argument: $1" ;;
  esac
done

[[ -n "$client_dir" ]] || btm_usage_error "--client-dir is required"

mkdir -p "$client_dir"/{logs,saves,versions,libraries,assets}
"$TOOL_ROOT/sync_to_client.sh" --apply --client-dir "$client_dir"

prism_root="${BTM_PRISM_ROOT:-$HOME/.local/share/PrismLauncher}"
forge_client_id="${BTM_MC_VERSION}-forge-${BTM_FORGE_VERSION}"
if [[ -d "$prism_root/libraries" && ! -L "$client_dir/libraries" ]]; then
  rm -rf "$client_dir/libraries"
  ln -s "$prism_root/libraries" "$client_dir/libraries"
fi
if [[ -d "$prism_root/assets" && ! -L "$client_dir/assets" ]]; then
  rm -rf "$client_dir/assets"
  ln -s "$prism_root/assets" "$client_dir/assets"
fi
if [[ -f "$prism_root/meta/net.minecraft/${BTM_MC_VERSION}.json" ]]; then
  mkdir -p "$client_dir/versions/${BTM_MC_VERSION}"
  cp "$prism_root/meta/net.minecraft/${BTM_MC_VERSION}.json" "$client_dir/versions/${BTM_MC_VERSION}/${BTM_MC_VERSION}.json"
fi
if [[ -f "$prism_root/libraries/com/mojang/minecraft/${BTM_MC_VERSION}/minecraft-${BTM_MC_VERSION}-client.jar" ]]; then
  mkdir -p "$client_dir/versions/${BTM_MC_VERSION}"
  ln -sf "$prism_root/libraries/com/mojang/minecraft/${BTM_MC_VERSION}/minecraft-${BTM_MC_VERSION}-client.jar" "$client_dir/versions/${BTM_MC_VERSION}/${BTM_MC_VERSION}.jar"
fi
if [[ ! -f "$client_dir/versions/${BTM_MC_VERSION}/${BTM_MC_VERSION}.json" ]]; then
  mkdir -p "$client_dir/versions/${BTM_MC_VERSION}"
  python3 - "$client_dir/versions/${BTM_MC_VERSION}/${BTM_MC_VERSION}.json" "$BTM_MC_VERSION" <<'PY'
import json
import sys
import urllib.request

dest, version = sys.argv[1], sys.argv[2]
with urllib.request.urlopen("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json") as resp:
    manifest = json.load(resp)
entry = next((item for item in manifest.get("versions", []) if item.get("id") == version), None)
if entry is None:
    raise SystemExit(f"missing version metadata in Mojang manifest: {version}")
with urllib.request.urlopen(entry["url"]) as resp:
    version_json = json.load(resp)
with open(dest, "w", encoding="utf-8") as fh:
    json.dump(version_json, fh, indent=2)
    fh.write("\n")
PY
fi
if [[ -f "$prism_root/meta/net.minecraftforge/${BTM_FORGE_VERSION}.json" ]]; then
  mkdir -p "$client_dir/versions/${forge_client_id}"
  node --input-type=module - "$prism_root/meta/net.minecraftforge/${BTM_FORGE_VERSION}.json" "$client_dir/versions/${forge_client_id}/${forge_client_id}.json" "$BTM_MC_VERSION" "$forge_client_id" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs'
const [src, dest, mcVersion, versionId] = process.argv.slice(2)
const forge = JSON.parse(readFileSync(src, 'utf8'))
const out = {
  id: versionId,
  inheritsFrom: mcVersion,
  type: 'release',
  mainClass: forge.mainClass,
  minecraftArguments: forge.minecraftArguments,
  libraries: forge.libraries || [],
}
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n')
NODE
fi

for jar_cache in "$REPO_ROOT/server-template/mods" "$REPO_ROOT/server-instance/mods"; do
  [[ -d "$jar_cache" ]] || continue
  [[ "$(cd "$jar_cache" && pwd)" == "$(cd "$client_dir/mods" 2>/dev/null && pwd)" ]] && continue
  if btm_have rsync; then
    rsync -a --ignore-existing --include='*/' --include='*.jar' --include='*.so' --exclude='*' "$jar_cache/" "$client_dir/mods/"
  fi
done

installer="$(btm_find_forge_installer "$REPO_ROOT")"
if [[ -n "$installer" && -f "$installer" ]]; then
  java_bin="$(btm_java17)"
  cp "$installer" "$client_dir/forge-${BTM_FORGE_COORD}-installer.jar"
  mkdir -p "$client_dir/versions/${forge_client_id}"
  unzip -p "$client_dir/forge-${BTM_FORGE_COORD}-installer.jar" version.json > "$client_dir/versions/${forge_client_id}/${forge_client_id}.json"
  if [[ ! -f "$client_dir/launcher_profiles.json" ]]; then
    cat > "$client_dir/launcher_profiles.json" <<'EOF'
{"profiles":{},"settings":{},"version":3}
EOF
  fi
  if [[ ! -f "$client_dir/libraries/net/minecraftforge/forge/${BTM_FORGE_COORD}/forge-${BTM_FORGE_COORD}-client.jar" ]]; then
    "$java_bin" -jar "$client_dir/forge-${BTM_FORGE_COORD}-installer.jar" --installClient "$client_dir"
  fi
fi

if [[ "${BTM_SKIP_PACKWIZ_DOWNLOADS:-0}" != "1" ]]; then
  node "$SHIM_ROOT/resolve_packwiz_downloads.mjs" --apply --target-dir "$client_dir" --side client
fi

node "$SHIM_ROOT/prune_runtime_mods.mjs" --apply --target-dir "$client_dir" --side client

cat > "$client_dir/README.agent-runtime.txt" <<EOF
Better Content direct client runtime

Minecraft: ${BTM_MC_VERSION}
Forge: ${BTM_FORGE_VERSION}

Managed content is synced from:
  $REPO_ROOT

Launch through:
  $TOOL_ROOT/launch_client_direct.sh --client-dir "$client_dir" --username AgentClient --server 127.0.0.1:${BTM_SERVER_PORT}

This directory is runtime state. Do not commit saves, logs, screenshots, options,
account files, assets, libraries, or downloaded versions.
EOF

echo "Bootstrapped client runtime: $client_dir"
