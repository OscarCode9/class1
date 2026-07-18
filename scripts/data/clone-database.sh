#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USER="${DB_USER:-postgres}"
SOURCE_DB="${1:-${DB_NAME:-class1_db}}"
TARGET_DB="${2:-class1_clone}"
PRIMARY_DB="${DB_NAME:-class1_db}"

if [[ "$SOURCE_DB" == "$TARGET_DB" ]]; then
  echo "Source and target databases must be different." >&2
  exit 1
fi

if [[ "$TARGET_DB" == "$PRIMARY_DB" || "$TARGET_DB" == "class1_db" ]]; then
  echo "Refusing to replace primary database: $TARGET_DB" >&2
  exit 1
fi

case "$TARGET_DB" in
  postgres|template0|template1)
    echo "Refusing to replace protected database: $TARGET_DB" >&2
    exit 1
    ;;
esac

docker compose exec -T db dropdb \
  --if-exists --force -U "$DB_USER" "$TARGET_DB"
docker compose exec -T db createdb -U "$DB_USER" "$TARGET_DB"

docker compose exec -T db \
  pg_dump -U "$DB_USER" -d "$SOURCE_DB" \
  --format=custom --no-owner --no-privileges \
  | docker compose exec -T db \
      pg_restore -U "$DB_USER" -d "$TARGET_DB" \
      --no-owner --no-privileges --exit-on-error

echo "Clone ready: $SOURCE_DB -> $TARGET_DB"
