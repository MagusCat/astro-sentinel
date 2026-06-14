# 🎨 Reporte de Estilos — UI/UX — Sentinel

> **Objetivo:** Identificar problemas de diseño visual, accesibilidad, consistencia de UI y experiencia de usuario.

---

## UI-01 — `html` tag tiene `lang="en"` pero la aplicación está en español

**Severidad:** 🔴 Crítico (accesibilidad y SEO)  
**Archivos:** `src/app/layout.tsx` (línea 22)

### Problema

El atributo `lang` del documento HTML está configurado como `"en"`, pero toda la interfaz de usuario, los mensajes de error y los labels están en español. Esto afecta:

- **Screen readers**: pronunciarán el español con fonética inglesa.
- **SEO**: los motores de búsqueda indexan el idioma incorrecto.
- **Validación W3C**: falla en herramientas de accesibilidad.

```tsx
// ❌ ACTUAL
<html lang="en" className={openSans.variable}>
```

### Solución

```tsx
// ✅
<html lang="es" className={openSans.variable}>
```

---

## UI-02 — La página `/health` mezcla strings en inglés y español sin criterio claro

**Severidad:** 🟡 Importante (estilo de código: regla de idioma)  
**Archivos:** `src/app/health/page.tsx` (líneas 21–23)

### Problema

La arquitectura establece que **todos los strings visibles al usuario deben estar en español**. La página de health check muestra textos en inglés sin justificación.

```tsx
// ❌ ACTUAL
<h1>System Operational</h1>
<p>All Sentinel core systems are running smoothly.</p>
<p>Módulos cargados: {loadedModulesLabel}</p>  {/* ← esto sí está en español */}
```

### Solución

```tsx
// ✅
<h1>Sistema Operativo</h1>
<p>Todos los servicios de Sentinel están funcionando correctamente.</p>
<p>Módulos cargados: {loadedModulesLabel}</p>
```

---

## UI-03 — `globals.css` declara una fuente mono `--font-geist-mono` que nunca se carga

**Severidad:** 🟡 Importante (CSS inconsistente / fuente rota)  
**Archivos:** `src/styles/globals.css` (línea 11), `src/app/layout.tsx`

### Problema

El token `--font-mono: var(--font-geist-mono)` hace referencia a una variable CSS que nunca se define porque `layout.tsx` solo carga `Open_Sans`. La fuente mono se usa en elementos como montos de pago, fechas y badgets de estado — actualmente caen al fallback del sistema.

```css
/* ❌ ACTUAL — font-geist-mono no existe en ningún lado */
--font-mono: var(--font-geist-mono);
```

### Solución

**Opción A:** Cargar `Geist Mono` en `layout.tsx`:

```tsx
import { Open_Sans, Geist_Mono } from 'next/font/google'
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
```

**Opción B:** Cambiar el token a una fuente mono del sistema:

```css
--font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
```

---

## UI-04 — `scrollbar-width: thin` con `width: 12px` en webkit es demasiado ancho en móvil

**Severidad:** 🟠 Menor (UX visual)  
**Archivos:** `src/styles/globals.css` (líneas 169–172)

### Problema

`scrollbar-width: thin` aplica al Firefox, pero el override de webkit define `width: 12px` y `height: 12px`, que es considerable en pantallas pequeñas. El scrollbar ocupa espacio visual innecesario.

```css
/* Valor actual — demasiado grande para móvil */
*::-webkit-scrollbar {
  width: 12px;   /* ← ocupa mucho espacio */
  height: 12px;
}
```

### Solución

Reducir a 6px para un look más moderno y consistente con el diseño actual:

```css
*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
```

---

## UI-05 — `transition-colors duration-300` en `body` puede causar FOUC en carga inicial

**Severidad:** 🟠 Menor (UX - flash de color)  
**Archivos:** `src/styles/globals.css` (línea 129)

### Problema

`transition-colors duration-300` en el `body` puede causar un flash visible cuando la página carga, especialmente si el tema inicial (light/dark) difiere del CSS por defecto. El usuario ve un destello de transición en el primer render.

```css
/* ❌ Puede causar FOUC */
body {
  @apply bg-background text-foreground font-sans transition-colors duration-300;
}
```

### Solución

Aplicar la transición solo después de la hidratación, usando una clase inyectada por JavaScript:

```css
body.transitions-ready {
  @apply transition-colors duration-300;
}
```

---

## UI-06 — `dashboard-overview.tsx` usa estilos de color hardcodeados sin variables CSS

**Severidad:** 🟠 Menor (inconsistencia de tema)  
**Archivos:** `src/features/admin/dashboard/components/dashboard-overview.tsx` (líneas 63–74)

### Problema

Los badges de estado de membresía usan colores hardcodeados (`bg-rose-500/10`, `text-rose-600`) en lugar de las variables del design system. Esto rompe la consistencia cuando el tema dark/light cambia.

```tsx
// ❌ Colores fuera del design system
'bg-rose-500/10 text-rose-600 border-rose-500/20'
'bg-red-500/10 text-red-600 border-red-500/20'
'bg-amber-500/10 text-amber-600 border-amber-500/20'
```

El componente `StatusBadge` ya existe en `@/components/shared` — precisamente para este caso de uso.

### Solución

```tsx
// ✅ Usar el componente compartido
import { StatusBadge } from '@/components/shared'
<StatusBadge status={membership.status} />
```

---

## UI-07 — `cms-shell.tsx` renderiza el modal de "unsaved changes" con estilos inline en lugar de usar `ConfirmDialog`

**Severidad:** 🟠 Menor (duplicación de UI)  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx` (líneas 356–392)

### Problema

El modal de "Cambios sin guardar" está implementado con HTML/botones inline dentro de `<Modal>`, replicando visualmente lo que `<ConfirmDialog>` ya ofrece. Esto duplica código de UI y hace más difícil mantener el estilo consistente.

```tsx
// ❌ ACTUAL — modal custom reimplementando ConfirmDialog
<Modal isOpen={!!pendingAction} ...>
  <div className="flex flex-col gap-4">
    <button onClick={() => setPendingAction(null)} className="text-xs font-semibold px-4 py-2...">
    <button onClick={...} className="text-xs font-bold px-4 py-2...">
```

### Solución

```tsx
// ✅ Reusar ConfirmDialog existente
<ConfirmDialog
  isOpen={!!pendingAction}
  onClose={() => setPendingAction(null)}
  onConfirm={() => { pendingAction?.(); setPendingAction(null) }}
  title="Cambios sin guardar"
  message="Tienes cambios pendientes de publicar. Si sales ahora, se perderán."
  confirmText="Sí, salir"
  cancelText="Cancelar"
  variant="danger"
/>
```

---

## UI-08 — `cms-shell.tsx` tiene indentación inconsistente en el bloque `renderEditor()`

**Severidad:** ℹ️ Nitpick (estilo de código)  
**Archivos:** `src/features/cms/core/components/cms-shell.tsx` (líneas 238–257)

### Problema

El bloque `case 'developer':` dentro de `renderEditor()` usa un nivel de indentación diferente al resto de los casos del `switch`. Los casos `'storage'` y `'backups'` tienen 2 espacios de indentación mientras que el estándar del archivo es 4 (o 6 si anidado).

```tsx
// ❌ Indentación inconsistente
      case 'storage': return <StorageEditor />
  case 'backups': return <BackupsEditor />     // ← 2 espacios, diferente
  case 'developer': return (                   // ← 2 espacios, diferente
```

### Solución

Normalizar la indentación al mismo nivel que el resto de los `case` del `switch`:

```tsx
      case 'storage': return <StorageEditor />
      case 'backups': return <BackupsEditor />
      case 'developer': return (...)
```

---

## UI-09 — `jwt.ts` tiene indentación inconsistente en encadenamiento de métodos

**Severidad:** ℹ️ Nitpick (estilo de código)  
**Archivos:** `src/lib/auth/jwt.ts` (líneas 38–41, 82–84)

### Problema

Los métodos `.setIssuer()`, `.setAudience()` y `.setExpirationTime()` están indentados con 2 espacios en lugar de 4, rompiendo la alineación del bloque `new SignJWT(...)`.

```typescript
// ❌ Indentación desigual
  return new SignJWT({ ... })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
  .setIssuer(APP_CONFIG.auth.jwtIssuer)    // ← 2 espacios
  .setAudience(APP_CONFIG.auth.jwtAudience) // ← 2 espacios
  .setExpirationTime(...)                   // ← 2 espacios
  .sign(key)
```

---

## Resumen de Estilos / UI / UX

| ID | Descripción | Severidad |
|---|---|---|
| UI-01 | `lang="en"` en HTML de una app en español | 🔴 Crítico |
| UI-02 | Strings en inglés en página `/health` (viola regla de idioma) | 🟡 Importante |
| UI-03 | `--font-geist-mono` referenciada pero nunca cargada | 🟡 Importante |
| UI-04 | Scrollbar webkit de 12px demasiado ancho en móvil | 🟠 Menor |
| UI-05 | `transition-colors` en body puede causar FOUC en carga | 🟠 Menor |
| UI-06 | Colores de badge hardcodeados, ignorando `StatusBadge` existente | 🟠 Menor |
| UI-07 | Modal de "unsaved changes" duplica `ConfirmDialog` | 🟠 Menor |
| UI-08 | Indentación inconsistente en `renderEditor()` de `cms-shell` | ℹ️ Nitpick |
| UI-09 | Indentación inconsistente en `jwt.ts` method chaining | ℹ️ Nitpick |
