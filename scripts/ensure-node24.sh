#!/usr/bin/env bash
# Prepend Node from .nvmrc; strip Cursor bundled node from PATH (EBADENGINE on v20).
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
unset npm_config_prefix 2>/dev/null || true
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm not found at $NVM_DIR — install Node $(cat .nvmrc 2>/dev/null || echo 24)+ (see .nvmrc)" >&2
  exit 1
fi
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
WANTED="$(tr -d ' \r\n' < .nvmrc)"
nvm install "$WANTED" >/dev/null 2>&1 || true
nvm use "$WANTED" >/dev/null
if [[ "$WANTED" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  VER="v${WANTED#v}"
else
  VER="$(ls -d "${NVM_DIR}/versions/node/v${WANTED}"* 2>/dev/null | sort -V | tail -1)"
  VER="${VER##*/}"
fi
NODE_BIN="${NVM_DIR}/versions/node/${VER}/bin"
if [[ ! -x "${NODE_BIN}/node" ]]; then
  echo "Node ${VER} not installed — run: nvm install ${WANTED}" >&2
  exit 1
fi
CLEAN_PATH=""
IFS=':' read -ra PARTS <<< "$PATH"
for p in "${PARTS[@]}"; do
  [[ "$p" == *cursor-server* ]] && continue
  CLEAN_PATH+="${p}:"
done
export PATH="${NODE_BIN}:${CLEAN_PATH%:}"
MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$MAJOR" -lt 24 ]]; then
  echo "Node $(node -v) < engines.node (>=24). PATH head: $(which node)" >&2
  exit 1
fi
