# Monitoring CapCut Studio

## Health check

| URL | Description |
|-----|-------------|
| `GET https://capcut.guelichweb.store/api/health` | Statut portal + connexion Supabase |
| `GET https://capcut.guelichweb.store/health` | Alias legacy (même service) |

Réponse attendue (200) :

```json
{
  "status": "ok",
  "db": "ok",
  "email": "ok"
}
```

- `db: "error"` → problème Supabase (service role ou réseau interne)
- `email: "not_configured"` → `RESEND_API_KEY` absent
- `email: "error"` → clé Resend invalide ou API injoignable

## Uptime Kuma (self-hosted)

Installé sur le VPS via Docker :

```bash
cd /www/wwwroot/capcut.guelichweb.store-portal/deploy/monitoring
docker compose up -d
```

- **Dashboard local** : `http://127.0.0.1:3001` (SSH tunnel recommandé)
- **Données** : volume Docker `monitoring_uptime-kuma-data`

### Configuration automatique

Script idempotent (moniteurs + alertes e-mail Resend) :

```bash
cd /www/wwwroot/capcut.guelichweb.store-portal/deploy/monitoring
node setup-kuma.mjs
```

- Lit `RESEND_API_KEY` et `EMAIL_FROM` depuis le `.env` du portal
- Crée le compte admin au premier lancement (mot de passe dans `.kuma-admin.env`, chmod 600)
- Alertes vers `christ@guelichweb.online` par défaut (`KUMA_ALERT_EMAIL` pour changer)

### Moniteurs configurés

| Nom | URL | Intervalle |
|-----|-----|------------|
| CapCut — Accueil | `https://capcut.guelichweb.store/` | 60 s |
| CapCut — Health API | `https://capcut.guelichweb.store/api/health` (mot-clé `"status":"ok"`) | 60 s |
| CapCut — Connexion | `https://capcut.guelichweb.store/connexion` | 120 s |

### Notifications

- **Type** : SMTP via Resend (`smtp.resend.com:465`)
- **Destinataire** : `christ@guelichweb.online`
- **Test** : Settings → Notifications → CapCut Alerts → Test

## SSH tunnel (accès dashboard)

```bash
ssh -L 3001:127.0.0.1:3001 mon-vps
```

Puis ouvrir http://localhost:3001

Identifiants admin : voir `.kuma-admin.env` sur le VPS (ne pas versionner).

## PM2

```bash
pm2 status capcut-portal
pm2 logs capcut-portal --lines 50
```
