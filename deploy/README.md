# Déploiement CapCut Studio (OpenReel Video)

Hébergement de [OpenReel Video](https://github.com/Augani/openreel-video) sur `capcut.guelichweb.store` avec authentification, abonnements et panneau admin.

## Architecture

| Composant | Rôle |
|-----------|------|
| **OpenReel** (`apps/web/dist`) | Éditeur vidéo 100 % client (React, WebCodecs, WebGPU) |
| **Portal** (`portal/`, port 3011) | Connexion FR, API auth, admin, vérification nginx |
| **Supabase** (`supabase.guelichweb.store`) | Tables `capcut_users`, `capcut_plans`, `capcut_subscriptions` |
| **Nginx** | HTTPS, headers COOP/COEP, `auth_request` sur l'éditeur |

## Forfaits par défaut

| Slug | Nom | Durée | Prix |
|------|-----|-------|------|
| `trial` | Essai gratuit | 7 jours | 0 FCFA |
| `starter` | Starter | 30 jours | 4 900 FCFA/mois |
| `pro` | Pro | 30 jours | 9 900 FCFA/mois |

L'activation est **manuelle par l'admin** (MVP). Paiement FedaPay/Stripe à brancher ultérieurement.

## Variables d'environnement (portal)

Fichier : `/www/wwwroot/capcut.guelichweb.store-portal/.env`

```env
PORT=3011
APP_URL=https://capcut.guelichweb.store
SESSION_SECRET=<32+ caractères aléatoires>
SUPABASE_URL=https://supabase.guelichweb.store
SUPABASE_INTERNAL_URL=http://127.0.0.1:8000
SUPABASE_SERVICE_ROLE_KEY=<service role — ne pas committer>
ADMIN_EMAIL=admin@capcut.guelichweb.store
ADMIN_PASSWORD=<mot de passe initial>
ADMIN_FULL_NAME=Administrateur CapCut
RESEND_API_KEY=<clé API Resend>
EMAIL_FROM=CapCut Studio <noreply@guelichweb.store>
```

## Migration base de données

Exécuter sur Supabase (Studio SQL ou psql) :

```bash
# Depuis le VPS si psql disponible vers Kong local
psql "$DATABASE_URL" -f supabase/migrations/001_capcut.sql
psql "$DATABASE_URL" -f supabase/migrations/002_password_reset.sql
```

## Déploiement

### Mise à jour courante (git pull — recommandé)

```bash
ssh mon-vps
cd /www/wwwroot/capcut.guelichweb.store-src
bash deploy/pull.sh
```

- Repo : `https://github.com/krissiankg/capcut.guelichweb.git` → `/www/wwwroot/capcut.guelichweb.store-src`
- Node **22+** via aaPanel (`/www/server/nodejs/v24.16.0`) ou `sudo bash deploy/install-node22.sh`
- Préserve `.env` et `deploy/monitoring/.kuma-admin.env`
## Éditeur OpenReel (apps/web)

L'éditeur **est déjà en ligne** sur `https://capcut.guelichweb.store/` (dossier `/www/wwwroot/capcut.guelichweb.store`).

`WITH_WEB=1` ne contrôle **pas** l'accès utilisateurs. Il sert uniquement à **reconstruire** l'éditeur depuis le monorepo Git lors d'un `pull.sh`.

Aujourd'hui le dépôt GitHub CapCut n'embarque pas le monorepo OpenReel complet (`package.json` / `pnpm-workspace` racine manquants) → laissez `WITH_WEB=0` (défaut). Le portal se déploie normalement ; l'éditeur reste celui déjà publié jusqu'à ce que le monorepo soit complet sur GitHub.



### Première installation

```bash
ssh mon-vps
git clone https://github.com/krissiankg/capcut.guelichweb.git /www/wwwroot/capcut.guelichweb.store-src
cp /www/wwwroot/capcut.guelichweb.store-portal/.env /www/wwwroot/capcut.guelichweb.store-src/portal/.env 2>/dev/null || true
bash /www/wwwroot/capcut.guelichweb.store-src/deploy/pull.sh
cd /www/wwwroot/capcut.guelichweb.store-portal && npm run seed-admin
```

### Installation complète (setup initial)

```bash
ssh mon-vps
git clone <votre-repo> /www/wwwroot/capcut.guelichweb.store-src
cd /www/wwwroot/capcut.guelichweb.store-src
cp portal/.env.example portal/.env   # puis éditer
bash deploy/setup.sh
cd /www/wwwroot/capcut.guelichweb.store-portal && npm run seed-admin
```

## URLs

- Éditeur : https://capcut.guelichweb.store/
- Connexion : https://capcut.guelichweb.store/connexion
- Mot de passe oublié : https://capcut.guelichweb.store/mot-de-passe-oublie
- Forfaits : https://capcut.guelichweb.store/abonnement
- Admin : https://capcut.guelichweb.store/admin

## Admin — gestion utilisateurs

1. Se connecter sur `/admin` avec le compte admin.
2. **Créer un utilisateur** : email, nom, mot de passe temporaire, forfait initial.
3. **Activer un abonnement** : email + forfait (renouvellement manuel).

## Sécurité

- Cookie `capcut_session` : httpOnly, secure, sameSite=lax, HMAC signé.
- Routes éditeur protégées par `auth_request` nginx → `/api/auth/verify`.
- Clés Supabase service role uniquement côté serveur portal.
- Ne pas modifier les vhosts `forgeia`, `supabase`, WordPress existants.

## Licence OpenReel

MIT — voir [LICENSE](../LICENSE) du projet upstream.
