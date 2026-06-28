#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=tools/_runtime_common.sh
source "$ROOT/tools/_runtime_common.sh"

packwiz_bin="${PACKWIZ:-}"
exports_dir="$ROOT/generated/exports"
server_tree_dir="$exports_dir/server-tree/bound-to-matter-server"
client_cf_zip="$exports_dir/bound-to-matter-playtest-4-v1-curseforge.zip"
server_cf_zip="$exports_dir/bound-to-matter-playtest-4-v1-server-curseforge.zip"
client_alias_zip="$exports_dir/bound-to-matter-curseforge.zip"
server_tree_zip="$exports_dir/bound-to-matter-playtest-4-v1-server.zip"
skip_cf=0
skip_server_tree=0
server_tree_dir_custom=0
server_tree_zip_custom=0

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options]

Builds distributable pack bundles:
  - client CurseForge pack zip
  - server CurseForge manifest zip
  - complete runnable server tree zip

Options:
  --exports-dir PATH       Output directory (default: generated/exports)
  --server-tree-dir PATH   Staging directory for the complete server tree
  --server-zip PATH        Complete server tree zip path
  --skip-cf               Do not export CurseForge manifest zips
  --skip-server-tree      Do not build the complete server tree
  -h, --help              Show this help

Set PACKWIZ=/path/to/packwiz to override packwiz discovery.
USAGE
}

while (($#)); do
  case "$1" in
    --exports-dir) exports_dir="${2:-}"; [[ -n "$exports_dir" ]] || btm_usage_error "--exports-dir needs a path"; shift 2 ;;
    --server-tree-dir) server_tree_dir="${2:-}"; [[ -n "$server_tree_dir" ]] || btm_usage_error "--server-tree-dir needs a path"; server_tree_dir_custom=1; shift 2 ;;
    --server-zip) server_tree_zip="${2:-}"; [[ -n "$server_tree_zip" ]] || btm_usage_error "--server-zip needs a path"; server_tree_zip_custom=1; shift 2 ;;
    --skip-cf) skip_cf=1; shift ;;
    --skip-server-tree) skip_server_tree=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) btm_usage_error "unknown argument: $1" ;;
  esac
done

client_cf_zip="$exports_dir/bound-to-matter-playtest-4-v1-curseforge.zip"
server_cf_zip="$exports_dir/bound-to-matter-playtest-4-v1-server-curseforge.zip"
client_alias_zip="$exports_dir/bound-to-matter-curseforge.zip"
if [[ "$server_tree_dir_custom" != "1" ]]; then
  server_tree_dir="$exports_dir/server-tree/bound-to-matter-server"
fi
if [[ "$server_tree_zip_custom" != "1" ]]; then
  server_tree_zip="$exports_dir/bound-to-matter-playtest-4-v1-server.zip"
fi

if [[ -z "$packwiz_bin" ]]; then
  if command -v packwiz >/dev/null 2>&1; then
    packwiz_bin="$(command -v packwiz)"
  elif [[ -x "$HOME/go/bin/packwiz" ]]; then
    packwiz_bin="$HOME/go/bin/packwiz"
  fi
fi

[[ -n "$packwiz_bin" && -x "$packwiz_bin" ]] || {
  echo "ERROR: packwiz not found. Set PACKWIZ=/path/to/packwiz." >&2
  exit 1
}

java_bin="$(btm_java17)"
btm_need curl
btm_need python3

mkdir -p "$exports_dir"

export_curseforge_zips() {
  "$packwiz_bin" curseforge export -o "$client_cf_zip" -s client -y
  "$packwiz_bin" curseforge export -o "$server_cf_zip" -s server -y
  "$packwiz_bin" curseforge export -o "$client_alias_zip" -s client -y
}

copy_managed_source() {
  local src dst path
  for path in "${btm_managed_paths[@]}"; do
    src="$ROOT/$path"
    dst="$server_tree_dir/$path"
    [[ -e "$src" ]] || continue
    mkdir -p "$(dirname "$dst")"
    cp -a "$src" "$dst"
  done
}

install_forge_server() {
  local installer source_installer
  installer="$server_tree_dir/forge-${BTM_FORGE_COORD}-installer.jar"
  source_installer="$(btm_find_forge_installer "$ROOT")"
  if [[ -n "$source_installer" && -f "$source_installer" ]]; then
    cp "$source_installer" "$installer"
  else
    curl -fL --retry 3 -o "$installer" \
      "https://maven.minecraftforge.net/net/minecraftforge/forge/${BTM_FORGE_COORD}/forge-${BTM_FORGE_COORD}-installer.jar"
  fi
  (cd "$server_tree_dir" && "$java_bin" -jar "$(basename "$installer")" --installServer)
}

write_server_bundle_notes() {
  cat > "$server_tree_dir/SERVER_README.txt" <<EOF
Bound to Matter complete server bundle

Minecraft: ${BTM_MC_VERSION}
Forge: ${BTM_FORGE_VERSION}

Before first launch:
1. Review eula.txt and set eula=true if you accept Mojang's EULA.
2. Optionally edit server.properties and user_jvm_args.txt.
3. Start with: ./run.sh nogui

This bundle is generated from the repository source plus server-side packwiz downloads.
EOF

  cat > "$server_tree_dir/eula.txt" <<'EOF'
eula=false
EOF

  btm_write_local_server_properties "$server_tree_dir/server.properties" "$BTM_SERVER_PORT"

  cat > "$server_tree_dir/user_jvm_args.txt" <<'EOF'
-Xms2G
-Xmx6G
-XX:+UseG1GC
-Dfile.encoding=UTF-8
EOF
}

build_server_tree() {
  rm -rf "$server_tree_dir"
  mkdir -p "$server_tree_dir"
  copy_managed_source
  "$ROOT/tools/resolve_packwiz_downloads.mjs" --apply --pack-root "$ROOT" --target-dir "$server_tree_dir" --side server
  "$ROOT/tools/prune_runtime_mods.mjs" --apply --pack-root "$ROOT" --target-dir "$server_tree_dir" --side server
  install_forge_server
  rm -f "$server_tree_dir/forge-${BTM_FORGE_COORD}-installer.jar" "$server_tree_dir/installer.log"
  rm -rf "$server_tree_dir/world" "$server_tree_dir/logs" "$server_tree_dir/crash-reports"
  write_server_bundle_notes

  export BTM_SERVER_TREE_DIR="$server_tree_dir"
  export BTM_SERVER_TREE_ZIP="$server_tree_zip"
  rm -f "$server_tree_zip"
  mkdir -p "$(dirname "$server_tree_zip")"
  python3 - <<'PY'
import os
import zipfile
from pathlib import Path

tree = Path(os.environ["BTM_SERVER_TREE_DIR"]).resolve()
out = Path(os.environ["BTM_SERVER_TREE_ZIP"]).resolve()
base = tree.parent
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for path in sorted(tree.rglob("*")):
        arcname = path.relative_to(base).as_posix()
        if path.is_dir():
            zinfo = zipfile.ZipInfo(f"{arcname}/")
            zf.writestr(zinfo, b"")
        else:
            zf.write(path, arcname)
PY
  echo "Complete server tree exported to $server_tree_zip"
}

if [[ "$skip_cf" != "1" ]]; then
  export_curseforge_zips
fi

if [[ "$skip_server_tree" != "1" ]]; then
  build_server_tree
fi
