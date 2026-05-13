# Fase 5 — Panel Super Admin: Desglose detallado

## Paso 5.1 — Layout, proteccion y sidebar

**Archivos:**
- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/page.tsx` (dashboard principal)

### Layout
- Misma estructura que dashboard pero para super_admin
- Sidebar con: Dashboard, Tenants, Monitoreo, Logs
- Verifica `profiles.role = 'super_admin'` al cargar
- Si no es admin, redirige a `/dashboard`
- Tema claro/oscuro con `next-themes`
- Logout

### Sidebar items
```tsx
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Tenants', icon: Store },
  { href: '/admin/monitoreo', label: 'Monitoreo', icon: Activity },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
]
```

### Admin dashboard (`/admin`)
- Tarjetas de resumen: Restaurantes activos/totales, Pedidos hoy/semana/mes, Errores 24h
- Cargado via admin client (bypass RLS)

## Paso 5.2 — Pagina de Tenants (CRUD)

**Archivos:**
- `src/app/(admin)/admin/tenants/page.tsx`

### Lista de restaurantes
- Tabla con: Nombre, Telefono, Plan, Estado, Pedidos hoy, Creado
- Badge por estado: activo (verde), suspendido (rojo), trial (amarillo)
- Search por nombre o telefono
- Paginado client-side (10 por pagina)

### Dialog crear tenant
- Campos: nombre, telefono, waba_id, waba_token, phone_number_id, webhook_verify_token, status
- Usa admin client para `restaurants.insert()`

### Dialog editar tenant
- Mismos campos precargados
- Usa admin client para `restaurants.update()`

### Acciones inline
- Toggle activo/suspendido/trial
- Eliminar (con confirmacion, solo si no tiene pedidos)
- Boton "Ver en dashboard" (link a `/dashboard`)

## Paso 5.3 — Pagina de Monitoreo

**Archivos:**
- `src/app/(admin)/admin/monitoreo/page.tsx`

### Webhook Health
- Estado global: si hay errores de webhook en las ultimas 24h → "Con errores", sino "OK"
- Ultimos errores (timestamp, restaurante, mensaje)
- Total errores hoy

### Por restaurante
- Tabla: Restaurante, Ultima actividad, Errores 24h, Estado
- Si ultimo mensaje > 24h → alerta (icono rojo)

## Paso 5.4 — Pagina de Logs

**Archivos:**
- `src/app/(admin)/admin/logs/page.tsx`

### Pedidos globales
- Tabla: Restaurante, Cliente, Items, Total, Estado, Creado
- Filtros: restaurante (select), estado (select), fecha desde/hasta
- Boton para ver detalle en modal

### Error logs
- Tabla separada: Timestamp, Restaurante, Tipo, Mensaje
- Filtro por tipo (webhook, llm, whatsapp, auth)

## Paso 5.5 — Tablas y RLS

### RLS para super_admin
Agregar policies faltantes para que super_admin pueda leer todo:
- `super_admin_select_menu_items` ON menu_items FOR SELECT USING (is_super_admin())
- `super_admin_select_orders` ON orders FOR SELECT USING (is_super_admin())
- `super_admin_select_conversations` ON conversations FOR SELECT USING (is_super_admin())
- `super_admin_select_error_logs` ON error_logs FOR SELECT USING (is_super_admin())
- `super_admin_insert_restaurants` ON restaurants FOR INSERT WITH CHECK (is_super_admin())
- `super_admin_update_restaurants` ON restaurants FOR UPDATE USING (is_super_admin())
- `super_admin_delete_restaurants` ON restaurants FOR DELETE USING (is_super_admin())

### Nota
Las funciones `get_user_restaurant_id()` e `is_super_admin()` ya estan corregidas con `SECURITY DEFINER`.

## Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `src/app/(admin)/layout.tsx` | Modificar — layout completo con sidebar |
| `src/app/(admin)/admin/page.tsx` | Modificar — dashboard con metricas |
| `src/app/(admin)/admin/tenants/page.tsx` | Crear — CRUD tenants |
| `src/app/(admin)/admin/monitoreo/page.tsx` | Crear — monitoreo |
| `src/app/(admin)/admin/logs/page.tsx` | Crear — logs globales |
| `supabase/migrations/20260512_init.sql` | Modificar — agregar RLS policies faltantes |
