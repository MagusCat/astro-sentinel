# Arquitectura de Sentinel

Sentinel es una plataforma modular de gestión de academias construida en Next.js 15 con Supabase como backend. Está diseñada como un monorepo de módulos opcionales que comparten un núcleo de autenticación común.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 + CSS Variables |
| Componentes UI | shadcn/ui + Lucide React |
| Backend / DB | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth + Cookies HTTP-only |
| Estado Global | Zustand |
| Package Manager | pnpm |

---

## Arquitectura Modular

Sentinel está organizado en tres capas bien diferenciadas que son **independientes entre sí** pero comparten la misma instancia de Supabase y el mismo sistema de autenticación.

```
┌─────────────────────────────────────────────┐
│              SENTINEL PLATFORM              │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   CORE   │  │  ADMIN   │  │   CMS    │  │
│  │  (Auth)  │  │ (Dashboard)│ │ (Editor) │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       ↑              ↑             ↑        │
│       └──────────────┴─────────────┘        │
│              Supabase (Shared)              │
└─────────────────────────────────────────────┘
```

### Módulo Core (Auth) — Siempre Presente
- Maneja el ciclo de vida de sesión vía cookies HTTP-only seguras.
- Sistema de doble autenticación: **Supabase Auth** (para admins con `auth_user_id`) + **credenciales locales** (para recepcionistas, almacenadas en la tabla `public.users`).
- El gateway en `src/app/page.tsx` detecta la sesión y redirige al módulo correcto.

### Módulo Admin — Opcional
- Ruta base: `/dashboard`
- Route Group: `src/app/(admin)/`
- Gestión de clientes, membresías, pagos, clases y personal.
- Acceso controlado por roles: `reception` (limitado), `admin` (completo), `maintainer` (total).

### Módulo CMS — Opcional
- Ruta base: `/editor`
- Route Group: `src/app/(cms)/`
- Editor visual del contenido del sitio web público (Studio Power).
- Acceso: solo `admin` y `maintainer`.
- Los datos viven en Supabase Storage como JSON e imágenes.

---

## Estructura de Rutas (Next.js App Router)

```
src/app/
│
├── page.tsx                    ← Auth Gateway: detecta sesión → redirige
├── login/
│   └── page.tsx                ← Login con Supabase Auth + credenciales locales
│
├── (admin)/                    ← Route Group: Módulo Admin
│   ├── layout.tsx              ← Sidebar + verificación de sesión
│   └── dashboard/
│       └── page.tsx            ← Dashboard principal (tabs via ?tab=)
│
└── (cms)/                      ← Route Group: Módulo CMS
    ├── layout.tsx              ← Auth guard (admin/maintainer only)
    └── editor/
        └── page.tsx            ← Editor visual de contenido
```

> **Nota sobre Route Groups:** Los paréntesis `(admin)` y `(cms)` son convención de Next.js para agrupar rutas con layouts compartidos sin afectar la URL pública. La URL es `/dashboard`, no `/(admin)/dashboard`.

---

## Estructura de Features

```
src/features/
│
├── auth/
│   ├── actions.ts              ← authorizeDevice, authenticateUser, getCurrentUser, logoutUser
│   ├── context.tsx             ← UserProvider + useActiveUser hook
│   ├── types.ts                ← AuthenticatedUser
│   └── components/
│       └── login-panel.tsx
│
├── admin/                      ← Módulo Admin (todas las features del dashboard)
│   └── dashboard/
│       ├── actions.ts          ← getClients, getClassPlans, getPayments, getOverviewStats
│       ├── user-actions.ts     ← getUsersList, saveNewUser, updateUserData, deleteUserData
│       ├── types.ts
│       ├── hooks/
│       │   └── use-dashboard-data.ts
│       └── components/
│           ├── sidebar-nav.tsx        ← Menú lateral (segmentado por rol)
│           ├── dashboard-panel.tsx    ← Router de tabs
│           ├── dashboard-overview.tsx
│           ├── client-registry.tsx
│           ├── class-plans.tsx
│           ├── payments-log.tsx
│           ├── user-management.tsx    ← CRUD de personal (tabla)
│           ├── create-user-modal.tsx  ← Modal de creación de usuario
│           ├── edit-user-modal.tsx    ← Modal de edición de usuario
│           └── developer-panel.tsx   ← Consola de auditoría (maintainer only)
│
└── cms/
    ├── actions.ts              ← getSiteContent, publishSiteContent, uploadSiteImage, deleteSiteImage
    ├── default-content.ts      ← DEFAULT_CONTENT: JSON inicial del sitio
    ├── types.ts                ← Schema TypeScript completo del JSON del sitio
    └── components/
        ├── cms-shell.tsx       ← Shell principal: orquesta estado draft/publish/discard
        ├── cms-toolbar.tsx     ← Barra de herramientas: título + botones de acción
        ├── cms-section-nav.tsx ← Sidebar de secciones del editor
        ├── backups-modal.tsx   ← Modal de historial de versiones
        └── editors/            ← Un editor por sección del sitio web
            ├── globals-editor.tsx
            ├── hero-editor.tsx
            ├── about-editor.tsx
            ├── header-editor.tsx
            ├── schedule-editor.tsx
            ├── gallery-editor.tsx
            ├── faq-editor.tsx
            ├── contact-editor.tsx
            ├── art-editor.tsx
            ├── principles-editor.tsx
            ├── comments-editor.tsx
            └── footer-editor.tsx
```

---

## Sistema de Roles (RBAC)

Los roles están definidos como enum en PostgreSQL (`public.user_role`) y se leen desde la cookie de sesión `sentinel_session`.

| Rol | Descripción | Módulo Admin | Módulo CMS |
|---|---|---|---|
| `reception` | Recepcionista | ✅ Limitado (operaciones diarias) | ❌ |
| `admin` | Administrador de sede | ✅ Completo (+ gestión de personal) | ✅ |
| `maintainer` | Desarrollador/Programador | ✅ Total (+ auditoría) | ✅ |

### Reglas de Usuario

- Un `admin` **no puede ver** usuarios con rol `maintainer`.
- Un `admin` **solo puede crear** usuarios con rol `reception`.
- Un `admin` puede **activar/desactivar** a otros `admin`s, pero no editarlos ni eliminarlos.
- El campo `username` es **inmutable** para todos los roles.
- La eliminación es **lógica** (`password_hash = 'LOGICALLY_DELETED'`), nunca física.
- Un `admin` requiere vinculación con `auth_user_id` de Supabase Auth para poder autenticarse.

---

## Autenticación: Flujo de Doble Capa

```
[Usuario ingresa credenciales]
        ↓
[1. Verificar Device Token (cookie sentinel_device_token)]
   → Si no existe: ERROR "Terminal no autorizada"
        ↓
[2. Consultar public.users por username + password_hash (base64)]
   → Si no existe: ERROR
   → Si is_active = false: ERROR
        ↓
[3. Guardar sesión en cookie sentinel_session (JSON HTTP-only)]
        ↓
[Redirigir a /dashboard]
```

El Device Token se obtiene a través de una autenticación con Supabase Auth (email/password). Solo un administrador o mantenedor puede autorizar nuevas terminales.

---

## Supabase Storage

Dos buckets para el módulo CMS:

| Bucket | Propósito | Estructura |
|---|---|---|
| `site-content` | JSON del sitio web | `content.json` + `backups/content_{timestamp}.json` |
| `site-images` | Imágenes del sitio | `hero/`, `gallery/`, etc. |

El flujo de publicación del CMS siempre **respalda** el JSON actual antes de sobreescribirlo.

---

## Componentes de Layout Compartidos

```
src/components/
├── shared/
│   ├── logo.tsx          ← Logo de Sentinel con animación
│   └── session-loading.tsx ← Pantalla de carga de sesión (compartida entre módulos)
└── ui/
    └── button.tsx        ← Componente Button (shadcn/ui)
```

### SidebarNav — Comportamiento por Rol

- Ubicado en `features/admin/dashboard/components/sidebar-nav.tsx`
- **`reception`**: Ve solo las 4 secciones operativas (Panel, Clientes, Clases, Pagos).
- **`admin` / `maintainer`**: Ve además la sub-sección **Administrar** con "Gestión de Personal" y "Editor de Sitio Web".
- **`maintainer`**: Ve además **Mantenimiento** (auditoría RLS) al fondo del menú.
- El **logo "Sentinel"** es un botón oculto que redirige a la consola de diagnóstico para `admin`/`maintainer`.
- El botón de cierre de sesión es **rojo ("Cerrar Terminal")** para `admin`/`maintainer` y neutro para `reception`.

---

## Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<key>
```

> No se requiere service role key — toda la seguridad está implementada a nivel de Row Level Security (RLS) en la base de datos.