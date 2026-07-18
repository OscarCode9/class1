#!/usr/bin/env bash
# Dump the Postgres database from the local Docker (compose service `db`)
# into ./backups as a timestamped file.
#
# Usage:
#   ./scripts/backup-docker-db.sh              # backup DB_NAME (default class1_db)
#   ./scripts/backup-docker-db.sh other_db    # backup a specific database
#   FORMAT=plain ./scripts/backup-docker-db.sh  # also write a .sql file
#
# Env (optional, loaded from .env if present):
#   DB_USER, DB_NAME, DB_PASSWORD, COMPOSE_SERVICE (default: db)
#   BACKUP_DIR (default: <repo>/backups)
#   FORMAT: custom | plain | both  (default: custom)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USER="${DB_USER:-postgres}"
DB_NAME_DEFAULT="${DB_NAME:-class1_db}"
SOURCE_DB="${1:-$DB_NAME_DEFAULT}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-db}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
FORMAT="${FORMAT:-custom}"
STAMP="$(date +%Y%m%d-%H%M%S)"
CONTAINER_NAME="${CONTAINER_NAME:-class1-db}"

mkdir -p "$BACKUP_DIR"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

container_running() {
  if compose ps --status running --services 2>/dev/null | grep -qx "$COMPOSE_SERVICE"; then
    return 0
  fi
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER_NAME"; then
    return 0
  fi
  return 1
}

if ! container_running; then
  echo "Error: Postgres container is not running." >&2
  echo "  Start it with:  docker compose up -d db" >&2
  echo "  (service: $COMPOSE_SERVICE, container: $CONTAINER_NAME)" >&2
  exit 1
fi

export PGPASSWORD="${DB_PASSWORD:-}"

pg_in_container() {
  # Prefer compose exec (same network/user as the stack)
  if compose ps --status running --services 2>/dev/null | grep -qx "$COMPOSE_SERVICE"; then
    compose exec -T \
      -e "PGPASSWORD=${DB_PASSWORD:-}" \
      "$COMPOSE_SERVICE" "$@"
  else
    docker exec -i \
      -e "PGPASSWORD=${DB_PASSWORD:-}" \
      "$CONTAINER_NAME" "$@"
  fi
}

# Verify database exists
if ! pg_in_container psql -U "$DB_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '${SOURCE_DB//\'/\'\'}'" | grep -q 1; then
  echo "Error: database '$SOURCE_DB' does not exist in the container." >&2
  echo "Available databases:" >&2
  pg_in_container psql -U "$DB_USER" -d postgres -tAc \
    "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1" >&2
  exit 1
fi

write_custom() {
  local out="$1"
  echo "→ custom dump: $out"
  pg_in_container pg_dump \
    -U "$DB_USER" \
    -d "$SOURCE_DB" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --verbose \
    >"$out"
  test -s "$out"
}

write_plain() {
  local out="$1"
  echo "→ plain SQL:   $out"
  pg_in_container pg_dump \
    -U "$DB_USER" \
    -d "$SOURCE_DB" \
    --format=plain \
    --no-owner \
    --no-privileges \
    >"$out"
  test -s "$out"
}

BASE="${BACKUP_DIR}/${SOURCE_DB}-${STAMP}"
CREATED=()

case "$FORMAT" in
  custom)
    write_custom "${BASE}.dump"
    CREATED+=("${BASE}.dump")
    ;;
  plain|sql)
    write_plain "${BASE}.sql"
    CREATED+=("${BASE}.sql")
    ;;
  both)
    write_custom "${BASE}.dump"
    write_plain "${BASE}.sql"
    CREATED+=("${BASE}.dump" "${BASE}.sql")
    ;;
  *)
    echo "Error: FORMAT must be custom | plain | both (got: $FORMAT)" >&2
    exit 1
    ;;
esac

# Pointer to the latest backup for this DB (relative path for convenience)
LATEST_LINK="${BACKUP_DIR}/${SOURCE_DB}-latest.dump"
if [[ -f "${BASE}.dump" ]]; then
  ln -sfn "$(basename "${BASE}.dump")" "$LATEST_LINK"
fi

echo
echo "Backup OK"
echo "  database : $SOURCE_DB"
echo "  user     : $DB_USER"
echo "  folder   : $BACKUP_DIR"
for f in "${CREATED[@]}"; do
  size="$(du -h "$f" | awk '{print $1}')"
  echo "  file     : $f ($size)"
done
if [[ -L "$LATEST_LINK" || -f "$LATEST_LINK" ]]; then
  echo "  latest   : $LATEST_LINK -> $(readlink "$LATEST_LINK" 2>/dev/null || basename "$LATEST_LINK")"
fi
echo
echo "Restore example:"
echo "  ./scripts/data/restore-to-local.sh ${CREATED[0]} class1_restored"
