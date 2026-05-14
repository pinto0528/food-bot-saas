# utils.sh - Funciones auxiliares para E2E tests
# Uso: source ./utils.sh

API_BASE="${API_BASE:-http://localhost:3456}"
RESTAURANT_ID="${RESTAURANT_ID:-a0000000-0000-0000-0000-000000000001}"

PASS=0
FAIL=0
FAILURES=""

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Report globals
REPORT_DIR=""
REPORT_FILE=""
REPORT_RESULTS="[]"

# --- REPORTING ---

init_report() {
  REPORT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/reports"
  mkdir -p "$REPORT_DIR"
  local ts
  ts=$(date '+%Y-%m-%dT%H-%M-%S')
  REPORT_FILE="$REPORT_DIR/${ts}_results.json"
  REPORT_RESULTS="[]"
  echo "  Reporte: $REPORT_FILE"
}

# write_result <group> <id> <desc> <pass> <message> <cart_before> <history> <response_json> <errors_json>
# errors_json: JSON array of error strings, use [] for pass
write_result() {
  local group="$1"
  local id="$2"
  local desc="$3"
  local passed="$4"
  local message="$5"
  local cart_before="$6"
  local history="$7"
  local resp="$8"
  local errors_json="$9"

  local action cart reply tool_calls llm_ms invalid_items
  action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))" 2>/dev/null)
  cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))" 2>/dev/null)
  reply=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('reply','')))" 2>/dev/null)
  llm_ms=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('debug',{}).get('llmMs',0))" 2>/dev/null)
  tool_calls=$(echo "$resp" | python -c "
import sys,json
d=json.load(sys.stdin)
tc=d.get('debug',{}).get('llmResponse',{}).get('toolCalls',[])
print(json.dumps(tc))
" 2>/dev/null)
  invalid_items=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('invalidItems',[])))" 2>/dev/null)

  local py_pass
  if [ "$passed" = true ]; then py_pass="True"; else py_pass="False"; fi

  local entry
  entry=$(python -c "
import json
entry = {
    'group': '$group',
    'id': '$id',
    'description': '''$desc''',
    'pass': $py_pass,
    'input': {
        'message': '''$message''',
        'cartBefore': $cart_before,
        'history': $history,
    },
    'response': {
        'action': '$action',
        'cart': $cart,
        'reply': $reply,
        'toolCalls': $tool_calls,
        'llmMs': $llm_ms,
        'invalidItems': $invalid_items,
    },
    'errors': $errors_json,
}
print(json.dumps(entry))
")

  REPORT_RESULTS=$(python -c "
import json
results = json.loads('''$REPORT_RESULTS''')
results.append(json.loads('''$entry'''))
print(json.dumps(results))
")
}

# write_result_simple: write a result with errors collected from a var
write_result_simple() {
  local group="$1"
  local id="$2"
  local desc="$3"
  local passed="$4"
  local message="$5"
  local cart_before="$6"
  local history="$7"
  local resp="$8"
  local error_str="$9"

  local errors_json
  errors_json=$(python -c "
import json
if '$error_str':
    lines = '''$error_str'''.strip().split('\n')
    print(json.dumps(lines))
else:
    print('[]')
")
  write_result "$group" "$id" "$desc" "$passed" "$message" "$cart_before" "$history" "$resp" "$errors_json"
}

# write_final_report <llm_provider> <start_epoch> <end_epoch>
write_final_report() {
  local llm_provider="$1"
  local start_epoch="$2"
  local end_epoch="$3"
  local duration=$((end_epoch - start_epoch))

  python -c "
import json, os

report = {
    'timestamp': '$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')',
    'server': '$API_BASE',
    'llmProvider': '$llm_provider',
    'restaurantId': '$RESTAURANT_ID',
    'duration': $duration,
    'summary': {
        'pass': $PASS,
        'fail': $FAIL,
        'total': $((PASS + FAIL)),
    },
    'results': json.loads('''$REPORT_RESULTS'''),
}

with open('$REPORT_FILE', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(json.dumps(report['summary']))
"
  echo "  Reporte escrito: $REPORT_FILE"
}

# --- API ---

SCRIPT_DIR_CALL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# call_api <message> <cart_json> <history_json>
call_api() {
  local message="$1"
  local cart="$2"
  local history="$3"

  python "$SCRIPT_DIR_CALL/call_api.py" \
    "$API_BASE" \
    "$RESTAURANT_ID" \
    "$message" \
    "$cart" \
    "$history"
}

# --- ASSERTIONS ---

# assert_action <response_json> <expected_action> -> prints error, returns 0/1
assert_action() {
  local resp="$1"
  local expected="$2"
  local actual
  actual=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  if [ "$actual" = "$expected" ]; then
    echo ""
    return 0
  else
    local msg="action: esperado='$expected' obtenido='$actual'"
    echo "$msg"
    return 1
  fi
}

assert_cart_length() {
  local resp="$1"
  local expected="$2"
  local actual
  actual=$(echo "$resp" | python -c "import sys,json; print(len(json.load(sys.stdin).get('cart',[])))")
  if [ "$actual" -eq "$expected" ] 2>/dev/null; then
    echo ""
    return 0
  else
    echo "cart length: esperado=$expected obtenido=$actual"
    return 1
  fi
}

assert_cart_item() {
  local resp="$1"
  local idx="$2"
  local field="$3"
  local expected="$4"
  local actual
  actual=$(echo "$resp" | python -c "
import sys, json
data = json.load(sys.stdin)
cart = data.get('cart', [])
if $idx < len(cart):
    print(cart[$idx].get('$field', ''))
else:
    print('__no_item__')
")
  if [ "$actual" = "$expected" ]; then
    echo ""
    return 0
  else
    echo "cart[$idx].$field: esperado='$expected' obtenido='$actual'"
    return 1
  fi
}

assert_cart_item_by_name() {
  local resp="$1"
  local name="$2"
  local field="$3"
  local expected="$4"
  local actual
  actual=$(echo "$resp" | python -c "
import sys, json
data = json.load(sys.stdin)
cart = data.get('cart', [])
for item in cart:
    if item.get('name','').lower() == '$name'.lower():
        print(item.get('$field', ''))
        sys.exit(0)
print('__not_found__')
")
  if [ "$actual" = "$expected" ]; then
    echo ""
    return 0
  else
    echo "cart[$name].$field: esperado='$expected' obtenido='$actual'"
    return 1
  fi
}

assert_reply_contains() {
  local resp="$1"
  local keyword="$2"
  local reply
  reply=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('reply',''))")
  if echo "$reply" | grep -iq "$keyword"; then
    echo ""
    return 0
  else
    echo "reply no contiene '$keyword'"
    return 1
  fi
}

assert_reply_not_contains() {
  local resp="$1"
  local keyword="$2"
  local reply
  reply=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('reply',''))")
  if echo "$reply" | grep -iq "$keyword"; then
    echo "reply contiene (no debia) '$keyword'"
    return 1
  fi
  echo ""
  return 0
}

assert_invalid_items() {
  local resp="$1"
  local expected="$2"
  local actual
  actual=$(echo "$resp" | python -c "
import sys, json
items = json.load(sys.stdin).get('invalidItems', [])
print(','.join(items))
")
  if [ "$actual" = "$expected" ]; then
    echo ""
    return 0
  else
    echo "invalidItems: esperado='$expected' obtenido='$actual'"
    return 1
  fi
}

assert_no_error() {
  local resp="$1"
  local has_err
  has_err=$(echo "$resp" | python -c "import sys,json; d=json.load(sys.stdin); print('error' in d)")
  if [ "$has_err" = "True" ]; then
    local err_msg
    err_msg=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('error',''))")
    echo "API error: $err_msg"
    return 1
  fi
  echo ""
  return 0
}

# --- TEST RUNNER ---

# run_test <group> <id> <description> <message> <cart_before> <history> <assertions...>
run_test() {
  local group="$1"
  local id="$2"
  local desc="$3"
  local message="$4"
  local cart_before="$5"
  local history="$6"
  shift 6

  local resp
  resp=$(call_api "$message" "$cart_before" "$history")

  # Verificar que la API no devolvio error
  local err
  err=$(assert_no_error "$resp")
  if [ -n "$err" ]; then
    echo -e "${RED}❌ $group/$id: $desc${NC}"
    echo "  $err"
    echo "  response: $resp"
    write_result "$group" "$id" "$desc" false "$message" "$cart_before" "$history" "$resp" "[\"$err\"]"
    FAIL=$((FAIL + 1))
    return 1
  fi

  # Extraer tool calls para el reporte
  local tool_calls_str
  tool_calls_str=$(echo "$resp" | python -c "
import sys, json
data = json.load(sys.stdin)
tc = data.get('debug',{}).get('llmResponse',{}).get('toolCalls',[])
for t in tc:
    import json as j2
    print(f\"  tool: {t['name']} args={j2.dumps(t.get('args',{}))}\")
")

  local errors=0
  local error_msgs=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -a|--action)
        shift
        local ae; ae=$(assert_action "$resp" "$1")
        if [ -n "$ae" ]; then
          echo "  ${RED}✗ $ae${NC}"
          error_msgs="$error_msgs$ae\n"
          errors=$((errors + 1))
        fi
        shift
        ;;
      -l|--cart-length)
        shift
        local le; le=$(assert_cart_length "$resp" "$1")
        if [ -n "$le" ]; then
          echo "  ${RED}✗ $le${NC}"
          error_msgs="$error_msgs$le\n"
          errors=$((errors + 1))
        fi
        shift
        ;;
      -n|--cart-idx)
        shift
        local idx="$1"; shift
        local field="$1"; shift
        local val="$1"; shift
        local ie; ie=$(assert_cart_item "$resp" "$idx" "$field" "$val")
        if [ -n "$ie" ]; then
          echo "  ${RED}✗ $ie${NC}"
          error_msgs="$error_msgs$ie\n"
          errors=$((errors + 1))
        fi
        ;;
      -N|--cart-name)
        shift
        local cname="$1"; shift
        local cfield="$1"; shift
        local cval="$1"; shift
        local ne; ne=$(assert_cart_item_by_name "$resp" "$cname" "$cfield" "$cval")
        if [ -n "$ne" ]; then
          echo "  ${RED}✗ $ne${NC}"
          error_msgs="$error_msgs$ne\n"
          errors=$((errors + 1))
        fi
        ;;
      -r|--reply-contains)
        shift
        local re; re=$(assert_reply_contains "$resp" "$1")
        if [ -n "$re" ]; then
          echo "  ${RED}✗ $re${NC}"
          error_msgs="$error_msgs$re\n"
          errors=$((errors + 1))
        fi
        shift
        ;;
      -R|--reply-not)
        shift
        local rne; rne=$(assert_reply_not_contains "$resp" "$1")
        if [ -n "$rne" ]; then
          echo "  ${RED}✗ $rne${NC}"
          error_msgs="$error_msgs$rne\n"
          errors=$((errors + 1))
        fi
        shift
        ;;
      -i|--invalid)
        shift
        local inve; inve=$(assert_invalid_items "$resp" "$1")
        if [ -n "$inve" ]; then
          echo "  ${RED}✗ $inve${NC}"
          error_msgs="$error_msgs$inve\n"
          errors=$((errors + 1))
        fi
        shift
        ;;
      *)
        echo "  ${YELLOW}⚠ assertion desconocida: $1${NC}"
        shift
        ;;
    esac
  done

  # Build errors JSON
  local errors_json
  errors_json=$(python -c "
import json
lines = '''$error_msgs'''.strip().split('\n')
lines = [l for l in lines if l]
print(json.dumps(lines))
")

  if [ "$errors" -eq 0 ]; then
    local ms
    ms=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('debug',{}).get('llmMs',0))" 2>/dev/null)
    echo -e "  ${GREEN}✅ PASS${NC} (${ms}ms)"
    write_result "$group" "$id" "$desc" true "$message" "$cart_before" "$history" "$resp" "[]"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌ FAIL ($errors assertions failed)${NC}"
    echo -e "${CYAN}$tool_calls_str${NC}"
    echo "  cart result: $(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))" 2>/dev/null)"
    write_result "$group" "$id" "$desc" false "$message" "$cart_before" "$history" "$resp" "$errors_json"
    FAIL=$((FAIL + 1))
    FAILURES="$FAILURES\n  $group/$id: $desc"
  fi
}

# record_turn_result <group> <id> <desc> <passed> <message> <cart_before> <history> <response> <error_msg>
# For multi-turn tests (H-group) that use manual assertions
record_turn_result() {
  local group="$1"
  local id="$2"
  local desc="$3"
  local passed="$4"
  local message="$5"
  local cart_before="$6"
  local history="$7"
  local resp="$8"
  local error_msg="$9"

  local errors_json
  if [ "$passed" = true ]; then
    errors_json="[]"
  else
    errors_json=$(python -c "import json; print(json.dumps(['$error_msg']))")
  fi
  write_result "$group" "$id" "$desc" "$passed" "$message" "$cart_before" "$history" "$resp" "$errors_json"
}

print_summary() {
  echo ""
  echo "=========================================="
  echo -e "  ${GREEN}PASS: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  Total: $((PASS + FAIL))"
  if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo -e "${RED}FALLOS:${NC}$FAILURES"
  fi
  echo "=========================================="
}
