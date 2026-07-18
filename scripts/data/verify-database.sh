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
TARGET_DB="${1:-class1_clone}"

docker compose exec -T db \
  psql -U "$DB_USER" -d "$TARGET_DB" \
  -v ON_ERROR_STOP=1 -f - < scripts/data/verify-clone.sql
