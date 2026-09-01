#!/usr/bin/env bash
# Déploiement CapCut Studio via git pull (portal + option éditeur web).
set -euo pipefail

DOMAIN="capcut.guelichweb.store"
WEB_ROOT="/www/wwwroot/${DOMAIN}"
PORTAL_ROOT="/www/wwwroot/${DOMAIN}-portal"
REPO_DIR="${REPO_DIR:-/www/wwwroot/capcut.guelichweb.store-src}"
GIT_REMOTE="${GIT_REMOTE:-https://github.com/krissiankg/capcut.guelichweb.git}"
BRANCH="${BRANCH:-main}"
WITH_WEB="${WITH_WEB:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=use-node.sh
source "${SCRIPT_DIR}/use-node.sh"

echo "==> Node $(node -v) | npm $(npm -v)"
echo "==> Déploiement ${DOMAIN} (git pull)"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "==> Clone ${GIT_REMOTE} → ${REPO_DIR}"
  git clone --branch "${BRANCH}" "${GIT_REMOTE}" "${REPO_DIR}"
else
  echo "==> Git pull (${BRANCH})"
  cd "${REPO_DIR}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
fi

cd "${REPO_DIR}"

if [[ "${WITH_WEB}" == "1" ]]; then
  if [[ ! -f "${REPO_DIR}/pnpm-workspace.yaml" ]]; then
    echo "!! Monorepo OpenReel incomplet sur GitHub — build web ignoré." >&2
    echo "   Poussez pnpm-workspace.yaml + package.json racine, ou lancez WITH_WEB=0." >&2
  else
    echo "==> Build OpenReel (apps/web)..."
    if command -v pnpm >/dev/null 2>&1; then
      PNPM=pnpm
    else
      PNPM="npx pnpm@11.7.0"
    fi
    $PNPM install
    $PNPM build
    echo "==> Sync éditeur → ${WEB_ROOT}"
    rsync -a --delete "${REPO_DIR}/apps/web/dist/" "${WEB_ROOT}/"
  fi
else
  echo "==> Éditeur web inchangé (WITH_WEB=0). Dist actuel: ${WEB_ROOT}"
fi

echo "==> Build portal..."
cd "${REPO_DIR}/portal"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

echo "==> Sauvegarde .env et secrets monitoring..."
ENV_BACKUP=""
KUMA_BACKUP=""
if [[ -f "${PORTAL_ROOT}/.env" ]]; then
  ENV_BACKUP="$(mktemp)"
  cp "${PORTAL_ROOT}/.env" "${ENV_BACKUP}"
fi
if [[ -f "${PORTAL_ROOT}/deploy/monitoring/.kuma-admin.env" ]]; then
  KUMA_BACKUP="$(mktemp)"
  cp "${PORTAL_ROOT}/deploy/monitoring/.kuma-admin.env" "${KUMA_BACKUP}"
fi

echo "==> Sync portal → ${PORTAL_ROOT}"
rsync -a --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude 'deploy/monitoring/.kuma-admin.env' \
  --exclude 'deploy/monitoring/node_modules' \
  "${REPO_DIR}/portal/" "${PORTAL_ROOT}/"

if [[ -n "${ENV_BACKUP}" ]]; then
  cp "${ENV_BACKUP}" "${PORTAL_ROOT}/.env"
  rm -f "${ENV_BACKUP}"
fi
if [[ -n "${KUMA_BACKUP}" ]]; then
  mkdir -p "${PORTAL_ROOT}/deploy/monitoring"
  cp "${KUMA_BACKUP}" "${PORTAL_ROOT}/deploy/monitoring/.kuma-admin.env"
  chmod 600 "${PORTAL_ROOT}/deploy/monitoring/.kuma-admin.env"
  rm -f "${KUMA_BACKUP}"
fi

echo "==> Dépendances production portal..."
cd "${PORTAL_ROOT}"
npm install --omit=dev

echo "==> Nginx vhost (si mis à jour)..."
NGINX_CONF="/www/server/panel/vhost/nginx/${DOMAIN}.conf"
if [[ -f "${REPO_DIR}/deploy/capcut.guelichweb.store.conf" ]]; then
  if ! cmp -s "${REPO_DIR}/deploy/capcut.guelichweb.store.conf" "${NGINX_CONF}" 2>/dev/null; then
    sudo cp "${REPO_DIR}/deploy/capcut.guelichweb.store.conf" "${NGINX_CONF}"
    sudo nginx -t && (sudo /www/server/nginx/sbin/nginx -s reload 2>/dev/null || sudo nginx -s reload)
  fi
fi

echo "==> PM2 capcut-portal..."
NODE_BIN="$(command -v node)"
if pm2 describe capcut-portal >/dev/null 2>&1; then
  pm2 delete capcut-portal 2>/dev/null || true
fi
pm2 start dist/server.js \
  --name capcut-portal \
  --cwd "${PORTAL_ROOT}" \
  --interpreter "${NODE_BIN}"
pm2 save

echo "==> Monitoring Docker (Uptime Kuma)..."
if [[ -f "${PORTAL_ROOT}/deploy/monitoring/docker-compose.yml" ]]; then
  cd "${PORTAL_ROOT}/deploy/monitoring"
  sudo docker compose up -d 2>/dev/null || sudo docker-compose up -d 2>/dev/null || true
fi

echo "==> Health check..."
sleep 2
HEALTH="$(curl -sf "http://127.0.0.1:3011/api/health" || true)"
if [[ "${HEALTH}" == *'"status":"ok"'* ]]; then
  echo "OK — portal healthy: ${HEALTH}"
else
  echo "!! Health check échoué: ${HEALTH:-empty}" >&2
  pm2 logs capcut-portal --lines 20 --nostream || true
  exit 1
fi

echo "OK — https://${DOMAIN}/ (portal déployé depuis ${REPO_DIR} @ $(git -C "${REPO_DIR}" rev-parse --short HEAD))"
