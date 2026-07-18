#!/usr/bin/env bash
# class1 API CLI (curl)
#
# Usage:
#   ./scripts/cli.sh task get all
#   ./scripts/cli.sh tasks get all
#   ./scripts/cli.sh health
#   ./scripts/cli.sh login
#   ./scripts/cli.sh help
#
# Env (optional):
#   API_URL   default http://localhost:6060/api/v1
#   EMAIL     default alice@example.com
#   PASSWORD  default Password123!
#   TOKEN     skip login if set
#   RAW=1     print raw response body without pretty-print

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

API_URL="${API_URL:-http://localhost:6060/api/v1}"
EMAIL="${EMAIL:-alice@example.com}"
PASSWORD="${PASSWORD:-Password123!}"
TOKEN="${TOKEN:-}"
RAW="${RAW:-0}"
TOKEN_FILE="${TOKEN_FILE:-$ROOT_DIR/.cli-token}"

# ── helpers ──────────────────────────────────────────────────────────

die() {
  echo "Error: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing dependency: $1"
}

need_cmd curl

json_pretty() {
  if [[ "$RAW" == "1" ]]; then
    cat
    return
  fi
  if command -v jq >/dev/null 2>&1; then
    jq .
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool
  else
    cat
  fi
}

# Extract JSON field without requiring jq (python fallback)
json_field() {
  local field="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -r "$field"
  else
    python3 -c "import sys,json; d=json.load(sys.stdin); print($field)" 2>/dev/null \
      || python3 -c "
import sys, json
data = json.load(sys.stdin)
path = '''$field'''.lstrip('.')
cur = data
for part in path.split('.'):
    if part.endswith(']'):
        name, idx = part[:-1].split('[')
        cur = cur[name][int(idx)]
    else:
        cur = cur[part]
print(cur if cur is not None else '')
"
  fi
}

api_curl() {
  # api_curl METHOD PATH [curl extras...]
  local method="$1"
  local path="$2"
  shift 2
  local url="${API_URL}${path}"

  local args=(-sS -X "$method" "$url" -H "Accept: application/json")
  if [[ -n "${TOKEN:-}" ]]; then
    args+=(-H "Authorization: Bearer ${TOKEN}")
  fi
  curl "${args[@]}" "$@"
}

ensure_token() {
  if [[ -n "${TOKEN:-}" ]]; then
    return 0
  fi

  if [[ -f "$TOKEN_FILE" ]]; then
    TOKEN="$(tr -d '[:space:]' <"$TOKEN_FILE")"
    if [[ -n "$TOKEN" ]]; then
      # quick validate
      local code
      code="$(api_curl GET "/tasks?limit=1" -o /dev/null -w "%{http_code}" || true)"
      if [[ "$code" == "200" ]]; then
        return 0
      fi
      TOKEN=""
    fi
  fi

  do_login >/dev/null
}

do_login() {
  local body resp success token
  body="$(printf '{"email":%s,"password":%s}' \
    "$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$EMAIL")" \
    "$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$PASSWORD")")"

  resp="$(curl -sS -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$body")" || die "Login request failed (is the API up on ${API_URL}?)"

  success="$(printf '%s' "$resp" | json_field '.success' 2>/dev/null || echo false)"
  if [[ "$success" != "True" && "$success" != "true" ]]; then
    echo "$resp" | json_pretty >&2
    die "Login failed for ${EMAIL}"
  fi

  if command -v jq >/dev/null 2>&1; then
    token="$(printf '%s' "$resp" | jq -r '.data.accessToken')"
  else
    token="$(printf '%s' "$resp" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')"
  fi

  [[ -n "$token" && "$token" != "null" ]] || die "Login response missing accessToken"

  TOKEN="$token"
  umask 077
  printf '%s\n' "$TOKEN" >"$TOKEN_FILE"
  echo "Logged in as ${EMAIL}"
  echo "Token saved: ${TOKEN_FILE}"
}

# ── commands ─────────────────────────────────────────────────────────

cmd_health() {
  api_curl GET "/health" | json_pretty
}

cmd_login() {
  do_login
}

cmd_task_get_all() {
  ensure_token

  local page=1
  local limit=100
  local total_pages=1
  # global so EXIT trap can see it under `set -u`
  CLI_PAGES_DIR="$(mktemp -d)"

  cleanup_pages() {
    [[ -n "${CLI_PAGES_DIR:-}" && -d "${CLI_PAGES_DIR}" ]] && rm -rf "${CLI_PAGES_DIR}"
    CLI_PAGES_DIR=""
  }
  trap cleanup_pages EXIT

  while (( page <= total_pages )); do
    local page_file="${CLI_PAGES_DIR}/page-${page}.json"
    # HTTP only via curl
    api_curl GET "/tasks?page=${page}&limit=${limit}&sortBy=createdAt&sortOrder=desc" \
      >"$page_file" \
      || die "curl failed on tasks page ${page}"

    # Validate + read pagination meta (python only parses JSON)
    local meta_line
    meta_line="$(python3 - "$page_file" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
if not body.get("success"):
    print("ERR", file=sys.stderr)
    json.dump(body, sys.stderr, indent=2)
    sys.exit(2)
meta = body.get("meta") or {}
total_pages = int(meta.get("totalPages") or 1)
total = int(meta.get("total") or len(body.get("data") or []))
limit = int(meta.get("limit") or 100)
print(f"{total_pages} {total} {limit}")
PY
)" || die "API error fetching tasks (page ${page})"

    read -r total_pages total limit <<<"$meta_line"
    page=$((page + 1))
  done

  # Merge all page files → one response with every task
  python3 - "$CLI_PAGES_DIR" <<'PY' | json_pretty
import json, sys
from datetime import datetime, timezone
from pathlib import Path

pages_dir = Path(sys.argv[1])
files = sorted(pages_dir.glob("page-*.json"), key=lambda p: int(p.stem.split("-")[1]))
all_tasks = []
total = 0
limit = 100
for f in files:
    body = json.loads(f.read_text())
    all_tasks.extend(body.get("data") or [])
    meta = body.get("meta") or {}
    total = int(meta.get("total") or total or len(all_tasks))
    limit = int(meta.get("limit") or limit)

out = {
    "success": True,
    "data": all_tasks,
    "meta": {
        "page": 1,
        "limit": limit,
        "total": total if total else len(all_tasks),
        "totalPages": 1,
        "fetched": len(all_tasks),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "version": "v1",
    },
}
print(json.dumps(out, ensure_ascii=False))
PY

  cleanup_pages
  trap - EXIT
}

cmd_task_get() {
  # task get <id>
  local id="${1:-}"
  [[ -n "$id" ]] || die "Usage: task get <id> | task get all"
  ensure_token
  api_curl GET "/tasks/${id}" | json_pretty
}

show_help() {
  cat <<EOF
class1 CLI — inspect API data with curl

Usage:
  ./scripts/cli.sh <command>

Commands:
  health                 GET /health
  login                  Authenticate and cache token
  task get all           GET all tasks (paginates until every row)
  tasks get all          Alias of task get all
  task get <id>          GET one task by id
  help                   Show this help

Environment:
  API_URL     ${API_URL}
  EMAIL       ${EMAIL}
  PASSWORD    (hidden)
  TOKEN       use existing JWT (skips login)
  RAW=1       no pretty-print

Examples:
  ./scripts/cli.sh task get all
  API_URL=http://localhost:6060/api/v1 ./scripts/cli.sh task get all
  EMAIL=bob@example.com PASSWORD='Password123!' ./scripts/cli.sh task get all
EOF
}

# ── router ───────────────────────────────────────────────────────────

main() {
  if [[ $# -eq 0 ]]; then
    show_help
    exit 0
  fi

  local joined="$*"

  case "$joined" in
    help|-h|--help)
      show_help
      return
      ;;
    health)
      cmd_health
      return
      ;;
    login)
      cmd_login
      return
      ;;
    "task get all"|"tasks get all"|"task list"|"tasks list"|"task all"|"tasks all")
      cmd_task_get_all
      return
      ;;
  esac

  # task get <id>
  if [[ "${1:-}" == "task" || "${1:-}" == "tasks" ]] && [[ "${2:-}" == "get" ]] && [[ -n "${3:-}" ]]; then
    cmd_task_get "$3"
    return
  fi

  die "Unknown command: $*. Try: ./scripts/cli.sh help"
}

main "$@"
