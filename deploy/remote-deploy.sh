#!/bin/bash
set -e
PORTAL=/www/wwwroot/capcut.guelichweb.store-portal
NEW_PW=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9!@#%&*' | head -c 20)
cd "$PORTAL"
export ADMIN_PASSWORD="$NEW_PW"
npx tsx scripts/rotate-admin-password.ts
if grep -q '^ADMIN_PASSWORD=' .env; then
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$NEW_PW|" .env
else
  echo "ADMIN_PASSWORD=$NEW_PW" >> .env
fi
echo "NEW_ADMIN_PASSWORD=$NEW_PW"
pm2 restart capcut-portal
NGINX_CONF="/www/server/panel/vhost/nginx/capcut.guelichweb.store.conf"
if [ -f "$NGINX_CONF" ] && ! grep -q 'verification-en-attente' "$NGINX_CONF"; then
  cp "$PORTAL/deploy/capcut.guelichweb.store.conf" "$NGINX_CONF"
  sudo nginx -t && sudo nginx -s reload
fi
cd "$PORTAL/deploy/monitoring"
sudo docker compose up -d 2>/dev/null || sudo docker-compose up -d
echo "DEPLOY_DONE"
