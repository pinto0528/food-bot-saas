# scenarios.sh - Definiciones de todos los tests E2E
# Cada funcion ejecuta un grupo de tests usando run_test()

source "$(dirname "${BASH_SOURCE[0]}")/utils.sh"

EMPTY_CART='[]'
EMPTY_HISTORY='[]'

run_group_a_primer_mensaje() {
  echo -e "\n${YELLOW}=== GRUPO A: Primer mensaje ===${NC}"

  # A1: Saludo simple
  run_test "A" "1" "saludo simple" \
    "hola" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a none

  # A2: Saludo + pedido en un mensaje
  run_test "A" "2" "saludo + pedido en 1 mensaje" \
    "hola quiero 2 hamburguesas clasicas" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a add_item \
    -l 1 \
    -n 0 name "Hamburguesa Clasica" \
    -n 0 qty 2

  # A3: Pedido multiple desde el vamos
  run_test "A" "3" "pedido multiple desde el vamos" \
    "quiero 4 hamburguesas clasicas y 2 cocas" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a add_item \
    -l 2 \
    -N "Hamburguesa Clasica" qty 4 \
    -N "Coca-Cola" qty 2

  # A4: Off-topic, no debe llamar tools
  run_test "A" "4" "off-topic: horarios" \
    "a que hora abren" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a none \
    -r "No tengo"

  # A5: Notas en el primer pedido
  run_test "A" "5" "pedido con notas" \
    "2 hamburguesas sin cebolla" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a add_item \
    -l 1 \
    -n 0 qty 2 \
    -r "sin cebolla"
}

run_group_b_agregar_items() {
  echo -e "\n${YELLOW}=== GRUPO B: Agregar items ===${NC}"

  local cart_hc2='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""}]'

  # B1: Agregar item nuevo
  run_test "B" "1" "agregar item nuevo al carrito" \
    "agregame una coca" "$cart_hc2" "$EMPTY_HISTORY" \
    -a add_item \
    -l 2 \
    -N "Coca-Cola" qty 1

  # B2: Agregar mas del mismo item (acumula)
  run_test "B" "2" "agregar mas del mismo item (acumulacion correcta)" \
    "ponele 2 hamburguesas mas" "$cart_hc2" "$EMPTY_HISTORY" \
    -a add_item \
    -l 1 \
    -n 0 qty 4

  # B3: Item invalido
  run_test "B" "3" "item invalido no se agrega" \
    "agrega una pizza" "$cart_hc2" "$EMPTY_HISTORY" \
    -a add_item \
    -l 1 \
    -i "Pizza"

  # B4: Mezcla valido + invalido
  run_test "B" "4" "mezcla item valido e invalido" \
    "2 hamburguesas y una pizza" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a add_item \
    -l 1 \
    -n 0 qty 2 \
    -i "Pizza"
}

run_group_c_reemplazo() {
  echo -e "\n${YELLOW}=== GRUPO C: Reemplazo de carrit ===${NC}"

  local cart_4_2='[{"name":"Hamburguesa Clasica","qty":4,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":2,"price":1.5,"notes":""}]'
  local cart_10_5='[{"name":"Hamburguesa Clasica","qty":10,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":5,"price":1.5,"notes":""}]'
  local cart_hc4='[{"name":"Hamburguesa Clasica","qty":4,"price":8.5,"notes":""}]'
  local cart_hc2='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""}]'

  # C1: "nono quiero solo X" → set_cart
  run_test "C" "1" "nono quiero solo 2 hamburguesas (reemplazo total)" \
    "nono quiero solo 2 hamburguesas" "$cart_4_2" "$EMPTY_HISTORY" \
    -a set_item \
    -l 1 \
    -n 0 qty 2 \
    -R "agreg"

  # C2: "mejor poneme X" → set_cart con items mezclados
  run_test "C" "2" "mejor poneme 3 cocas y 2 papas fritas" \
    "mejor poneme 3 cocas y 2 papas fritas" "$cart_4_2" "$EMPTY_HISTORY" \
    -a set_item \
    -l 2 \
    -N "Coca-Cola" qty 3 \
    -N "Papas Fritas" qty 2

  # C3: "cambialo a X" → set_cart
  run_test "C" "3" "cambialo a 1 hamburguesa nomas" \
    "cambialo a 1 hamburguesa nomas" "$cart_4_2" "$EMPTY_HISTORY" \
    -a set_item \
    -l 1 \
    -n 0 qty 1

  # C4: "no, nada de eso, quiero X" → set_cart con item diferente
  run_test "C" "4" "no nada de eso quiero milanesa napolitana" \
    "no nada de eso quiero milanesa napolitana" "$cart_4_2" "$EMPTY_HISTORY" \
    -a set_item \
    -l 1 \
    -n 0 name "Milanesa Napolitana"

  # C5: CASO REAL DE LOS LOGS - acumulacion 10→2
  run_test "C" "5" "DE NUEVO no quiero tantas solamente 2 hamburguesas y una coca" \
    "DE NUEVO no quiero tantas solamente 2 hamburguesas y una coca" "$cart_10_5" "$EMPTY_HISTORY" \
    -a set_item \
    -l 2 \
    -N "Hamburguesa Clasica" qty 2 \
    -N "Coca-Cola" qty 1

  # C6: Cambio de variante (Hamburguesa Clasica → Completa)
  run_test "C" "6" "en realidad quiero 2 hamburguesas completas (cambio variante)" \
    "en realidad quiero 2 hamburguesas completas" "$cart_hc2" "$EMPTY_HISTORY" \
    -a set_item \
    -l 1 \
    -n 0 name "Hamburguesa Completa"
}

run_group_d_sacar_items() {
  echo -e "\n${YELLOW}=== GRUPO D: Sacar items ===${NC}"

  local cart_hc2_cocax2='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":2,"price":1.5,"notes":""}]'
  local cart_hc2='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""}]'
  local cart_mixto='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":2,"price":1.5,"notes":""},{"name":"Papas Fritas","qty":1,"price":3.5,"notes":""}]'

  # D1: Sacar item existente
  run_test "D" "1" "sacar item existente" \
    "saca las cocas" "$cart_hc2_cocax2" "$EMPTY_HISTORY" \
    -a remove_item \
    -l 1 \
    -n 0 name "Hamburguesa Clasica"

  # D2: Sacar item inexistente (no pasa nada)
  run_test "D" "2" "sacar item inexistente" \
    "saca la pizza" "$cart_hc2" "$EMPTY_HISTORY" \
    -a remove_item \
    -l 1

  # D3: Sacar todo
  run_test "D" "3" "sacar todo" \
    "saca todo" "$cart_mixto" "$EMPTY_HISTORY" \
    -l 0
}

run_group_e_acumulacion_espuria() {
  echo -e "\n${YELLOW}=== GRUPO E: Acumulacion espuria (SIN CAMBIOS) ===${NC}"

  local cart_hc2_coca='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":1,"price":1.5,"notes":""}]'

  # E1-E5: Todas estas respuestas NO deben modificar el carrito
  for test_case in \
    "E:1:ok gracias:ok gracias" \
    "E:2:dale:dale" \
    "E:3:perfecto:perfecto" \
    "E:4:listo:listo" \
    "E:5:y ahora:y ahora?"
  do
    IFS=':' read -r grp tid tdesc tmsg <<< "$test_case"
    run_test "$grp" "$tid" "\"$tmsg\" no debe modificar el carrito" \
      "$tmsg" "$cart_hc2_coca" "$EMPTY_HISTORY" \
      -a none \
      -l 2 \
      -N "Hamburguesa Clasica" qty 2 \
      -N "Coca-Cola" qty 1
  done
}

run_group_f_confirmar_cancelar() {
  echo -e "\n${YELLOW}=== GRUPO F: Confirmar / Cancelar ===${NC}"

  local cart_hc2_coca='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":1,"price":1.5,"notes":""}]'
  local cart_hc4='[{"name":"Hamburguesa Clasica","qty":4,"price":8.5,"notes":""}]'

  # F1: Confirmar pedido con items
  run_test "F" "1" "confirmar pedido con items" \
    "confirmo el pedido" "$cart_hc2_coca" "$EMPTY_HISTORY" \
    -a confirm_order \
    -l 0

  # F2: Cancelar pedido
  run_test "F" "2" "cancelar pedido" \
    "cancela todo" "$cart_hc4" "$EMPTY_HISTORY" \
    -a cancel \
    -l 0

  # F3: Confirmar con carrito vacio (no debe explotar)
  run_test "F" "3" "confirmar con carrito vacio" \
    "confirmo" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -l 0
}

run_group_g_resumen() {
  echo -e "\n${YELLOW}=== GRUPO G: Resumen ===${NC}"

  local cart_hc2_coca='[{"name":"Hamburguesa Clasica","qty":2,"price":8.5,"notes":""},{"name":"Coca-Cola","qty":1,"price":1.5,"notes":""}]'

  # G1: Mostrar resumen
  run_test "G" "1" "mostrar resumen del pedido" \
    "mostrame el pedido" "$cart_hc2_coca" "$EMPTY_HISTORY" \
    -a show_summary

  # G2: Preguntar total
  run_test "G" "2" "preguntar cuanto sale todo" \
    "cuanto sale todo" "$cart_hc2_coca" "$EMPTY_HISTORY" \
    -a show_summary \
    -r "18"
}

run_group_h_multiturno() {
  echo -e "\n${YELLOW}=== GRUPO H: Conversaciones multi-turno ===${NC}"

  # H1: Flujo completo feliz
  echo -e "\n${CYAN}--- H1: Flujo completo (saludo → pedido → agregar → confirmar) ---${NC}"
  local h1_cart='[]'
  local h1_history='[]'

  resp=$(call_api "hola" "$h1_cart" "$h1_history")
  h1_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h1_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h1_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 1 (hola): action=$h1_action"
  if [ "$h1_action" = "none" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "1a" "saludo inicial" true "hola" "$EMPTY_CART" "$EMPTY_HISTORY" "$resp" ""
  else
    echo -e "  ${RED}  ❌ se esperaba none${NC}"
    record_turn_result "H" "1a" "saludo inicial" false "hola" "$EMPTY_CART" "$EMPTY_HISTORY" "$resp" "se esperaba none"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  resp=$(call_api "quiero 2 hamburguesas clasicas" "$h1_cart" "$h1_history")
  h1_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h1_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h1_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 2 (2 hamburguesas): action=$h1_action cart=$h1_cart"
  if [ "$h1_action" = "add_item" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "1b" "pedir 2 hamburguesas" true "quiero 2 hamburguesas clasicas" "$h1_cart" "$h1_history" "$resp" ""
  else
    echo -e "  ${RED}  ❌ se esperaba add_item${NC}"
    record_turn_result "H" "1b" "pedir 2 hamburguesas" false "quiero 2 hamburguesas clasicas" "$h1_cart" "$h1_history" "$resp" "se esperaba add_item"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  resp=$(call_api "y una coca" "$h1_cart" "$h1_history")
  h1_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h1_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h1_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 3 (y una coca): action=$h1_action cart=$h1_cart"
  if [ "$h1_action" = "add_item" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "1c" "agregar una coca" true "y una coca" "$h1_cart" "$h1_history" "$resp" ""
  else
    echo -e "  ${RED}  ❌ se esperaba add_item${NC}"
    record_turn_result "H" "1c" "agregar una coca" false "y una coca" "$h1_cart" "$h1_history" "$resp" "se esperaba add_item"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  resp=$(call_api "confirmo" "$h1_cart" "$h1_history")
  h1_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  echo "  Turno 4 (confirmo): action=$h1_action"
  if [ "$h1_action" = "confirm_order" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "1d" "confirmar pedido" true "confirmo" "$h1_cart" "$h1_history" "$resp" ""
  else
    echo -e "  ${RED}  ❌ se esperaba confirm_order${NC}"
    record_turn_result "H" "1d" "confirmar pedido" false "confirmo" "$h1_cart" "$h1_history" "$resp" "se esperaba confirm_order"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  # H2: Pedido → correccion → agregar
  echo -e "\n${CYAN}--- H2: Pedido → correccion (set_cart) → agregar ---${NC}"
  local h2_cart='[]'
  local h2_history='[]'

  resp=$(call_api "quiero 2 hamburguesas clasicas" "$h2_cart" "$h2_history")
  h2_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h2_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h2_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 1 (2 hamburguesas): action=$h2_action cart=$h2_cart"
  if [ "$h2_action" = "add_item" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "2a" "pedir 2 hamburguesas" true "quiero 2 hamburguesas clasicas" "$EMPTY_CART" "$EMPTY_HISTORY" "$resp" ""
  else
    echo -e "  ${RED}  ❌${NC}"
    record_turn_result "H" "2a" "pedir 2 hamburguesas" false "quiero 2 hamburguesas clasicas" "$EMPTY_CART" "$EMPTY_HISTORY" "$resp" "se esperaba add_item"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  resp=$(call_api "nono 1 nomas" "$h2_cart" "$h2_history")
  h2_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h2_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h2_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 2 (nono 1 nomas): action=$h2_action cart=$h2_cart"
  local h2_pass=false
  local h2_err=""
  if [ "$h2_action" = "set_item" ] && echo "$h2_cart" | python -c "import sys,json; d=json.load(sys.stdin); assert len(d)==1 and d[0]['qty']==1" 2>/dev/null; then
    h2_pass=true
    echo -e "  ${GREEN}  ✅${NC}"
  else
    h2_err="se esperaba set_item con 1 item qty=1"
    echo -e "  ${RED}  ❌ $h2_err${NC}"
    FAIL=$((FAIL+1))
  fi
  record_turn_result "H" "2b" "nono 1 nomas (set_cart)" "$h2_pass" "nono 1 nomas" "$h2_cart" "$h2_history" "$resp" "$h2_err"
  PASS=$((PASS + 1))

  resp=$(call_api "y una coca" "$h2_cart" "$h2_history")
  h2_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h2_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  echo "  Turno 3 (y una coca): action=$h2_action cart=$h2_cart"
  if [ "$h2_action" = "add_item" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "2c" "agregar coca despues de correccion" true "y una coca" "$h2_cart" "$h2_history" "$resp" ""
  else
    echo -e "  ${RED}  ❌${NC}"
    record_turn_result "H" "2c" "agregar coca despues de correccion" false "y una coca" "$h2_cart" "$h2_history" "$resp" "se esperaba add_item"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  # H3: REPRODUCCION DEL BUG REAL (el caso exacto de los logs)
  echo -e "\n${CYAN}--- H3: REPRODUCCION DEL BUG REAL (acumulacion evitada) ---${NC}"
  local h3_cart='[]'
  local h3_history='[]'

  resp=$(call_api "quiero 2 hamburguesas clasicas y una coca" "$h3_cart" "$h3_history")
  h3_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h3_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h3_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 1 (2 hamburguesas + coca): action=$h3_action cart=$h3_cart"
  if [ "$h3_action" = "add_item" ]; then
    echo -e "  ${GREEN}  ✅${NC}"
    record_turn_result "H" "3a" "pedido inicial" true "quiero 2 hamburguesas clasicas y una coca" "$h3_cart" "$h3_history" "$resp" ""
  else
    echo -e "  ${RED}  ❌${NC}"
    record_turn_result "H" "3a" "pedido inicial" false "quiero 2 hamburguesas clasicas y una coca" "$h3_cart" "$h3_history" "$resp" "se esperaba add_item"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  # Turno 2: usuario dice "ok gracias" → NO debe acumular
  resp=$(call_api "ok gracias" "$h3_cart" "$h3_history")
  h3_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h3_cart_before_set=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  h3_history=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('history',[])))")
  echo "  Turno 2 (ok gracias): action=$h3_action cart=$h3_cart_before_set"
  if [ "$h3_action" = "none" ]; then
    echo -e "  ${GREEN}  ✅ sin acumulacion${NC}"
    record_turn_result "H" "3b" "ok gracias sin acumular" true "ok gracias" "$h3_cart" "$h3_history" "$resp" ""
  else
    local accum_err="acumulo! action=$h3_action"
    echo -e "  ${RED}  ❌ $accum_err${NC}"
    record_turn_result "H" "3b" "ok gracias sin acumular" false "ok gracias" "$h3_cart" "$h3_history" "$resp" "$accum_err"
    FAIL=$((FAIL+1))
  fi
  PASS=$((PASS + 1))

  # Turno 3: "nono quiero solo 2 hamburguesas" → DEBE usar set_cart, NO add_to_cart
  resp=$(call_api "nono quiero solo 2 hamburguesas" "$h3_cart_before_set" "$h3_history")
  h3_action=$(echo "$resp" | python -c "import sys,json; print(json.load(sys.stdin).get('action',''))")
  h3_cart=$(echo "$resp" | python -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('cart',[])))")
  echo "  Turno 3 (nono solo 2): action=$h3_action cart=$h3_cart"
  local h3_pass=false
  local h3_err=""
  if [ "$h3_action" = "set_item" ]; then
    qty=$(echo "$h3_cart" | python -c "import sys,json; print(json.load(sys.stdin)[0]['qty'])" 2>/dev/null)
    if [ "$qty" = "2" ]; then
      h3_pass=true
      echo -e "  ${GREEN}  ✅ set_item con qty=2${NC}"
    else
      h3_err="set_item pero qty=$qty (esperado 2)"
      echo -e "  ${RED}  ❌ $h3_err${NC}"
    fi
  elif [ "$h3_action" = "add_item" ]; then
    h3_err="USO add_to_cart EN VEZ DE set_cart (BUG)"
    echo -e "  ${RED}  ❌ $h3_err${NC}"
  else
    h3_err="action inesperada: $h3_action"
    echo -e "  ${RED}  ❌ $h3_err${NC}"
  fi
  if [ "$h3_pass" = false ]; then FAIL=$((FAIL+1)); fi
  record_turn_result "H" "3c" "nono solo 2 (set_cart)" "$h3_pass" "nono quiero solo 2 hamburguesas" "$h3_cart_before_set" "$h3_history" "$resp" "$h3_err"
  PASS=$((PASS + 1))
}

run_group_i_edge_cases() {
  echo -e "\n${YELLOW}=== GRUPO I: Edge cases ===${NC}"

  # I1: "no se"
  run_test "I" "1" "no se (respuesta vaga)" \
    "no se" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a none

  # I2: Pregunta sobre delivery
  run_test "I" "2" "pregunta sobre delivery (politica)" \
    "hacen delivery?" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a none \
    -r "No tengo"

  # I3: Caracteres especiales
  run_test "I" "3" "solo caracteres especiales" \
    ". - ." "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a none

  # I4: Mayusculas
  run_test "I" "4" "todo en mayusculas" \
    "QUIERO 2 HAMBURGUESAS CLASICAS" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -a add_item \
    -l 1 \
    -n 0 qty 2

  # I5: Sin espacios
  run_test "I" "5" "sin espacios entre item y cantidad" \
    "2hamburguesas y 1coca" "$EMPTY_CART" "$EMPTY_HISTORY" \
    -l 2
}

run_all_scenarios() {
  run_group_a_primer_mensaje
  run_group_b_agregar_items
  run_group_c_reemplazo
  run_group_d_sacar_items
  run_group_e_acumulacion_espuria
  run_group_f_confirmar_cancelar
  run_group_g_resumen
  run_group_h_multiturno
  run_group_i_edge_cases
}
