#!/bin/bash
set -euo pipefail

PORT="${PORT:-3000}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_DELAY="${RETRY_DELAY:-1}"
BASE_URL="http://localhost:${PORT}/api/v1/health"

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

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null || echo "000")

  if [ "$RESPONSE" = "200" ]; then
    BODY=$(curl -s "$BASE_URL")
    STATUS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])")

    if [ "$STATUS" = "healthy" ]; then
      echo ""
      echo -e "${GREEN}PASS (attempt ${i}/${MAX_RETRIES})${NC}"
      echo -e "${GREEN}Response:${NC}"
      echo "$BODY" | python3 -m json.tool
      exit 0
    fi
  fi

  printf "\r  Attempt %02d/%02d → HTTP %s" "$i" "$MAX_RETRIES" "$RESPONSE"
  sleep "$RETRY_DELAY"
done

echo ""
echo -e "${RED}FAIL: Server did not respond with 200 after ${MAX_RETRIES} attempts${NC}"
exit 1
