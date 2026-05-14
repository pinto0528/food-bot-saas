# Plan Híbrido: Intent Parser (LLM) + State Machine + Bot Guionado

## Arquitectura

```
User (texto libre)
    │
    ▼
┌─────────────────────┐
│  Intent Parser (LLM) │  ← solo entiende, NO decide
│  prompt: extract     │
│  {intent, items}     │
└────────┬────────────┘
         │ {intent: "add_item", items: [...]}
         ▼
┌─────────────────────┐
│  State Machine      │  ← valida, modifica carrito, elige reply
│  estados + reglas   │
└────────┬────────────┘
         │ reply guionado + cart + newState
         ▼
┌─────────────────────┐
│     Bot Response    │  ← texto 100% predecible
└─────────────────────┘
```

## Responsabilidades

| Capa | Hace | No hace |
|---|---|---|
| **Intent Parser (LLM)** | Texto libre → `{intent, items}` | Decidir respuestas, modificar carrito |
| **State Machine** | Validar intent, mutar cart, elegir reply | Alucinar, inventar políticas |
| **Bot Response** | Texto guionado por estado | Depender del LLM |

## Intent Parser

### Prompt
```
Sos un extractor de pedidos para El Buen Sabor.
Devolvé SOLO JSON SIN markdown ni explicaciones.

MENU:
{menu_formateado}

INSTRUCCIONES:
- "nono quiero solo 2 hamburguesas" → set_cart (reemplaza todo)
- "quiero 2 hamburguesas" → add_item
- "saca las cocas" → remove_item  
- "gracias", "hola", "chau" → chitchat
- "a qué hora abren", "hacen delivery?" → chitchat
- "confirmo", "dale", "confirmar" → confirm
- "cancela", "cancelar", "nada" → cancel
- "mostrame", "carrito", "resumen" → show_summary
- Items fuera del menú → NO los incluyas en "items"
- NUNCA inventes nombres ni precios

RESPUESTA:
{"intent": "...", "items": [{"name": "...", "qty": N}], "text": "..."}
- "text" solo para chitchat (respuesta amigable)
- "items" vacío para confirm, cancel, show_summary, chitchat
```

### Output esperado del LLM

```json
{"intent": "add_item", "items": [{"name": "Hamburguesa Clasica", "qty": 2}]}
{"intent": "set_cart", "items": [{"name": "Hamburguesa Clasica", "qty": 1}]}
{"intent": "remove_item", "items": [{"name": "Coca-Cola"}]}
{"intent": "confirm"}
{"intent": "cancel"}
{"intent": "show_summary"}
{"intent": "chitchat", "text": "gracias por tu consulta"}
```

## State Machine

### Estados

```
GREETING
  → user habla → ORDERING o CHITCHAT

ORDERING
  → add_item → ADD_MORE
  → set_cart → ADD_MORE
  → remove_item → ADD_MORE
  → show_summary → ADD_MORE
  → confirm → CONFIRM
  → cancel → CANCEL
  → chitchat → ORDERING (mismo estado)

ADD_MORE
  → add_item → ADD_MORE
  → set_cart → ADD_MORE
  → remove_item → ADD_MORE
  → show_summary → ADD_MORE
  → confirm → CONFIRM
  → cancel → CANCEL
  → chitchat → ADD_MORE (pregunta de nuevo)

CONFIRM
  → confirm → DONE
  → cancel → ORDERING
  → chitchat → CONFIRM (pregunta de nuevo)

DONE
  → cualquier cosa → GREETING

CANCEL
  → cualquier cosa → GREETING
```

### Respuestas guionadas por estado

```typescript
const REPLIES = {
  GREETING: {
    default: "¡Bienvenido a {restaurant}! ¿Qué te gustaría pedir?",
    chitchat: "{respuesta_amigable}. ¿Querés ver nuestro menú?"
  },
  ORDERING: {
    add_item: "Listo, agregué {items}. ¿Querés algo más? (Si / No)",
    set_cart: "Ok, cambié tu pedido a {items}. ¿Algo más?",
    remove_item: "Listo, saqué {items}. ¿Algo más?",
    show_summary: "{resumen}. ¿Querés modificar algo o confirmar?",
    invalid: "Disculpa, no tenemos {item}. Tenemos: {menu_resumido}",
    chitchat: "{respuesta}. ¿Querés ver el menú?"
  },
  ADD_MORE: {
    add_item: "Listo, agregué {items}. ¿Algo más?",
    set_cart: "Ok, cambié a {items}. ¿Algo más?",
    remove_item: "Listo, saqué {items}. ¿Algo más?",
    show_summary: "{resumen}. ¿Querés modificar algo o confirmar?",
    confirm: "{resumen_total}. ¿Confirmás el pedido? (Si / No)",
    cancel: "¿Estás seguro? Se borrará todo el pedido.",
    invalid: "Disculpa, no tenemos {item}. Tenemos: {menu_resumido}",
    chitchat: "{respuesta}. ¿Querés agregar algo más al pedido?"
  },
  CONFIRM: {
    confirm: "¡Pedido confirmado! Gracias por tu compra.",
    cancel: "Ok, volvamos. ¿Qué querés modificar?",
    chitchat: "{resumen_total}. ¿Confirmás el pedido?"
  },
  DONE: {
    default: "¡Gracias! Si querés pedir de nuevo, decime 'hola'."
  },
  CANCEL: {
    default: "Pedido cancelado. Si querés empezar de nuevo, decime 'hola'."
  }
}
```

### Reglas de validación

1. **Items fuera del menú** → intent sigue siendo `add_item` pero items=[], y se agrega `invalidItems` al resultado
2. **Carrito vacío + confirm** → reply "No tenés nada en el carrito"
3. **remove_item + item no está** → igual se responde "Listo, saqué..." (no falla)
4. **set_cart con items duplicados** → se mergean (sumar qty)
5. **LLM devuelve JSON inválido** → se retorna `{intent: "chitchat", text: "Disculpa, no entendí. ¿Podés repetir?"}`
6. **LLM devuelve intent desconocido** → mismo fallback que JSON inválido

## Archivos a crear

| Archivo | Rol |
|---|---|
| `src/lib/intent-parser.ts` | Prompt + parseo del LLM para extraer `{intent, items}` |
| `src/lib/order-flow.ts` | State machine: estados, transiciones, respuestas guionadas |
| `src/lib/types.ts` (agregar tipos) | `ConversationState`, `IntentResult` |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/llm.ts` | Agregar `processIntent()` — llamada a LLM con prompt extractor. Sacar CHAT_TOOLS |
| `src/lib/prompts.ts` | Agregar `buildIntentPrompt()` |
| `src/lib/chat.ts` | Reemplazar tool-calling del LLM por **intent parser + state machine** |
| `src/lib/actions.ts` | Simplificar o eliminar (la state machine muta el cart) |
| `src/app/api/chat/route.ts` | Agregar `state` al request/response |
| WhatsApp handler | Guardar `state` en `conversations.context` |
| E2E tests (`tests/e2e/`) | Tests deterministas, no dependen del LLM |

## Tipos nuevos (`src/lib/types.ts`)

```typescript
export type ConversationState =
  | 'GREETING'
  | 'ORDERING'
  | 'ADD_MORE'
  | 'CONFIRM'
  | 'DONE'
  | 'CANCEL'

export type IntentType =
  | 'add_item'
  | 'set_cart'
  | 'remove_item'
  | 'show_summary'
  | 'confirm'
  | 'cancel'
  | 'chitchat'

export interface IntentResult {
  intent: IntentType
  items?: { name: string; qty?: number }[]
  text?: string
}

export interface StateResult {
  reply: string
  action: string
  cart: OrderItem[]
  state: ConversationState
  invalidItems?: string[]
}
```

## API Route — Formato request/response

### Request
```json
{
  "message": "quiero 2 hamburguesas",
  "restaurantId": "...",
  "cart": [],
  "history": [],
  "state": "GREETING"
}
```

### Response
```json
{
  "reply": "Listo, agregué 2x Hamburguesa Clasica. ¿Algo más?",
  "action": "add_item",
  "cart": [{ "name": "Hamburguesa Clasica", "qty": 2, "price": 8.5 }],
  "history": [...],
  "state": "ADD_MORE"
}
```

## Integración con WhatsApp

El webhook handler (`handler.ts`) ya guarda `context.items` en la DB. Se agrega `context.state`. En cada mensaje:
1. Leer `conversations.context.state` (default `"GREETING"`)
2. Pasar al state machine junto con cart e history
3. Guardar `state` actualizado en `context.state`

## Tests

### Unit tests (`tests/chat.test.ts`)
- Intent parser: mensaje → JSON esperado
- State machine: cada estado + cada intent → reply + newState correctos
- Edge cases: carrito vacío, items inválidos, LLM falla

### E2E tests (`tests/e2e/`)
- Reemplazar llamadas reales a LLM por mocks
- Tests deterministas (~100ms cada uno)

## Orden de implementación sugerido

1. `src/lib/types.ts` — agregar tipos nuevos
2. `src/lib/intent-parser.ts` — prompt + parseo del LLM
3. `src/lib/order-flow.ts` — state machine + respuestas guionadas
4. `src/lib/chat.ts` — integrar intent parser + state machine
5. `src/app/api/chat/route.ts` — agregar `state`
6. Actualizar WhatsApp handler
7. Tests unitarios
8. Tests E2E
9. Limpiar archivos viejos (`actions.ts`, `prompts.ts`, `llm.ts`)
