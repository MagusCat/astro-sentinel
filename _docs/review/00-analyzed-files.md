# 📁 Archivos Analizados — Code Review Sentinel

> Todos los archivos inspeccionados durante la revisión completa del codebase.

---

## Configuración del Proyecto

| Archivo | Descripción |
|---------|-------------|
| `next.config.ts` | Configuración de Next.js (webpack, bodySizeLimit, remotePatterns) |
| `open-next.config.ts` | Configuración de OpenNext para Cloudflare |
| `tsconfig.json` | Configuración de TypeScript |
| `package.json` | Dependencias y scripts del proyecto |
| `wrangler.json` | Configuración de Cloudflare Workers |
| `.env.example` | Plantilla de variables de entorno |

---

## Estilos Globales

| Archivo | Descripción |
|---------|-------------|
| `src/styles/globals.css` | Design system, tokens CSS, dark mode, scrollbar, animaciones |

---

## App Router — `src/app/`

| Archivo | Descripción |
|---------|-------------|
| `src/app/layout.tsx` | Root layout — fuente, metadata, `lang` del documento |
| `src/app/page.tsx` | Página raíz (redirect) |
| `src/app/login/page.tsx` | Página de login |
| `src/app/health/page.tsx` | Página de health check — `?debug=true` |
| `src/app/(admin)/layout.tsx` | Layout del grupo admin — Server Component |
| `src/app/(admin)/_components/admin-shell.tsx` | Shell client del admin |
| `src/app/(admin)/dashboard/page.tsx` | Página del dashboard — Client Component |
| `src/app/(cms)/layout.tsx` | Layout del grupo CMS — Server Component |
| `src/app/(cms)/_components/cms-shell.tsx` | Shell client del CMS |

---

## Middleware

| Archivo | Descripción |
|---------|-------------|
| `src/middleware.ts` | Edge middleware — feature flags, JWT verify, RBAC |

---

## Librerías Compartidas — `src/lib/`

| Archivo | Descripción |
|---------|-------------|
| `src/lib/utils.ts` | Utilidades generales (`cn`, `parseDuration`) |
| `src/lib/cookies.ts` | Gestión de cookies de sesión y dispositivo |
| `src/lib/modules.ts` | Helper `getActiveModules()` |
| `src/lib/config/index.ts` | Barrel de configuración |
| `src/lib/config/app.ts` | Configuración estática de la app (`APP_CONFIG`) |
| `src/lib/config/domain.ts` | Roles, permisos (`APP_ROLE`, `Roles`, `MEMBERSHIP_STATUS`) |
| `src/lib/config/env.ts` | Helper `getEnv()` |
| `src/lib/config/secrets.ts` | Helper `getSecret()` — secrets críticos |
| `src/lib/config/services.ts` | Helper `getServiceConfig()` — URLs de Supabase |
| `src/lib/config/types.ts` | Tipos de configuración (`AppConfig`, etc.) |
| `src/lib/auth/session.ts` | Barrel/facade de auth — re-exporta password y jwt |
| `src/lib/auth/jwt.ts` | JWT sign/verify con `jose` (session + device tokens) |
| `src/lib/auth/password.ts` | bcrypt hash/compare con `bcryptjs` |
| `src/lib/auth/roles.ts` | Re-export de `Roles` desde `lib/config/domain` |
| `src/lib/supabase/client.ts` | Cliente Supabase para el browser |
| `src/lib/supabase/server.ts` | Cliente Supabase para Server Components/Actions |
| `src/lib/supabase/middleware.ts` | Cliente Supabase para middleware |

---

## Componentes Compartidos — `src/components/shared/`

| Archivo | Descripción |
|---------|-------------|
| `src/components/shared/index.ts` | Barrel — re-exporta todos los shared components |
| `src/components/shared/layout/app-sidebar.tsx` | Sidebar genérica (`AppSidebar`, `AppSidebarGroup`, `AppSidebarItem`) |
| `src/components/shared/layout/logo.tsx` | Componente Logo |
| `src/components/shared/layout/page-shell.tsx` | Shell de página |
| `src/components/shared/layout/page-header.tsx` | Header de página |
| `src/components/shared/layout/session-loading.tsx` | Pantalla de carga de sesión |
| `src/components/shared/feedback/toast.tsx` | Toast de notificaciones |
| `src/components/shared/feedback/confirm-dialog.tsx` | Diálogo de confirmación |
| `src/components/shared/feedback/modal.tsx` | Modal genérico |
| `src/components/shared/feedback/loading-state.tsx` | Estado de carga |
| `src/components/shared/feedback/progress-bar.tsx` | Barra de progreso indeterminada |
| `src/components/shared/feedback/empty-state.tsx` | Estado vacío |
| `src/components/shared/feedback/warning-alert.tsx` | Alerta de advertencia |
| `src/components/shared/feedback/tooltip.tsx` | Tooltip |
| `src/components/shared/form/text-field.tsx` | Campo de texto |
| `src/components/shared/form/textarea-field.tsx` | Campo textarea |
| `src/components/shared/form/select-field.tsx` | Campo select |
| `src/components/shared/form/phone-field.tsx` | Campo de teléfono |
| `src/components/shared/form/search-input.tsx` | Input de búsqueda |
| `src/components/shared/form/form-actions.tsx` | Acciones de formulario |
| `src/components/shared/form/toggle-button-group.tsx` | Grupo de botones toggle |
| `src/components/shared/form/image-uploader.tsx` | Uploader de imágenes |
| `src/components/shared/form/button.tsx` | Botón reutilizable |
| `src/components/shared/data-display/data-table.tsx` | Tabla de datos |
| `src/components/shared/data-display/section-card.tsx` | Card de sección |
| `src/components/shared/data-display/status-badge.tsx` | Badge de estado |
| `src/components/shared/data-display/dashboard-list-widget.tsx` | Widget de lista del dashboard |
| `src/components/shared/data-display/metric-card.tsx` | Card de métrica |
| `src/components/shared/data-display/card.tsx` | Card genérico (shadcn) |

---

## Feature: Auth — `src/features/auth/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/auth/actions.ts` | Server Actions: login, logout, device auth, session |
| `src/features/auth/schemas.ts` | Zod schemas: `credentialsSchema`, `localLoginSchema` |
| `src/features/auth/types.ts` | Tipos: `AuthenticatedUser` |
| `src/features/auth/context.tsx` | Context: `UserProvider`, `useActiveUser` |
| `src/features/auth/components/login-panel.tsx` | UI del panel de login |
| `src/features/auth/components/role-badge.tsx` | Badge de rol de usuario |

---

## Feature: Admin / Dashboard — `src/features/admin/dashboard/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/dashboard/actions.ts` | Server Action: `getOverviewStats` |
| `src/features/admin/dashboard/config.ts` | Configuración de links del sidebar |
| `src/features/admin/dashboard/types.ts` | Tipos del dashboard (`OverviewStats`, view rows) |
| `src/features/admin/dashboard/hooks/use-dashboard-data.ts` | Hook: carga paralela de todos los datos |
| `src/features/admin/dashboard/hooks/use-sidebar-nav.ts` | Hook: navegación del sidebar |
| `src/features/admin/dashboard/components/dashboard-panel.tsx` | Panel principal del dashboard |
| `src/features/admin/dashboard/components/dashboard-overview.tsx` | Vista de overview con métricas |
| `src/features/admin/dashboard/components/sidebar-nav.tsx` | Sidebar con RBAC y logout |

---

## Feature: Admin / Staff — `src/features/admin/staff/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/staff/mutations.ts` | Server Actions: crear, editar, eliminar usuarios |
| `src/features/admin/staff/queries.ts` | Server Action: listar usuarios |
| `src/features/admin/staff/schemas.ts` | Zod schemas: `createUserSchema`, `updateUserSchema` |
| `src/features/admin/staff/types.ts` | Tipos: `LocalUser` |
| `src/features/admin/staff/constants.ts` | Constantes: `LOGICAL_DELETE_MARKER` |
| `src/features/admin/staff/policies.ts` | Lógica de políticas de actualización de usuarios |
| `src/features/admin/staff/components/user-management.tsx` | Gestión de usuarios (tabla + modales) |
| `src/features/admin/staff/components/create-user-modal.tsx` | Modal de creación de usuario |
| `src/features/admin/staff/components/edit-user-modal.tsx` | Modal de edición de usuario |

---

## Feature: Admin / Clients — `src/features/admin/clients/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/clients/mutations.ts` | Server Actions: crear, editar, eliminar clientes |
| `src/features/admin/clients/queries.ts` | Server Actions: listar clientes |
| `src/features/admin/clients/schemas.ts` | Zod schemas de cliente |
| `src/features/admin/clients/types.ts` | Tipos: `ClientData` |
| `src/features/admin/clients/components/client-registry.tsx` | Registro de clientes |
| `src/features/admin/clients/components/create-client-modal.tsx` | Modal de creación |
| `src/features/admin/clients/components/client-details-modal.tsx` | Modal de detalles |

---

## Feature: Admin / Memberships — `src/features/admin/memberships/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/memberships/mutations.ts` | Server Actions: congelar, descongelar, cancelar membresías |
| `src/features/admin/memberships/queries.ts` | Server Actions: listar membresías |
| `src/features/admin/memberships/schemas.ts` | Zod schemas de membresía |
| `src/features/admin/memberships/types.ts` | Tipos: `MembershipRecord`, `MembershipsPanelData` |
| `src/features/admin/memberships/utils.ts` | Utilidades: `calcRemainingDays`, `getTodayStr` |
| `src/features/admin/memberships/components/memberships-panel.tsx` | Panel de membresías |
| `src/features/admin/memberships/components/memberships-table.tsx` | Tabla de membresías |
| `src/features/admin/memberships/components/memberships-metrics.tsx` | Métricas de membresías |
| `src/features/admin/memberships/components/class-occupancy.tsx` | Ocupación por clase |

---

## Feature: Admin / Payments — `src/features/admin/payments/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/payments/mutations.ts` | Server Action: registrar pago |
| `src/features/admin/payments/queries.ts` | Server Action: listar pagos |
| `src/features/admin/payments/schemas.ts` | Zod schema de pago |
| `src/features/admin/payments/types.ts` | Tipos: `PaymentData` |
| `src/features/admin/payments/components/payments-log.tsx` | Log de pagos |
| `src/features/admin/payments/components/create-payment-modal.tsx` | Modal de creación de pago |

---

## Feature: Admin / Classes — `src/features/admin/classes/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/classes/queries.ts` | Server Actions: listar clases y planes |
| `src/features/admin/classes/types.ts` | Tipos: `ClassData`, `PlanData` |

---

## Feature: Admin / Developer — `src/features/admin/developer/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/developer/actions.ts` | Server Actions: listar y revocar dispositivos autorizados |
| `src/features/admin/developer/schemas.ts` | Zod schema: `revokeDeviceSchema` |
| `src/features/admin/developer/types.ts` | Tipos: `ConnectedDevice` |
| `src/features/admin/developer/components/developer-panel.tsx` | Panel de mantenimiento |

---

## Feature: Admin / Reception — `src/features/admin/reception/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/admin/reception/components/reception-panel.tsx` | Panel de recepción |

---

## Feature: CMS / Core — `src/features/cms/core/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/cms/core/actions.ts` | Server Actions: leer, publicar contenido, subir imagen |
| `src/features/cms/core/derive.ts` | Funciones de derivación: social links, contact items, whatsapp |
| `src/features/cms/core/config.ts` | Configuración de canales de contacto del CMS |
| `src/features/cms/core/schemas.ts` | Zod schema: `uploadImageSchema` |
| `src/features/cms/core/types.ts` | Tipos completos del `SiteContent` (223 líneas) |
| `src/features/cms/core/default-content.ts` | Contenido por defecto para inicialización |
| `src/features/cms/core/components/cms-shell.tsx` | Componente principal del CMS (404 líneas) |
| `src/features/cms/core/components/cms-toolbar.tsx` | Toolbar del CMS |
| `src/features/cms/core/components/cms-sidebar-nav.tsx` | Sidebar de navegación del CMS |
| `src/features/cms/core/components/image-card.tsx` | Card de imagen |

---

## Feature: CMS / Editors — `src/features/cms/editors/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/cms/editors/components/globals-editor.tsx` | Editor de configuración global |
| `src/features/cms/editors/components/hero-editor.tsx` | Editor del hero |
| `src/features/cms/editors/components/about-editor.tsx` | Editor de "Acerca de" |
| `src/features/cms/editors/components/art-editor.tsx` | Editor de artes/disciplinas |
| `src/features/cms/editors/components/principles-editor.tsx` | Editor de principios |
| `src/features/cms/editors/components/schedule-editor.tsx` | Editor de horarios |
| `src/features/cms/editors/components/gallery-editor.tsx` | Editor de galería |
| `src/features/cms/editors/components/comments-editor.tsx` | Editor de testimonios |
| `src/features/cms/editors/components/faq-editor.tsx` | Editor de FAQ |
| `src/features/cms/editors/components/contact-editor.tsx` | Editor de contacto |
| `src/features/cms/editors/components/footer-editor.tsx` | Editor del footer |
| `src/features/cms/editors/components/storage-editor.tsx` | Editor de almacenamiento |
| `src/features/cms/editors/components/backups-editor.tsx` | Editor de backups |
| `src/features/cms/editors/components/developer-editor.tsx` | Editor de desarrollador (JSON import) |
| `src/features/cms/editors/components/header-editor.tsx` | Editor del header |

---

## Feature: CMS / Backups — `src/features/cms/backups/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/cms/backups/actions.ts` | Server Actions: restaurar, listar, eliminar, obtener autores |
| `src/features/cms/backups/schemas.ts` | Zod schemas de backup |
| `src/features/cms/backups/types.ts` | Tipos: `BackupEntry` |
| `src/features/cms/backups/components/backups-modal.tsx` | Modal de gestión de backups |

---

## Feature: CMS / Media — `src/features/cms/media/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/cms/media/actions.ts` | Server Actions: subir, eliminar, listar imágenes, stats del bucket |
| `src/features/cms/media/schemas.ts` | Zod schemas de media |
| `src/features/cms/media/types.ts` | Tipos: `StorageFile`, `BucketStats` |

---

## Feature: Health — `src/features/health/`

| Archivo | Descripción |
|---------|-------------|
| `src/features/health/actions.ts` | Server Action: `runHealthCheck` |
| `src/features/health/types.ts` | Tipos: `HealthStatus` |
| `src/features/health/hooks/use-health-check.ts` | Hook: `useHealthCheck` con animación de pasos |
| `src/features/health/components/health-check.tsx` | Componente de diagnóstico |

---

## Hooks Globales — `src/hooks/`

| Archivo | Descripción |
|---------|-------------|
| `src/hooks/use-debounce.ts` | Hook de debounce |
| `src/hooks/use-media-query.ts` | Hook de media query |
| `src/hooks/use-sidebar-state.ts` | Hook de estado del sidebar (collapse/expand) |

---

## Estadísticas del Análisis

| Métrica | Valor |
|---------|-------|
| Total de archivos analizados | **98** |
| Líneas de código aproximadas | ~8.500 |
| Archivos de configuración | 6 |
| Server Actions / Mutations / Queries | 26 |
| Componentes React | 42 |
| Hooks | 7 |
| Librerías / Utilidades | 17 |
| Archivos de tipos y schemas | 24 |
