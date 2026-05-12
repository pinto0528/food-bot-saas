# Fase 3: Bot WhatsApp + LLM

**Objetivo:** Bot conversacional que recibe pedidos via WhatsApp usando LLM para entender lenguaje natural.

## Pasos

### 3.1 Webhook de verificacion

Endpoint: `POST /api/webhook`

- Verificar token de Meta (`hub.verify_token`) en el handshake inicial
- Recibir mensajes entrantes via POST
- Identificar el restaurante destinatario usando `entry[0].changes[0].value.metadata.phone_number_id`
- Responder `200 OK` a Meta inmediatamente para evitar reenvios

### 3.2 Procesador de mensajes

Logica principal en `src/lib/webhook/handler.ts`:

```
1. Recibir payload de Meta
2. Extraer: phone_number_id destino, numero del cliente, texto del mensaje
3. Buscar restaurante en DB por phone_number_id
4. Buscar/crear conversacion activa para ese cliente + restaurante
5. Construir system prompt (ver 3.3)
6. Llamar al LLM (Groq en dev, GPT-4o-mini en prod)
7. Parsear respuesta estructurada del LLM
8. Ejecutar accion (actualizar DB, enviar respuesta WhatsApp)
9. Registrar en logs
```

### 3.3 System Prompt

Construir prompt en cada mensaje con:

```
- Nombre del restaurante
- Menu completo (categoria, item, precio)
- Items ya agregados al carrito (si existen)
- Estado actual de la conversacion
- Ultimos N mensajes del historial
- Instrucciones de formato de respuesta
```

El LLM debe responder en formato JSON estructurado:

```json
{
  "action": "add_item | remove_item | show_summary | confirm_order | ask_clarify | cancel | greeting",
  "message": "Texto amigable para enviar al cliente en español",
  "items": [{ "name": "Hamburguesa", "qty": 2, "notes": "sin cebolla" }],
  "clarification_needed": false
}
```

### 3.4 Integracion con Groq

Archivo: `src/lib/groq.ts`

```typescript
import Groq from 'groq-sdk'

export function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

export async function processMessage(prompt: string, history: Message[]) {
  const groq = getGroqClient()
  const response = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })
  return JSON.parse(response.choices[0].message.content)
}
```

### 3.5 Integracion con OpenAI (produccion)

Archivo: `src/lib/openai.ts` — misma interfaz que Groq, pero usando `gpt-4o-mini`. Se switchea via variable de entorno.

### 3.6 Envio de mensajes WhatsApp

Archivo: `src/lib/whatsapp.ts`

```typescript
export async function sendWhatsAppMessage(
  token: string,
  phoneNumberId: string,
  to: string,
  text: string
) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  })
}
```

### 3.7 Flujo de conversacion completo

**Estados de conversacion:**

1. **Nueva** — cliente escribe por primera vez
   - LLM genera saludo + muestra categorias del menu
   - Estado: `ordering`

2. **Ordering** — cliente agregando items
   - LLM interpreta lenguaje natural: "quiero dos hamburguesas"
   - Extrae items, cantidades, notas
   - Agrega al carrito en `context` de la conversacion
   - Puede preguntar precios, modificaciones, etc.

3. **Checkout** — cliente confirma pedido
   - LLM muestra resumen y pide confirmacion
   - Si confirma → se crea `order` en DB con status `pending`
   - Se envia notificacion al WhatsApp del restaurante (ver 3.8)
   - Conversacion pasa a `closed`

4. **Closed** — pedido completado
   - Si el cliente vuelve a escribir, se inicia nuevo pedido

### 3.8 Notificacion al restaurante

Cuando se confirma un pedido:

```
NUEVO PEDIDO 🆕
Cliente: +52 555 123 4567
Items:
  🍔 Hamburguesa x2 - $12.00
  🥤 Coca-Cola x1 - $2.00
Total: $14.00
Notas: sin hielo

Responde:
1  Confirmar pedido
2  Cancelar
3  Llamar al cliente
```

El restaurante responde el numero:
- `1` → Bot confirma al cliente, estado pasa a `confirmed`
- `2` → Bot avisa al cliente que el pedido fue cancelado
- `3` → Bot envia el numero del cliente al WhatsApp del restaurante

### 3.9 Manejo de errores

- **Groq rate limit:** Responder con mensaje generico "Estoy procesando tu pedido, un momento por favor" y reintentar en el proximo mensaje
- **LLM timeout/timeout:** Responder mensaje generico, loguear error
- **Menu vacio:** Bot informa que el menu no esta disponible
- **Mensaje inentendible:** LLM pide aclaracion. Si falla 2 veces, responde "Puedes llamar directamente al restaurante al [numero]" y cierra

### 3.10 Environments

- `.env.local` — `GROQ_API_KEY` + variables de prueba
- Vercel Production — `OPENAI_API_KEY` (funciona via feature flag o variable)

## Criterios de aceptacion

- [ ] Webhook verificado por Meta (handshake 200 OK)
- [ ] Bot recibe mensaje y responde via LLM (Groq)
- [ ] System prompt incluye menu correcto del restaurante
- [ ] Flujo de pedido completo: saludo → ordenar → confirmar → notificar
- [ ] Notificacion llega al WhatsApp del restaurante
- [ ] Restaurante puede confirmar/cancelar respondiendo numeros
- [ ] Manejo de errores funcional (rate limit, timeout, menu vacio)
