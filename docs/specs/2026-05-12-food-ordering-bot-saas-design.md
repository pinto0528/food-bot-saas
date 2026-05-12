# Food Ordering WhatsApp Bot SaaS

**Fecha:** 2026-05-12
**Estado:** Borrador

## Resumen

SaaS multi-tenant que permite a restaurantes recibir pedidos de clientes via WhatsApp usando un bot con lenguaje natural potenciado por LLM. Incluye dashboard web opcional para gestion de menu y pedidos en tiempo real, mas un panel super admin para control de tenants.

## Stack Tecnologico

| Componente | Tecnologia | Costo MVP |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | $0 (Vercel Hobby) |
| Base de datos + Auth + Realtime | Supabase | $0 (Free Tier) |
| Mensajeria | Meta WhatsApp Cloud API | $0 (mensajes de servicio) |
| LLM (pruebas) | Groq - Llama 3 | $0 (rate limited) |
| LLM (produccion) | OpenAI - GPT-4o-mini | ~$0.15/1M tokens |
| Dominio | $10-15/año | |

### Modelo de numeros

Cada restaurante usa **su propio numero de WhatsApp Business**. Nosotros proveemos el bot como servicio vía webhook. El numero pertenece al restaurante, no a la plataforma. Si un tenant se suspende, el restaurante sigue recibiendo mensajes directo en su WhatsApp normalmente — solo se desactiva el bot automatizado.

## Arquitectura

```
[Cliente WhatsApp] ←→ WhatsApp Cloud API ←→ Webhook → Next.js API Route
                                                         ↓
                                                    Supabase (Postgres + Auth + Realtime)
                                                         ↓
                                              Dashboard Web (Next.js App Router)
                                                         ↓
                                              WhatsApp del Restaurante (notificaciones)
```

## Componentes

### 1. Bot WhatsApp (core)

Flujo de conversacion:

1. Cliente escribe al numero del restaurante
2. Webhook recibe el mensaje y activa la API Route de Next.js
3. Si no hay conversacion activa, se crea una nueva (status: `ordering`)
4. Se construye un system prompt con:
   - Menu del restaurante (desde DB)
   - Estado actual de la conversacion
   - Historial de mensajes recientes
5. Se envia el prompt al LLM (Groq en pruebas, GPT-4o-mini en prod)
6. El LLM devuelve una accion estructurada:
   - `add_item` — agregar item al pedido
   - `remove_item` — quitar item del pedido
   - `show_summary` — mostrar resumen del pedido
   - `confirm_order` — confirmar pedido (pasa a checkout)
   - `ask_clarify` — pedir aclaracion al cliente
   - `cancel` — cancelar pedido
   - `greeting` — respuesta inicial/saludo
7. Se ejecuta la accion: actualizar DB, enviar respuesta a WhatsApp

### 2. Notificacion al Restaurante (WhatsApp)

Cuando un cliente confirma un pedido:

```
NUEVO PEDIDO
Cliente: +52 555 123 4567
Items:
  Hamburguesa x2 - $12.00
  Coca-Cola x1 - $2.00
Total: $14.00
Notas: sin hielo

Responde:
1  Confirmar pedido
2  Cancelar
3  Llamar al cliente
```

El restaurante responde el numero y el bot:
- Confirma al cliente que su pedido esta en preparacion
- Actualiza el estado en la DB
- Envia notificacion Realtime al dashboard web si esta abierto

### 3. Dashboard Web (opcional para restaurantes)

Ruta: `app.tudominio.com`

Pantallas:
- **Login** — email + password (Supabase Auth)
- **Pedidos** — lista en tiempo real con Realtime. Cada pedido muestra: items, total, notas, boton para cambiar estado (confirmar, preparando, listo, entregado, cancelado)
- **Menu** — CRUD de items (nombre, descripcion, precio, categoria, disponible/no disponible)
- **Configuracion** — ver numero de WhatsApp conectado, datos del restaurante

### 4. Panel Super Admin

Ruta: `admin.tudominio.com`

Funcionalidades:
- **Gestion de Tenants** — listar, crear, activar/suspender restaurantes. Cada tenant tiene: nombre, telefono, plan, estado (active/suspended/trial)
- **Webhook Health** — dashboard con estado del webhook, ultimo ping, errores, latencia
- **Logs Globales** — visor de todos los pedidos del sistema con filtro por restaurante, estado, fecha
- **Metricas** — pedidos/dia, restaurantes activos, mensajes enviados/recibidos
- **Logs de Errores** — registro de errores del webhook, fallos de envio WhatsApp, excepciones del LLM

## Modelo de Datos

### restaurants
| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID PK | |
| name | text | Nombre del restaurante |
| phone | text | Numero WhatsApp del restaurante |
| waba_id | text | WhatsApp Business Account ID |
| waba_token | text | Token de acceso a la WABA (cifrado) |
| phone_number_id | text | ID del numero en Meta Cloud API |
| webhook_verify_token | text | Token para verificar webhook de Meta |
| status | enum | active, suspended, trial |
| created_at | timestamp | |

### menu_items
| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID PK | |
| restaurant_id | UUID FK → restaurants | |
| name | text | Ej: "Hamburguesa Clasica" |
| description | text | |
| price | decimal | |
| category | text | Ej: "Entradas", "Principales", "Bebidas", "Postres" |
| available | boolean | |
| created_at | timestamp | |

### conversations
| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID PK | |
| restaurant_id | UUID FK → restaurants | |
| customer_phone | text | |
| customer_name | text | Opcional |
| status | enum | ordering, checkout, closed |
| messages | JSONB | Historial de mensajes {role, content, timestamp} |
| context | JSONB | Estado actual del pedido {items, step, ...} |
| created_at | timestamp | |
| updated_at | timestamp | |

### orders
| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID PK | |
| restaurant_id | UUID FK → restaurants | |
| conversation_id | UUID FK → conversations | |
| customer_phone | text | |
| customer_name | text | |
| items | JSONB | [{name, qty, price, notes}] |
| total | decimal | |
| notes | text | |
| status | enum | pending, confirmed, preparing, ready, delivered, cancelled |
| created_at | timestamp | |
| updated_at | timestamp | |

### profiles
| Campo | Tipo | Descripcion |
|---|---|---|
| id | UUID PK FK → auth.users | |
| restaurant_id | UUID FK → restaurants | Nullable (null = super admin) |
| role | enum | super_admin, restaurant_owner |
| name | text | |
| created_at | timestamp | |

## Manejo de Errores y Edge Cases

- **Webhook caido:** WhatsApp reintenta hasta 3 veces. Se loguean todos los webhooks entrantes antes de procesar para trazabilidad.
- **Mensaje sin sentido:** El LLM responde con disculpa y pide repetir. Tras 2 fallos consecutivos, deriva a atencion manual (el restaurante recibe el chat).
- **Menu vacio o no disponible:** El bot responde que el menu no esta disponible y cierra la conversacion.
- **Supabase Free pausado:** La DB se pausa tras 1 semana de inactividad. Se configura un cron (cron-job.org gratis) que haga ping cada 3 dias.
- **Rate limit Groq:** El bot responde con mensaje generico predefinido y reintenta en el proximo mensaje. Se registra el error para monitoreo.
- **Tenant suspendido:** Se desactiva el bot para ese restaurante. El numero de WhatsApp sigue activo y el restaurante recibe los mensajes directamente en su telefono — opera manual como siempre. La suspension solo retira la automatizacion, no secuestra el numero.

## Deploy y CI/CD

- **Repo:** GitHub (monorepo Next.js)
- **Deploy:** Vercel Hobby conectado al repo, deploy automatico al hacer push a `main`
- **Supabase:** Migraciones via CLI local, proyecto en la nube
- **Webhook:** Apuntar a `https://<dominio>.vercel.app/api/webhook`
- **Variables de entorno:**
  ### Sobre las credenciales de WhatsApp

Cada restaurante tiene **su propio WhatsApp Business Account (WABA)** y su propio numero. Por lo tanto, `waba_token` y `phone_number_id` se almacenan **por tenant en la tabla `restaurants`**, no como variables de entorno globales.

El webhook de Meta es unico (`https://dominio/api/webhook`). Cuando llega un mensaje entrante, el payload incluye el `phone_number_id` del destinatario. Buscamos en la DB a que restaurante pertenece y usamos sus credenciales para responder.

**Variables de entorno globales:**

- `NEXT_PUBLIC_SUPABASE_URL` — **Frontend + API Routes.** URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — **Solo API Routes (server-side).** Key con permisos totales para operaciones administrativas. Nunca se expone al frontend.
- `GROQ_API_KEY` — **API Route del webhook.** LLM en fase de pruebas.
- `OPENAI_API_KEY` — **API Route del webhook.** Reemplaza a GROQ_API_KEY en produccion.
- `ADMIN_EMAILS` — **API de autenticacion.** Lista de emails permitidos como super admin (separados por coma).

## Roadmap MVP

1. Setup del proyecto Next.js + Supabase + deploy a Vercel
2. Modelo de datos y migrations
3. Webhook de WhatsApp + integracion con LLM (Groq)
4. Flujo basico de pedido por WhatsApp
5. Notificacion al restaurante por WhatsApp
6. Dashboard web basico (login, pedidos, menu)
7. Panel super admin
8. Testing con 1-2 restaurantes reales
