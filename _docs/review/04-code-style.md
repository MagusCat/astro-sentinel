# 📐 Reporte de Estilos de Código — Sentinel

> **Objetivo:** Verificar que el código respeta los estándares del proyecto definidos en el `sentinel-architecture` skill: separación de responsabilidades, estructura de archivos, convenciones de naming e importaciones.

---

## CS-01 — `saveNewUser` en `mutations.ts` tiene lógica de autorización que viola el flujo estándar de Actions

**Severidad:** 🟡 Importante (violación de orden del flujo de Server Action)  
**Archivos:** `src/features/admin/staff/mutations.ts` (líneas 11–43)

### Problema

La arquitectura define que el flujo de un Server Action debe ser:
1. Parse input → `schema.safeParse()`
2. Check permissions → `Roles.*`
3. Execute DB query
4. Return result

`saveNewUser` invierte los pasos 1 y 2: verifica permisos **antes** de validar el input, y hace checks de roles adicionales **entre** la validación del schema y la query a la DB.

```typescript
// ❌ ACTUAL — orden incorrecto
async function saveNewUser(userData) {
  // Paso 2 (permisos) — ANTES que el parse
  const currentUser = await getCurrentUser()
  if (currentUser.role !== APP_ROLE.ADMIN && ...) return { error }
  
  // Paso 1 (parse) — DESPUÉS de permisos
  const parsed = createUserSchema.safeParse(userData)
  
  // Lógica de negocio adicional mezclada
  if (userData.role === APP_ROLE.ADMIN && !userData.auth_user_id?.trim()) { return { error } }
}
```

### Solución

Seguir el orden estándar:

```typescript
// ✅ Orden correcto
async function saveNewUser(userData) {
  // 1. Parse y validar input
  const parsed = createUserSchema.safeParse(userData)
  if (!parsed.success) return { error: ... }
  
  // 2. Verificar permisos
  const currentUser = await getCurrentUser()
  if (!Roles.canManageStaff(currentUser?.role)) return { error: 'Acceso denegado.' }
  
  // 3. Reglas de negocio
  if (parsed.data.role === APP_ROLE.ADMIN && ...) return { error: ... }
  
  // 4. Query DB
  const supabase = await createClient()
  ...
}
```

---

## CS-02 — `authenticateAdmin` en `auth/actions.ts` tiene un bloque `catch {}` vacío

**Severidad:** 🟡 Importante (silencia errores, dificulta debugging)  
**Archivos:** `src/features/auth/actions.ts` (líneas 270–281)

### Problema

El bloque `catch` al obtener el `userRecord` de Supabase está completamente vacío. Si la query falla por un error de red o de RLS, el error se silencia y el código continúa como si el usuario no existiera, retornando un mensaje poco informativo.

```typescript
// ❌ ACTUAL — catch vacío
try {
  const { data: user } = await supabase
    .from('users')
    .select(...)
    .maybeSingle()
  if (user) userRecord = user
} catch {
  // ← nada aquí, error completamente silenciado
}

if (!userRecord) {
  return { success: false, error: 'Error al obtener información de usuario.' }
}
```

### Solución

```typescript
// ✅ Loguear y retornar error apropiado
try {
  const { data: user, error: userError } = await supabase.from('users').select(...).maybeSingle()
  if (userError) throw userError
  if (user) userRecord = user
} catch (err) {
  console.error('[Auth] Error fetching user record:', err)
  return { success: false, error: 'Error interno al verificar credenciales.' }
}
```

---

## CS-03 — `revokeDeviceAuthorization` no tiene tipo de retorno explícito consistente

**Severidad:** 🟠 Menor (inconsistencia de API)  
**Archivos:** `src/features/auth/actions.ts` (línea 123)

### Problema

`revokeDeviceAuthorization` retorna `Promise<void>` en lugar de seguir el patrón `{ success: boolean; error?: string }` que el resto de las Server Actions usan. Los llamadores no pueden saber si la revocación fue exitosa.

```typescript
// ❌ void — no comunica resultado
export async function revokeDeviceAuthorization(): Promise<void>
```

### Solución

```typescript
// ✅ Patrón estándar
export async function revokeDeviceAuthorization(): Promise<{ success: boolean; error?: string }>
```

---

## CS-04 — `logoutUser` y `logoutUserFull` retornan `Promise<void>` en lugar del patrón estándar

**Severidad:** 🟠 Menor (inconsistencia de API)  
**Archivos:** `src/features/auth/actions.ts` (líneas 323–337)

### Problema equivalente al CS-03 para las funciones de logout.

```typescript
// ❌ ACTUAL
export async function logoutUser(): Promise<void>
export async function logoutUserFull(): Promise<void>
```

### Solución

```typescript
// ✅
export async function logoutUser(): Promise<{ success: boolean; error?: string }>
export async function logoutUserFull(): Promise<{ success: boolean; error?: string }>
```

---

## CS-05 — `revokeDeviceById` en `developer/actions.ts` no verifica permisos de usuario

**Severidad:** 🔴 Crítico (bug de seguridad — endpoint sin auth guard)  
**Archivos:** `src/features/admin/developer/actions.ts` (líneas 52–74)

### Problema

`revokeDeviceById` valida el input con Zod pero **nunca verifica que el usuario en sesión tenga permisos** para revocar dispositivos. Cualquier usuario autenticado (incluyendo recepcionistas) puede llamar a esta acción y revocar un dispositivo.

```typescript
// ❌ ACTUAL — sin verificación de permisos
export async function revokeDeviceById(deviceId: string) {
  const parsed = revokeDeviceSchema.safeParse({ deviceId })
  if (!parsed.success) return { error: ... }
  
  // ← FALTA: getCurrentUser() + Roles.canAccessDeveloper()
  
  const supabase = await createClient()
  await supabase.from('authorized_devices').delete().eq('device_id', ...)
}
```

### Solución

```typescript
export async function revokeDeviceById(deviceId: string) {
  const parsed = revokeDeviceSchema.safeParse({ deviceId })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  
  const currentUser = await getCurrentUser()
  if (!currentUser || !Roles.canAccessDeveloper(currentUser.role)) {
    return { success: false, error: 'Acceso denegado: Se requieren permisos de mantenimiento.' }
  }
  
  ...
}
```

---

## CS-06 — `getAuthorizedDevices` no verifica permisos de usuario

**Severidad:** 🔴 Crítico (bug de seguridad — endpoint sin auth guard)  
**Archivos:** `src/features/admin/developer/actions.ts` (líneas 9–50)

### Problema equivalente a CS-05. `getAuthorizedDevices` retorna la lista de todos los dispositivos autorizados y quién los autorizó, sin verificar si el usuario tiene permisos.

```typescript
// ❌ ACTUAL — sin verificación de permisos
export async function getAuthorizedDevices() {
  // ← FALTA: getCurrentUser() + Roles.canAccessDeveloper()
  const supabase = await createClient()
  const { data } = await supabase.from('authorized_devices').select(...)
  ...
}
```

---

## CS-07 — Módulos `APP_CONFIG.modules.anyEnabled` es un campo estático que no refleja la realidad

**Severidad:** 🟠 Menor (lógica incorrecta / campo engañoso)  
**Archivos:** `src/lib/config/app.ts` (líneas 34–38)

### Problema

`anyEnabled: true` está hardcodeado como constante. Debería derivarse dinámicamente de `admin || cms`. Si en el futuro se deshabilitan ambos módulos, `anyEnabled` seguirá siendo `true`, causando comportamiento incorrecto en el middleware y las redirecciones.

```typescript
// ❌ ACTUAL — hardcodeado, nunca cambia
modules: {
  admin: true,
  cms: true,
  anyEnabled: true,  // ← siempre true, no derivado
},
```

### Solución

```typescript
// En getActiveModules() o en la definición de APP_CONFIG
anyEnabled: APP_CONFIG.modules.admin || APP_CONFIG.modules.cms
```

O eliminar `anyEnabled` del config y derivarlo en el punto de uso:

```typescript
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

## CS-08 — `dashboard/page.tsx` es un Client Component innecesario

**Severidad:** 🟠 Menor (violación arquitectónica sutil)  
**Archivos:** `src/app/(admin)/dashboard/page.tsx` (líneas 1–15)

### Problema

`dashboard/page.tsx` tiene `'use client'` solo para leer el contexto de usuario mediante `useActiveUser()`. El layout ya hace la verificación server-side y pasa el usuario por contexto. Pero el componente de página no necesita ser client component — podría recibir el usuario via props del layout o leerlo del contexto en un child client component.

```typescript
// ❌ La página completa es client por solo leer contexto
'use client'
export default function DashboardPage() {
  const activeUser = useActiveUser()
  if (!activeUser) return <SessionLoading />
  return <DashboardPanel activeUser={activeUser} />
}
```

### Contexto

Dado que `DashboardPanel` sí necesita ser client (tiene hooks y estado), el impacto real es mínimo. Sin embargo, `<SessionLoading />` como fallback no es necesario aquí porque el layout ya garantiza que `activeUser` existe.

---

## CS-09 — `cms-shell.tsx` define `formatDate` como función de módulo fuera del componente que debería estar en `lib/utils.ts`

**Severidad:** 🟠 Menor (organización de utilidades)  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx` (líneas 45–55)

### Problema

`formatDate` es una función de utilidad pura (sin dependencias de componente) que formatea fechas con locale español. Está definida a nivel de módulo en un componente de 404 líneas. Esta función debería vivir en `lib/utils.ts` donde es reutilizable y testeable.

```typescript
// ❌ Función de utilidad en un componente
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { ... })
  } catch { return null }
}
```

---

## CS-10 — `cms-shell.tsx` tiene doble línea vacía entre `formatDate` y el componente principal

**Severidad:** ℹ️ Nitpick  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx` (líneas 56–58)

Hay dos líneas en blanco consecutivas entre el fin de `formatDate` y el inicio del componente `CmsShell`. El estándar del proyecto es una sola línea en blanco entre declaraciones de top-level.

---

## CS-11 — `health/actions.ts` expone internals de Supabase (`getSession`) que no pertenecen a la capa de health check

**Severidad:** 🟠 Menor (acoplamiento con internals de Supabase)  
**Archivos:** `src/features/health/actions.ts` (línea 34)

### Problema

El health check llama a `supabase.auth.getSession()` para verificar el handshake. Esto acopla el health check a la implementación interna de Supabase Auth. Si Supabase cambia el endpoint, el health check falla.

### Solución

Usar una query más semántica como un `SELECT 1` o verificar la conectividad con la tabla `_status` directamente, sin pasar por la capa de Auth.

---

## Resumen de Estilos de Código

| ID | Descripción | Severidad |
|---|---|---|
| CS-01 | `saveNewUser` viola el orden estándar del flujo de Server Action | 🟡 Importante |
| CS-02 | Bloque `catch {}` vacío en `authenticateAdmin` | 🟡 Importante |
| CS-03 | `revokeDeviceAuthorization` retorna `void` en lugar del patrón estándar | 🟠 Menor |
| CS-04 | `logoutUser/Full` retornan `void` en lugar del patrón estándar | 🟠 Menor |
| CS-05 | `revokeDeviceById` sin verificación de permisos — **bug de seguridad** | 🔴 Crítico |
| CS-06 | `getAuthorizedDevices` sin verificación de permisos — **bug de seguridad** | 🔴 Crítico |
| CS-07 | `anyEnabled` hardcodeado, no derivado de los módulos reales | 🟠 Menor |
| CS-08 | `dashboard/page.tsx` Client Component innecesario | 🟠 Menor |
| CS-09 | `formatDate` debería estar en `lib/utils.ts` | 🟠 Menor |
| CS-10 | Doble línea vacía en `cms-shell.tsx` | ℹ️ Nitpick |
| CS-11 | Health check acoplado a `supabase.auth.getSession()` | 🟠 Menor |

---

## Hallazgos Positivos — Buenas Prácticas Observadas

A pesar de los problemas identificados, el codebase muestra varias prácticas sólidas:

✅ **Separación de concerns** — Las capas `schemas.ts`, `types.ts`, `actions.ts`/`mutations.ts`/`queries.ts` están bien separadas en casi todos los módulos.

✅ **Barrel imports** — El uso del barrel en `@/components/shared` está bien respetado en la mayoría de los componentes.

✅ **Server Components por defecto** — Los layouts son Server Components correctamente; no hay `useEffect` para sesiones en layouts.

✅ **Zod en todas partes** — Todas las Server Actions usan Zod para validación; no hay validación manual.

✅ **Error handling consistente** — El patrón `{ success: boolean; error?: string }` está bien seguido (con las excepciones documentadas).

✅ **JWT bien implementado** — El módulo `lib/auth/jwt.ts` tiene notas de seguridad correctas y usa Web Crypto disponible en el edge.

✅ **CSS design system limpio** — `globals.css` tiene un sistema de tokens bien estructurado con soporte completo para dark mode.

✅ **RBAC correctamente centralizado** — El objeto `Roles` en `lib/config/domain.ts` centraliza la lógica de permisos de manera limpia.
