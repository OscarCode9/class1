#!/usr/bin/env bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment port or default to 3000
PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}/api/v1"

echo -e "${YELLOW}Starting Curl API Verification Suite against ${BASE_URL}...${NC}"
echo "------------------------------------------------------------"

# Helper to check JSON response programmatically using Python
assert_json() {
  local json_data="$1"
  local python_script="$2"
  if ! echo "$json_data" | python3 -c "$python_script" 2>/dev/null; then
    echo -e "${RED}Assertion failed for JSON:${NC}"
    echo "$json_data"
    return 1
  fi
  return 0
}

# 1. Test GET /health
echo -e "${YELLOW}[1/10] Testing Health Endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n1)

if [ "$HEALTH_STATUS" != "200" ]; then
  echo -e "${RED}FAIL: expected 200, got ${HEALTH_STATUS}${NC}"
  exit 1
fi
assert_json "$HEALTH_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
assert data['data']['status'] == 'healthy'
"
echo -e "${GREEN}PASS: Health endpoint works.${NC}"

# 2. Test POST /auth/register
echo -e "${YELLOW}[2/10] Testing Auth Register Endpoint...${NC}"
RANDOM_NUM=$((RANDOM % 10000))
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Register User\",\"email\":\"register${RANDOM_NUM}@example.com\",\"password\":\"SecurePassword${RANDOM_NUM}!\"}")
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')
REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | tail -n1)

if [ "$REGISTER_STATUS" != "201" ]; then
  echo -e "${RED}FAIL: expected 201, got ${REGISTER_STATUS}${NC}"
  echo "$REGISTER_BODY"
  exit 1
fi
assert_json "$REGISTER_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
assert 'accessToken' in data['data']
assert data['data']['user']['name'] == 'Register User'
"
echo -e "${GREEN}PASS: Auth register works.${NC}"

# 3. Test POST /users (Create User)
echo -e "${YELLOW}[3/10] Testing Create User Endpoint...${NC}"
CREATE_USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Docker User\",\"email\":\"docker${RANDOM_NUM}@example.com\"}")
CREATE_USER_BODY=$(echo "$CREATE_USER_RESPONSE" | sed '$d')
CREATE_USER_STATUS=$(echo "$CREATE_USER_RESPONSE" | tail -n1)

if [ "$CREATE_USER_STATUS" != "201" ]; then
  echo -e "${RED}FAIL: expected 201, got ${CREATE_USER_STATUS}${NC}"
  echo "$CREATE_USER_BODY"
  exit 1
fi

USER_ID=$(echo "$CREATE_USER_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo -e "${GREEN}PASS: Created user with ID: ${USER_ID}${NC}"

# 4. Test GET /users (List Users)
echo -e "${YELLOW}[4/10] Testing List Users Endpoint...${NC}"
LIST_USERS_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/users")
LIST_USERS_BODY=$(echo "$LIST_USERS_RESPONSE" | sed '$d')
LIST_USERS_STATUS=$(echo "$LIST_USERS_RESPONSE" | tail -n1)

if [ "$LIST_USERS_STATUS" != "200" ]; then
  echo -e "${RED}FAIL: expected 200, got ${LIST_USERS_STATUS}${NC}"
  exit 1
fi
assert_json "$LIST_USERS_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
assert any(u['id'] == '$USER_ID' for u in data['data'])
"
echo -e "${GREEN}PASS: User list retrieval works.${NC}"

# 5. Test GET /users/:id (Get single user)
echo -e "${YELLOW}[5/10] Testing Get User by ID Endpoint...${NC}"
GET_USER_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/users/${USER_ID}")
GET_USER_BODY=$(echo "$GET_USER_RESPONSE" | sed '$d')
GET_USER_STATUS=$(echo "$GET_USER_RESPONSE" | tail -n1)

if [ "$GET_USER_STATUS" != "200" ]; then
  echo -e "${RED}FAIL: expected 200, got ${GET_USER_STATUS}${NC}"
  exit 1
fi
assert_json "$GET_USER_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
assert data['data']['id'] == '$USER_ID'
assert data['data']['name'] == 'Docker User'
"
echo -e "${GREEN}PASS: Get user by ID works.${NC}"

# 6. Test PUT /users/:id (Update user)
echo -e "${YELLOW}[6/10] Testing Update User Endpoint...${NC}"
UPDATE_USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/users/${USER_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Updated Docker User\"}")
UPDATE_USER_BODY=$(echo "$UPDATE_USER_RESPONSE" | sed '$d')
UPDATE_USER_STATUS=$(echo "$UPDATE_USER_RESPONSE" | tail -n1)

if [ "$UPDATE_USER_STATUS" != "200" ]; then
  echo -e "${RED}FAIL: expected 200, got ${UPDATE_USER_STATUS}${NC}"
  exit 1
fi
assert_json "$UPDATE_USER_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
assert data['data']['name'] == 'Updated Docker User'
"
echo -e "${GREEN}PASS: Update user works.${NC}"

# 7. Test POST /tasks (Create Task with assignee)
echo -e "${YELLOW}[7/10] Testing Create Task Endpoint...${NC}"
FUTURE_DATE=$(python3 -c "from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(timespec='milliseconds').replace('+00:00', 'Z'))")
CREATE_TASK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Verify Docker Setup\",\"description\":\"Run curls in docker\",\"priority\":\"critical\",\"tags\":[\"docker\",\"testing\"],\"dueDate\":\"${FUTURE_DATE}\",\"assigneeId\":\"${USER_ID}\"}")
CREATE_TASK_BODY=$(echo "$CREATE_TASK_RESPONSE" | sed '$d')
CREATE_TASK_STATUS=$(echo "$CREATE_TASK_RESPONSE" | tail -n1)

if [ "$CREATE_TASK_STATUS" != "201" ]; then
  echo -e "${RED}FAIL: expected 201, got ${CREATE_TASK_STATUS}${NC}"
  echo "$CREATE_TASK_BODY"
  exit 1
fi
assert_json "$CREATE_TASK_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
assert data['data']['title'] == 'Verify Docker Setup'
assert data['data']['priority'] == 'critical'
assert data['data']['assigneeId'] == '$USER_ID'
"
echo -e "${GREEN}PASS: Create task works.${NC}"

# 8. Test Tasks Validation Failures
echo -e "${YELLOW}[8/10] Testing Task Input Validation...${NC}"

# Validation 8a: Empty title
VAL_EMPTY_TITLE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"  \"}")
VAL_EMPTY_TITLE_BODY=$(echo "$VAL_EMPTY_TITLE" | sed '$d')
VAL_EMPTY_TITLE_STATUS=$(echo "$VAL_EMPTY_TITLE" | tail -n1)
if [ "$VAL_EMPTY_TITLE_STATUS" != "400" ]; then
  echo -e "${RED}FAIL: expected 400 for empty title, got ${VAL_EMPTY_TITLE_STATUS}${NC}"
  exit 1
fi

# Validation 8b: Past due date
VAL_PAST_DATE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Review bugs\",\"dueDate\":\"2020-01-01T00:00:00.000Z\"}")
VAL_PAST_DATE_BODY=$(echo "$VAL_PAST_DATE" | sed '$d')
VAL_PAST_DATE_STATUS=$(echo "$VAL_PAST_DATE" | tail -n1)
if [ "$VAL_PAST_DATE_STATUS" != "400" ]; then
  echo -e "${RED}FAIL: expected 400 for past due date, got ${VAL_PAST_DATE_STATUS}${NC}"
  exit 1
fi

# Validation 8c: Missing assignee user
VAL_MISSING_USER=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/tasks" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Review logs\",\"assigneeId\":\"00000000-0000-4000-8000-000000000000\"}")
VAL_MISSING_USER_BODY=$(echo "$VAL_MISSING_USER" | sed '$d')
VAL_MISSING_USER_STATUS=$(echo "$VAL_MISSING_USER" | tail -n1)
if [ "$VAL_MISSING_USER_STATUS" != "404" ]; then
  echo -e "${RED}FAIL: expected 404 for missing assignee, got ${VAL_MISSING_USER_STATUS}${NC}"
  exit 1
fi

echo -e "${GREEN}PASS: Task validations behave correctly (returned 400 and 404).${NC}"

# 9. Test DELETE /users/:id (Delete user)
echo -e "${YELLOW}[9/10] Testing Delete User Endpoint...${NC}"
DELETE_USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/users/${USER_ID}")
DELETE_USER_BODY=$(echo "$DELETE_USER_RESPONSE" | sed '$d')
DELETE_USER_STATUS=$(echo "$DELETE_USER_RESPONSE" | tail -n1)

if [ "$DELETE_USER_STATUS" != "200" ]; then
  echo -e "${RED}FAIL: expected 200, got ${DELETE_USER_STATUS}${NC}"
  exit 1
fi
assert_json "$DELETE_USER_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is True
"
echo -e "${GREEN}PASS: User delete works.${NC}"

# 10. Test GET /users/:id after deletion (Should fail with 404)
echo -e "${YELLOW}[10/10] Testing Get Deleted User Endpoint...${NC}"
GET_DELETED_USER_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/users/${USER_ID}")
GET_DELETED_USER_BODY=$(echo "$GET_DELETED_USER_RESPONSE" | sed '$d')
GET_DELETED_USER_STATUS=$(echo "$GET_DELETED_USER_RESPONSE" | tail -n1)

if [ "$GET_DELETED_USER_STATUS" != "404" ]; then
  echo -e "${RED}FAIL: expected 404 for deleted user, got ${GET_DELETED_USER_STATUS}${NC}"
  exit 1
fi
assert_json "$GET_DELETED_USER_BODY" "
import sys, json
data = json.load(sys.stdin)
assert data['success'] is False
assert data['error']['code'] == 'USER_NOT_FOUND'
"
echo -e "${GREEN}PASS: Endpoint returns 404 for deleted user.${NC}"

echo "------------------------------------------------------------"
echo -e "${GREEN}SUCCESS: All curl API integration tests passed!${NC}"
