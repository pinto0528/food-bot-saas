# Fase 3 — Bot WhatsApp + LLM: Desglose detallado

## Paso 3.1 — Webhook de verificacion (GET + POST)

**Endpoint:** `src/app/api/webhook/route.ts`

### GET
Meta envia un handshake de verificacion:
```http
GET /api/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```
- Verificar que `hub.verify_token` coincide con el token del restaurante
- Devolver `hub.challenge` como texto plano con status 200
- Si no coincide, devolver 403

### POST
Meta envia mensajes entrantes:
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "metadata": { "phone_number_id": "123" },
        "messages": [{
          "from": "521234567890",
          "text": { "body": "Hola" }
        }]
      }
    }]
  }]
}
```
- Responder 200 inmediatamente (evita reenvios)
- Extraer: `phone_number_id`, `from` (cliente), `text.body`
- Pasar a handler (Paso 3.5)
- Responder 200 a Meta

**Archivos:** `src/app/api/webhook/route.ts`

---

## Paso 3.2 — WhatsApp message sender

**Archivo:** `src/lib/whatsapp.ts`

Funcion:
```typescript
export async function sendWhatsAppMessage(
  token: string,     // waba_token del restaurante
  phoneNumberId: string,
  to: string,
  text: string
): Promise<boolean>
```

- POST a `https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Body: `{ messaging_product: 'whatsapp', to, type: 'text', text: { body } }`
- Retorna true si fue exitoso, false si fallo
- Loguea errores en `error_logs`

---

## Paso 3.3 — LLM integracion

### Groq (`src/lib/groq.ts`)
```typescript
export function getGroqClient(): Groq
export async function processWithGroq(messages: any[]): Promise<LLMResponse>
```
- Modelo: `llama3-70b-8192`
- Temperature: 0.3
- `response_format: { type: 'json_object' }`
- API Key de `process.env.GROQ_API_KEY`

### OpenAI (`src/lib/openai.ts`)
```typescript
export function getOpenAIClient(): OpenAI
export async function processWithOpenAI(messages: any[]): Promise<LLMResponse>
```
- Modelo: `gpt-4o-mini`
- Temperature: 0.3
- `response_format: { type: 'json_object' }`
- API Key de `process.env.OPENAI_API_KEY`

### LLM Factory (`src/lib/llm.ts`)
```typescript
export async function processWithLLM(messages: any[]): Promise<LLMResponse>
```
- Si `OPENAI_API_KEY` esta definida → usa OpenAI
- Si no → usa Groq
- Unifica la interfaz

---

## Paso 3.4 — System prompt + action parser

**Archivo:** `src/lib/prompts.ts`

Funcion `buildSystemPrompt(restaurant, menuItems, context, history)`:
```
Eres un asistente de pedidos para {restaurant.name}.
Tu objetivo es ayudar al cliente a realizar su pedido.

MENU:
{categorias y items con precios}

ESTADO ACTUAL:
- Carrito: {items agregados}
- Total parcial: ${total}

REGLAS:
- Responde siempre en español, amigable y conciso
- Si el cliente pide algo del menu, agregalo al carrito
- Si pide algo que no existe, sugerile alternativas del menu
- Cuando el cliente quiera confirmar, muestra resumen y total
- NUNCA inventes precios o items que no esten en el menu
- Responde SOLO con JSON valido

FORMATO DE RESPUESTA:
{
  "action": "add_item" | "remove_item" | "show_summary" | "confirm_order" | "ask_clarify" | "cancel" | "greeting",
  "message": "texto para el cliente",
  "items": [{"name": "", "qty": 1, "notes": ""}],
  "clarification_needed": false
}
```

**Archivo:** `src/lib/actions.ts`

Funcion `executeAction(action, data, conversation, restaurant)`: ejecuta la accion:
- `add_item` → agregar items al `context.items` en DB
- `remove_item` → quitar items
- `show_summary` → solo mostrar resumen
- `confirm_order` → crear `order` en DB, enviar notificacion al restaurante, cerrar conversacion
- `ask_clarify` → solo responder mensaje
- `cancel` → limpiar carrito
- `greeting` → solo responder mensaje

---

## Paso 3.5 — Message handler pipeline

**Archivo:** `src/lib/webhook/handler.ts`

Pipeline completo:

```
1. Recibir payload de Meta
2. Extraer datos (phone_number_id, from, text)
3. Buscar restaurante en DB por phone_number_id
4. Si no se encuentra restaurante → loguear error, responder 200
5. Buscar conversacion activa para cliente + restaurante
6. Si no existe → crear nueva conversacion (status: ordering)
7. Si existe y esta closed → resetear a ordering
8. Agregar mensaje del cliente al historial
9. Construir system prompt (Paso 3.4)
10. Llamar al LLM (Paso 3.3)
11. Validar respuesta JSON
12. Ejecutar accion (Paso 3.4)
13. Agregar respuesta del bot al historial
14. Actualizar conversation en DB
15. Enviar respuesta al cliente via WhatsApp
16. Loggear todo
```

---

## Paso 3.6 — Restaurant notification flow

**Archivo:** `src/lib/webhook/notifications.ts`

Cuando se confirma un pedido (`confirm_order`):
```typescript
export async function sendOrderToRestaurant(order, restaurant)
```
- Enviar mensaje al WhatsApp del restaurante con resumen del pedido
- Formato con emojis y estructura clara
- Opciones: 1 = Confirmar, 2 = Cancelar, 3 = Llamar

**Cuado el restaurante responde:**
- El mensaje del restaurante llega al webhook igual que cualquier otro
- Detectar si es un restaurante respondiendo (basado en phone_number_id)
- Parsear: "1" → confirmar, "2" → cancelar, "3" → enviar numero
- Actualizar estado del pedido en DB
- Enviar mensaje de confirmacion al cliente

**Identificar si un mensaje es del restaurante:**
- Si el `from` del mensaje entrante coincide con el `phone` del restaurante
- O si el `phone_number_id` destino NO es del restaurante (es decir, el mensaje llega al numero del cliente, lo cual no pasa normalmente)

**Enfoque simplificado:** El restaurante responde a su propio numero (el mismo webhook). Cuando el webhook recibe un mensaje:
1. Buscar restaurante por `phone_number_id` destino
2. Verificar si el `from` coincide con el `phone` del restaurante
3. Si coincide → es respuesta del restaurante → procesar confirmacion
4. Si no coincide → es mensaje de cliente → procesar pedido

---

## Paso 3.7 — Error handling + logging

**Archivo:** `src/lib/webhook/errors.ts`

```typescript
export async function logError(
  supabase, 
  restaurantId: string | null, 
  type: ErrorLogType, 
  message: string, 
  details?: any
)
```
- Insertar en `error_logs`
- Tipos: `webhook`, `llm`, `whatsapp`, `auth`

**Casos:**
- Webhook malformado → log y 200
- Restaurante no encontrado → log
- LLM rate limit → mensaje generico, log
- LLM timeout → mensaje generico, log
- LLM respuesta invalida → reintentar 1 vez, si falla → mensaje generico
- WhatsApp send fail → log, no bloquear respuesta
- Error de DB → log, responder mensaje generico

---

## Paso 3.8 — Variables de entorno

Agregar a `.env.local`:
```
GROQ_API_KEY=gsk_tu_key_aqui
```

Para produccion en Vercel:
```
OPENAI_API_KEY=sk_tu_key_aqui
```

---

## Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `src/app/api/webhook/route.ts` | Modificar (GET + POST) |
| `src/lib/whatsapp.ts` | Crear |
| `src/lib/groq.ts` | Crear |
| `src/lib/openai.ts` | Crear |
| `src/lib/llm.ts` | Crear |
| `src/lib/prompts.ts` | Crear |
| `src/lib/actions.ts` | Crear |
| `src/lib/webhook/handler.ts` | Crear |
| `src/lib/webhook/notifications.ts` | Crear |
| `src/lib/webhook/errors.ts` | Crear |
