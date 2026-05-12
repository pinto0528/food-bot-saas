# Fase 5: Panel Super Admin

**Objetivo:** Interfaz para administrar todos los tenants, monitorear el sistema y ver metricas globales.

## Pasos

### 5.1 Layout y proteccion

`src/app/(admin)/layout.tsx`

- Ruta base: `admin.tudominio.com`
- Verificar que el usuario autenticado tenga `role = 'super_admin'`
- Sidebar con: Tenants, Monitoreo, Logs, Metricas
- Si no es admin, redirigir a dashboard de restaurante o login

### 5.2 Pagina de Tenants

`src/app/(admin)/page.tsx` (o `/tenants/page.tsx`)

**Lista de restaurantes** — tabla con:
- Nombre, Telefono, Plan/Estado, Pedidos hoy, Fecha de registro
- Badge de color por estado: activo (verde), suspendido (rojo), trial (amarillo)
- Buscador por nombre o telefono
- Paginacion

**Acciones por tenant:**
- Ver detalle (modal o pagina aparte)
- Activar / Suspender
- Editar nombre
- Ver pedidos del tenant

**Crear nuevo tenant** — formulario:
- Nombre del restaurante
- Telefono WhatsApp
- WhatsApp Business Account ID
- Token de WABA
- Phone Number ID
- Webhook Verify Token
- Estado inicial

### 5.3 Pagina de Monitoreo (Webhook Health)

`src/app/(admin)/monitoreo/page.tsx`

**Estado del webhook:**
- Indicador: Activo / Caido (verde/rojo)
- Ultimo mensaje recibido (timestamp y tiempo transcurrido desde entonces)
- Total de mensajes hoy / esta semana / este mes
- Errores en las ultimas 24h

**Por tenant:**
- Estado de conexion de cada restaurante
- Ultima actividad
- Alertas si no ha recibido mensajes en > 24h

### 5.4 Pagina de Logs Globales

`src/app/(admin)/logs/page.tsx`

- Lista de todos los pedidos del sistema
- Filtros: restaurante, estado, fecha (desde/hasta)
- Exportar a CSV (opcional MVP)
- Vista detalle de cada pedido

**Logs de errores:**
- Tabla separada `error_logs` (o columna en pedidos):
  - Timestamp, restaurante, tipo de error, mensaje, accion tomada
- Filtro por tipo de error: webhook, LLM, envio WhatsApp

### 5.5 Pagina de Metricas

`src/app/(admin)/metricas/page.tsx`

Tarjetas de resumen:
- Restaurantes activos / totales
- Pedidos hoy / esta semana / este mes
- Pedidos por estado (pendientes, confirmados, etc.)
- Pedidos por restaurante (top 5)

Graficos (usar `recharts` o similar):
- Pedidos por dia (ultimos 30 dias) — grafico de lineas
- Distribucion por estado — grafico de dona
- Mensajes WhatsApp enviados vs recibidos

**Actualizacion:** Datos en tiempo real con Realtime o refresco periodico.

### 5.6 Tabla de logs de errores

```sql
-- Migration complementaria
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  type TEXT NOT NULL, -- 'webhook', 'llm', 'whatsapp', 'auth'
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_created ON error_logs(created_at);
```

## Criterios de aceptacion

- [ ] Solo super_admin puede acceder a `admin.*`
- [ ] CRUD completo de tenants
- [ ] Activar/suspender restaurante desactiva el bot para ese tenant
- [ ] Health check del webhook funcional
- [ ] Logs globales con filtros por restaurante y fecha
- [ ] Metricas basicas visibles (pedidos/dia, restaurantes activos)
- [ ] Logs de errores registrandose correctamente
