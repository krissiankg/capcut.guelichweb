# Sauvegardes Supabase — CapCut Studio

Sauvegardes automatiques des tables `capcut_*` de l'instance Supabase self-hosted sur le VPS.

## Tables incluses

- `capcut_users`
- `capcut_plans`
- `capcut_subscriptions`
- `capcut_password_reset_tokens`
- Toute table `public.capcut_*` ajoutée ultérieurement (détection automatique)

## Emplacement

```
/www/backups/capcut/
```

Fichiers nommés : `capcut_YYYYMMDD_HHMMSS.sql.gz`

## Rétention

**14 jours** — les fichiers plus anciens sont supprimés automatiquement.

## Script

`deploy/backup-capcut-db.sh` — exécuté via `sudo` (accès Docker requis).

```bash
sudo bash /www/wwwroot/capcut.guelichweb.store-src/deploy/backup-capcut-db.sh
```

## Planification (cron)

Installation sur le VPS :

```bash
sudo cp deploy/backup-capcut-db.sh /usr/local/bin/backup-capcut-db.sh
sudo chmod +x /usr/local/bin/backup-capcut-db.sh
echo '0 3 * * * root /usr/local/bin/backup-capcut-db.sh >> /www/backups/capcut/backup.log 2>&1' | sudo tee /etc/cron.d/capcut-db-backup
```

- **Fréquence** : tous les jours à **03:00** (heure serveur)
- **Journal** : `/www/backups/capcut/backup.log`

## Restauration

```bash
# Lister les sauvegardes
ls -lh /www/backups/capcut/

# Restaurer une table (exemple capcut_users) — à adapter selon besoin
gunzip -c /www/backups/capcut/capcut_YYYYMMDD_HHMMSS.sql.gz | \
  sudo docker exec -i supabase-db psql -U postgres -d postgres
```

> **Attention** : la restauration écrase les données existantes. Tester d'abord sur une base de staging.

## Prérequis

- Conteneur Docker `supabase-db` en cours d'exécution
- Droits `sudo` pour l'utilisateur cron (root)
- Répertoire `/www/backups/capcut/` créé automatiquement par le script

## Sécurité

- Les dumps contiennent des hashes de mots de passe — ne pas exposer publiquement
- Ne pas committer de mots de passe PostgreSQL dans le dépôt
- Les identifiants DB restent dans la configuration Docker Supabase (`/www/docker/supabase`)
