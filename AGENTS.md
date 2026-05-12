# AGENTS.md — food-bot-saas

## Stack
- Next.js 16 App Router, TypeScript, Tailwind CSS v4
- Supabase (Postgres, Auth, Realtime), shadcn/ui v4 (@base-ui/react), next-themes, sonner
- Groq SDK + OpenAI SDK (LLM factory: Groq fallback if OPENAI_API_KEY unset)

## Commands
- `npm run dev` — dev server
- `npm run build` — typecheck + compile + static generation. Run before commit.
- `npm run lint`
- GH push → Vercel auto-deploy

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
Route group `(dashboard)` does NOT affect URL. Actual paths:
- `/dashboard` → `(dashboard)/dashboard/page.tsx`
- `/dashboard/menu` → `(dashboard)/dashboard/menu/page.tsx`
- `/dashboard/config` → `(dashboard)/dashboard/config/page.tsx`
- `/admin` → `(admin)/admin/page.tsx`

### Supabase project
Project ref: `hvsqswctwfysncgfrwyu`  
Admin user: `nicolaspinto2805@gmail.com` / `nicolaspinto28` (role=super_admin)  
Tenant test: `tenant@gmail.com` / `tenant` (role=restaurant_owner, restaurant="El Buen Sabor")  
Service key: from `.env.local` SUPABASE_SERVICE_ROLE_KEY (starts with `sb_secret_`)
