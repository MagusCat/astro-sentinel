import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/features/auth/actions'
import { APP_ROLE, type AppRole } from '@/lib/config/domain'
import type { AuthenticatedUser } from '@/features/auth/types'

/**
 * Thrown when authorization fails. Server actions translate it into their
 * own `{ success: false, error }` result shape. The message is safe to show
 * to the user — it never contains internal detail.
 */
export class AuthorizationError extends Error {
  constructor(message = 'Acceso denegado: No autorizado.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Central authorization gate for every server action.
 *
 * 1. Reads the app's own session JWT (`getCurrentUser`).
 * 2. Re-verifies the user against the database on every call — a deactivated,
 *    deleted, or role-changed account is rejected immediately, without waiting
 *    for the 7-day JWT to expire (fixes stale-session access).
 * 3. Enforces the allowed-role list (empty list = any active user).
 * 4. Returns a privileged **service-role** Supabase client. The browser never
 *    receives a Supabase session, so authorization lives here, in one place —
 *    not in RLS policies that can only see which terminal is connected.
 */
export async function requireRole(
  ...allowed: AppRole[]
): Promise<{ user: AuthenticatedUser; supabase: SupabaseClient }> {
  const claim = await getCurrentUser()
  if (!claim) throw new AuthorizationError('Acceso denegado: Sesión inválida.')

  const supabase = createAdminClient()

  const { data: fresh, error } = await supabase
    .from('users')
    .select('id, full_name, role, username, is_active')
    .eq('id', claim.id)
    .maybeSingle()

  if (error) throw new AuthorizationError('Acceso denegado: No se pudo verificar la sesión.')
  if (!fresh || !fresh.is_active) throw new AuthorizationError('Acceso denegado: Sesión inválida.')

  const role = fresh.role as AppRole
  if (!Object.values(APP_ROLE).includes(role)) {
    throw new AuthorizationError('Acceso denegado: Rol no reconocido.')
  }
  if (allowed.length > 0 && !allowed.includes(role)) {
    throw new AuthorizationError('Acceso denegado: Permisos insuficientes.')
  }

  const user: AuthenticatedUser = {
    id: fresh.id,
    full_name: fresh.full_name,
    role,
    username: fresh.username || '',
  }
  return { user, supabase }
}

/**
 * Converts a caught error into a message safe to return to the client.
 *
 * Authorization errors carry a user-facing message and are passed through.
 * Everything else (database errors, constraint names, stack detail) is logged
 * server-side and replaced with a generic fallback — internal detail never
 * reaches the browser.
 */
/**
 * SQLSTATE that our RPCs use for messages written for the operator ("Cupo lleno",
 * "Stock insuficiente de …"). See supabase/migrations/20261027090100.
 */
export const USER_FACING_DB_ERROR = 'SN400'

export function toActionError(err: unknown, fallback = 'Ocurrió un error inesperado. Intente de nuevo.'): string {
  if (err instanceof AuthorizationError) return err.message
  const db = err as { code?: unknown; message?: unknown } | null
  if (db?.code === USER_FACING_DB_ERROR && typeof db.message === 'string') return db.message
  console.error('[Action error]', err instanceof Error ? err.message : String(err))
  return fallback
}
