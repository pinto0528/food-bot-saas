# Plan de Implementacion: Food Ordering WhatsApp Bot SaaS

Basado en: `docs/specs/2026-05-12-food-ordering-bot-saas-design.md`

## Fases

| Fase | Nombre | Depende de | Entrega |
|---|---|---|---|
| 1 | Fundacion | — | Proyecto Next.js corriendo en Vercel + Supabase conectado |
| 2 | Base de Datos | Fase 1 | Esquema completo, migraciones, RLS policies |
| 3 | Bot WhatsApp + LLM | Fase 2 | Webhook, integracion Groq, flujo de pedidos completo |
| 4 | Dashboard Restaurante | Fase 2 | Login, pedidos en vivo, CRUD menu, config |
| 5 | Panel Super Admin | Fase 2 | Gestion de tenants, metricas, logs |

Cada fase tiene su propio archivo detallado en `docs/plans/`.

## Orden de ejecucion

1. Fase 1 → Fase 2 (ambas son prerequisito)
2. Fase 3 y Fase 4 pueden ejecutarse en paralelo (dependen solo de Fase 2)
3. Fase 5 depende solo de Fase 2, puede ejecutarse en cualquier momento despues

## Stack

- Next.js 14 App Router + TypeScript
- Supabase (Postgres + Auth + Realtime)
- Tailwind CSS + shadcn/ui (dashboard)
- Groq SDK + OpenAI SDK
- Meta WhatsApp Cloud API

## Archivos de detalle por fase

- `docs/plans/01-fundacion.md`
- `docs/plans/02-base-de-datos.md`
- `docs/plans/03-bot-whatsapp-llm.md`
- `docs/plans/04-dashboard-restaurante.md`
- `docs/plans/05-panel-super-admin.md`
