# Administration CapCut Studio

## Rotation du mot de passe admin

Le mot de passe administrateur a été **roté le 2026-09-01** (ne pas stocker le secret dans ce dépôt).

### Procédure de rotation

1. Sur le VPS, dans `/www/wwwroot/capcut.guelichweb.store-portal` :
   ```bash
   cd /www/wwwroot/capcut.guelichweb.store-portal
   NEW_PW="$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)"
   HASH=$(node -e "import('bcryptjs').then(b=>b.default.hash('$NEW_PW',12).then(h=>console.log(h)))")
   # Mettre à jour le hash en base (via script rotate-admin-password ou Supabase)
   sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$NEW_PW/" .env
   npx tsx scripts/rotate-admin-password.ts
   ```
2. Transmettre le nouveau mot de passe au propriétaire par canal sécurisé (pas par email ni git).
3. Vérifier la connexion sur https://capcut.guelichweb.store/connexion → `/admin`.

### Compte admin

- Email : variable `ADMIN_EMAIL` dans `.env` du portal (défaut `admin@capcut.guelichweb.store`)
- Le mot de passe est stocké en hash bcrypt dans `capcut_users`, pas en clair dans la base.

### Ancien mot de passe temporaire

L'ancien mot de passe temporaire `Hk64c27SDsowpn` a été **invalidé** lors de la rotation du 2026-09-01.
