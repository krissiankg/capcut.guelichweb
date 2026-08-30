#!/usr/bin/env bash
# Déploiement CapCut Studio (OpenReel + portal auth) sur aaPanel / Nginx
set -euo pipefail

DOMAIN="capcut.guelichweb.store"
WEB_ROOT="/www/wwwroot/${DOMAIN}"
PORTAL_ROOT="/www/wwwroot/${DOMAIN}-portal"
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PORTAL_PORT=3011

echo "==> Déploiement ${DOMAIN}"

sudo mkdir -p "${WEB_ROOT}" "${PORTAL_ROOT}"

echo "==> Build OpenReel (apps/web)..."
cd "${REPO_DIR}"
if command -v pnpm >/dev/null 2>&1; then
  PNPM=pnpm
else
  PNPM="npx pnpm@11.7.0"
fi
$PNPM install
$PNPM build

echo "==> Copie dist OpenReel..."
sudo rsync -a --delete "${REPO_DIR}/apps/web/dist/" "${WEB_ROOT}/"

echo "==> Build portal..."
cd "${REPO_DIR}/portal"
npm install
npm run build
sudo rsync -a --delete \
  --exclude node_modules \
  --exclude .env \
  "${REPO_DIR}/portal/" "${PORTAL_ROOT}/"
cd "${PORTAL_ROOT}"
sudo npm install --omit=dev

if [[ ! -f "${PORTAL_ROOT}/.env" ]]; then
  echo "!! Créez ${PORTAL_ROOT}/.env à partir de .env.example"
  sudo cp "${PORTAL_ROOT}/.env.example" "${PORTAL_ROOT}/.env"
fi

echo "==> Migration Supabase (manuel si besoin) :"
echo "    psql ou Studio : ${REPO_DIR}/supabase/migrations/001_capcut.sql"

echo "==> PM2 portal..."
cd "${PORTAL_ROOT}"
pm2 delete capcut-portal 2>/dev/null || true
pm2 start dist/server.js --name capcut-portal --cwd "${PORTAL_ROOT}"
pm2 save

echo "==> Nginx vhost..."
sudo cp "${REPO_DIR}/deploy/capcut.guelichweb.store.conf" \
  "/www/server/panel/vhost/nginx/${DOMAIN}.conf"

if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  echo "==> Certificat SSL..."
  sudo certbot certonly --webroot -w "${WEB_ROOT}" -d "${DOMAIN}" \
    --non-interactive --agree-tos -m admin@guelichweb.store || true
fi

sudo nginx -t && sudo systemctl reload nginx

echo "==> Seed admin (si ADMIN_PASSWORD défini dans .env) :"
echo "    cd ${PORTAL_ROOT} && npm run seed-admin"

echo "OK — https://${DOMAIN}/connexion"
