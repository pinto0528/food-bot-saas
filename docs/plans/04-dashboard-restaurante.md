# Fase 4: Dashboard Restaurante

**Objetivo:** Interfaz web donde el restaurante puede ver pedidos en vivo y administrar su menu.

## Pasos

### 4.1 Layout base

`src/app/(dashboard)/layout.tsx`

- Sidebar con navegacion: Pedidos, Menu, Configuracion
- Header con nombre del restaurante y avatar de usuario
- Tema claro/oscuro via `next-themes`
- Responsive (sidebar colapsable en mobile)

### 4.2 Autenticacion

- Pagina de login: `src/app/auth/login/page.tsx`
- Login con email + password via Supabase Auth
- Proteger rutas del dashboard via middleware
- Despues del login, obtener el `profile` y cargar el `restaurant_id`
- Logout

### 4.3 Pagina de Pedidos (principal)

`src/app/(dashboard)/page.tsx`

Componentes:
- **OrderList** — tabla/tarjetas de pedidos activos
  - Columnas: Cliente, Items, Total, Estado, Tiempo
  - Filtros: todos / pendientes / confirmados / preparando / listos
  - Ordenado por mas reciente primero
- **OrderCard** — cada pedido como tarjeta expandible
  - Muestra items detallados
  - Botones de accion segun estado:
    - `pending` → Confirmar | Cancelar
    - `confirmed` → Marcar preparando
    - `preparing` → Marcar listo
    - `ready` → Marcar entregado
  - Boton "Llamar al cliente" (muestra numero)

**Realtime:** Suscripcion a cambios en `orders` via `supabase.channel()` para que nuevos pedidos aparezcan automaticamente sin recargar.

### 4.4 Pagina de Menu

`src/app/(dashboard)/menu/page.tsx`

- Lista de items agrupados por categoria
- Cada item: nombre, descripcion, precio, toggle disponible/no disponible
- Boton "Agregar item" → modal/formulario:
  - Nombre, descripcion, precio, categoria, disponible
- Editar item → mismo modal precargado
- Eliminar item → confirmacion antes de borrar
- Drag & drop para reordenar (opcional MVP)

### 4.5 Pagina de Configuracion

`src/app/(dashboard)/config/page.tsx`

- Datos del restaurante: nombre, telefono (solo lectura)
- Estado de conexion WhatsApp (activo/inactivo)
- Plan actual (trial/activo)

### 4.6 UI / Componentes compartidos

- Usar `shadcn/ui` para componentes base: Button, Input, Card, Dialog, Select, Badge, Toast
- Componentes de loading skeleton
- Estado vacio (no hay pedidos) con ilustracion y mensaje

## Criterios de aceptacion

- [ ] Login funcional con Supabase Auth
- [ ] Pedidos aparecen en tiempo real sin recargar pagina
- [ ] Cambiar estado de pedido actualiza DB y se refleja en UI
- [ ] CRUD completo de items del menu
- [ ] Pagina responsive (funciona en tablet y desktop)
- [ ] Dashboard solo muestra datos del restaurante autenticado (RLS)
