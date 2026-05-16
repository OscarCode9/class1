#!/bin/bash
set -euo pipefail

PORT="${PORT:-3000}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_DELAY="${RETRY_DELAY:-1}"
BASE_URL="http://localhost:${PORT}/api/v1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo -e "${YELLOW}Starting server...${NC}"
bun src/index.ts &
SERVER_PID=$!

echo -e "${YELLOW}Waiting for server to be ready...${NC}"
for i in $(seq 1 "$MAX_RETRIES"); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${RED}Server process died${NC}"
    exit 1
  fi

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health" 2>/dev/null || echo "000")

  if [ "$RESPONSE" = "200" ]; then
    break
  fi

  printf "\r  Attempt %02d/%02d → HTTP %s" "$i" "$MAX_RETRIES" "$RESPONSE"
  sleep "$RETRY_DELAY"

  if [ "$i" = "$MAX_RETRIES" ]; then
    echo ""
    echo -e "${RED}FAIL: Server did not become ready${NC}"
    exit 1
  fi
done

echo ""

USER_EMAIL="alice.$(date +%s)@example.com"
USER_BODY=$(curl -s -X POST "${BASE_URL}/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Alice\",\"email\":\"${USER_EMAIL}\"}")
USER_ID=$(printf '%s' "$USER_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

FUTURE_DATE=$(python3 -c "from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(timespec='milliseconds').replace('+00:00', 'Z'))")

VALID_TASK_RESPONSE=$(curl -s -w $'\n%{http_code}' -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Prepare launch checklist\",\"description\":\"Review release blockers\",\"priority\":\"high\",\"tags\":[\"release\",\"backend\"],\"dueDate\":\"${FUTURE_DATE}\",\"assigneeId\":\"${USER_ID}\"}")
VALID_TASK_BODY=$(printf '%s' "$VALID_TASK_RESPONSE" | sed '$d')
VALID_TASK_STATUS=$(printf '%s' "$VALID_TASK_RESPONSE" | tail -n1)

if [ "$VALID_TASK_STATUS" != "201" ]; then
  echo -e "${RED}FAIL: expected 201 for valid task, got ${VALID_TASK_STATUS}${NC}"
  echo "$VALID_TASK_BODY"
  exit 1
fi

printf '%s' "$VALID_TASK_BODY" | python3 -c "
import json
import sys

body = json.load(sys.stdin)
user_id = sys.argv[1]
future_date = sys.argv[2]

assert body['success'] is True
assert body['data']['title'] == 'Prepare launch checklist'
assert body['data']['description'] == 'Review release blockers'
assert body['data']['status'] == 'pending'
assert body['data']['priority'] == 'high'
assert body['data']['tags'] == ['release', 'backend']
assert body['data']['dueDate'] == future_date
assert body['data']['assigneeId'] == user_id
assert isinstance(body['data']['id'], str) and body['data']['id']
" "$USER_ID" "$FUTURE_DATE"

INVALID_TITLE_RESPONSE=$(curl -s -w $'\n%{http_code}' -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"   "}')
INVALID_TITLE_BODY=$(printf '%s' "$INVALID_TITLE_RESPONSE" | sed '$d')
INVALID_TITLE_STATUS=$(printf '%s' "$INVALID_TITLE_RESPONSE" | tail -n1)

if [ "$INVALID_TITLE_STATUS" != "400" ]; then
  echo -e "${RED}FAIL: expected 400 for empty title, got ${INVALID_TITLE_STATUS}${NC}"
  echo "$INVALID_TITLE_BODY"
  exit 1
fi

printf '%s' "$INVALID_TITLE_BODY" | python3 -c "
import json
import sys

body = json.load(sys.stdin)
assert body['success'] is False
assert body['error']['code'] == 'VALIDATION_ERROR'
assert body['error']['message'] == 'Title is required'
"

INVALID_PRIORITY_RESPONSE=$(curl -s -w $'\n%{http_code}' -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Investigate bug","priority":"urgent"}')
INVALID_PRIORITY_BODY=$(printf '%s' "$INVALID_PRIORITY_RESPONSE" | sed '$d')
INVALID_PRIORITY_STATUS=$(printf '%s' "$INVALID_PRIORITY_RESPONSE" | tail -n1)

if [ "$INVALID_PRIORITY_STATUS" != "400" ]; then
  echo -e "${RED}FAIL: expected 400 for invalid priority, got ${INVALID_PRIORITY_STATUS}${NC}"
  echo "$INVALID_PRIORITY_BODY"
  exit 1
fi

printf '%s' "$INVALID_PRIORITY_BODY" | python3 -c "
import json
import sys

body = json.load(sys.stdin)
assert body['success'] is False
assert body['error']['code'] == 'VALIDATION_ERROR'
assert body['error']['message'] == 'Priority must be one of: low, medium, high, critical'
"

PAST_DUE_DATE_RESPONSE=$(curl -s -w $'\n%{http_code}' -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Review incident report","dueDate":"2020-01-01T00:00:00.000Z"}')
PAST_DUE_DATE_BODY=$(printf '%s' "$PAST_DUE_DATE_RESPONSE" | sed '$d')
PAST_DUE_DATE_STATUS=$(printf '%s' "$PAST_DUE_DATE_RESPONSE" | tail -n1)

if [ "$PAST_DUE_DATE_STATUS" != "400" ]; then
  echo -e "${RED}FAIL: expected 400 for past due date, got ${PAST_DUE_DATE_STATUS}${NC}"
  echo "$PAST_DUE_DATE_BODY"
  exit 1
fi

printf '%s' "$PAST_DUE_DATE_BODY" | python3 -c "
import json
import sys

body = json.load(sys.stdin)
assert body['success'] is False
assert body['error']['code'] == 'VALIDATION_ERROR'
assert body['error']['message'] == 'Due date must be a future date'
"

MISSING_ASSIGNEE_RESPONSE=$(curl -s -w $'\n%{http_code}' -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Assign onboarding session","assigneeId":"00000000-0000-4000-8000-000000000000"}')
MISSING_ASSIGNEE_BODY=$(printf '%s' "$MISSING_ASSIGNEE_RESPONSE" | sed '$d')
MISSING_ASSIGNEE_STATUS=$(printf '%s' "$MISSING_ASSIGNEE_RESPONSE" | tail -n1)

if [ "$MISSING_ASSIGNEE_STATUS" != "404" ]; then
  echo -e "${RED}FAIL: expected 404 for missing assignee, got ${MISSING_ASSIGNEE_STATUS}${NC}"
  echo "$MISSING_ASSIGNEE_BODY"
  exit 1
fi

printf '%s' "$MISSING_ASSIGNEE_BODY" | python3 -c "
import json
import sys

body = json.load(sys.stdin)
assert body['success'] is False
assert body['error']['code'] == 'USER_NOT_FOUND'
assert body['error']['message'] == 'User not found'
"

echo -e "${GREEN}PASS: tasks endpoint validated with curl${NC}"
