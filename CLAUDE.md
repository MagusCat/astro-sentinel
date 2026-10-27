# Sentinel — guía para agentes LLM

Plataforma de gestión para academias (danza, pole, centros deportivos). Next.js 15
(App Router, React 19) + Supabase (Postgres) desplegado en Cloudflare Workers vía
OpenNext. Terminal operativa tablet-first: cada movimiento de dinero es auditable.

Esta es la entrada. Lee el doc del área que vas a tocar **antes** de escribir código:

| Doc | Cuándo leerlo |
|-----|---------------|
| [docs/architecture.md](docs/architecture.md) | Estructura, capas, flujo de datos, BD, despliegue |
| [docs/frontend.md](docs/frontend.md) | Cualquier UI: inventario de componentes y cuándo usarlos |
| [docs/style.md](docs/style.md) | Estilo base: tokens, sistema de componentes, anti-flash |
| [docs/security.md](docs/security.md) | Auth, server actions, acceso a datos, migraciones |
| [docs/rules.md](docs/rules.md) | Reglas transversales de código (checklist) |

## Reglas que no se rompen nunca

1. **Toda server action pasa por `requireRole()`** ([src/lib/auth/guard.ts](src/lib/auth/guard.ts)).
   Nada accede a la BD sin él. El navegador **nunca** habla con Supabase. → `docs/security.md`.
2. **La UI usa los componentes compartidos** de `src/components/shared` y `src/components/ui`,
   no HTML/Tailwind crudo. → `docs/frontend.md`.
3. **No aplicar migraciones a la BD.** Se escriben en `supabase/migrations/` y las aplica
   el humano. → `docs/security.md`.
4. **KISS.** Server Components por defecto, Zod en las fronteras, kebab-case, archivos pequeños.
   → `docs/rules.md`.

## Comandos

```bash
pnpm dev            # desarrollo (o: node node_modules/next/dist/bin/next dev)
pnpm typecheck      # tsc --noEmit  (debe dar 0 errores)
pnpm lint
pnpm test           # vitest
pnpm check:guards   # gate: ninguna server action sin requireRole
```

> Entorno con `/mnt` en `noexec`: si un binario da EACCES, invócalo con `node`
> (p. ej. `node node_modules/next/dist/bin/next build`).
