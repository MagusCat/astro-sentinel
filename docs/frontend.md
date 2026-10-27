# Diseño frontend

## Principio

La UI debe sentirse **moderna, limpia, calmada, tablet-first y touch-friendly**, pensada
para usuarios no técnicos. Prioriza whitespace, tipografía legible, targets grandes,
navegación simple y layouts modulares. Evita el desorden visual, animaciones excesivas y
gradientes innecesarios.

## Regla de oro

**Antes de escribir `<div className="…">`, pregúntate si ya existe un componente.**
Casi siempre sí. Revisa `src/components/shared/` primero. Duplicar
estructura inline crea deuda, deriva visual y bugs.

## Inventario de componentes compartidos

Todo vive en `src/components/shared/` (no hay `components/ui/`). Importa por barrel:
`import { Button, TextField, DataTable } from '@/components/shared'`.

| Necesitas… | Usa | Carpeta |
|-----------|-----|---------|
| Campo de formulario con label | `TextField` | `shared/form` |
| Botón (cualquier estilo) | `Button` | `shared/form` |
| Contenedor tipo tarjeta | `SectionCard` / `Card` | `shared/data-display` |
| Tabla de datos | `DataTable` | `shared/data-display` |
| Estado vacío / sin datos | `EmptyState` | `shared/feedback` |
| Buscador | `SearchInput` | `shared/form` |
| Spinner de carga | `LoadingState` | `shared/feedback` |
| Confirmar/cancelar | `ConfirmDialog` / `Modal` | `shared/feedback` |
| Cabecera de página | `PageHeader` | `shared/layout` |
| Etiqueta de estado | `StatusBadge` | `shared/data-display` |
| Indicador de progreso | `ProgressBar` | `shared/feedback` |
| Alerta / aviso | `WarningAlert` | `shared/feedback` |
| Conmutador de pestañas | `ToggleButtonGroup` | `shared/form` |

`Button`: variantes `default | outline | secondary | neutral | ghost | destructive | link`;
tamaños `xs | sm | default | lg | icon | icon-xs | icon-sm | icon-lg`.

`DataTable`: pásale `data`, `keyExtractor`, `columns` (con `render` opcional) y `emptyState`.

## Árbol de decisión

input con label→`TextField` · botón→`Button` · tarjeta→`SectionCard`
· tabla→`DataTable` · buscador→`SearchInput` · carga→`LoadingState` · confirmación→`ConfirmDialog`
· estado→`StatusBadge` · progreso→`ProgressBar` · alerta→`WarningAlert` · toggle→`ToggleButtonGroup`
· vacío→`EmptyState`. El wrapper de página lo da el layout de ruta (`AdminShell`/`CmsShell`),
no un componente compartido. Si no encaja: JSX mínimo y, si se repite más de una vez, extrae a
`src/components/shared/`.

## Reglas

- **No** `className` inline de más de ~60 caracteres: si es largo, es un patrón reutilizable.
- **No** copiar la misma estructura `<div className="…">` entre ficheros. Extráela.
- **Siempre** `cn()` de `@/lib/utils` para combinar clases condicionalmente.
- **Prefiere composición**: componentes de feature pequeños que componen primitivas compartidas.
- Componente funcional, tipado, `async/await`; lógica de negocio fuera de la UI.
- Al tocar un fichero con HTML/Tailwind crudo antiguo, migra oportunistamente a los compartidos.

## Sistema de diseño

- **Tailwind v4** con tokens variables + shadcn/ui (base-nova). `rounded-lg`/`rounded-md`,
  bordes mínimos, layouts con mucho whitespace, jerarquía clara, tipografía grande.
- **Paleta:** Primary `#3B82F6`, Light `#60A5FA`, Dark Surface `#1F2937`,
  Soft BG `#E0F2FE`, Accent Purple `#A78BFA`, Deep Purple `#7C3AED`.
- **Animación:** microinteracciones suaves, hover sutil, transiciones gentiles, nada que distraiga.
- **Accesibilidad:** no bloquear el zoom (`viewport` sin `userScalable:false`); targets táctiles grandes.
