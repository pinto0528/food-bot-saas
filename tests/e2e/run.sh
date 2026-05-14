#!/usr/bin/env bash
set -euo pipefail

# run.sh - FoodBot E2E Test Runner
# Usage: bash tests/e2e/run.sh [--port 3456] [--restaurant-id <uuid>]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/utils.sh"
source "$SCRIPT_DIR/scenarios.sh"

# Parse args
PORT="${PORT:-3456}"
RESTAURANT_ID="${RESTAURANT_ID:-a0000000-0000-0000-0000-000000000001}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --restaurant-id) RESTAURANT_ID="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

API_BASE="http://localhost:$PORT"

# Detect LLM provider
LLM_PROVIDER="Groq"
if [ -n "${OPENAI_API_KEY:-}" ]; then
  LLM_PROVIDER="OpenAI"
fi

echo ""
echo "=========================================="
echo "     FOODBOT E2E TESTS"
echo "=========================================="
echo "  Server:    $API_BASE"
echo "  LLM:       $LLM_PROVIDER"
echo "  Restaurant: $RESTAURANT_ID"
echo "  Started:   $(date '+%H:%M:%S')"
echo "=========================================="

# Verify server is running
echo ""
echo "Verificando servidor..."
if ! curl -sf "$API_BASE/api/health" > /dev/null 2>&1; then
  echo -e "${YELLOW}Servidor no detectado en $API_BASE.${NC}"
  echo "Intentando iniciar dev server..."
  cd "$PROJECT_DIR"

  npm run build > /dev/null 2>&1 || { echo "Build fallo"; exit 1; }

  npx next dev --port "$PORT" &
  SERVER_PID=$!

  # Esperar hasta 30s a que el server responda
  for i in $(seq 1 30); do
    if curl -sf "$API_BASE/api/health" > /dev/null 2>&1; then
      echo "  Server ready after ${i}s (PID $SERVER_PID)"
      break
    fi
    sleep 1
  done

  if ! curl -sf "$API_BASE/api/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Server no arranco${NC}"
    exit 1
  fi

  # Cleanup function to kill server on exit
  cleanup() {
    echo ""
    echo "Deteniendo servidor (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    echo "Servidor detenido."
  }
  trap cleanup EXIT
else
  echo -e "  ${GREEN}Servidor ya corriendo${NC}"
fi

# Initialize report
init_report

# Run all test scenarios
PASS=0
FAIL=0
FAILURES=""
START_TIME=$(date +%s)

run_all_scenarios

END_TIME=$(date +%s)

# Summary and final report
print_summary
write_final_report "$LLM_PROVIDER" "$START_TIME" "$END_TIME"
echo ""

# Exit code
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
