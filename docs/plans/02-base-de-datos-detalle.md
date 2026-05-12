# Fase 2 — Base de Datos: Desglose detallado

## Paso 2.1 — Vincular Supabase CLI al proyecto cloud

**Comando:**
```bash
npx supabase login --token <PAT>
npx supabase link --project-ref hvsqswctwfysncgfrwyu
```

**Nota:** Si no hay PAT, ir a Supabase Dashboard → Settings → API → `Generate a new access token`
Alternativa: configurar manualmente las variables de entorno sin vincular CLI.

**Resultado esperado:** CLI vinculado, `supabase status` muestra proyecto conectado.

---

## Paso 2.2 — Crear migracion inicial

```bash
npx supabase migration new init
```

Esto crea `supabase/migrations/<timestamp>_init.sql`.

El archivo contiene el esquema completo:

### Enum types
- `restaurant_status` — active, suspended, trial
- `order_status` — pending, confirmed, preparing, ready, delivered, cancelled
- `conversation_status` — ordering, checkout, closed
- `user_role` — super_admin, restaurant_owner

### Tabla: restaurants
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| id | UUID PK | gen_random_uuid() | |
| name | TEXT | | Nombre del restaurante |
| phone | TEXT | | WhatsApp del restaurante |
| waba_id | TEXT | null | WhatsApp Business Account ID |
| waba_token | TEXT | null | Token cifrado |
| phone_number_id | TEXT | null | ID del numero en Meta |
| webhook_verify_token | TEXT | null | Token de verificacion webhook |
| status | restaurant_status | 'trial' | |
| created_at | TIMESTAMPTZ | now() | |

### Tabla: menu_items
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| id | UUID PK | gen_random_uuid() | |
| restaurant_id | UUID FK | | ON DELETE CASCADE |
| name | TEXT | | |
| description | TEXT | null | |
| price | DECIMAL(10,2) | | |
| category | TEXT | | |
| available | BOOLEAN | true | |
| created_at | TIMESTAMPTZ | now() | |

Index: `idx_menu_items_restaurant` on `restaurant_id`

### Tabla: conversations
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| id | UUID PK | gen_random_uuid() | |
| restaurant_id | UUID FK | | ON DELETE CASCADE |
| customer_phone | TEXT | | |
| customer_name | TEXT | null | |
| status | conversation_status | 'ordering' | |
| messages | JSONB | '[]' | Historial [{role, content, timestamp}] |
| context | JSONB | '{}' | Estado actual del pedido |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

Indexes: `idx_conversations_restaurant` (restaurant_id), `idx_conversations_phone` (customer_phone)

### Tabla: orders
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| id | UUID PK | gen_random_uuid() | |
| restaurant_id | UUID FK | | ON DELETE CASCADE |
| conversation_id | UUID FK | null | |
| customer_phone | TEXT | | |
| customer_name | TEXT | null | |
| items | JSONB | '[]' | [{name, qty, price, notes}] |
| total | DECIMAL(10,2) | | |
| notes | TEXT | null | |
| status | order_status | 'pending' | |
| created_at | TIMESTAMPTZ | now() | |
| updated_at | TIMESTAMPTZ | now() | |

Indexes: `idx_orders_restaurant` (restaurant_id), `idx_orders_status` (status)

### Tabla: profiles
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| id | UUID PK FK → auth.users | | ON DELETE CASCADE |
| restaurant_id | UUID FK | null | null = super admin |
| role | user_role | 'restaurant_owner' | |
| name | TEXT | null | |
| created_at | TIMESTAMPTZ | now() | |

### Tabla: error_logs
| Campo | Tipo | Default | Notas |
|---|---|---|---|
| id | UUID PK | gen_random_uuid() | |
| restaurant_id | UUID FK | null | Si es null, error global |
| type | TEXT | | webhook, llm, whatsapp, auth |
| message | TEXT | | |
| details | JSONB | null | |
| created_at | TIMESTAMPTZ | now() | |

Indexes: `idx_error_logs_type` (type), `idx_error_logs_created` (created_at)

### Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

---

## Paso 2.3 — RLS Policies

### restaurants
- `SELECT`: solo super_admin (via `auth.uid()` IN profiles WHERE role = 'super_admin')
- `INSERT`: solo super_admin
- `UPDATE`: solo super_admin
- `DELETE`: solo super_admin

### menu_items
- `SELECT`: dueño del restaurante (restaurant_id = auth user's restaurant_id)
- `INSERT`: dueño del restaurante
- `UPDATE`: dueño del restaurante
- `DELETE`: dueño del restaurante

### orders
- `SELECT`: dueño del restaurante
- `UPDATE`: dueño del restaurante (cambiar estado)
- `INSERT`: via API (sin restriccion de RLS)

### conversations
- `SELECT`: dueño del restaurante
- `UPDATE`: dueño del restaurante

### profiles
- `SELECT`: propio perfil (id = auth.uid())
- `INSERT`: propio registro (id = auth.uid())

### error_logs
- `SELECT`: solo super_admin
- `INSERT`: via API

**Helper function:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;
```

---

## Paso 2.4 — Tipos de TypeScript

**`src/lib/database.types.ts`** — generado automaticamente:
```bash
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

**`src/lib/types.ts`** — tipos manuales para el dominio:
```typescript
export type RestaurantStatus = 'active' | 'suspended' | 'trial'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type ConversationStatus = 'ordering' | 'checkout' | 'closed'
export type UserRole = 'super_admin' | 'restaurant_owner'

export interface MenuItemInput {
  name: string
  description?: string
  price: number
  category: string
  available?: boolean
}

export interface OrderItem {
  name: string
  qty: number
  price: number
  notes?: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface LLMResponse {
  action: 'add_item' | 'remove_item' | 'show_summary' | 'confirm_order' | 'ask_clarify' | 'cancel' | 'greeting'
  message: string
  items?: OrderItem[]
  clarification_needed?: boolean
}
```

---

## Paso 2.5 — Seed Data

Crear `supabase/seed.sql` con:

- **2 restaurantes de prueba**:
  1. "El Buen Sabor" — estado trial
  2. "Pizzeria Don Remolo" — estado trial

- **Items de menu para cada uno** (~8-10 items, con categorias y precios variados)

- **1 usuario super admin**:
  - Email: `nicolaspinto2805@gmail.com`
  - Se crea via Supabase Auth (manual desde dashboard)

- **2 usuarios restaurante owner**:
  - Se crean via Supabase Auth

**Nota:** Como las tablas dependen de `auth.users` que solo se crea via Supabase Auth, el seed de `profiles` se hara via trigger o manualmente.

---

## Paso 2.6 — Aplicar migraciones

```bash
npx supabase db push
```

**Resultado esperado:** Migraciones ejecutadas sin errores, tablas creadas en Supabase cloud.

---

## Paso 2.7 — Verificacion final

- [ ] `supabase db push` exitoso
- [ ] Tablas visibles en Supabase Dashboard → Table Editor
- [ ] Realtime activo en orders y conversations
- [ ] RLS policies funcionando (probar con consulta anonima vs autenticada)
- [ ] Tipos de TypeScript generados
- [ ] Trigger de auto-creacion de profile al registrarse (opcional)

---

## Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `supabase/migrations/<timestamp>_init.sql` | Crear (esquema completo) |
| `supabase/seed.sql` | Crear (datos de prueba) |
| `src/lib/database.types.ts` | Crear (tipos generados) |
| `src/lib/types.ts` | Crear (tipos manuales) |
