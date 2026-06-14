# 🛠️ Plan de Mejoras — Críticas del Usuario (docs/review/changes/)

> **Fuente:** `docs/review/changes/Criticas.md` + `docs/review/changes/UI.md`  
> **Fecha:** 2026-06-12

---

## Resumen de Críticas Recibidas

### Críticas generales (Criticas.md)
1. Problemas de estilos generales
2. Comentarios en español/inglés innecesarios en el código
3. Big components en features (sidebar de admin y CMS son enormes)
4. Sidebars de admin y CMS deberían estar normalizados
5. **Lógica de negocio expuesta en el front** (ej. pausar membresía desde el cliente — grave)
6. Algunos toasts en inglés cuando deberían estar en español
7. Falta delimitadores de sección en los componentes `.tsx` de cada feature para estructurar mejor el JSX
8. Comentarios inútiles sin borrar

### Críticas de UI (UI.md)
- Login: rediseño completo con degradado, selector simplificado, sin card en mobile, logo sin círculo
- Menú: logo sin función al hacer click, expandir solo en tablet/laptop, icono más grande, texto sin truncar, mobile fullscreen
- MetricCard: solo icono+número en mobile, subtítulo gris/pequeño en tablet/pc
- Dashboard: badge de membresía cancelada más pequeño
- Recepción: botones arriba del buscador en mobile, lista sin card de fondo, badge pequeño
- Modales de pago: advertencia sin color diferente, concepto muestra nombre
- Gestión de personal: textos más grandes, cambio de contraseña con confirmación
- Gestión de clientes: igual que personal + mobile order
- Membresías/pausar: date picker para seleccionar hasta cuándo pausar
- Pagos: filtros colapsables en mobile/tablet
- Control de membresía: orden de cards en mobile, filtros más grandes
- Mantenimiento: eliminar card Configuración, subtítulos, diagnóstico
- Shared/Modal: botón cerrar más grande, mobile fullscreen, botones en bottom
- Shared/Table: centralizar estilos e iconos
- Shared/Toast+Modals: altura mínima h-11, espaciado generoso
- General: date picker centralizado

---

## Fase 1 — Seguridad: Lógica de Negocio en el Front 🔴
> **Prioridad máxima.** La crítica más grave de Criticas.md.

---

### TASK-01 — Mover la lógica de "pausar membresía" al servidor

**Problema:** La decisión de si se puede pausar una membresía y los cálculos de días se calculan/validan en el cliente, permitiendo bypass de reglas de negocio.

**Archivos afectados:**
- `src/features/admin/memberships/mutations.ts`
- `src/features/admin/memberships/components/memberships-table.tsx` (o similar)
- `src/features/admin/clients/components/client-details-modal.tsx`

**Pasos:**
1. En `mutations.ts → freezeMembership`, mover TODA validación de estado al servidor:
   - "¿puede pausarse?" → validar `status === 'active'` solo en el server action
   - "¿hay membresías en cola?" → solo en el server action
2. En el componente cliente, el botón de "Pausar" solo debe llamar a la acción — sin lógica previa.
3. El componente mostrará u ocultará el botón basándose en el `status` del registro, NO en lógica propia.

**Criterio de aceptación:** El componente cliente no importa ni ejecuta ninguna lógica de negocio de membresías. Solo renderiza y llama acciones.

---

### TASK-02 — Añadir date picker para seleccionar fecha de reactivación al pausar

**Problema:** Al congelar, el usuario solo puede ingresar número de días. El usuario pide un calendar picker para seleccionar el día hasta el que pausará.

**Archivos:**
- `src/features/admin/memberships/mutations.ts` → `freezeMembership`
- `src/components/shared/form/` → nuevo `date-picker.tsx`
- `src/features/admin/memberships/components/` → modal de freeze

**Pasos:**
1. Crear `src/components/shared/form/date-picker.tsx` — componente centralizado.
2. Exportarlo desde `src/components/shared/index.ts`.
3. Modificar el modal de freeze: mostrar DatePicker para seleccionar `targetDate`.
4. Calcular `freezeDays = diff(today, targetDate)` en el servidor en `freezeMembership`.
5. Actualizar `freezeMembershipSchema` para aceptar `targetDate: z.string().date()` en lugar de `freezeDays`.

**Criterio de aceptación:** El usuario selecciona una fecha en el modal; el cálculo de días ocurre en el server action.

---

## Fase 2 — Refactor: Big Components y Normalización 🟡

---

### TASK-03 — Descomponer el sidebar de Admin en sub-componentes

**Problema:** `app/(admin)/_components/admin-shell.tsx` y el sidebar son componentes grandes con lógica mezclada.

**Pasos:**
1. Extraer la lógica de navegación a `use-admin-sidebar.ts` (hook).
2. Extraer cada sección del sidebar a `admin-sidebar-section.tsx`.
3. El componente principal solo orquesta, no contiene lógica.

**Criterio de aceptación:** El sidebar de admin usa el componente compartido `AppSidebar` en lugar de una implementación propia.

---

### TASK-04 — Normalizar ambos sidebars (Admin y CMS) usando `AppSidebar`

**Problema:** `cms-sidebar-nav.tsx` y el sidebar de admin son implementaciones completamente distintas cuando deberían compartir la base de `AppSidebar`.

**Archivos:**
- `src/components/shared/layout/app-sidebar.tsx`
- `src/features/cms/core/components/cms-sidebar-nav.tsx`
- `src/app/(admin)/_components/` sidebar

**Pasos:**
1. Revisar `AppSidebar` e identificar qué falta para CMS (ej. secciones colapsables).
2. Extender `AppSidebar` con las props necesarias.
3. Refactorizar `cms-sidebar-nav.tsx` para usar `AppSidebar` internamente.
4. Hacer lo mismo con el sidebar de admin.

**Criterio de aceptación:** Ambos sidebars comparten el mismo componente base. Un cambio de estilo en `AppSidebar` se refleja en ambos.

---

### TASK-05 — Agregar delimitadores de sección en componentes TSX

**Aclaración:** Los delimitadores aplican **solo a archivos `.tsx`** (componentes React) para estructurar el HTML/JSX, no a server actions ni mutations.

**Problema:** Los componentes grandes no tienen separadores visuales entre bloques del JSX (ej. header, body, sidebar, modales), dificultando la lectura y localización de secciones.

**Archivos objetivo:** Componentes `.tsx` con más de 100 líneas en features, por ejemplo:
- `src/features/cms/core/components/cms-shell.tsx`
- `src/features/admin/dashboard/components/dashboard-panel.tsx`
- `src/features/admin/memberships/components/memberships-panel.tsx`
- `src/features/admin/clients/components/client-details-modal.tsx`
- `src/features/admin/reception/components/reception-panel.tsx`

**Pasos:**
1. En cada componente TSX largo, agregar comentarios separadores en **inglés** antes de cada bloque JSX significativo:
   ```tsx
   {/* ── State & Feedback ────────────────────────── */}
   {/* ── Sidebar / Navigation ────────────────────── */}
   {/* ── Main Content ────────────────────────────── */}
   {/* ── Modals & Overlays ───────────────────────── */}
   ```
2. Usar el formato `{/* ── Section Name ──────────── */}` de forma consistente en todo el proyecto.
3. No agregar en archivos `.ts` de server actions — esos ya tienen el estilo `// ── Nombre` propio.

**Criterio de aceptación:** Cualquier componente TSX de más de 100 líneas tiene al menos 3 delimitadores en inglés separando sus bloques principales de JSX.

---

### TASK-06 — Limpiar comentarios inútiles del codebase

**Problema:** Hay comentarios en inglés innecesarios, comentarios que reiteran lo que hace el código, y comentarios huérfanos de código eliminado.

**Archivos a revisar:**
- `src/lib/auth/jwt.ts` — comentarios de security notes redundantes
- `src/features/auth/actions.ts` — `// Send raw password over HTTPS — bcrypt.compare runs server-side`
- `src/features/admin/memberships/mutations.ts`
- `src/features/cms/core/actions.ts`

**Pasos:**
1. Eliminar cualquier comentario que solo repita lo que el código hace.
2. Mantener solo comentarios que expliquen el **por qué**, no el **qué**.
3. Traducir al español los comentarios útiles que estén en inglés.
4. En `jwt.ts`, conservar el bloque de Security Notes (es útil, solo traducirlo).

**Criterio de aceptación:** No hay comentarios en inglés en archivos de features. No hay comentarios que digan lo mismo que el código.

---

### TASK-07 — Traducir toasts en inglés a español

**Problema:** Algunos mensajes de feedback están en inglés.

**Archivos a revisar:**
- `src/features/auth/actions.ts` — `'Error fetching user record'`, etc.
- `src/features/auth/components/login-panel.tsx` — `'Failed to verify device...'`
- `src/features/admin/dashboard/hooks/use-dashboard-data.ts` — `'Failed to load dashboard data'`
- `src/lib/supabase/admin.ts`

**Pasos:**
1. Buscar todos los `console.error(...)` y `setToast(...)` con strings en inglés.
2. Traducir al español manteniendo el mismo nivel de detalle.

**Criterio de aceptación:** `grep -r "Failed to\|Error fetching\|Error loading" src/` no retorna resultados en componentes de UI.

---

## Fase 3 — UI: Componentes Compartidos 🟡

---

### TASK-08 — Rediseñar el Login con fondo degradado y UX mejorado

**Problema:** El login actual usa una card flotante. El usuario quiere:
- Fondo de degradado con la paleta de color propia
- En mobile: fill completo (sin card flotante)
- Selector admin/personal simplificado (sin fondo en las opciones)
- Logo sin el círculo pulsante

**Archivos:**
- `src/features/auth/components/login-panel.tsx`
- `src/app/login/page.tsx`

**Pasos:**
1. En `login/page.tsx`, agregar fondo con `bg-gradient-to-br from-primary/20 via-background to-accent/10 min-h-screen`.
2. En `login-panel.tsx`:
   - En mobile: `w-full h-full min-h-screen` sin `max-w-md` ni `rounded` ni card border
   - En desktop: `max-w-md rounded-2xl border`
   - Cambiar `animate={true}` a `animate={false}` en `<Logo>` (eliminar parpadeo)
3. Simplificar `ToggleButtonGroup` en el selector de login: sin card/fondo, solo texto + icono activo con underline o punto indicador.
4. Si `localLoginEnabled` es false, no renderizar el selector en absoluto.

**Criterio de aceptación:** El login en mobile ocupa toda la pantalla. No hay parpadeo en el logo. El selector no tiene card de fondo.

---

### TASK-09 — Ajustar comportamiento del menú/sidebar (click en logo, mobile fullscreen)

**Problema:**
- Click en el logo no debe tener función (actualmente navega)
- Expandir/minimizar solo disponible en tablet/laptop
- En mobile, el menu debe cubrir toda la pantalla
- Texto de opciones no debe truncarse
- Icono del logo más grande

**Archivos:**
- `src/features/cms/core/components/cms-sidebar-nav.tsx`
- `src/app/(admin)/_components/` sidebar

**Pasos:**
1. Remover el `<Link>` o `onClick` del componente Logo en el sidebar.
2. Ocultar el botón collapse/expand en mobile: `hidden md:flex`.
3. En mobile, el overlay del sidebar debe ser `fixed inset-0 z-50` (fullscreen), no un panel lateral.
4. En items del sidebar, cambiar `truncate` por `whitespace-nowrap overflow-visible`.
5. Aumentar el icono del Logo en sidebar: de `w-8 h-8` a `w-10 h-10`.
6. El botón de cerrar mobile: mismo `w` y `h` que el botón de minimizar.

**Criterio de aceptación:** En mobile, el menu ocupa toda la pantalla. No hay truncamiento de texto.

---

### TASK-10 — MetricCard: responsive sin subtítulo en mobile

**Problema:** En mobile las cards deben mostrar solo icono + número. Subtítulo en gris/sm para tablet/pc. Títulos y números más pequeños en tablet.

**Archivo:** `src/components/shared/data-display/metric-card.tsx`

**Pasos:**
1. Ajustar el título de la card: `text-[10px] md:text-xs lg:text-sm`.
2. El número: `text-2xl md:text-3xl lg:text-4xl`.
3. El subtítulo: `text-muted-foreground` (ya en gris), agregar `text-xs font-normal` (menos llamativo).
4. Ocultar el subtítulo en mobile: `hidden sm:block`.

**Criterio de aceptación:** En mobile la card muestra solo icono + título + número. En desktop también el subtítulo en gris/pequeño.

---

### TASK-11 — Modal compartido: botón cerrar más grande, bottom actions

**Problema:** El botón de cerrar es muy pequeño (`w-4 h-4`). En mobile debe ser fullscreen. Los botones de acción deben estar en el bottom del modal.

**Archivo:** `src/components/shared/feedback/modal.tsx`

**Pasos:**
1. El botón de cierre: `p-2 rounded-lg` y `X` de `w-5 h-5`.
2. Agregar prop `footer?: React.ReactNode` para renderizar botones en el bottom.
3. El footer: `sticky bottom-0 bg-card border-t border-border/10 p-4 flex gap-2 justify-end`.

**Criterio de aceptación:** El botón de cierre es visualmente mayor. Los modales con `footer` muestran acciones abajo con sticky positioning.

---

### TASK-12 — StatusBadge: añadir labels en español y soporte de membresías

**Problema:** El `StatusBadge` muestra el status crudo (en inglés: `expired`, `frozen`, `cancelled`). Debe mostrar el texto en español.

**Archivo:** `src/components/shared/data-display/status-badge.tsx`

**Pasos:**
1. Añadir un `LABEL_MAP` con traducciones:
   ```ts
   const LABEL_MAP: Record<string, string> = {
     active: 'Activo',
     expired: 'Vencida',
     frozen: 'Pausada',
     cancelled: 'Cancelada',
     transferred: 'Transferida',
     inactive: 'Inactivo',
     pending: 'Pendiente',
   }
   ```
2. Añadir al `STATUS_CONFIG` las entradas faltantes (`expired`, `frozen`, `cancelled`, `transferred`).
3. Renderizar `LABEL_MAP[status] ?? status` en lugar de `status` directamente.

**Criterio de aceptación:** `<StatusBadge status="expired" />` muestra "Vencida" en rojo. `<StatusBadge status="frozen" />` muestra "Pausada" en ámbar.

---

### TASK-13 — DatePicker centralizado

**Problema:** No hay un componente de date picker compartido. Se pide centralizarlo.

**Archivo nuevo:** `src/components/shared/form/date-picker.tsx`

**Pasos:**
1. Crear un componente `DatePicker` simple con `<input type="date">` estilizado con el design system:
   ```tsx
   export function DatePicker({ label, value, onChange, min, max, disabled }: DatePickerProps)
   ```
2. Usar los mismos estilos que `TextField` (mismo `rounded-xl`, `border`, `focus:ring`).
3. Agregar `min={today}` por defecto cuando se usa en contexto de freeze.
4. Exportar desde `src/components/shared/index.ts`.

**Criterio de aceptación:** El DatePicker existe como componente compartido y se usa en el modal de freeze de membresía.

---

### TASK-14 — Shared/Table: centralizar estilos e incluir iconos base

**Problema:** Las tablas de datos tienen estilos inconsistentes. El usuario pide centralizar estilos y elementos comunes como iconos.

**Archivo:** `src/components/shared/data-display/data-table.tsx`

**Pasos:**
1. Definir `TABLE_CELL_BASE = "text-sm font-medium text-foreground"` como clase base.
2. Definir `TABLE_HEADER_BASE = "text-xs font-bold uppercase tracking-wider text-muted-foreground"`.
3. Agregar prop `icon?: LucideIcon` a las columnas para renderizar un icono antes del valor.
4. Eliminar el uso de `font-light` en cualquier celda — mínimo `font-normal`.

**Criterio de aceptación:** Todas las tablas del proyecto usan los estilos base de `data-table.tsx`. No hay `font-light` en celdas de tablas.

---

## Fase 4 — UI: Secciones Específicas 🟠

---

### TASK-15 — Login: ocultar selector cuando `localLoginEnabled` es false

**Problema:** El selector Admin/Personal aparece aunque el login de usuario esté desactivado.

**Archivo:** `src/features/auth/components/login-panel.tsx`

**Pasos:**
1. Agregar condición: `{adminEnabled && localLoginEnabled && <ToggleButtonGroup ... />}`.
2. Si solo hay un tipo de login disponible, no mostrar el selector.

**Criterio de aceptación:** Si `localLoginEnabled=false`, el selector no se renderiza.

---

### TASK-16 — Recepción: botones "Nuevo pago" y "Nuevo cliente" arriba del buscador en mobile

**Archivo:** `src/features/admin/reception/components/reception-panel.tsx`

**Pasos:**
1. Cambiar el orden de los elementos en mobile: botones primero, luego el buscador.
2. Usar `flex-col-reverse md:flex-row` o reordenar con CSS `order`.

---

### TASK-17 — Recepción: eliminar card de fondo en lista de resultados de búsqueda

**Archivo:** `src/features/admin/reception/components/reception-panel.tsx`

**Pasos:**
1. Eliminar el `bg-card border rounded-xl` que envuelve la lista de clientes en el buscador.
2. Dejar los items directamente sobre el fondo de la página.

---

### TASK-18 — Recepción/Modal de pago: advertencia con estilo base, mostrar nombre en concepto

**Problema:** La advertencia de membresía pausada usa un color diferente innecesario. En "pago completado", el concepto no muestra el nombre del usuario.

**Pasos:**
1. En el modal de procesar pago, cambiar la advertencia de `text-amber-600 bg-amber-50` al estilo base con solo un icono de advertencia.
2. En el concepto del pago completado, concatenar el `full_name` del cliente.

---

### TASK-19 — Gestión de personal/clientes: textos más grandes en tabla

**Problema:** Se usa `font-light` en nombres y campos de tabla que dificulta la lectura.

**Pasos:**
1. En las tablas de staff y clientes, cambiar `font-light` → `font-medium` para nombres.
2. El badge de estado activo: `text-sm` mínimo.

---

### TASK-20 — Gestión de personal: cambio de contraseña con re-ingreso de contraseña actual

**Problema:** El usuario puede cambiar su propia contraseña sin confirmar la actual.

**Archivos:**
- `src/features/admin/staff/mutations.ts` → `updateUserData`
- `src/features/admin/staff/schemas.ts`
- `src/features/admin/staff/components/edit-user-modal.tsx`

**Pasos:**
1. En el schema de update, agregar `current_password?: z.string()`.
2. En `updateUserData`: si el usuario está editando su propia contraseña, requerir `current_password` y verificar contra el hash actual antes de actualizar.
3. En el modal de edición, agregar el campo "Contraseña actual" que solo aparece cuando el usuario edita su propio registro.

**Criterio de aceptación:** Un usuario no puede cambiar su propia contraseña sin ingresar la actual primero.

---

### TASK-21 — Gestión de personal/modal editar: ocultar campo rol si no se puede editar

**Problema:** El campo "Rol" se muestra aunque el usuario actual no tenga permiso de cambiarlo.

**Archivo:** `src/features/admin/staff/components/edit-user-modal.tsx`

**Pasos:**
1. Leer el rol del `currentUser` desde el contexto.
2. Mostrar el selector de rol solo si `currentUser.role === 'maintainer'`.
3. Si no puede cambiar el rol, mostrar un texto: "Tipo: Recepcionista" (readonly).

---

### TASK-22 — Clientes/modal detalle: orden de cards en mobile

**Problema:** En mobile, los últimos pagos deben estar abajo y las membresías activas arriba.

**Archivo:** `src/features/admin/clients/components/client-details-modal.tsx`

**Pasos:**
1. Usar CSS `order` para reordenar en mobile:
   - Datos del cliente: `order-1`
   - Membresías activas: `order-2`
   - Últimos pagos: `order-3` (al fondo)
2. En desktop mantener el layout actual.

---

### TASK-23 — Clientes/modal: ocultar botón "Pausar" si no se puede pausar

**Problema:** El botón de pausar se muestra aunque la membresía no sea pausable.

**Archivo:** `src/features/admin/clients/components/client-details-modal.tsx`

**Pasos:**
1. Solo renderizar el botón "Pausar" si `membership.status === 'active'`.
2. Validar el permiso también en el botón: solo si `Roles.canManageStaff(currentUser.role)`.

---

### TASK-24 — Pagos: filtros colapsables en mobile/tablet

**Archivo:** `src/features/admin/payments/components/payments-log.tsx`

**Pasos:**
1. Agregar estado `filtersOpen = false` en mobile.
2. En mobile/tablet, mostrar un botón "Filtros" que expande/colapsa el panel de filtros.
3. En desktop, los filtros siempre visibles.

---

### TASK-25 — Control de membresía: orden de cards en mobile

**Archivo:** `src/features/admin/memberships/components/memberships-panel.tsx` o similar

**Pasos:**
1. La card de "Ocupación" debe estar encima de "Registro General" en mobile.
2. Usar `flex-col` con `order` CSS.

---

### TASK-26 — Mantenimiento: limpiar sección developer-panel

**Problema:** El panel tiene: card "Configuración", subtítulos de cards, y "Herramientas de Diagnóstico" que deben eliminarse.

**Archivo:** `src/features/admin/developer/components/developer-panel.tsx`

**Pasos:**
1. Eliminar la card "Configuración" completa.
2. Eliminar todos los subtítulos de las `SectionCard`.
3. Eliminar la sección "Herramientas de Diagnóstico" y sus cards.

---

### TASK-27 — Toast y modales: espaciado mínimo y altura h-11

**Problema:** Algunos botones dentro de modales tienen altura inconsistente (`h-11`) y las cards son muy pequeñas.

**Pasos:**
1. En `modal.tsx`, asegurar `p-6` mínimo en el body del modal.
2. Estandarizar todos los botones de confirmación en modales a `h-11 px-6`.
3. Agregar `min-h-[44px]` a los botones de acción en modales compartidos.

---

### TASK-28 — Control de membresía: filtro de búsqueda más grande que el selector

**Archivo:** `src/features/admin/memberships/components/memberships-table.tsx` o filtros

**Pasos:**
1. El input de búsqueda: `flex-1` (ocupa el espacio restante).
2. El selector de clase: `w-48` (fijo, más pequeño).

---

## Resumen del Plan

| Fase | Tasks | Área | Estimación |
|------|-------|------|------------|
| **🔴 Fase 1** — Seguridad | TASK-01, 02 | Lógica de negocio en front | ~3h |
| **🟡 Fase 2** — Refactor | TASK-03 a 07 | Big components, código limpio | ~4h |
| **🟡 Fase 3** — Shared Components | TASK-08 a 14 | Login, Modal, MetricCard, Badges | ~5h |
| **🟠 Fase 4** — UI Específica | TASK-15 a 28 | Secciones por módulo | ~6h |
| **Total** | **28 tasks** | | **~18h** |

---

## Prioridades de Ejecución

1. **Inmediato (esta sesión):** TASK-01 (lógica de negocio), TASK-12 (StatusBadge en español), TASK-15 (selector condicional)
2. **Alta prioridad:** TASK-08 (Login rediseño), TASK-10 (MetricCard responsive), TASK-11 (Modal mejorado), TASK-02 (DatePicker)
3. **Media prioridad:** TASK-03/04 (sidebars), TASK-05/06/07 (código limpio)
4. **Backlog:** TASK-15 a 28 (secciones específicas)
