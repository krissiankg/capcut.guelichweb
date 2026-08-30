# CapCut Studio

Éditeur vidéo professionnel en ligne pour [capcut.guelichweb.store](https://capcut.guelichweb.store), basé sur un fork d'[OpenReel Video](https://github.com/Augani/openreel-video) avec portail d'authentification, abonnements et branding GUELICHWEB.

## Composants

| Dossier | Description |
|---------|-------------|
| `portal/` | Portail Node.js (connexion FR, admin, API auth, pages légales) |
| `deploy/` | Nginx, scripts de déploiement et sauvegardes |
| `supabase/migrations/` | Schéma PostgreSQL (`capcut_*`) |
| `scripts/` | Utilitaires de déploiement |
| `apps/web/` | Éditeur OpenReel rebrandé (voir `docs/CAPCUT-BRANDING.md`) |

L'éditeur est construit depuis le monorepo OpenReel ; ce dépôt contient le code custom CapCut Studio et la documentation de déploiement.

## Déploiement rapide

```bash
ssh mon-vps
git clone https://github.com/krissiankg/capcut.guelichweb.git /www/wwwroot/capcut.guelichweb.store-src
cd /www/wwwroot/capcut.guelichweb.store-src
cp portal/.env.example portal/.env   # configurer les secrets
bash deploy/setup.sh
cd /www/wwwroot/capcut.guelichweb.store-portal && npm run seed-admin
```

Voir [deploy/README.md](deploy/README.md) pour l'architecture complète et les variables d'environnement.

## URLs

- Éditeur : https://capcut.guelichweb.store/
- Connexion : https://capcut.guelichweb.store/connexion
- CGU : https://capcut.guelichweb.store/cgu
- Confidentialité : https://capcut.guelichweb.store/confidentialite
- Admin : https://capcut.guelichweb.store/admin

## Sauvegardes

Sauvegarde quotidienne automatique des tables `capcut_*` — voir [deploy/BACKUP.md](deploy/BACKUP.md).

## Licence

- Code custom GUELICHWEB : usage privé du projet CapCut Studio
- OpenReel upstream : MIT (voir dépôt [Augani/openreel-video](https://github.com/Augani/openreel-video))
