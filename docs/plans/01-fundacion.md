# Fase 1: Fundacion

**Objetivo:** Proyecto Next.js corriendo en Vercel con Supabase conectado y estructura de codigo definida.

## Pasos

### 1.1 Inicializar proyecto Next.js

- `npx create-next-app@latest food-bot-saas --typescript --tailwind --eslint --app --src-dir`
- Configurar `tsconfig.json` con paths absolutos (`@/` apuntando a `src/`)

### 1.2 Dependencias principales

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install groq-sdk openai
npm install zod
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install next-themes
npx shadcn@latest init
```

### 1.3 Estructura de carpetas

```
src/
  app/
    (dashboard)/
      layout.tsx
      page.tsx
    (admin)/
      layout.tsx
      page.tsx
    api/
      webhook/
        route.ts
      restaurants/
        route.ts
      orders/
        route.ts
    auth/
      callback/
        route.ts
      login/
        page.tsx
    layout.tsx
    page.tsx
  components/
    ui/          (shadcn components)
    dashboard/
    admin/
  lib/
    supabase/
      client.ts       (browser client)
      server.ts       (server client)
      admin.ts        (service role client)
    groq.ts
    openai.ts
    whatsapp.ts
    types.ts
    constants.ts
  hooks/
  store/
```

### 1.4 Cliente Supabase

- `src/lib/supabase/client.ts` — `createBrowserClient` para el frontend
- `src/lib/supabase/server.ts` — `createServerClient` para Server Components y API Routes
- `src/lib/supabase/admin.ts` — `createClient` con `service_role` para operaciones admin (solo server)

### 1.5 Configurar middleware de autenticacion

- `src/middleware.ts` — refrescar session de Supabase Auth en cada request

### 1.6 Deploy a Vercel

- Conectar repo de GitHub
- Configurar variables de entorno en Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GROQ_API_KEY`
  - `ADMIN_EMAILS`
- Verificar deploy exitoso

### 1.7 CI/CD basico

- Branch `main` → deploy automatico a produccion (Vercel)
- Branch `develop` → deploy a preview (Vercel)

## Criterios de aceptacion

- [ ] `npm run dev` levanta correctamente
- [ ] `npm run build` pasa sin errores
- [ ] Deploy a Vercel exitoso, app accesible via URL
- [ ] Conexion a Supabase funciona (query de prueba)
- [ ] Variables de entorno configuradas
