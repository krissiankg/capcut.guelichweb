#!/usr/bin/env bash
# Active Node.js 22+ pour les builds et PM2 (aaPanel ou NodeSource).
set -euo pipefail

if [[ -x /www/server/nodejs/v24.16.0/bin/node ]]; then
  export PATH="/www/server/nodejs/v24.16.0/bin:${PATH}"
elif [[ -x /usr/local/bin/node ]] && /usr/local/bin/node -v | grep -qE '^v2[2-9]'; then
  export PATH="/usr/local/bin:${PATH}"
elif command -v node >/dev/null 2>&1 && node -v | grep -qE '^v2[2-9]'; then
  :
else
  echo "!! Node 22+ introuvable. Lancez: sudo bash deploy/install-node22.sh" >&2
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"
