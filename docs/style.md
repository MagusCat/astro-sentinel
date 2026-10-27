# Estilo base y sistema de componentes

Guía canónica para mantener una UI uniforme y cómo construir componentes.
Complementa [frontend.md](frontend.md) (inventario) con los tokens, las capas y
los patrones de carga rápida. **Léela antes de crear o tocar UI.**

## 1. Principio

Moderna, limpia, calmada, **tablet-first**, touch-friendly, para usuarios no
técnicos. Whitespace, tipografía legible, targets grandes, microinteracciones
sutiles. Nada de desorden visual, animaciones excesivas ni gradientes gratuitos.

## 2. Tokens (única fuente de verdad)

Definidos en [`src/styles/globals.css`](../src/styles/globals.css) (`@theme` + `:root`).
**Usa siempre el token, nunca un valor arbitrario.**

### Color (variables semánticas, no hex sueltos)
`background`, `foreground`, `card`, `primary` (#4953ac indigo), `secondary`
(#2563eb azul), `accent` (#652fe7 violeta), `muted`, `border`, `destructive`
(#b41340), `ring`, y la familia `sidebar-*` (fondo azul del menú).
En clases: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`,
`bg-primary/10`, etc. **No** escribas `bg-[#4953ac]`.

### Radio — escala basada en `--radius: 0.75rem`
| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-md` | 0.6rem | inputs, chips, badges |
| `rounded-lg` | 0.75rem | botones, controles |
| `rounded-xl` | 1.05rem | contenedores pequeños |
| `rounded-2xl` | 1.35rem | iconos-contenedor, modales |
| `rounded-3xl` | 1.65rem | tarjetas compactas (`Card size="sm"`) |
| `rounded-4xl` | 1.95rem | tarjetas y métricas (`Card`, `MetricCard`) |
| `rounded-full` | — | puntos, avatares, separadores |

Prohibido `rounded-[2rem]` y similares: usa `rounded-4xl`. (Ya normalizado en la
familia de tarjetas.)

### Movimiento
- Easing de marca: `ease-[var(--ease-haptic)]` (`cubic-bezier(0.32,0.72,0,1)`).
- **Convención de duración** (3 niveles, no inventes intermedios):
  - `duration-150` — feedback inmediato (hover de badges, colores).
  - `duration-200` — controles interactivos (botones).
  - `duration-500`/`duration-700` + `ease-haptic` — contenedores y tarjetas (sensación premium).
- Regla: **un componente contenedor define su transición una sola vez.** No la
  sobreescribas desde el wrapper (p. ej. `SectionCard` NO redefine la de `Card`).

### Tipografía
`--font-sans` (Plus Jakarta / Open Sans) para todo; `--font-mono` para datos
técnicos/etiquetas. Jerarquía por peso: títulos `font-extrabold/black tracking-tight`,
labels `text-[11px] uppercase tracking-wider font-semibold text-muted-foreground`.

## 3. Sistema de componentes en capas

```
components/ui  (no existe aún)          ← primitivas shadcn si algún día se separan
components/shared/
├── data-display/  Card → SectionCard, MetricCard, DataTable, StatusBadge,
│                  PriceDisplay, DashboardListWidget, Sparkline, InventoryHealthBar
├── feedback/      Modal, ConfirmDialog, Toast, Tooltip, WarningAlert,
│                  ContextualBanner, EmptyState, LoadingState, Skeleton,
│                  ProgressBar, NavigationIndicator
├── form/          Button, TextField, TextareaField, SelectField, SearchInput,
│                  DatePicker, PhoneField, FormActions, ToggleButtonGroup, ImageUploader
└── layout/        AppSidebar, PageHeader, Logo, SessionLoading
```

**Capas:** `Card` es la primitiva (con subcomponentes); `SectionCard` es la API
de aplicación (título + descripción + footer). Compón sobre la capa más alta que
te sirva. No dupliques la estructura de un componente inline.

Import por barrel: `import { Button, SectionCard, DataTable } from '@/components/shared'`.

## 4. Cómo trabajar los componentes

1. **Busca primero.** ¿Existe ya en `shared/`? Casi siempre sí (ver tabla en frontend.md).
2. **Compón**, no copies. Un componente de feature pequeño que compone primitivas
   compartidas > un `<div>` con 20 clases.
3. **`cn()`** de `@/lib/utils` para clases condicionales.
4. **Sin `className` inline > ~60 chars**: si es largo, es un patrón → extráelo.
5. **Extrae a `shared/` solo cuando se repite** más de una vez. Un componente de
   un solo uso legítimo (p. ej. `InventoryHealthBar`) está bien; no crees
   micro-componentes especulativos ni los borres si cumplen una función real.
6. Componente funcional, tipado, props explícitas; lógica de negocio fuera de la UI.
7. Al tocar un fichero con HTML/Tailwind crudo antiguo, **migra oportunistamente**
   a los componentes compartidos.

### Al crear un componente nuevo
- Toma tokens (color/radio/duración) de la sección 2. No hardcodees.
- Si es un contenedor, define UNA transición con `ease-haptic`.
- Estados: soporta carga (`Skeleton`/`LoadingState`) y vacío (`EmptyState`).
- Accesibilidad: targets ≥ 44px en móvil (los `Button` ya lo hacen con `max-md:min-h-[44px]`),
  no bloquees el zoom, contraste suficiente.

## 5. Carga rápida y anti-flash

Objetivo: nada de "flash de contenido sin estilo", saltos de layout ni pantallas
en blanco entre navegaciones.

### 5.1 Estado de UI persistente vía cookie (no localStorage)
El estado que afecta al **primer render** (p. ej. sidebar colapsado) se guarda en
**cookie**, no en localStorage, para que el layout de servidor lo conozca y pinte
el ancho correcto de entrada. Patrón implementado:
- `src/store/sidebar-store.ts` escribe la cookie `sb_collapsed` al alternar.
- `src/app/(admin)/layout.tsx` la lee con `cookies()` y pasa `initialCollapsed`.
- `useSidebarState(initialCollapsed)` usa ese valor antes de montar (coincide con
  el SSR → sin mismatch de hidratación) y siembra el store al montar.
- Resultado: se eliminó el gate `opacity-0` que escondía todo el shell hasta hidratar.

> localStorage no es visible en el servidor → provoca flash. Para first-paint, cookie.

### 5.2 Cacheo de datos globales en RSC
Los datos **no dependientes del usuario** (métricas de la academia) se cachean con
`unstable_cache`, con la **autorización FUERA** del cache (el cache guarda datos,
no permisos) y usando el **cliente service role** (sin cookies, requisito de
`unstable_cache`). Ejemplo canónico en `dashboard/actions.ts`:

```ts
const fetchOverviewStats = unstable_cache(
  async () => { const supabase = createAdminClient(); /* … lecturas … */ },
  ['dashboard-overview-stats'],
  { revalidate: 30, tags: [DASHBOARD_CACHE_TAG] }
)
export async function getOverviewStats() {
  await requireRole()               // auth por petición
  return fetchOverviewStats()       // datos cacheados 30s
}
```

Invalidación inmediata tras un cambio: las mutaciones llaman
`revalidateTag(DASHBOARD_CACHE_TAG)` (checkout, pagos, venta de productos, alta de
cliente). El tag vive en `dashboard/cache.ts` (módulo normal, no `'use server'`).
**No** metas datos por-usuario en un cache compartido.

### 5.3 Prefetch en el servidor
Las páginas server-component hacen prefetch y pasan `initialData` al panel cliente
(ver `dashboard/page.tsx`). Evita la cascada de fetches y el parpadeo inicial.

### 5.4 Skeletons y overlays, no pantallas en blanco
- Usa `Skeleton` para placeholders que **preservan el layout** (mismo tamaño que el
  contenido real) en vez de spinners que reflowean.
- El shell (sidebar) persiste entre navegaciones de tab; solo el área de contenido
  muestra carga. Prefiere un skeleton del contenido a un loader a pantalla completa.
- `NavigationIndicator` / `navigation-store` señalan transición sin ocultar el shell.

### 5.5 PWA
El service worker (`public/sw.js`) cachea el shell estático pero **excluye**
`/`, `/login`, `/dashboard`, `/editor`, `/_next/` y las server actions para no
servir datos sensibles o rancios. No caches respuestas autenticadas.

## 5.6 Dinero: precisión

La BD guarda dinero en `NUMERIC` (exacto). JavaScript usa doubles IEEE-754
(`0.1 + 0.2 ≠ 0.3`), así que **toda suma/multiplicación de dinero en JS debe
usar [`src/lib/format.ts`](../src/lib/format.ts)** (`sumMoney`, `lineTotal`), que
opera en unidades mínimas enteras.

- **Nunca** sumes importes con `reduce((s,x)=>s+x)` ni multipliques `precio*cantidad`
  a pelo: usa `sumMoney(...)` / `lineTotal(...)`.
- **Nunca** guardes en la BD un importe calculado en JS como autoritativo: el total
  que se cobra lo **recalcula el RPC en SQL** (checkout de membresías y productos).
  Lo de JS es solo presentación (vista previa del carrito, subtotales, reportes).
- Para mostrar, `PriceDisplay` ya redondea de forma determinista a 2 decimales.
- Aplicado en: `product-checkout-panel` (carrito), `sales-reports` y
  `reports-actions` (agregados), `getDashboardSnapshots` (tendencia).

## 5.7 Moneda: USD base + visualización dual

**USD es la moneda dominante.** Los precios de `products` y `class_plans` se guardan
en USD, los formularios se capturan en USD y la UI muestra USD por defecto. `NIO`
existe solo para **mostrar** el equivalente local; nunca se guardan precios en ella.

Todo importe se pinta con `PriceDisplay`, que usa `Intl.NumberFormat`:

```tsx
<PriceDisplay amount={99.9} />                 // $99.90
<PriceDisplay amount={99.9} showSecondary />   // $99.90  C$3,676.32
```

`showSecondary` se reserva para los puntos donde el operador cobra en efectivo local:
total del carrito, total del plan en el checkout y total acumulado de reportes.

**La configuración vive en la BD, no en el código.** La tabla `currencies` es la fuente
de verdad (`is_base`, `is_secondary`, `locale`); `APP_CONFIG.currency` es solo el
*fallback* si la tabla no está disponible. Se administra desde el tab **Moneda y Tasas**
(`features/admin/settings`, admin+maintainer), sin redeploy.

**De dónde sale**, sin fetch en cliente ni parpadeo:
`currencies` + `exchange_rates` → `getCurrencySettings()` (servidor, cacheado con tag
`currency-settings`) → layout `(admin)` → `CurrencyProvider` → `useCurrency()` dentro
de `PriceDisplay`.

La BD guarda `rate_to_base` (cuántos USD vale 1 NIO) porque es lo que necesita la
columna generada `payments.amount_base`; la app deriva la inversa (`unitsPerBase`,
C$ por US$) para mostrar. Si no hay tasa cargada, `PriceDisplay` muestra solo la base —
degradación limpia, nada se rompe.

**Cambiar la moneda base no es un ajuste, es una migración contable.** El RPC
`set_base_currency()` convierte los precios del catálogo y **se niega si ya hay pagos o
membresías**: el histórico guarda su propia moneda y tasa, y `amount_base` es relativa a
la base, así que cambiarla reinterpretaría todo lo registrado. La UI lo refleja
bloqueando la opción con el motivo.

Conversión siempre con `baseToLocal` / `localToBase` de [`format.ts`](../src/lib/format.ts),
nunca multiplicando a mano.

## 6. Checklist antes de terminar UI
- [ ] Usé componentes compartidos; nada de HTML/Tailwind crudo duplicado.
- [ ] Solo tokens (color/radio/duración); cero valores arbitrarios.
- [ ] Una transición por contenedor, con `ease-haptic`.
- [ ] Estados de carga (skeleton) y vacío cubiertos.
- [ ] Sin flash: first-paint correcto (cookie si aplica), sin saltos de layout.
- [ ] `pnpm typecheck` en verde.
