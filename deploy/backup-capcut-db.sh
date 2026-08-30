#!/usr/bin/env bash
# Sauvegarde quotidienne des tables CapCut Studio (Supabase self-hosted)
set -euo pipefail

BACKUP_DIR="/www/backups/capcut"
RETENTION_DAYS=14
CONTAINER="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/capcut_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

TABLES=(
  capcut_users
  capcut_plans
  capcut_subscriptions
  capcut_password_reset_tokens
)

# Include any future capcut_* tables automatically
mapfile -t EXTRA_TABLES < <(
  docker exec "${CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc \
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'capcut_%' ORDER BY tablename;"
)

declare -A SEEN=()
TABLE_ARGS=()
for t in "${TABLES[@]}" "${EXTRA_TABLES[@]}"; do
  [[ -z "${t}" ]] && continue
  [[ -n "${SEEN[$t]+x}" ]] && continue
  SEEN["$t"]=1
  TABLE_ARGS+=("-t" "public.${t}")
done

if [[ ${#TABLE_ARGS[@]} -eq 0 ]]; then
  echo "Aucune table capcut_* trouvée — abandon." >&2
  exit 1
fi

docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
  --no-owner --no-privileges "${TABLE_ARGS[@]}" | gzip -9 > "${OUTPUT_FILE}"

find "${BACKUP_DIR}" -name 'capcut_*.sql.gz' -type f -mtime +"${RETENTION_DAYS}" -delete

echo "Sauvegarde OK : ${OUTPUT_FILE} ($(du -h "${OUTPUT_FILE}" | cut -f1))"
