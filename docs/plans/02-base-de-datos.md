# Fase 2: Base de Datos

**Objetivo:** Esquema completo en Supabase con migraciones, RLS policies, types de TypeScript y seed data.

## Pasos

### 2.1 Crear proyecto Supabase

- Crear proyecto en dashboard de Supabase
- Habilitar Realtime en las tablas que lo requieran
- Configurar Autenticacion (email + password)

### 2.2 Migraciones

Usar Supabase CLI para migraciones locales:

```bash
supabase init
supabase link --project-ref <ref>
supabase migration new init
```

Contenido de la migration:

```sql
-- Enum types
CREATE TYPE restaurant_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE conversation_status AS ENUM ('ordering', 'checkout', 'closed');
CREATE TYPE user_role AS ENUM ('super_admin', 'restaurant_owner');

-- restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  waba_id TEXT,
  waba_token TEXT,
  phone_number_id TEXT,
  webhook_verify_token TEXT,
  status restaurant_status NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- menu_items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);

-- conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status conversation_status NOT NULL DEFAULT 'ordering',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_restaurant ON conversations(restaurant_id);
CREATE INDEX idx_conversations_phone ON conversations(customer_phone);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id),
  role user_role NOT NULL DEFAULT 'restaurant_owner',
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

### 2.3 RLS Policies

- `restaurants`: solo super_admin puede ver/editar
- `menu_items`: dueño del restaurant (via `profiles`) puede CRUD
- `orders`: dueño del restaurant puede ver sus propias ordenes
- `conversations`: dueño del restaurant puede ver sus conversaciones
- `profiles`: cada usuario puede leer su propio perfil

### 2.4 Tipos de TypeScript

```typescript
// src/lib/types.ts
export type RestaurantStatus = 'active' | 'suspended' | 'trial'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type ConversationStatus = 'ordering' | 'checkout' | 'closed'
export type UserRole = 'super_admin' | 'restaurant_owner'

export interface Restaurant { ... }
export interface MenuItem { ... }
export interface Conversation { ... }
export interface Order { ... }
export interface Profile { ... }
```

Generar tipos automaticamente con `supabase gen types typescript --linked > src/lib/database.types.ts`

### 2.5 Seed Data

Crear seed para desarrollo:
- 2 restaurantes de prueba (con estado `trial`)
- Items de menu para cada uno (8-10 items por restaurante)
- 1 usuario super admin
- 1 usuario restaurante owner por cada restaurante

### 2.6 Aplicar migraciones

```bash
supabase db push
```

## Criterios de aceptacion

- [ ] Migraciones aplicadas sin errores
- [ ] RLS policies funcionando (verificar con queries autenticadas y anonimas)
- [ ] Tipos de TypeScript generados correctamente
- [ ] Seed data cargada y funcional
- [ ] Realtime habilitado en tablas `orders` y `conversations`
