# Migraciones de base de datos

Las 11 migraciones `20260914*` **no se han aplicado todavía**: las aplicas tú con
`supabase db push` (o desde el editor SQL) en el orden de abajo.

> Este fichero vive en `docs/` y no en `supabase/migrations/`: el CLI rechaza
> cualquier fichero de esa carpeta que no siga el patrón `<timestamp>_nombre.sql`.

## Historial

Las 6 migraciones `20260621*` se aplicaron antes de que el repo llevara historial.
Se reconstruyeron desde `supabase_migrations.schema_migrations` (que guarda el SQL
de cada una), así que el historial local y el remoto coinciden y `supabase db push`
las salta como ya aplicadas.

### Baseline (`20260620000000_baseline.sql`)

El esquema original se creó a mano en el dashboard, así que una BD vacía fallaba
en la primera migración (`relation "products" does not exist`). El baseline lo
reconstruye y va antes de todo lo demás.

- **BD vacía** (proyecto nuevo, local, tras un reset): `supabase db push` aplica
  baseline + todo el resto en orden.
- **BD que ya tiene el esquema (producción)**: el baseline **no se ejecuta**; se
  marca como aplicado, con el proyecto correcto vinculado, antes del próximo push:
  ```bash
  supabase migration repair --status applied 20260620000000
  ```
  Sin esto, `db push` se queja de una migración local anterior a la última remota.

**Datos de prueba** (`supabase/seed.sql`): solo para entornos vacíos. Crea la
cuenta que autoriza terminales, 3 operadores, clases, clientes con membresías,
productos, compras y ventas, todo vía los RPC reales. Credenciales en la
cabecera del fichero. Se aplica con `supabase db push --include-seed`, o pegándolo
en el SQL Editor. Aborta si la BD ya tiene usuarios o pagos, y no hace nada si ya
se aplicó.

> ⚠️ Nunca `supabase db reset --linked`: borra la BD **remota** vinculada.
> Comprueba siempre `supabase/.temp/project-ref` antes de un `push`.

Verifica también en el dashboard: **Authentication → Providers → "Allow new
users to sign up"**. Si está activo, desactívalo.

## Pendientes (20261027*)

| # | Fichero | Cuándo | Rompe compatibilidad |
|---|---------|--------|----------------------|
| 1 | `20261027090000_academy_timezone.sql` | Cuando sea | No. Tras aplicarla, **reinicia el servidor** (Dashboard → Settings → Restart) para que PostgREST tome la zona |
| 2 | `20261027090100_schedule_and_attendance.sql` | Antes o con el deploy | No (aditivo) |
| 3 | `20261027090200_payment_void_discount_cash_closing.sql` | **Con** el despliegue de código | Sí — `process_*_checkout` cambian de firma (`p_discount`). El código nuevo la necesita; el viejo sigue funcionando porque `p_discount` tiene default |

Pruébalas antes contra un Postgres desechable con todas las migraciones del repo:
`bash supabase/tests/run.sh` (Docker; no toca la BD real).

## Orden de aplicación

| # | Fichero | Cuándo | Rompe compatibilidad |
|---|---------|--------|----------------------|
| 1 | `20260914090000_login_attempts.sql` | Cuando sea | No (aditivo) |
| 2 | `20260914090100_lock_public_api.sql` | Antes del despliegue | No (compatible con el código actual) |
| 3 | `20260914090200_transactional_checkout_and_constraints.sql` | **Con** el despliegue de código | Sí — cambia firmas de RPC y quita el guard `auth.uid()` |
| 4 | `20260914090300_deny_public_schema.sql` | **Con** el despliegue de código | Sí — corta todo acceso de anon/authenticated |

Las migraciones 3 y 4 y el código de la Fase 2 son inseparables: el código nuevo
(service role) necesita 3 y 4; el código viejo (sesión Supabase en el navegador)
dejaría de funcionar con ellas. Aplícalas en la misma ventana que el deploy.

### Objetos creados a mano fuera de las migraciones

`090100` asume ahora la existencia de `expire_active_memberships_cron` /
`process_frozen_memberships_cron` — las **crea** con `CREATE OR REPLACE` en vez
de solo moverlas de esquema, así funciona igual en un proyecto donde nunca se
crearon a mano que en uno donde sí. Es idempotente: se puede re-aplicar sin daño
si falla a mitad.

Si otro entorno tiene más objetos creados a mano y no versionados (vistas,
funciones), la migración que los toque va a fallar igual que esta lo hizo. La
consulta de diagnóstico está en el mensaje de error de esta sesión; en general:
compara `to_regprocedure()` / `to_regclass()` de cada objeto que una migración
`ALTER`/`DROP` contra el proyecto de destino antes de aplicar.

## Después del despliegue

1. Fuerza la re-autorización de todas las terminales (la tabla
   `authorized_devices` se vacía o se revoca desde el panel de desarrollador) y
   verifica que las cookies `sb-*` residuales se borran al cerrar sesión.
2. Valida las restricciones de integridad contra las filas existentes (revisa
   antes qué filas fallarían — no borres datos financieros sin mirarlos primero):
   ```sql
   SELECT * FROM payments    WHERE NOT (total_amount >= 0);
   SELECT * FROM inventory   WHERE NOT (current_stock >= 0);
   SELECT * FROM memberships WHERE NOT (end_date >= start_date);

   ALTER TABLE payments    VALIDATE CONSTRAINT payments_total_amount_nonnegative;
   ALTER TABLE inventory   VALIDATE CONSTRAINT inventory_stock_nonnegative;
   ALTER TABLE memberships VALIDATE CONSTRAINT memberships_dates_ordered;
   ```
3. Ejecuta las consultas de verificación de la sección "Verificación" del plan
   (`pg_policies`, `has_function_privilege`, `role_table_grants`): todas deben
   devolver 0 filas para anon/authenticated.

---

## Lote de mejoras de esquema (20260914_1000xx)

Se aplica DESPUÉS del lote de seguridad (0900xx), en orden de timestamp:

| # | Fichero | Qué hace |
|---|---------|----------|
| 5 | `20260914100000_money_precision.sql` | Dinero `NUMERIC(10,2)` → `NUMERIC(14,4)`. Recrea 3 vistas dependientes de `payments.total_amount`. |
| 5b | `20260914100050_relax_payment_amount_check.sql` | `payments_total_amount_positive` (`> 0`) → `payments_total_amount_nonnegative` (`>= 0`). Un pago de 0 es válido (cortesía/beca); sin esto, el backfill de `100100` revalida cada fila y falla contra pagos históricos en 0. |
| 6 | `20260914100100_currencies_and_exchange_rates.sql` | Tablas `currencies` (con moneda base) y `exchange_rates`; en `payments`: `currency`, `exchange_rate`, `amount_base` (generada) + trigger de defaults. |
| 7 | `20260914100200_inventory_min_max_flags.sql` | `products`: `min_stock`, `max_stock`, `is_temporary` (política de reposición). La vista `vw_inventory_status` la crea `20260918090000`. |
| 8 | `20260914100300_product_categories.sql` | Tabla `product_categories` + `products.category_id` (FK), backfill. `products.category` (texto) queda deprecado. |
| 9 | `20260914100400_movement_type_enum.sql` | `inventory_movements.movement_type` text+CHECK → enum `inventory_movement_type`; recrea `adjust_product_stock` con cast. |

### Monedas: USD es la base

Los precios de `products` y `class_plans` están **en USD**, y la UI muestra USD por
defecto. `NIO` se siembra solo para la **visualización dual** (ciertos totales se
muestran en ambas monedas); no se guardan precios en córdobas.

**Actualizar la tasa** — la migración 6 siembra un valor PLACEHOLDER. La tasa se
actualiza **insertando una fila nueva**, nunca con `UPDATE`: el histórico permite
que un pago viejo conserve la tasa con la que se cobró.

```sql
-- rate_to_base = cuántos USD vale 1 NIO  (ej.: 36.80 C$/US$ → 1/36.80)
INSERT INTO exchange_rates (currency_code, rate_to_base, effective_from)
VALUES ('NIO', 1/36.80::numeric, now());
```

La app lee la más reciente con `effective_from <= now()` (`src/lib/currency.ts`) y
deriva la tasa inversa para mostrar. Si no hay fila, la UI simplemente muestra solo
USD — no se rompe nada.

### Follow-ups de código de la app (no incluidos aquí)

- **Categorías**: migrar `products/{queries,mutations,schemas}` y `create_product_with_inventory`
  para usar `category_id` en vez del texto `category` (que quedó deprecado). El
  filtro `getProducts` y el select de categorías del checkout deben leer de
  `product_categories`.
- **Tipos TS**: `min_stock`, `max_stock` e `is_temporary` van en `Product` (no en
  `Inventory`) en `products/types.ts`. Los flags no son columnas: se leen de
  `vw_inventory_status`.
- **Alertas de stock**: el dashboard calcula "stock bajo" con un 10 fijo en JS
  (`getDashboardSnapshots`); debe leer `vw_inventory_status.needs_restock`, que ya
  excluye productos retirados y temporales.
- **Cobro en otra moneda** (opcional): para cobrar en divisa no-base, el RPC de
  checkout debe aceptar `currency`/`exchange_rate` y pasarlos al `INSERT` de
  `payments` (si no, el trigger asume base + tasa vigente).

---

## Lote de moneda administrable (20260914_11xxxx / 12xxxx)

| # | Fichero | Qué hace |
|---|---------|----------|
| 10 | `20260914110000_currency_settings.sql` | `currencies` += `locale`, `is_secondary` (máx. 1). RPC `set_base_currency()` que convierte precios del catálogo. |
| 11 | `20260914120000_currency_per_operation.sql` | Snapshot de moneda por operación, tasa vigente única y vista `vw_current_exchange_rates`. |

### Trazabilidad de moneda por operación

`payments` y `memberships` guardan ahora, como **snapshot inmutable**:

- `currency` — en qué moneda se cobró
- `exchange_rate` — la tasa aplicada en ese momento
- `base_currency` — contra qué base está expresado `amount_base`

Los rellena el trigger `apply_currency_snapshot()` en cualquier ruta de inserción,
así que no depende de que el RPC se acuerde de hacerlo. Consecuencia: una fila vieja
sigue significando lo mismo aunque la base cambie después.

### Tasa vigente única

`exchange_rates` gana `is_active` y `units_per_base` (columna generada, la dirección
"humana": cuántas unidades locales por 1 base). Al insertar una tasa nueva, el trigger
`exchange_rates_activate_latest()` desactiva la anterior de esa moneda, y un índice
único parcial garantiza **una sola activa por moneda**. Las tasas nunca se actualizan
ni se borran: se inserta una nueva y el histórico queda.

### Vista de tasas actuales

```sql
SELECT * FROM vw_current_exchange_rates;
```

Devuelve una fila por moneda activa con su tasa vigente, **incluida la base con
`rate_to_base = 1` y `units_per_base = 1`** (el 1 = 1), para que ningún consumidor
tenga que tratar la base como caso especial. `has_rate` indica si la moneda tiene
tasa cargada. Es la fuente que usa la app (`src/lib/currency.ts`) y el panel de
administración.

### Sobre cambiar la moneda base

Con el snapshot por operación, cambiar la base **ya no corrompe el histórico**. Lo que
sigue sin ser seguro es **agregar**: sumar `amount_base` a través de un cambio de base
mezclaría monedas y daría totales erróneos en silencio. Por eso `set_base_currency()`
se mantiene bloqueado mientras existan pagos o membresías. Para levantar el bloqueo,
antes hay que hacer los informes conscientes de `base_currency`.

---

## Lote de inventario y ventas (20260918_09xxxx)

| # | Fichero | Qué hace |
|---|---------|----------|
| 12 | `20260918090000_move_stock_thresholds_to_products.sql` | Mueve `min_stock`/`max_stock` de `inventory` a `products` y crea `vw_inventory_status`. No-op si `100200` ya corrió en su versión corregida. |
| 13 | `20260918090100_sales_and_purchases_ledger.sql` | Tabla `payment_lines` (saca las ventas de `payments.metadata`), `unit_cost` + `payment_id` en `inventory_movements`, RPC `register_stock_purchase`, vista `vw_inventory_ledger`. |

### Por qué los umbrales viven en `products` y no en `inventory`

`products` e `inventory` siguen siendo **dos entidades separadas**:

- **`products` = política**: cuánto quiero tener (`min_stock`, `max_stock`) y si el
  producto sigue disponible (`is_active`, `is_temporary`).
- **`inventory` = estado**: cuánto hay ahora (`current_stock`).

Consecuencia técnica: los flags **no pueden ser columnas generadas**, porque una
columna generada en Postgres no puede leer otra tabla. Se calculan en
`vw_inventory_status`, que además aplica la regla de negocio pedida:

```sql
needs_restock = is_active AND NOT is_temporary AND current_stock <= min_stock
```

Un producto retirado o temporal se agota **sin generar alerta**. Esa es la única
columna que debe disparar notificaciones — `is_low_stock` e `is_out_of_stock`
están ahí para mostrar estado, no para alertar.

### Entradas y salidas

`inventory_movements` es el libro: un asiento por movimiento, con stock anterior
y posterior. El signo de `quantity` marca la dirección (entradas en positivo,
salidas en negativo) y `vw_inventory_ledger` lo expone ya resuelto como `IN`/`OUT`
junto al costo de compra y al precio de venta.

- **Salidas (ventas)**: `process_product_checkout` escribe ahora `payment_lines`
  además de `metadata`, y liga cada movimiento a su pago vía `payment_id`.
- **Entradas (compras)**: `register_stock_purchase(product_id, user_id, quantity, unit_cost)`
  sube el stock y asienta la entrada con su costo, de forma atómica.

### Follow-ups de código

- **Alertas de stock**: `getDashboardSnapshots` calcula "stock bajo" con un `10`
  fijo en JS. Debe leer `vw_inventory_status.needs_restock`.
- **Recibos**: `payments-log.tsx` lee `payments.metadata`. Cuando pase a
  `payment_lines`, se puede dejar de escribir `metadata` en el RPC y borrar la columna.
- **UI de compras**: no existe pantalla para `register_stock_purchase`; hoy las
  entradas se hacen con `adjust_product_stock` (sin costo).
- **Tipos TS**: `min_stock`/`max_stock`/`is_temporary` pasaron a `Product`, no a `Inventory`.

---

## Limpieza de esquema (20260919090000)

| # | Fichero | Qué hace |
|---|---------|----------|
| 14 | `20260919090000_schema_cleanup.sql` | `payments.payment_method` → enum `payment_method_type`; `payments.category` → enum `payment_category`; borra `clients.registration_source` y `products.category` (texto); `product_categories.parent_id` (subcategorías, sin ciclos, nombre único entre hermanos); RPC `resolve_product_category`. |

**Va con el despliegue de código**: el código viejo lee `registration_source` y
`products.category`, que dejan de existir. Aborta al inicio si algún pago tiene un
método fuera de `efectivo | tarjeta | transferencia`.

Los RPC de checkout siguen recibiendo el método como `text`: un cast de asignación
`text → payment_method_type` los mantiene sin recrearlos. `create_product_with_inventory`
conserva la firma; `p_category` es el nombre y se resuelve a `category_id`.

Follow-up: la UI aún escribe la categoría como texto libre (se crea como raíz si
no existe); no hay selector de subcategorías.
