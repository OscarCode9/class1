#!/usr/bin/env bash
# Deprecated wrapper — prefer: ./scripts/backup-docker-db.sh
# Still works; defaults BACKUP_DIR to repo-root backups/ if unset.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
exec "$ROOT_DIR/scripts/backup-docker-db.sh" "$@"
