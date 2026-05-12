# Fase 4 — Dashboard Restaurante: Desglose detallado

## Paso 4.1 — Layout base con sidebar y header

**Archivos:**
- `src/app/(dashboard)/layout.tsx`

### Sidebar desktop
- Ancho fijo `md:w-56 lg:w-64`, borde derecho, fondo `bg-card`
- Logo con icono `Store` de lucide-react y texto "FoodBot"
- Navegacion con 3 links: Pedidos (`ClipboardList`), Menu (`Package`), Configuracion (`Settings`)
- Link activo resaltado con `bg-primary text-primary-foreground`
- Footer del sidebar: Avatar + nombre + email del usuario autenticado

### Sidebar mobile
- Usa `Sheet` de shadcn/ui (`@base-ui/react/dialog`)
- Trigger como boton flotante (solo visible en `md:hidden`)
- Mismo contenido que sidebar desktop

### Header
- Altura `h-14`, fondo `bg-card`, borde inferior
- Theme toggle via `DropdownMenu`: Claro / Oscuro / Sistema
- Usa `next-themes` (`ThemeProvider`, `useTheme`)
- Boton de logout que llama `supabase.auth.signOut()`

### Carga inicial
- `useEffect` llama `supabase.auth.getUser()`
- Si no hay usuario, redirige a `/auth/login`
- Obtiene `profiles.name` desde DB para mostrar en sidebar
- Mientras carga, muestra `Skeleton`

### Providers
- `ThemeProvider` de `next-themes` envuelve todo el shell
- `Toaster` de `sonner` para notificaciones toast

## Paso 4.2 — Autenticacion

**Archivos:**
- `src/app/auth/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/middleware.ts`

### Login page
- Componente cliente con formulario email + password
- Llama `supabase.auth.signInWithPassword()`
- Tras login exitoso, consulta `profiles.role` para redirigir:
  - `super_admin` → `/admin`
  - `restaurant_owner` → `/dashboard`
- Muestra toast con `sonner` si hay error

### Auth callback
- Intercambia `code` por sesion via `supabase.auth.exchangeCodeForSession()`
- Redirige a `/dashboard`

### Middleware
- Usa `createServerClient` de `@supabase/ssr`
- Lee/escribe cookies con `getAll()` / `setAll()`
- Protege rutas `/(dashboard)` y `/(admin)`
- Si no hay usuario autenticado, redirige a `/auth/login`

## Paso 4.3 — Pagina de Pedidos (principal)

**Archivos:**
- `src/app/(dashboard)/dashboard/page.tsx`

### Estructura
- URL: `/dashboard`
- Componente cliente con estado: `orders[]`, `loading`, `filter`

### Filtros de estado
- Botones: Todos / Pendientes / Confirmados / Preparando / Listos
- Muestra contador de cada estado entre parentesis
- Filtra la lista localmente

### OrderCard (tarjeta expandible)
- Encabezado: nombre del cliente, telefono, tiempo transcurrido, badge de estado
- Badge con colores por estado: `pending` (amarillo), `confirmed` (azul), `preparing` (purpura), `ready` (verde), `delivered` (gris), `cancelled` (rojo)
- Tabla de items: nombre, cantidad, precio
- Footer con total
- Notas del pedido (si hay)
- Botones de accion segun estado:
  - `pending` → Confirmar | Cancelar
  - `confirmed` → Marcar Preparando
  - `preparing` → Marcar Listo
  - `ready` → Marcar Entregado
- Boton "Llamar" que copia el numero al portapapeles

### Carga de datos
- Obtiene `user` via `supabase.auth.getUser()`
- Obtiene `profile.restaurant_id` desde `profiles`
- Query: `orders.select('*').eq('restaurant_id', X).order('created_at', false).limit(50)`
- Si `restaurant_id` es null, no carga datos

### Realtime
- Se suscribe a `postgres_changes` en tabla `orders`
- En cualquier cambio, refetch completa
- Limpia suscripcion en cleanup del `useEffect`

### Estados
- **Loading:** 3 skeletons apilados
- **Vacio:** Icono `Package` + "No hay pedidos todavia" + texto secundario
- **Con datos:** Grid de OrderCards

### Mapa de acciones
```typescript
const nextActions = {
  pending:    [{ status: 'confirmed', label: 'Confirmar', icon: CheckCircle }],
  confirmed:  [{ status: 'preparing', label: 'Preparando', icon: CookingPot }],
  preparing:  [{ status: 'ready', label: 'Listo', icon: Package }],
  ready:      [{ status: 'delivered', label: 'Entregado', icon: Truck }],
  delivered:  [],
  cancelled:  [],
}
```

## Paso 4.4 — Pagina de Menu (CRUD)

**Archivos:**
- `src/app/(dashboard)/dashboard/menu/page.tsx`

### Estructura
- URL: `/dashboard/menu`
- Componente cliente con estado: `items[]`, `loading`, `dialogOpen`, `editing`, `form`

### Listado de items
- Agrupados por categoria (ej: "Principales", "Bebidas", "Postres")
- Cada fila: nombre, badge de categoria, precio, toggle disponible, editar, eliminar
- Items no disponibles con `line-through` y texto "(no disponible)"

### Dialog de crear/editar
- Modal con `Dialog` de shadcn/ui
- Campos: Nombre, Descripcion (textarea), Precio (number), Categoria, Disponible (switch)
- Al crear: `menu_items.insert({ restaurant_id, name, description, price, category, available })`
- Al editar: `menu_items.update({ name, description, price, category, available }).eq('id', X)`
- Validacion: nombre obligatorio

### Eliminar
- Confirmacion con `confirm()` nativo
- `menu_items.delete().eq('id', X)`

### Toggle disponible
- Switch que llama `menu_items.update({ available: !current }).eq('id', X)`
- Refetch automatico tras cada operacion

### Estados
- **Loading:** 3 skeletons
- **Vacio:** "No hay items en el menu" + texto secundario
- **Con datos:** Lista agrupada por categoria

## Paso 4.5 — Pagina de Configuracion

**Archivos:**
- `src/app/(dashboard)/dashboard/config/page.tsx`

### Estructura
- URL: `/dashboard/config`
- Datos de solo lectura del restaurante

### Cards informativas
1. **Datos del Restaurante:** nombre, telefono, direccion
2. **WhatsApp:** estado (Conectado/Desconectado segun `waba_token`), ID de numero
3. **Plan:** badge "Trial"

### Carga
- Obtiene `profile.restaurant_id`
- Query: `restaurants.select('*').eq('id', X).single()`

## Paso 4.6 — Componentes compartidos

**Archivos agregados via `npx shadcn@latest add`:**
- `src/components/ui/avatar.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/textarea.tsx`

### Notas
- Todos los componentes usan `@base-ui/react` (shadcn/ui v4+)
- DropdownMenu, Sheet, Dialog, etc. no tienen prop `asChild`; usan `render` o className directo
- El layout usa `ThemeProvider` de `next-themes` para tema claro/oscuro/sistema

## Correcciones aplicadas post-MVP

### Fix 1 — OpenAI client lazy instantiation
- `src/lib/openai.ts`: Mover `new OpenAI()` dentro de la funcion `processWithOpenAI` para evitar crash al importar el modulo si `OPENAI_API_KEY` no esta definida en el entorno de Vercel.

### Fix 2 — Columna `full_name` → `name`
- `src/app/(dashboard)/layout.tsx`: El select de profiles usaba `full_name` (inexistente). Corregido a `name`.

### Fix 3 — Redireccion post-login por rol
- `src/app/auth/login/page.tsx`: Agregada consulta de `profiles.role` tras login para redirigir segun tipo de usuario (`super_admin` → `/admin`, `restaurant_owner` → `/dashboard`).
