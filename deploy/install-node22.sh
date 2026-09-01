#!/usr/bin/env bash
# Installe Node.js 22 LTS (NodeSource) — à lancer une fois sur le VPS avec sudo.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Exécutez avec sudo: sudo bash deploy/install-node22.sh" >&2
  exit 1
fi

CURRENT="$(node -v 2>/dev/null || echo none)"
if [[ "${CURRENT}" == v22.* ]] || [[ "${CURRENT}" == v24.* ]]; then
  echo "Node déjà à jour: ${CURRENT}"
  exit 0
fi

echo "==> Installation Node.js 22 LTS (NodeSource)..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "==> Versions installées:"
node -v
npm -v

echo "==> Réinstallation PM2 global (utilisateur debian)..."
sudo -u debian npm install -g pm2@latest

echo "OK — Node $(node -v)"
