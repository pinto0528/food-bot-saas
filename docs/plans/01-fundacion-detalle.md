# Fase 1 — Fundacion: Desglose detallado

## Paso 1.1 — Inicializar proyecto Next.js

**Comandos:**
```bash
npx create-next-app@latest food-bot-saas --typescript --tailwind --eslint --app --src-dir
cd food-bot-saas
```

**Configurar tsconfig.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Crear estructura de carpetas:**
```bash
mkdir -p src/app/\(dashboard\)
mkdir -p src/app/\(admin\)
mkdir -p src/app/api/webhook
mkdir -p src/app/api/restaurants
mkdir -p src/app/api/orders
mkdir -p src/app/auth/login
mkdir -p src/app/auth/callback
mkdir -p src/components/ui
mkdir -p src/components/dashboard
mkdir -p src/components/admin
mkdir -p src/lib/supabase
mkdir -p src/hooks
mkdir -p src/store
```

**Resultado esperado:** `npm run dev` funciona, estructura de carpetas lista.

---

## Paso 1.2 — Instalar dependencias

**Produccion:**
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install groq-sdk openai
npm install zod
npm install next-themes
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
```

**shadcn/ui:**
```bash
npx shadcn@latest init
npx shadcn@latest add button input card dialog select badge toast dropdown-menu sheet
```

**Resultado esperado:** `npm install` exitoso, shadcn components en `src/components/ui/`.

---

## Paso 1.3 — Configurar archivos base

**`src/lib/utils.ts`** — funcion `cn()` con clsx + tailwind-merge

**`src/lib/constants.ts`**
```typescript
export const APP_NAME = 'FoodBot'
export const APP_DESCRIPTION = 'Sistema de pedidos por WhatsApp para restaurantes'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
```

**`src/app/globals.css`** — directivas Tailwind + variables CSS de shadcn

---

## Paso 1.4 — Configurar clientes Supabase

- `src/lib/supabase/client.ts` — `createBrowserClient` para frontend
- `src/lib/supabase/server.ts` — `createServerClient` para server components
- `src/lib/supabase/admin.ts` — `createClient` con `service_role` (solo server-side)

---

## Paso 1.5 — Middleware de autenticacion

`src/middleware.ts` — refrescar session y proteger rutas dashboard/admin

---

## Paso 1.6 — Health endpoint

`src/app/api/health/route.ts` — GET que responde `{ status: "ok", timestamp }`

---

## Paso 1.7 — Configurar Supabase + .env

- Crear proyecto Supabase
- `.env.local` con URL, anon key, service_role key, GROQ_API_KEY, ADMIN_EMAILS

---

## Paso 1.8 — Deploy a Vercel

- Push a GitHub
- Importar en Vercel
- Configurar env vars
- Deploy

---

## Paso 1.9 — Verificacion final

Checklist:
- [ ] `npm run dev` → localhost:3000 carga
- [ ] `npm run build` → 0 errores
- [ ] `/api/health` → JSON status ok
- [ ] URL de Vercel responde
- [ ] Supabase conecta
- [ ] Estructura de carpetas completa
