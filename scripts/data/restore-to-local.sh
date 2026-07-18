#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/backup.dump [target_database]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USER="${DB_USER:-postgres}"
DUMP_PATH="$1"
TARGET_DB="${2:-class1_restored}"
PRIMARY_DB="${DB_NAME:-class1_db}"

if [[ ! -s "$DUMP_PATH" ]]; then
  echo "Backup not found or empty: $DUMP_PATH" >&2
  exit 1
fi

if [[ "$TARGET_DB" == "$PRIMARY_DB" || "$TARGET_DB" == "class1_db" ]]; then
  echo "Refusing to overwrite primary database: $TARGET_DB" >&2
  exit 1
fi

case "$TARGET_DB" in
  postgres|template0|template1)
    echo "Refusing to overwrite protected database: $TARGET_DB" >&2
    exit 1
    ;;
esac

docker compose exec -T db dropdb \
  --if-exists --force -U "$DB_USER" "$TARGET_DB"
docker compose exec -T db createdb -U "$DB_USER" "$TARGET_DB"
docker compose exec -T db \
  pg_restore -U "$DB_USER" -d "$TARGET_DB" \
  --no-owner --no-privileges --exit-on-error < "$DUMP_PATH"

echo "Backup restored into local database: $TARGET_DB"
