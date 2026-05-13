# AGENTS.md — food-bot-saas

## Stack
- Next.js 16 App Router, TypeScript, Tailwind CSS v4
- Supabase (Postgres, Auth, Realtime), shadcn/ui v4 (@base-ui/react), next-themes, sonner
- Groq SDK + OpenAI SDK (LLM factory: Groq fallback if OPENAI_API_KEY unset)
- @whiskeysockets/baileys (WhatsApp Web protocol, replaces Meta/Twilio APIs)

## Deployment
- **Production:** VPS with PM2, custom `server.js` entry point (Next.js + Baileys bot in one process)
- `server.js` starts both Next.js HTTP server and the WhatsApp bot
- `ecosystem.config.js` — PM2 config
- `setup-vps.sh` — provisioning script
- No longer deploy on Vercel (Baileys needs persistent WebSocket)

## Commands
- `npm run dev` — Next.js dev server (no bot)
- `npm run build` — typecheck + compile + static generation
- `npm run start` — `node server.js` (production: Next.js + Baileys bot)
- `npm run bot` — `tsx src/lib/baileys/bot.ts` (standalone bot, for testing)
- `npm run lint`

## Critical gotchas

### Supabase Json → TypeScript
`conversations.messages` and `.context` are `Json` type. Cast via `as unknown as T` (not `as T`).
Never instantiate Supabase clients at module level in API routes (causes build errors for unset env vars).

### OpenAI client must be lazy (openai.ts:4)
`new OpenAI()` called inside `processWithOpenAI()`, not at module scope.
If initialized at import time, `npm run build` fails when OPENAI_API_KEY is unset (the SDK constructor throws on empty key).

### RLS helper functions need SECURITY DEFINER
`get_user_restaurant_id()` and `is_super_admin()` must be `SECURITY DEFINER`.
Without it, calling them from RLS policies queries `profiles` with RLS active → infinite recursion → `stack depth limit exceeded` (54001).

### shadcn/ui v4 (@base-ui/react)
No `asChild` prop on Trigger components. Use `render` prop or pass `className` directly.
Components: Sheet, Dialog, DropdownMenu, etc. all use @base-ui/react, not @radix-ui.

### 3 Supabase clients, pick the right one
- `@/lib/supabase/client` → browser (createBrowserClient). Use in `'use client'` components.
- `@/lib/supabase/server` → server component (createServerClient + next/headers cookies).
- `@/lib/supabase/admin` → admin/API routes (createClient + SERVICE_ROLE_KEY, bypasses RLS).

### Middleware → Proxy deprecation (Next.js 16)
Warning is non-blocking. The `middleware.ts` convention is deprecated in favor of `proxy.ts`.

### Auth redirect by role
Login reads `profiles.role`: `super_admin`→`/admin`, `restaurant_owner`→`/dashboard`.

### URL structure
Route groups do NOT affect URL. Actual paths:
- `/dashboard` → `(dashboard)/dashboard/page.tsx`
- `/dashboard/menu` → `(dashboard)/dashboard/menu/page.tsx`
- `/dashboard/config` → `(dashboard)/dashboard/config/page.tsx`
- `/admin` → `(admin)/admin/page.tsx`
- `/admin/tenants` → `(admin)/admin/tenants/page.tsx`
- `/admin/monitoreo` → `(admin)/admin/monitoreo/page.tsx`
- `/admin/logs` → `(admin)/admin/logs/page.tsx`

### Supabase project
Project ref: `hvsqswctwfysncgfrwyu`  
Admin user: `nicolaspinto2805@gmail.com` / `nicolaspinto28` (role=super_admin)  
Tenant test: `tenant@gmail.com` / `tenant` (role=restaurant_owner, restaurant="El Buen Sabor")  
Service key: from `.env.local` SUPABASE_SERVICE_ROLE_KEY (starts with `sb_secret_`)

### Baileys WhatsApp (replaces Meta Cloud API + Twilio)
- **No external provider needed.** Baileys implements the WhatsApp Web protocol directly.
- Restaurant scans a QR code from the dashboard to link their WhatsApp.
- Session stored on VPS filesystem (`./sessions/<restaurant_id>/`).
- `whatsapp.ts` uses an injectable sender pattern: `registerSendMessage(fn)` called by `bot.ts`.
- `handler.ts` now accepts `(supabase, restaurant, from, text)` instead of looking up restaurant by `phone_number_id`.
- Bot runs inside `server.js` alongside Next.js (same Node.js process).
- QR endpoint: `GET /api/baileys/qr` returns `{ qr, status }` for dashboard.
- Env: `BOT_RESTAURANT_ID` = which restaurant this bot handles; `BOT_SESSIONS_DIR` = session storage path.
- Webhook endpoint (`/api/webhook`) is disabled — Baileys receives messages via WebSocket.
