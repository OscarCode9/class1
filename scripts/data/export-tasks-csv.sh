#!/usr/bin/env bash
set -euo pipefail

DB_USER="${DB_USER:-postgres}"
SOURCE_DB="${1:-${DB_NAME:-class1_db}}"
EXPORT_DIR="${EXPORT_DIR:-data/exports}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT="${EXPORT_DIR}/tasks-${STAMP}.csv"

mkdir -p "$EXPORT_DIR"

docker compose exec -T db \
  psql -U "$DB_USER" -d "$SOURCE_DB" \
  -v ON_ERROR_STOP=1 \
  -c '\copy (SELECT id, title, description, status, priority, tags, "dueDate", "assigneeId", "createdAt", "updatedAt" FROM tasks ORDER BY "createdAt") TO STDOUT WITH CSV HEADER' \
  > "$OUTPUT"

test -s "$OUTPUT"
echo "CSV exported: $OUTPUT"
