# Reglas (checklist para agentes)

KISS-first: la simplicidad gana. Evita la sobreingeniería. Antes de implementar, busca lo
que ya existe (helper, util, componente, patrón) y reúsalo.

## Código

- [ ] Server Components por defecto; Server Actions para mutaciones.
- [ ] Zustand solo para estado **de UI** global; los datos viven en el servidor.
- [ ] Componentes funcionales, tipado estricto, `async/await` consistente.
- [ ] Archivos pequeños y enfocados; lógica de negocio separada de la UI.
- [ ] Nada de anidamiento profundo, componentes gigantes ni valores mágicos.
- [ ] DRY solo con duplicación real. Composición sobre herencia/abstracción prematura.
- [ ] Comentarios solo si la lógica no es obvia, es un edge case o una decisión importante.
- [ ] Incompletos → `TODO:` con una descripción corta y clara.

## Nombres y estructura

- [ ] Ficheros en **kebab-case** (`member-form.tsx`, `create-payment.ts`).
- [ ] Nada de `helpers.ts` / `misc.ts` / `stuff.ts`.
- [ ] Respeta el patrón por feature: `components/`, `queries.ts`/`mutations.ts`,
      `schemas.ts`, `types.ts`, `utils.ts` (ver `architecture.md`).
- [ ] Lógica pura y testeable en `utils.ts`; deja al menos un test si no es trivial.

## Server Actions — rol y prohibiciones

Una server action es un **endpoint HTTP público**: cualquiera puede invocarla con su
action-id (está en el bundle). No es "una función del servidor", es la frontera de
confianza de la app.

### Su rol: autorizar, validar, delegar. No calcular.

1. **Autorizar** — `requireRole(...)` primero, siempre (devuelve el cliente service role).
2. **Validar** — Zod sobre la entrada; a partir de ahí se usa `parsed.data`, no el input crudo.
3. **Delegar** — la lógica de negocio con invariantes (dinero, stock, estado) vive en un
   **RPC transaccional de Postgres**, no en TypeScript.
4. **Devolver** un resultado serializable (`{ success, error? }`) e **invalidar cache**
   (`revalidateTag` / `revalidatePath`) si cambió algo que se muestra.

> Plantilla completa y roles por caso: [security.md](security.md).

### Prohibido en el servidor

- [ ] **Tocar la BD sin `requireRole()`.** Verificado en CI (`pnpm check:guards`).
- [ ] **Confiar en importes, precios o duraciones que manda el cliente.** Se leen de la BD
      *dentro* del RPC. El cliente manda identificadores y cantidades, nunca dinero.
- [ ] **Calcular dinero autoritativo en TypeScript.** Lo calcula SQL. `lib/format.ts` es solo
      presentación (ver [style.md §5.6](style.md)); lo que devuelve **nunca** se persiste.
- [ ] **Operaciones multi-paso sobre dinero o stock sin transacción.** Dos `insert` seguidos
      dejan estados a medias (pago huérfano). Un RPC = una transacción.
- [ ] **Devolver el error crudo al cliente.** Siempre `toActionError()`; el detalle al log.
- [ ] **Crear clientes Supabase con la clave publicable para acceder a datos.** Solo service
      role. La única excepción es verificar credenciales (`lib/supabase/verify.ts`), que no
      persiste sesión.
- [ ] **Aplicar migraciones o DDL.** Se escriben en `supabase/migrations/`; las aplica el humano.
- [ ] **Guardar estado en memoria de módulo como si persistiera.** En Cloudflare Workers cada
      isolate tiene el suyo y se recicla: un `Map` no sirve como rate limiter ni como cache.
      Usa la BD (`login_attempts`) o el cache de Next.
- [ ] **Exportar desde un fichero `'use server'` algo que no sea una action async con
      argumentos serializables.** Pasar un `SupabaseClient` como parámetro lo expone como
      endpoint y rompe la frontera; esos helpers van en un módulo normal.
- [ ] **Cachear datos por usuario en un `unstable_cache` compartido.** El cache guarda datos
      globales; la autorización va *fuera* (ver `dashboard/actions.ts`).

## Seguridad (ver `security.md` — no negociable)

- [ ] Toda server action empieza con `requireRole(...)`.
- [ ] Entradas validadas con Zod en la frontera.
- [ ] Errores al cliente vía `toActionError()` (nunca el mensaje crudo).
- [ ] Precios/importes/duraciones desde la BD, nunca desde el cliente.
- [ ] Dinero autoritativo calculado en SQL; en JS solo con `lib/format.ts` y solo para mostrar.
- [ ] Cero clientes Supabase de navegador; cero secretos en el cliente.
- [ ] Migraciones: se escriben en `supabase/migrations/`, **no se aplican** (lo hace el humano).

## UI (ver `frontend.md`)

- [ ] Usa los componentes compartidos antes que HTML/Tailwind crudo.
- [ ] `cn()` para clases condicionales; nada de `className` inline > ~60 chars.
- [ ] Tablet-first, touch-friendly, accesible (no bloquear zoom).

## Antes de dar algo por terminado

- [ ] `pnpm typecheck` → 0 errores.
- [ ] `pnpm lint` limpio.
- [ ] `pnpm check:guards` en verde.
- [ ] `pnpm test` si tocaste lógica con tests.
- [ ] Reporta fielmente lo hecho y lo que quede pendiente (p. ej. migraciones por aplicar).

## Flujo de trabajo

1. Analiza la feature y traza el flujo real que tocas.
2. Propón la solución más simple que funcione; explica brevemente las decisiones.
3. Evita abstracciones innecesarias.
4. Prioriza mantenibilidad, claridad y escalabilidad por simplicidad.
