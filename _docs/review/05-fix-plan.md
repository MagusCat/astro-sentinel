# 🛠️ Plan de Correcciones — Code Review Sentinel

> **Basado en:** `docs/review/01-code-quality.md`, `02-styles-ui-ux.md`, `03-optimization.md`, `04-code-style.md`  
> **Total de issues:** 45 (8 críticos, 12 importantes, 21 menores, 4 nitpicks)

---

## Fase 1 — Seguridad e Integridad de Datos 🔴
> **Prioridad:** Inmediata. Estos bugs deben corregirse antes de cualquier otro trabajo.

---

### TASK-01 — Agregar auth guard a `revokeDeviceById` y `getAuthorizedDevices`
**Issues:** CS-05, CS-06  
**Archivo:** `src/features/admin/developer/actions.ts`

**Pasos:**
1. Al inicio de `getAuthorizedDevices`, agregar:
   ```ts
   const currentUser = await getCurrentUser()
   if (!currentUser || !Roles.canAccessDeveloper(currentUser.role)) {
     return { success: false, error: 'Acceso denegado: Se requieren permisos de mantenimiento.' }
   }
   ```
2. Al inicio de `revokeDeviceById` (antes del `safeParse`), agregar la misma verificación.
3. Importar `getCurrentUser` desde `@/features/auth/actions` y `Roles` desde `@/lib/auth/roles`.

**Criterio de aceptación:** Un usuario con rol `reception` no puede llamar estas acciones sin recibir error.

---

### TASK-02 — Agregar verificación de rol efectiva en `freeze/unfreezeMembership`
**Issue:** CQ-02  
**Archivo:** `src/features/admin/memberships/mutations.ts`

**Pasos:**
1. En `freezeMembership` y `unfreezeMembership`, reemplazar:
   ```ts
   if (!currentUser?.role) { ... }
   ```
   por:
   ```ts
   if (!currentUser?.role || !Roles.canManageStaff(currentUser.role)) {
     return { success: false, error: 'Acceso denegado: Solo administradores pueden gestionar membresías.' }
   }
   ```

**Criterio de aceptación:** Solo `admin` o `maintainer` pueden congelar/descongelar membresías.

---

### TASK-03 — Hacer `unfreezeMembership` tolerante a fallo parcial
**Issue:** CQ-03  
**Archivo:** `src/features/admin/memberships/mutations.ts`

**Pasos:**
1. Capturar el `id` de la fila insertada con `.select('id').single()`.
2. Si el `UPDATE` posterior falla, compensar eliminando la fila recién insertada:
   ```ts
   if (updateError) {
     await supabase.from('memberships').delete().eq('id', inserted.id)
     return { success: false, error: 'Error al actualizar el estado de la membresía.' }
   }
   ```

**Criterio de aceptación:** Si el segundo write falla, no quedan dos membresías activas.

---

### TASK-04 — Mover `UpdatePayload` de `policies.ts` a `types.ts`
**Issue:** CQ-01  
**Archivos:** `src/features/admin/staff/policies.ts`, `src/features/admin/staff/types.ts`

**Pasos:**
1. Cortar `UpdatePayload` (interfaz, líneas 5–11) de `policies.ts`.
2. Pegarla en `types.ts`.
3. Agregar `import { UpdatePayload } from './types'` en `policies.ts`.

**Criterio de aceptación:** `policies.ts` no define ni exporta ningún tipo/interfaz.

---

## Fase 2 — Build, Deploy y Accesibilidad 🟡

---

### TASK-05 — Corregir `lang="en"` en el root layout
**Issue:** UI-01  
**Archivo:** `src/app/layout.tsx`

**Pasos:**
1. Cambiar `<html lang="en"` → `<html lang="es"`.

---

### TASK-06 — Traducir strings en inglés de la página `/health`
**Issue:** UI-02  
**Archivo:** `src/app/health/page.tsx`

**Pasos:**
1. `"System Operational"` → `"Sistema Operativo"`.
2. `"All Sentinel core systems are running smoothly."` → `"Todos los servicios de Sentinel están funcionando correctamente."`.

---

### TASK-07 — Eliminar `config.cache = false` de `next.config.ts`
**Issue:** OPT-01  
**Archivo:** `next.config.ts`

**Pasos:**
1. Eliminar el bloque `webpack: (config, { dev }) => { ... }` completo.
2. Correr `npx next build` para confirmar que no hay errores subyacentes.

> ⚠️ Si el build falla, investigar el error real — no volver a deshabilitar el caché.

---

### TASK-08 — Reducir y documentar `bodySizeLimit`
**Issue:** OPT-02  
**Archivo:** `next.config.ts`

**Pasos:**
1. Cambiar `'20mb'` → `'10mb'`.
2. Agregar comentario explicando la limitación del edge runtime de Cloudflare.

---

### TASK-09 — Reemplazar token `--font-geist-mono` por stack de fuente mono del sistema
**Issue:** UI-03  
**Archivo:** `src/styles/globals.css`

**Pasos:**
1. Reemplazar:
   ```css
   --font-mono: var(--font-geist-mono);
   ```
   por:
   ```css
   --font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
   ```

---

## Fase 3 — Calidad de Código y Optimización 🟡

---

### TASK-10 — Extraer `normalizeContent()` de `getSiteContent`
**Issue:** CQ-04  
**Archivos:** `src/features/cms/core/actions.ts`, `src/features/cms/core/normalize.ts` (nuevo)

**Pasos:**
1. Crear `normalize.ts` con una función `normalizeContent(raw: unknown): SiteContent` que contenga toda la lógica de defaults y migración legacy (líneas 38–62 de `actions.ts`).
2. En `actions.ts`, reemplazar el bloque por:
   ```ts
   import { normalizeContent } from './normalize'
   const content = normalizeContent(JSON.parse(text))
   ```

---

### TASK-11 — Tipar `AuthenticatedUser.role` como `AppRole`
**Issue:** CQ-07  
**Archivos:** `src/features/auth/types.ts`, `src/lib/auth/jwt.ts`

**Pasos:**
1. Cambiar `role: string` → `role: AppRole` en `AuthenticatedUser`.
2. En `verifySessionToken`, validar que el rol del payload sea un `AppRole` válido antes de retornar.
3. Corregir errores de TypeScript en cascada.

---

### TASK-12 — Corregir `catch {}` vacío en `authenticateAdmin`
**Issue:** CS-02  
**Archivo:** `src/features/auth/actions.ts`

**Pasos:**
1. En el `catch {}` vacío (líneas 270–281), agregar log y retorno de error:
   ```ts
   } catch (err) {
     console.error('[Auth] Error fetching user record:', err)
     return { success: false, error: 'Error interno al verificar credenciales.' }
   }
   ```

---

### TASK-13 — Mover `getAdminClient` a `lib/supabase/admin.ts`
**Issue:** CQ-12  
**Archivos:** `src/features/auth/actions.ts`, `src/lib/supabase/admin.ts` (nuevo)

**Pasos:**
1. Crear `src/lib/supabase/admin.ts` con `export function createAdminClient(): SupabaseClient { ... }`.
2. Eliminar la función `getAdminClient` local de `auth/actions.ts`.
3. Eliminar el import directo de `@supabase/supabase-js` en `auth/actions.ts`.
4. Importar `createAdminClient` desde `@/lib/supabase/admin`.

---

### TASK-14 — Mover `import revalidatePath` al top-level de `cms/core/actions.ts`
**Issue:** OPT-09  
**Archivo:** `src/features/cms/core/actions.ts`

**Pasos:**
1. Agregar al inicio: `import { revalidatePath } from 'next/cache'`.
2. Eliminar el `await import('next/cache')` dentro de `publishSiteContent`.
3. Eliminar el `await import('@/lib/config')` dentro de la función (ya importado en el top).

---

### TASK-15 — Paralelizar `getBucketStats` con `Promise.all`
**Issue:** OPT-05  
**Archivo:** `src/features/cms/media/actions.ts`

**Pasos:**
1. Reemplazar el `for...of` secuencial por:
   ```ts
   const results = await Promise.all(
     foldersToScan.map(folder => supabase.storage.from(parsed.data).list(folder, { limit: 1000 }))
   )
   for (const { data } of results) {
     if (data) for (const file of data) {
       if (file.id && file.name !== '.emptyFolderPlaceholder') {
         fileCount++
         totalSize += (file.metadata?.size || 0)
       }
     }
   }
   ```

---

### TASK-16 — Eliminar fetch duplicado en `useDashboardData`
**Issue:** OPT-06  
**Archivo:** `src/features/admin/dashboard/hooks/use-dashboard-data.ts`

**Pasos:**
1. Unificar los bloques `if (tab === 'plans')` e `if (tab === 'checkout')` en uno:
   ```ts
   if (!tab || tab === 'plans' || tab === 'checkout') {
     const [plansData, classesRes] = await Promise.all([getClassPlans(), getClassesList()])
     setPlans(plansData)
     if (classesRes.success && classesRes.classes) setClasses(classesRes.classes)
   }
   ```

---

### TASK-17 — Reemplazar `alert()` por callback `onError` en `developer-editor.tsx`
**Issue:** CQ-10  
**Archivos:** `src/features/cms/editors/components/developer-editor.tsx`, `src/features/cms/core/components/cms-shell.tsx`

**Pasos:**
1. Agregar `onError: (message: string) => void` a la interfaz `Props` del editor.
2. Reemplazar `alert(...)` por `onError(...)`.
3. En `cms-shell.tsx`, pasar `onError={(msg) => showToast(msg, 'error')}` al `<DeveloperEditor>`.

---

### TASK-18 — Derivar `anyEnabled` dinámicamente en `lib/modules.ts`
**Issue:** CS-07  
**Archivo:** `src/lib/modules.ts`

**Pasos:**
1. Reemplazar el valor hardcodeado:
   ```ts
   export const getActiveModules = () => {
     const adminEnabled = APP_CONFIG.modules.admin
     const cmsEnabled = APP_CONFIG.modules.cms
     return {
       adminEnabled,
       cmsEnabled,
       anyEnabled: adminEnabled || cmsEnabled,
       localLoginEnabled: APP_CONFIG.auth.enableLocalLogin,
     }
   }
   ```

---

## Fase 4 — Deuda Técnica y Nitpicks 🟠

---

### TASK-19 — Reducir logs en `cms/core/actions.ts`
**Issue:** CQ-09  
**Archivo:** `src/features/cms/core/actions.ts`

**Pasos:**
1. Reemplazar `console.group/log/groupEnd` por `console.info('[CMS] Content published', { url, modifiedBy, backupKey })`.
2. Reemplazar el log de image upload por `console.info('[CMS] Image upload', { userId, fileName, size })`.

---

### TASK-20 — Reducir scrollbar webkit a 6px
**Issue:** UI-04  
**Archivo:** `src/styles/globals.css`

**Pasos:**
1. Cambiar `width: 12px; height: 12px` → `width: 6px; height: 6px`.

---

### TASK-21 — Reemplazar modal inline de "unsaved changes" por `ConfirmDialog`
**Issue:** UI-07  
**Archivo:** `src/features/cms/core/components/cms-shell.tsx`

**Pasos:**
1. Reemplazar el `<Modal>` con contenido inline (líneas 356–392) por `<ConfirmDialog>` con las props equivalentes.

---

### TASK-22 — Usar `StatusBadge` en `dashboard-overview.tsx`
**Issue:** UI-06  
**Archivo:** `src/features/admin/dashboard/components/dashboard-overview.tsx`

**Pasos:**
1. Verificar que `StatusBadge` soporta los estados `expired`, `cancelled`, `frozen`.
2. Reemplazar el `<span className={...}>` con lógica de colores inline por `<StatusBadge status={membership.status} />`.

---

### TASK-23 — Estandarizar tipo de retorno de `logout` y `revokeDeviceAuthorization`
**Issues:** CS-03, CS-04  
**Archivo:** `src/features/auth/actions.ts`

**Pasos:**
1. Cambiar las firmas a `Promise<{ success: boolean; error?: string }>`.
2. Retornar `{ success: true }` al final del happy path de cada función.
3. Actualizar los llamadores.

---

### TASK-24 — Mover `formatDate` a `lib/utils.ts`
**Issue:** CS-09  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx`, `src/lib/utils.ts`

**Pasos:**
1. Cortar `formatDate` de `cms-shell.tsx`.
2. Pegarlo en `lib/utils.ts` como export nombrado.
3. Importarlo en `cms-shell.tsx` desde `@/lib/utils`.

---

### TASK-25 — Reordenar flujo de `saveNewUser` según estándar
**Issue:** CS-01  
**Archivo:** `src/features/admin/staff/mutations.ts`

**Pasos:**
1. Mover `safeParse` antes de `getCurrentUser()`.
2. Mover los checks de permisos después del parse.

---

### TASK-26 — Eliminar archivos temporales de la raíz
**Issue:** CQ-11  
**Archivos:** `test_derive.ts`, `tmp_diff.patch`, `tmp_diff_staged.patch`, `.gitignore`

**Pasos:**
1. Eliminar los 3 archivos.
2. Agregar `tmp_diff*.patch` a `.gitignore`.

---

### TASK-27 — Corregir indentación en `cms-shell.tsx` y `jwt.ts`
**Issues:** UI-08, UI-09  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx`, `src/lib/auth/jwt.ts`

**Pasos:**
1. Normalizar la indentación de los `case 'storage'`, `'backups'`, `'developer'` en `renderEditor()`.
2. Normalizar el method chaining de `SignJWT` en `jwt.ts`.

---

### TASK-28 — Agregar límite de concurrencia en `getBackupAuthors`
**Issue:** CQ-06  
**Archivo:** `src/features/cms/backups/actions.ts`

**Pasos:**
1. Reemplazar `Promise.all(parsed.data.names.map(...))` por procesamiento en chunks de 5.

---

## Resumen del Plan

| Fase | Tasks | Issues resueltos | Estimación |
|------|-------|-----------------|------------|
| **Fase 1** — Seguridad | TASK-01 a 04 | CS-05, CS-06, CQ-02, CQ-03, CQ-01 | ~2h |
| **Fase 2** — Build/Deploy | TASK-05 a 09 | UI-01, UI-02, OPT-01, OPT-02, UI-03 | ~1h |
| **Fase 3** — Calidad | TASK-10 a 18 | CQ-04, CQ-07, CS-02, CQ-12, OPT-09, OPT-05, OPT-06, CQ-10, CS-07 | ~4h |
| **Fase 4** — Deuda técnica | TASK-19 a 28 | CQ-09, UI-04, UI-07, UI-06, CS-03/04, CS-09, CS-01, CQ-11, UI-08/09, CQ-06 | ~3h |
| **Total** | **28 tasks** | **45 issues** | **~10h** |

---

## Issues Fuera del Alcance de Este Plan

| Issue | Razón |
|-------|-------|
| **CQ-05** — `cms-shell.tsx` demasiado grande | Refactor mayor que requiere diseño de hooks dedicados |
| **OPT-02** — Upload directo a Supabase (largo plazo) | Cambio de arquitectura de la subida de imágenes |
| **UI-05** — FOUC en `transition-colors` | Requiere lógica de hidratación; impacto visual mínimo |
