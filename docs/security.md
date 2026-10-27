# Gestión de seguridad

## Modelo (léelo entero antes de tocar auth o acceso a datos)

**El navegador nunca habla con Supabase.** La autorización vive en un único sitio del
servidor. Este modelo existe porque el anterior confiaba en una sesión de Supabase en el
navegador que hacía a `auth.uid()` identificar a la terminal, no al operador — un RBAC
puramente cosmético. Ahora:

- **Sesión de app:** JWT propio firmado con `SESSION_SECRET`, en cookie **`httpOnly`**
  `sentinel_session` (`src/lib/auth/jwt.ts`, `src/lib/cookies.ts`). No es legible por JS.
- **Login:** verifica credenciales contra Supabase Auth con un cliente que **no persiste
  sesión** (`src/lib/supabase/verify.ts`) → no queda ninguna cookie `sb-*` en la terminal.
- **Acceso a datos:** toda server action obtiene su cliente de **`requireRole()`**
  (`src/lib/auth/guard.ts`), que:
  1. lee y verifica el JWT,
  2. **revalida `is_active`/`role` contra la BD** en cada llamada (una cuenta desactivada
     se expulsa al instante, sin esperar a que expire el JWT),
  3. comprueba los roles permitidos,
  4. devuelve el cliente **service role** (`src/lib/supabase/admin.ts`).
- **Base de datos:** RLS en **deny-all** para `anon`/`authenticated`. Solo el service role
  (que ignora RLS) accede. Los RPC son `SECURITY DEFINER` con `EXECUTE` únicamente para
  `service_role`. Los crons viven en el esquema `private`, sin URL en PostgREST.

## Cómo añadir una server action (obligatorio)

```ts
'use server'
import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { miSchema } from './schemas'

export async function miAccion(input: MiInput) {
  try {
    // 1. Autoriza y obtén el cliente service role. Sin args = cualquier usuario activo.
    const { user, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    // 2. Valida la entrada con Zod (frontera de confianza).
    const parsed = miSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

    // 3. Lógica con `supabase` (service role).
    const { error } = await supabase.from('tabla').insert({ /* … */ })
    if (error) throw error
    return { success: true }
  } catch (err) {
    // 4. Nunca devuelvas el mensaje crudo: toActionError lo generaliza y loguea el detalle.
    return { success: false, error: toActionError(err, 'Error al hacer X.') }
  }
}
```

Roles permitidos por caso: lecturas/operativa de recepción → `requireRole()` (cualquier
activo); gestión (staff, inventario, clases, CMS) → `requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)`;
herramientas de desarrollador → `requireRole(APP_ROLE.MAINTAINER)`.

**Invariante verificado en CI:** ninguna server action bajo `src/features` puede tocar la
BD sin `requireRole()`. Lo comprueba `scripts/check-guards.sh` (`pnpm check:guards`).
Excepciones permitidas: `features/auth/actions.ts` (entrada de login) y
`features/health/actions.ts` (probe público, sin fugas).

> El rol de una server action (autorizar → validar → delegar) y la lista completa de lo
> **prohibido en el servidor** están en [rules.md](rules.md#server-actions--rol-y-prohibiciones).

## Reglas duras

- **Nunca** un cliente Supabase de navegador ni una sesión `sb-*` en el cliente.
- **Nunca** confíes importes/precios/duraciones del cliente: se leen de la BD dentro del RPC.
- **Nunca** calcules dinero autoritativo en TypeScript ni persistas un importe calculado en
  JS: lo calcula SQL dentro del RPC. `lib/format.ts` es solo para mostrar.
- **Nunca** hagas una operación multi-paso sobre dinero o stock fuera de una transacción
  (un RPC = una transacción).
- **Valida siempre** con Zod en la frontera (`schemas.ts`).
- **Nunca** devuelvas mensajes de error crudos al cliente: usa `toActionError()`.
  Si un RPC debe mostrarle un mensaje al operador, lánzalo con `RAISE EXCEPTION '…' USING
  ERRCODE = 'SN400'` y escríbelo pensando en quien lo lee (sin IDs ni nombres de tablas).
- **Secretos** (`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) solo server-side; nunca en el
  bundle ni en `NEXT_PUBLIC_*`.
- **Cookies** siempre `Secure` + `httpOnly` (`src/lib/cookies.ts`).
- Throttle de login en `login_attempts`: registra **solo fallos**, se limpia al acertar
  (no autobloquea al operador), persistido porque un `Map` en memoria no sobrevive en Workers.
  Falla abierto. Complementar con Cloudflare Rate Limiting por IP para el control volumétrico.

## Base de datos: no la modifiques tú

El agente **no aplica migraciones**. Escribe SQL en `supabase/migrations/` con un nombre
`AAAAMMDDHHMMSS_descripcion.sql` y deja que el humano lo aplique. Reglas al escribir SQL:

- Toda tabla nueva: `ENABLE ROW LEVEL SECURITY` y **sin** políticas para `anon`/`authenticated`
  (deny-all); el service role ya accede.
- Toda función nueva en `public`: `SET search_path = public, pg_temp`; `REVOKE ALL … FROM
  anon, authenticated`; `GRANT EXECUTE … TO service_role`.
- Funciones internas (crons): créalas/muévelas al esquema `private`.
- Tras aplicar, correr las consultas de verificación (deben dar 0 filas para anon/authenticated):
  `pg_policies`, `has_function_privilege`, `role_table_grants`; y `get_advisors` sin ERROR/WARN.

## Categorías de acción sensibles

Confirmar con un humano y no ejecutar de forma autónoma: aplicar migraciones/DDL, borrar
datos, cambiar settings del proyecto Supabase (p. ej. "Allow new users to sign up"),
rotar secretos. Ver [migrations.md](migrations.md) para el orden de despliegue.
