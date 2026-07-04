#!/usr/bin/env bash

BTM_MC_VERSION="${BTM_MC_VERSION:-1.20.1}"
BTM_FORGE_VERSION="${BTM_FORGE_VERSION:-47.4.13}"
BTM_FORGE_COORD="${BTM_MC_VERSION}-${BTM_FORGE_VERSION}"
BTM_SERVER_PORT="${BTM_SERVER_PORT:-25565}"
BTM_DEFAULT_CLIENT_DIR="${BTM_DEFAULT_CLIENT_DIR:-$PWD/.runtime/client}"
BTM_DEFAULT_SERVER_DIR="${BTM_DEFAULT_SERVER_DIR:-$PWD/server-instance}"

btm_repo_root() {
  local script_dir
  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  cd -- "$script_dir/.." && pwd
}

btm_usage_error() {
  echo "ERROR: $*" >&2
  exit 2
}

btm_need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: required command not found: $1" >&2
    exit 1
  }
}

btm_java17() {
  if [[ -n "${JAVA17:-}" && -x "${JAVA17:-}" ]]; then
    echo "$JAVA17"
    return 0
  fi
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
    "$JAVA_HOME/bin/java" -version 2>&1 | rg -q 'version "17\.|openjdk version "17\.' && {
      echo "$JAVA_HOME/bin/java"
      return 0
    }
  fi
  if command -v java >/dev/null 2>&1 && java -version 2>&1 | rg -q 'version "17\.|openjdk version "17\.'; then
    command -v java
    return 0
  fi
  for candidate in /usr/lib/jvm/*/bin/java "$HOME"/.gradle/jdks/*/bin/java "$HOME"/.jdks/*/bin/java; do
    [[ -x "$candidate" ]] || continue
    "$candidate" -version 2>&1 | rg -q 'version "17\.|openjdk version "17\.' || continue
    echo "$candidate"
    return 0
  done
  if [[ "${BTM_ALLOW_NON17_JAVA:-0}" == "1" ]] && command -v java >/dev/null 2>&1; then
    echo "WARN: Java 17 was not found; using $(command -v java) because BTM_ALLOW_NON17_JAVA=1." >&2
    command -v java
    return 0
  fi
  echo "ERROR: Java 17 was not found. Set JAVA17=/path/to/java or JAVA_HOME, or set BTM_ALLOW_NON17_JAVA=1 for a non-parity local smoke test." >&2
  return 1
}

btm_managed_paths=(
  "LICENSE"
  "coin.png"
  "config"
  "datapacks"
  "defaultconfigs"
  "globalresources"
  "index.toml"
  "kubejs"
  "mods"
  "pack.toml"
  "recipe-policies.yml"
  "resourcepacks"
  "shaderpacks"
)

btm_runtime_excludes=(
  ".codex"
  ".codex/***"
  ".git/***"
  ".idea/***"
  ".runtime/***"
  "server-instance/***"
  "server-template/***"
  "world/***"
  "saves/***"
  "logs/***"
  "crash-reports/***"
  "screenshots/***"
  "backups/***"
  "options.txt"
  "optionsof.txt"
  "servers.dat"
  "launcher_accounts.json"
  "launcher_profiles.json"
  "usercache.json"
  "usernamecache.json"
  "session.lock"
  "eula.txt"
)

btm_client_only_mod_globs=(
  "ambientsounds*"
  "mods/ambientsounds*"
  "bettergrassify*"
  "mods/bettergrassify*"
  "/configured*"
  "mods/configured*"
  "controllable*"
  "mods/controllable*"
  "controlling*"
  "mods/controlling*"
  "embeddium*"
  "mods/embeddium*"
  "emi*"
  "mods/emi*"
  "entityculling*"
  "mods/entityculling*"
  "hold-my-items*"
  "mods/hold-my-items*"
  "holdmyitems*"
  "mods/holdmyitems*"
  "mouse-tweaks*"
  "mods/mouse-tweaks*"
  "no-more-popups*"
  "mods/no-more-popups*"
  "no-recipe-book*"
  "mods/no-recipe-book*"
  "oculus*"
  "mods/oculus*"
  "presence-footsteps*"
  "mods/presence-footsteps*"
  "shoulder-surfing*"
  "mods/shoulder-surfing*"
  "sound-physics*"
  "mods/sound-physics*"
  "the-one-probe*"
  "mods/the-one-probe*"
  "true-darkness*"
  "mods/true-darkness*"
  "darkness*"
  "mods/darkness*"
)

btm_rsync_excludes() {
  local pattern
  for pattern in "${btm_runtime_excludes[@]}"; do
    printf -- '--exclude=%s\n' "$pattern"
  done
}

btm_rsync_server_excludes() {
  local pattern
  btm_rsync_excludes
  for pattern in "${btm_client_only_mod_globs[@]}"; do
    printf -- '--exclude=%s\n' "$pattern"
  done
}

btm_find_forge_installer() {
  local root="$1"
  local candidate
  for candidate in \
    "$root/server-instance/forge-${BTM_FORGE_COORD}-installer.jar" \
    "$root/server-template/forge-${BTM_FORGE_COORD}-installer.jar" \
    "$root/forge-${BTM_FORGE_COORD}-installer.jar"
  do
    [[ -f "$candidate" ]] && {
      echo "$candidate"
      return 0
    }
  done
  find "$root" -maxdepth 3 -type f -name "forge-${BTM_FORGE_COORD}-installer.jar" -print -quit 2>/dev/null
}

btm_write_local_server_properties() {
  local path="$1" port="${2:-$BTM_SERVER_PORT}"
  if [[ -f "$path" ]]; then
    cp "$path" "$path.bak.$(date +%Y%m%d-%H%M%S)"
  fi
  cat > "$path" <<EOF
allow-flight=true
difficulty=normal
enable-command-block=true
enable-query=false
enable-rcon=false
enforce-secure-profile=false
gamemode=survival
level-name=world
max-players=8
motd=Bound to Matter local agent runtime
online-mode=false
pvp=true
server-ip=
server-port=$port
simulation-distance=6
spawn-protection=0
view-distance=8
white-list=false
EOF
}
