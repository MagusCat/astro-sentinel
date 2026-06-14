# ⚡ Reporte de Optimización — Edge / Cloudflare — Sentinel

> **Objetivo:** Identificar problemas de rendimiento, compatibilidad con runtimes edge (Cloudflare Workers / OpenNext) y oportunidades de optimización.

---

## OPT-01 — `next.config.ts` deshabilita el caché de webpack en producción sin justificación

**Severidad:** 🔴 Crítico (build performance destruido)  
**Archivos:** `next.config.ts` (líneas 13–18)

### Problema

La configuración deshabilita explícitamente el caché de webpack en builds de producción. Esto hace que cada build reconstruya desde cero, aumentando los tiempos de CI/CD de manera significativa (puede duplicar o triplicar el tiempo de build).

```typescript
// ❌ ACTUAL — caché de build deshabilitado en prod
webpack: (config, { dev }) => {
  if (!dev) {
    config.cache = false   // ← elimina todo el caché incremental
  }
  return config
},
```

### Motivo probable

Posiblemente fue un workaround para un error de build específico. Si el error ya fue resuelto, esta línea debería eliminarse.

### Solución

Eliminar el bloque `webpack` o usar caché selectivo:

```typescript
// ✅ Eliminar completamente si el error subyacente ya se resolvió
// Si aún hay problema, investigar el error específico en lugar de deshabilitar el caché
```

---

## OPT-02 — `serverActions.bodySizeLimit: '20mb'` es excesivamente grande para un edge runtime

**Severidad:** 🔴 Crítico (límite de Cloudflare Workers)  
**Archivos:** `next.config.ts` (líneas 19–23)

### Problema

Cloudflare Workers tiene un límite de **128 MB de memoria total** y un request body limit de **100 MB**. Sin embargo, los Workers también tienen un tiempo máximo de CPU de **30s (paid) / 10ms (free)**. Un body de 20MB procesado en el edge puede exceder el tiempo de CPU disponible durante la serialización/deserialización.

Adicionalmente, **OpenNext en Cloudflare** puede no manejar correctamente streams de 20MB en la capa de adaptador.

```typescript
// ⚠️ Potencialmente problemático en edge
experimental: {
  serverActions: {
    bodySizeLimit: '20mb',
  },
}
```

### Contexto

Este límite existe para soportar la subida de imágenes en el CMS. La arquitectura ya usa Supabase Storage para imágenes — el cliente debería subir **directamente a Supabase Storage** (presigned URL) en lugar de pasar por el Server Action del edge.

### Solución

1. **Corto plazo:** Reducir a `'5mb'` para uso general, documentar la limitación.
2. **Largo plazo:** Implementar upload directo desde el cliente a Supabase usando `supabase.storage.from().upload()` desde el browser (con un token de sesión temporal).

---

## OPT-03 — `getAdminClient()` en auth/actions.ts crea un cliente Supabase sin caché (no reusable)

**Severidad:** 🟡 Importante (latencia en edge)  
**Archivos:** `src/features/auth/actions.ts` (líneas 26–37)

### Problema

La función `getAdminClient()` se llama dentro de `isDeviceAuthorized()` y `authorizeDevice()` creando un cliente nuevo en **cada invocación**. En el edge, instanciar clientes HTTP para cada request añade latencia de inicialización.

```typescript
// ❌ Nueva instancia en cada llamada
function getAdminClient() {
  return createSupabaseClient(supabaseUrl, serviceKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  })
}
```

### Solución

Mover a `lib/supabase/admin.ts` y usar el patrón de singleton por request context:

```typescript
// El cliente Supabase es stateless — se puede reusar dentro del mismo request
// OpenNext propaga el request context correctamente
let _adminClient: SupabaseClient | null = null
export function getAdminClient(): SupabaseClient {
  if (!_adminClient) _adminClient = createSupabaseClient(...)
  return _adminClient
}
```

---

## OPT-04 — `getOverviewStats` hace 5 queries en `Promise.all` — correctamente paralelizado ✅ con error parcial no manejado

**Severidad:** 🟡 Importante (resiliencia)  
**Archivos:** `src/features/admin/dashboard/actions.ts` (líneas 11–43)

### Punto positivo

`Promise.all()` está bien utilizado para paralelizar las 5 queries. 

### Problema

Si `vw_dashboard_stats` falla (`statsRes`), la función cae al `catch` y retorna zeros para todo. Pero si una de las otras queries falla (p.ej. `inactiveMembershipsRes`), el error se silencia y el array queda vacío, sin notificar al usuario.

```typescript
const { data: inactiveData } = inactiveMembershipsRes  // ← el error se descarta
```

### Solución

Manejar resultados parciales explícitamente:

```typescript
const { data: inactiveData, error: inactiveError } = inactiveMembershipsRes
if (inactiveError) console.error('Error fetching inactive memberships:', inactiveError)
```

---

## OPT-05 — `getBucketStats` en `media/actions.ts` usa un loop secuencial para listar carpetas

**Severidad:** 🟡 Importante (latencia innecesaria)  
**Archivos:** `src/features/cms/media/actions.ts` (líneas 120–132)

### Problema

El cálculo de estadísticas del bucket itera sobre carpetas de forma **secuencial** con un `for...of`, haciendo las requests una por una.

```typescript
// ❌ Secuencial — suma las latencias de cada folder
for (const folder of foldersToScan) {
  const { data } = await supabase.storage.from(parsed.data).list(folder, { limit: 1000 })
  ...
}
```

Con 6 carpetas para `site-images`, esto suma 6 roundtrips secuenciales al edge de Supabase.

### Solución

```typescript
// ✅ Paralelo
const results = await Promise.all(
  foldersToScan.map(folder =>
    supabase.storage.from(parsed.data).list(folder, { limit: 1000 })
  )
)
for (const { data } of results) {
  if (data) {
    for (const file of data) {
      if (file.id && file.name !== '.emptyFolderPlaceholder') {
        fileCount++
        totalSize += (file.metadata?.size || 0)
      }
    }
  }
}
```

---

## OPT-06 — `useDashboardData` carga datos duplicados en tabs `checkout` y `plans`

**Severidad:** 🟡 Importante (requests duplicadas)  
**Archivos:** `src/features/admin/dashboard/hooks/use-dashboard-data.ts` (líneas 45–70)

### Problema

La lógica de fetch para la tab `checkout` duplica exactamente el mismo fetch que `plans`. Si el usuario navega de `plans` a `checkout`, ambas queries se ejecutan nuevamente.

```typescript
// ❌ Código duplicado — mismo fetch
if (!tab || tab === 'plans') {
  const [plansData, classesRes] = await Promise.all([getClassPlans(), getClassesList()])
  ...
}
if (tab === 'checkout') {  // ← exactamente el mismo fetch
  const [plansData, classesRes] = await Promise.all([getClassPlans(), getClassesList()])
  ...
}
```

### Solución

```typescript
if (!tab || tab === 'plans' || tab === 'checkout') {
  const [plansData, classesRes] = await Promise.all([getClassPlans(), getClassesList()])
  setPlans(plansData)
  if (classesRes.success && classesRes.classes) setClasses(classesRes.classes)
}
```

---

## OPT-07 — `use-health-check.ts` usa delays artificiales hardcodeados (1.75s total)

**Severidad:** 🟠 Menor (UX / performance)  
**Archivos:** `src/features/health/hooks/use-health-check.ts` (líneas 27, 39, 48)

### Problema

El hook introduce **1.75 segundos** de delay artificial para animar los pasos del health check. La animación se desacopla de la realidad — el diagnóstico ya terminó pero el usuario espera artificialmente.

```typescript
await new Promise(r => setTimeout(r, 550))  // paso 1
await new Promise(r => setTimeout(r, 650))  // paso 2
await new Promise(r => setTimeout(r, 550))  // paso 3
// Total: 1750ms artificiales
```

### Contexto

El propósito visual es mostrar los pasos progresivamente. Está bien para UX, pero los delays son demasiado largos. 550ms por paso es perceptible como lento.

### Solución

Reducir los delays y/o ejecutar el diagnóstico real concurrentemente con la animación:

```typescript
// Reducir a 200-300ms por paso para una UX más fluida
await new Promise(r => setTimeout(r, 200))
```

---

## OPT-08 — `getSiteContent` bloquea la carga de la app con migración sincrónica de datos legacy

**Severidad:** 🟠 Menor (performance de carga del CMS)  
**Archivos:** `src/features/cms/core/actions.ts` (líneas 46–48)

### Problema

La migración de `globals.whatsapp` → `contact.whatsapp` se ejecuta en cada carga del CMS, incluso si el dato ya fue migrado. Esto añade lógica de evaluación innecesaria en cada request.

### Solución

Una vez confirmado que todos los archivos `content.json` en producción ya tienen el formato nuevo, eliminar el bloque de migración. Mientras tanto, agregar un flag `_version` en el contenido para detectar si necesita migración:

```typescript
if ((content._version || 1) < 2 && !content.contact.whatsapp && ...) {
  // migrar
  content._version = 2
}
```

---

## OPT-09 — `publishSiteContent` hace un `dynamic import` de `next/cache` en tiempo de ejecución

**Severidad:** 🟠 Menor (edge runtime / tree-shaking)  
**Archivos:** `src/features/cms/core/actions.ts` (línea 108)

### Problema

`revalidatePath` se importa dinámicamente dentro de la función en lugar de en el top-level. En el edge runtime de Cloudflare, los dynamic imports pueden ser problemáticos con el tree-shaking de OpenNext y añaden overhead de módulo.

```typescript
// ❌ ACTUAL — dynamic import dentro de Server Action
const { revalidatePath } = await import('next/cache')
revalidatePath('/', 'layout')
```

### Solución

```typescript
// ✅ Import estático en el top del archivo
import { revalidatePath } from 'next/cache'
```

---

## OPT-10 — `open-next.config.ts` está vacío — falta configuración explícita para Cloudflare

**Severidad:** 🟠 Menor (optimización para edge)  
**Archivos:** `open-next.config.ts`

### Problema

La configuración de OpenNext está mínima. Para Cloudflare Workers, se recomienda configurar explícitamente el runtime y las opciones de ISR/caché para asegurar comportamiento correcto.

### Solución

```typescript
// open-next.config.ts
import type { OpenNextConfig } from '@opennextjs/cloudflare'

export default {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
    },
  },
} satisfies OpenNextConfig
```

---

## Resumen de Optimización

| ID | Descripción | Severidad |
|---|---|---|
| OPT-01 | Caché de webpack deshabilitado en producción | 🔴 Crítico |
| OPT-02 | `bodySizeLimit: '20mb'` excesivo para edge runtime | 🔴 Crítico |
| OPT-03 | `getAdminClient()` crea nueva instancia en cada llamada | 🟡 Importante |
| OPT-04 | Errores parciales silenciados en `getOverviewStats` | 🟡 Importante |
| OPT-05 | `getBucketStats` hace requests de carpetas en secuencia | 🟡 Importante |
| OPT-06 | Fetch duplicado para tabs `plans` y `checkout` | 🟡 Importante |
| OPT-07 | Delays artificiales de 1.75s en health check | 🟠 Menor |
| OPT-08 | Migración de datos legacy en cada carga del CMS | 🟠 Menor |
| OPT-09 | `dynamic import` de `next/cache` dentro de Server Action | 🟠 Menor |
| OPT-10 | `open-next.config.ts` vacío para Cloudflare | 🟠 Menor |
