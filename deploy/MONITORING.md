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
- **Données** : volume Docker `uptime-kuma-data`

### Moniteurs à configurer

| Nom | URL | Intervalle |
|-----|-----|------------|
| CapCut — Accueil | `https://capcut.guelichweb.store/` | 60 s |
| CapCut — Health API | `https://capcut.guelichweb.store/api/health` | 60 s |
| CapCut — Connexion | `https://capcut.guelichweb.store/connexion` | 120 s |

### Notifications

Configurer dans Uptime Kuma (première visite) :

- **Email** → `christ@guelichweb.online` (recommandé)
- Ou **Telegram** si `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` sont disponibles (voir projet FORGE IA)

## SSH tunnel (accès dashboard)

```bash
ssh -L 3001:127.0.0.1:3001 mon-vps
```

Puis ouvrir http://localhost:3001

## PM2

```bash
pm2 status capcut-portal
pm2 logs capcut-portal --lines 50
```
