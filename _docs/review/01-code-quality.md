# 🔍 Reporte de Calidad de Código — Sentinel

> **Fecha:** 2026-06-12  
> **Revisión:** Completa (codebase completo)  
> **Criterio:** Mantenibilidad, legibilidad, correctitud, arquitectura

---

## Objetivo

Identificar problemas de calidad en el código que afectan la comprensión, mantenibilidad y correctitud a largo plazo, basándose en las reglas definidas en `sentinel-architecture` skill.

---

## CQ-01 — `policies.ts` define una interfaz de tipo (`UpdatePayload`) que debería estar en `types.ts`

**Severidad:** 🔴 Crítico (viola regla explícita de arquitectura)  
**Archivos:** `src/features/admin/staff/policies.ts` (línea 5–11)

### Problema

La arquitectura define que **ningún tipo/interfaz puede vivir fuera de `types.ts`** dentro de su feature. El archivo `policies.ts` es un helper de negocio, no un contenedor de tipos.

```typescript
// ❌ ACTUAL — en policies.ts
export interface UpdatePayload {
  full_name?: string
  password_hash?: string
  is_active?: boolean
  role?: string
  auth_user_id?: string | null
}
```

### Solución

Mover `UpdatePayload` a `src/features/admin/staff/types.ts` e importarla en `policies.ts`.

```typescript
// ✅ En types.ts
export interface UpdatePayload {
  full_name?: string
  password_hash?: string
  is_active?: boolean
  role?: string
  auth_user_id?: string | null
}

// ✅ En policies.ts
import { UpdatePayload } from './types'
```

---

## CQ-02 — `freezeMembership` y `unfreezeMembership` no verifican el rol del usuario

**Severidad:** 🔴 Crítico (bug de seguridad / autorización incompleta)  
**Archivos:** `src/features/admin/memberships/mutations.ts` (líneas 10–78, 80–152)

### Problema

`freezeMembership` y `unfreezeMembership` solo verifican que el usuario tenga **cualquier** rol (`currentUser?.role` es truthy), pero no validan si tiene permisos de gestión. En contraste, `cancelMembership` sí usa `Roles.canManageStaff()`. Esto permite que un recepcionista congele/descongele membresías sin autorización.

```typescript
// ❌ ACTUAL — freezeMembership / unfreezeMembership
const currentUser = await getCurrentUser()
if (!currentUser?.role) {   // ← solo verifica que tenga algún rol
  return { success: false, error: 'Acceso denegado: Sesión inválida.' }
}
```

```typescript
// ✅ CORRECTO — como en cancelMembership
if (!currentUser?.role || !Roles.canManageStaff(currentUser.role)) {
  return { success: false, error: 'Acceso denegado: Solo administradores pueden gestionar membresías.' }
}
```

### Solución

Agregar la verificación `Roles.canManageStaff(currentUser.role)` al inicio de ambas funciones.

---

## CQ-03 — `unfreezeMembership` tiene una operación no-atómica (two-step write sin transacción)

**Severidad:** 🔴 Crítico (bug de integridad de datos)  
**Archivos:** `src/features/admin/memberships/mutations.ts` (líneas 119–145)

### Problema

La función inserta una nueva membresía activa (línea 119) y luego actualiza la membresía congelada a `transferred` (línea 137). Si la inserción tiene éxito pero el `update` falla, el sistema queda en estado inconsistente: hay **dos membresías activas** para el mismo cliente/clase.

```
INSERT nueva membresía activa ✅
UPDATE membresía antigua → transferred ❌ (falla)
Resultado: dos registros activos para el mismo cliente
```

### Solución

Usar una **función RPC de Supabase (Postgres function)** que envuelva ambas operaciones en una transacción atómica, o al menos implementar compensación explícita: si el `update` falla, hacer rollback del `insert`.

```typescript
// Opción mínima — compensación manual
const { error: insertError } = await supabase.from('memberships').insert(...)
if (insertError) return { success: false, error: '...' }

const { error: updateError } = await supabase.from('memberships')
  .update({ status: 'transferred' }).eq('id', membershipId)
if (updateError) {
  // Compensar: eliminar la membresía recién insertada
  await supabase.from('memberships').delete().eq('payment_id', ...) 
  return { success: false, error: '...' }
}
```

---

## CQ-04 — `getSiteContent` tiene migración de datos inline (lógica de negocio mezclada con lectura)

**Severidad:** 🟡 Importante (mezcla de responsabilidades)  
**Archivos:** `src/features/cms/core/actions.ts` (líneas 38–62)

### Problema

La función `getSiteContent` hace 3 cosas a la vez: leer el JSON, aplicar defaults de campos faltantes **y** ejecutar una migración de datos legacy (mover `globals.whatsapp` → `contact.whatsapp`). Esto viola el principio de responsabilidad única.

```typescript
// ❌ Migración de datos incrustada en la función de lectura
if (!content.contact.whatsapp && (content.globals as unknown as Record<string, unknown>).whatsapp) {
  content.contact.whatsapp = ...
  delete (content.globals as unknown as Record<string, unknown>).whatsapp
}
// También: filtrado de social links con lógica hardcodeada
const AUTO_ICONS = ['phone', 'mail', 'map-pin']
content.globals.socialLinks = content.globals.socialLinks.filter(...)
```

### Solución

Extraer la normalización a una función pura separada:

```typescript
// En un nuevo archivo: features/cms/core/normalize.ts
export function normalizeContent(raw: unknown): SiteContent { ... }

// En actions.ts
const content = normalizeContent(JSON.parse(text))
```

---

## CQ-05 — `cms-shell.tsx` es un componente gigante (404 líneas, 15+ estados)

**Severidad:** 🟡 Importante (mantenibilidad crítica)  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx`

### Problema

El componente maneja: carga de contenido, publicación, logout, backups, restauración, navegación entre secciones, modales, toasts, sidebar, y estado del borrador. Tiene **15 variables de estado** y más de 12 event handlers en un solo componente.

### Solución

Extraer la lógica de estado a hooks dedicados:

```typescript
// hooks/use-cms-content.ts — carga y publicación de contenido
// hooks/use-cms-navigation.ts — navegación entre secciones con transición
// hooks/use-cms-modals.ts — control de modales (backup, confirmación)
```

La vista (`CmsShell`) debería orquestar estos hooks, no implementar toda la lógica.

---

## CQ-06 — `getBackupAuthors` hace N requests paralelas sin límite de concurrencia

**Severidad:** 🟡 Importante (performance / abuso de recursos)  
**Archivos:** `src/features/cms/backups/actions.ts` (líneas 128–144)

### Problema

`Promise.all()` con un `map()` sin límite puede disparar decenas de descargas de Supabase simultáneas para obtener los autores de cada backup, saturando las conexiones del edge.

```typescript
// ❌ Sin límite de concurrencia
await Promise.all(parsed.data.names.map(async (name) => {
  const { data } = await supabase.storage.from(CONTENT_BUCKET).download(`backups/${name}`)
  ...
}))
```

### Solución

Implementar un semáforo o usar `p-limit`:

```typescript
// Alternativa sin dependencias: procesar en chunks de 5
const CHUNK_SIZE = 5
for (let i = 0; i < names.length; i += CHUNK_SIZE) {
  await Promise.all(names.slice(i, i + CHUNK_SIZE).map(async (name) => { ... }))
}
```

---

## CQ-07 — `AuthenticatedUser.role` es `string` en lugar de `AppRole`

**Severidad:** 🟡 Importante (type safety débil)  
**Archivos:** `src/features/auth/types.ts`

### Problema

El campo `role` en `AuthenticatedUser` es `string`, lo que permite asignar cualquier valor sin validación de tipos. Toda la lógica de `Roles.*` acepta `string` por compatibilidad, pero el compilador no detecta roles inválidos.

```typescript
// ❌ ACTUAL
export interface AuthenticatedUser {
  role: string  // sin restricción
}
```

```typescript
// ✅ CORRECTO
import { AppRole } from '@/lib/config'
export interface AuthenticatedUser {
  role: AppRole
}
```

### Nota

Esto también requeriría ajustar `verifySessionToken` en `jwt.ts` para retornar el rol tipado (validando contra `APP_ROLE`).

---

## CQ-08 — Inline role comparisons en componentes de staff (UI)

**Severidad:** 🟠 Menor (violación de estilo de arquitectura)  
**Archivos:**  
- `src/features/admin/staff/components/create-user-modal.tsx` (líneas 36, 79, 84, 88, 96)  
- `src/features/admin/staff/components/edit-user-modal.tsx` (líneas 40–41, 84, 90, 98)  
- `src/features/admin/staff/components/user-management.tsx` (líneas 262–264)

### Problema

La arquitectura establece que **todos** los role checks deben usar `Roles.*` helpers. Los componentes comparan directamente contra `APP_ROLE.*` en la UI, duplicando lógica de permisos.

```typescript
// ❌ ACTUAL — comparación directa en UI
activeUser.role === APP_ROLE.MAINTAINER
activeUser.role === APP_ROLE.ADMIN
```

### Solución

Agregar helpers al objeto `Roles` para los casos de uso de UI:

```typescript
// En lib/config/domain.ts
canCreateAdmin: (role: string) => role === APP_ROLE.MAINTAINER,
isAdmin: (role: string) => role === APP_ROLE.ADMIN,
```

---

## CQ-09 — `console.log` / `console.group` en código de producción (Server Action)

**Severidad:** 🟠 Menor (observabilidad incorrecta)  
**Archivos:** `src/features/cms/core/actions.ts` (líneas 128–131, 187)

### Problema

`publishSiteContent` imprime el JSON completo del contenido del sitio al log del servidor en cada publicación. Además de revelar datos potencialmente sensibles en logs, `console.group` no está disponible de manera consistente en todos los runtimes edge.

```typescript
// ❌ ACTUAL
console.group('[CMS] Publicación Exitosa')
console.log('URL:', finalPublicUrl)
console.log('JSON:', newContent)  // ← imprime TODO el JSON en prod
console.groupEnd()
```

### Solución

Reemplazar por logs estructurados concisos (sin el payload completo):

```typescript
// ✅
console.info('[CMS] Content published', {
  url: finalPublicUrl,
  modifiedBy: newContent._metadata?.lastModifiedBy,
  backupKey,
})
```

---

## CQ-10 — `developer-editor.tsx` usa `alert()` del navegador para errores de usuario

**Severidad:** 🟠 Menor (UX inconsistente)  
**Archivos:** `src/features/cms/editors/components/developer-editor.tsx` (líneas 32, 35)

### Problema

El componente usa `alert()` nativo del navegador para mostrar errores de validación JSON, mientras que el resto del CMS usa el componente `Toast`. Esto rompe la consistencia de la UI.

```typescript
// ❌ ACTUAL
alert('El archivo JSON no tiene el formato de contenido esperado...')
alert('Error crítico: El archivo subido no es un JSON válido.')
```

### Solución

El componente `DeveloperEditor` debería recibir una prop `onError` o usar un callback para comunicar errores al padre (`CmsShell`), que ya tiene la infraestructura de `showToast`.

```typescript
interface Props {
  onImport: (data: SiteContent) => void
  onError: (message: string) => void  // ← nueva prop
}
```

---

## CQ-11 — `test_derive.ts` y `tmp_diff.patch` en la raíz del proyecto

**Severidad:** 🟠 Menor (limpieza del repositorio)  
**Archivos:** `/test_derive.ts`, `/tmp_diff.patch`, `/tmp_diff_staged.patch`

### Problema

Archivos temporales de desarrollo comprometidos en el repositorio. `test_derive.ts` es un script de prueba ad-hoc que no tiene ubicación apropiada. Los archivos `.patch` son diffs temporales.

### Solución

1. Eliminar `test_derive.ts`, `tmp_diff.patch`, `tmp_diff_staged.patch`.
2. Agregar a `.gitignore`: `tmp_diff*.patch`, `test_*.ts` (en raíz).

---

## CQ-12 — `getAdminClient()` en `auth/actions.ts` no está en `lib/supabase/`

**Severidad:** 🟠 Menor (violación de arquitectura: Supabase logic fuera de lib/supabase)  
**Archivos:** `src/features/auth/actions.ts` (líneas 26–37)

### Problema

La arquitectura establece *"Keep Supabase logic centralized"* en `lib/supabase/`. La función `getAdminClient()` crea un cliente Supabase con service role directamente en `features/auth/actions.ts`, duplicando configuración y saliendo del patrón centralizado.

```typescript
// ❌ ACTUAL — en features/auth/actions.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
function getAdminClient() {
  return createSupabaseClient(supabaseUrl, getSecret('SUPABASE_SERVICE_ROLE_KEY'), ...)
}
```

### Solución

Mover a `lib/supabase/admin.ts`:

```typescript
// ✅ En lib/supabase/admin.ts
export function createAdminClient(): SupabaseClient {
  const { supabaseUrl } = getServiceConfig()
  return createSupabaseClient(supabaseUrl, getSecret('SUPABASE_SERVICE_ROLE_KEY'), {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  })
}
```

---

## Resumen de Calidad de Código

| ID | Descripción | Severidad |
|---|---|---|
| CQ-01 | `UpdatePayload` en `policies.ts` en lugar de `types.ts` | 🔴 Crítico |
| CQ-02 | `freeze/unfreezeMembership` sin verificación de rol | 🔴 Crítico |
| CQ-03 | `unfreezeMembership` no es atómica (2 writes sin transacción) | 🔴 Crítico |
| CQ-04 | Migración de datos legacy inline en `getSiteContent` | 🟡 Importante |
| CQ-05 | `cms-shell.tsx` demasiado grande (404 líneas, 15 estados) | 🟡 Importante |
| CQ-06 | `getBackupAuthors` sin límite de concurrencia en Promise.all | 🟡 Importante |
| CQ-07 | `AuthenticatedUser.role` tipado como `string` en lugar de `AppRole` | 🟡 Importante |
| CQ-08 | Comparaciones de rol inline en componentes de staff UI | 🟠 Menor |
| CQ-09 | `console.log` con payload JSON completo en producción | 🟠 Menor |
| CQ-10 | `alert()` nativo en lugar de `Toast` en developer-editor | 🟠 Menor |
| CQ-11 | Archivos temporales en raíz del repositorio | 🟠 Menor |
| CQ-12 | `getAdminClient()` fuera de `lib/supabase/` | 🟠 Menor |
