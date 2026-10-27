# Arquitectura

## Stack

- **Framework:** Next.js 15 (App Router), React 19, RSC + Server Actions.
- **Lenguaje:** TypeScript estricto.
- **Estilos:** Tailwind CSS v4 (tokens variables) + shadcn/ui (base-nova) + lucide-react.
- **Estado global:** Zustand — **solo estado de UI** (`src/store/navigation-store.ts`,
  `src/store/sidebar-store.ts`). Los datos viven en el servidor.
- **BD:** Supabase (Postgres 17). Acceso siempre server-side con service role.
- **Despliegue:** Cloudflare Workers vía `@opennextjs/cloudflare`.
- **Gestor:** pnpm.

## Estructura

```
src/
├── app/                      # App Router. Route groups: (admin), (cms). middleware.ts
│   ├── (admin)/dashboard/    # panel admin (tabs: overview, clients, plans, payments, …)
│   ├── (cms)/editor/         # editor de contenido del sitio público
│   ├── login/ , health/ , layout.tsx
├── features/                 # dominios de negocio (corte vertical)
│   ├── auth/                 # login local + admin, sesión JWT
│   └── admin/<dominio>/      # checkout, classes, clients, dashboard, developer,
│                             #   memberships, payments, products, reception, staff
│   └── cms/<área>/           # core, media, backups, editors
├── components/
│   ├── ui/                   # primitivas shadcn
│   └── shared/               # componentes compartidos (usar SIEMPRE — ver frontend.md)
├── lib/
│   ├── auth/                 # guard.ts (requireRole), jwt.ts, password.ts, session.ts
│   ├── supabase/             # admin.ts (service role), verify.ts (login sin sesión)
│   ├── config/               # APP_CONFIG, domain (roles), services, secrets
│   └── cookies.ts, utils.ts, validation/
├── hooks/ , store/ , styles/
└── middleware.ts             # feature flags + verificación JWT + RBAC
```

## Patrón por feature

Cada dominio en `src/features/**/` sigue:

```
<dominio>/
├── components/      # UI del dominio (compone componentes compartidos)
├── queries.ts       # lecturas         (server actions)
├── mutations.ts     # escrituras       (server actions)  — o actions.ts si es pequeño
├── schemas.ts       # validación Zod de las entradas
├── types.ts
└── utils.ts         # lógica pura (testeable)
```

No crear carpetas extra salvo que la complejidad lo exija.

## Flujo de datos

1. **RSC hace el prefetch.** La página server-component obtiene los datos según el tab
   activo y los pasa como `initialData` al panel cliente (elimina la cascada de fetches).
   Ej.: `src/app/(admin)/dashboard/page.tsx` → `DashboardPanel`.
2. **Mutaciones vía Server Actions.** El cliente llama a funciones `'use server'` de
   `mutations.ts`. Devuelven `{ success, error?, ... }`.
3. **Todo acceso a BD pasa por `requireRole()`** (`src/lib/auth/guard.ts`), que
   devuelve el cliente **service role** y el usuario ya validado. No hay cliente de
   Supabase en el navegador. Ver `security.md`.

## Modelo de dominio

- **Roles:** `maintainer` > `admin` > `reception` (`src/lib/config/domain.ts`, helpers `Roles.*`).
- **Módulos activables** por flags en `APP_CONFIG.modules` (`admin`, `cms`). El middleware
  y los layouts redirigen según lo que esté activo.
- **Terminal operativa:** inmutabilidad y auditoría. Cada pago/venta lleva responsable
  en `payments.processed_by`; la auditoría de productos va en `payments.metadata`; descuentos y anulaciones
  en `payments.discount_amount` / `voided_*` (no hay tabla de logs). Los tickets PDF se generan en el cliente con `jspdf`.

## Base de datos

- **Operaciones atómicas vía RPC Postgres** (`SECURITY DEFINER`, ejecutables solo por
  `service_role`): `process_membership_checkout`, `process_product_checkout` (ambas con
  `p_discount` opcional, solo admin), `void_payment`, `check_in`, `enroll_client`,
  `cash_closing`, `create_product_with_inventory`, `adjust_product_stock`,
  `register_stock_purchase`, `freeze_membership`, `unfreeze_membership`. El precio/duración
  se leen **de la BD** dentro del RPC, nunca del cliente.
- **Mensajes de RPC para el operador:** se lanzan con `ERRCODE = 'SN400'`; `toActionError()`
  los deja pasar tal cual. Cualquier otro error de BD se sigue ocultando.
- **Pagos anulados:** nunca se borran. `void_payment` marca `voided_at/by/reason`, cancela la
  membresía y devuelve el stock (movimiento `RETURN`). Toda lectura de ingresos filtra
  `voided_at IS NULL` (las vistas `vw_*` ya lo hacen).
- **Zona horaria:** la BD corre en `America/Managua` (`CURRENT_DATE` = día local). En TS,
  "hoy" y rangos de días salen de `src/lib/dates.ts`; nunca `toISOString().split('T')[0]`.
- **Vistas `vw_*`** con `security_invoker=on` para lecturas agregadas del dashboard.
- **Crons** (`expire_active_memberships_cron`, `process_frozen_memberships_cron`) viven en
  el esquema `private` (PostgREST no lo expone) y los dispara `pg_cron`.
- **Migraciones** versionadas en `supabase/migrations/`. RLS en deny-all para
  `anon`/`authenticated`; solo el service role (server) accede. Ver `security.md`.

## Despliegue

- Build/preview/deploy con OpenNext + Wrangler (`pnpm build|preview|deploy`).
- Secretos (`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) por variables de entorno /
  `wrangler secret`. Nunca en el bundle.
