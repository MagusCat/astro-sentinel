'use server'

import { AuthenticatedUser } from './types'
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  createDeviceToken,
  verifyDeviceToken,
} from '@/lib/auth/session'
import { credentialsSchema, localLoginSchema } from './schemas'
import {
  setSessionCookie,
  setDeviceCookie,
  getSessionToken,
  getDeviceToken,
  deleteDeviceCookie,
  clearSessionAndSupabase,
  clearAllAuthAndSupabase,
} from '@/lib/cookies'

import { createAdminClient } from '@/lib/supabase/admin'
import { createVerifyClient } from '@/lib/supabase/verify'

// ── Brute-force throttle (login_attempts)
//
// La tabla registra SOLO intentos FALLIDOS, persistidos en la BD porque un Map
// en memoria no sobrevive al reciclaje de isolates en Cloudflare Workers. Un
// login correcto limpia los fallos de esa clave, así que un operador legítimo
// no se autobloquea. Falla ABIERTO: si la BD no responde, no deja a nadie fuera
// (bcrypt sigue siendo el freso de fondo).
const MAX_FAILED_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const RATE_LIMITED_MSG = 'Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.'

async function isRateLimited(key: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - WINDOW_MS).toISOString()

    const { count } = await supabase
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_key', key)
      .gte('created_at', since)

    return (count ?? 0) >= MAX_FAILED_ATTEMPTS
  } catch (err) {
    console.error('[Auth] Rate-limit check unavailable:', err instanceof Error ? err.message : String(err))
    return false // fail-open
  }
}

async function recordFailedAttempt(key: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('login_attempts').insert({ attempt_key: key })
  } catch (err) {
    console.error('[Auth] Could not record failed attempt:', err instanceof Error ? err.message : String(err))
  }
}

async function clearFailedAttempts(key: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('login_attempts').delete().eq('attempt_key', key)
  } catch (err) {
    console.error('[Auth] Could not clear failed attempts:', err instanceof Error ? err.message : String(err))
  }
}

// ── Device Authorization
export async function isDeviceAuthorized(): Promise<boolean> {
  const token = await getDeviceToken()
  if (!token) return false

  const deviceId = await verifyDeviceToken(token)
  if (!deviceId) return false

  try {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('authorized_devices')
      .select('device_id')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (error) {
      console.error('[Auth] Error querying authorized_devices:', error.message)
      return false
    }

    if (!data) {
      await deleteDeviceCookie()
      return false
    }
  } catch (err) {
    console.error('[Auth] Exception checking device authorization:', err)
    return false
  }

  return true
}

export async function authorizeDevice(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const rateKey = `device:${parsed.data.email}`
    if (await isRateLimited(rateKey)) {
      return { success: false, error: RATE_LIMITED_MSG }
    }

    // Verify credentials without persisting any Supabase session in the browser.
    const verify = createVerifyClient()
    let authUserId: string | null = null

    try {
      const { data, error } = await verify.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      })
      if (error) {
        await recordFailedAttempt(rateKey)
        return { success: false, error: 'Credenciales inválidas.' }
      }
      if (data.user) authUserId = data.user.id
    } catch {
      return { success: false, error: 'Error de conexión. Por favor, verifique la conectividad de red.' }
    }

    if (!authUserId) {
      await recordFailedAttempt(rateKey)
      return { success: false, error: 'Autorización de dispositivo rechazada.' }
    }

    await clearFailedAttempts(rateKey)

    const deviceId = crypto.randomUUID()

    // Register the device with the service role — the browser has no session.
    const supabaseAdmin = createAdminClient()
    const { error: insertError } = await supabaseAdmin
      .from('authorized_devices')
      .insert({ device_id: deviceId, authorized_by: authUserId })

    if (insertError) {
      console.error('[Auth] Error authorizing device:', insertError.message)
      return { success: false, error: 'Error interno del servidor al registrar la terminal.' }
    }

    const token = await createDeviceToken(deviceId)
    await setDeviceCookie(token)

    return { success: true }
  } catch (err) {
    console.error('[Auth] Device authorization exception:', err)
    return { success: false, error: 'Error de autorización de dispositivo.' }
  }
}

export async function revokeDeviceAuthorization(): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getDeviceToken()

    if (token) {
      const deviceId = await verifyDeviceToken(token)
      if (deviceId) {
        const supabaseAdmin = createAdminClient()
        const { error: deleteError } = await supabaseAdmin
          .from('authorized_devices')
          .delete()
          .eq('device_id', deviceId)

        if (deleteError) {
          console.error('[Auth] Error revoking device in DB:', deleteError.message)
        }
      }
    }

    await deleteDeviceCookie()
    return { success: true }
  } catch (err) {
    console.error('[Auth] Error revoking device authorization:', err)
    return { success: false, error: 'Error interno al revocar dispositivo.' }
  }
}

// ── User Authentication

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const parsed = localLoginSchema.safeParse({ username, password })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const rateKey = `user:${parsed.data.username}`
    if (await isRateLimited(rateKey)) {
      return { success: false, error: RATE_LIMITED_MSG }
    }

    const deviceToken = await getDeviceToken()
    if (!deviceToken) {
      return { success: false, error: 'No autorizado.' }
    }

    const deviceId = await verifyDeviceToken(deviceToken)
    if (!deviceId) {
      return { success: false, error: 'El token de autorización es inválido o ha expirado.' }
    }

    const supabaseAdmin = createAdminClient()

    const { data: deviceData, error: deviceError } = await supabaseAdmin
      .from('authorized_devices')
      .select('device_id')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (deviceError) {
      console.error('[Auth] Error querying authorized device on user login:', deviceError.message)
      return { success: false, error: 'Error al verificar la autorización de la terminal. Intente de nuevo.' }
    }

    if (!deviceData) {
      await deleteDeviceCookie()
      return { success: false, error: 'La autorización de esta terminal ha sido revocada remotamente.' }
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, password_hash, is_active, username')
      .eq('username', parsed.data.username)
      .maybeSingle()

    if (error) {
      console.error('[Auth] Error fetching user record:', error.message)
      return { success: false, error: 'Error interno del servidor.' }
    }

    // Constant-ish failure path: unknown user, inactive account, or an account
    // with no local password (e.g. an admin linked only to Supabase Auth) all
    // return the same generic message.
    if (!user || !user.is_active || !user.password_hash) {
      await recordFailedAttempt(rateKey)
      return { success: false, error: 'Usuario o contraseña inválidos.' }
    }

    const passwordMatch = await verifyPassword(parsed.data.password, user.password_hash)
    if (!passwordMatch) {
      await recordFailedAttempt(rateKey)
      return { success: false, error: 'Usuario o contraseña inválidos.' }
    }

    await clearFailedAttempts(rateKey)

    const authUser: AuthenticatedUser = {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      username: user.username || '',
    }

    const sessionToken = await createSessionToken(authUser)
    await setSessionCookie(sessionToken)

    return { success: true, user: authUser }
  } catch (err) {
    console.error('[Auth] User authentication exception:', err)
    return { success: false, error: 'Error de conexión de autenticación.' }
  }
}

// ── Admin Authentication

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const rateKey = `admin:${parsed.data.email}`
    if (await isRateLimited(rateKey)) {
      return { success: false, error: RATE_LIMITED_MSG }
    }

    const verify = createVerifyClient()
    let supabaseUserId: string | null = null

    try {
      const { data, error } = await verify.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      })
      if (error) {
        await recordFailedAttempt(rateKey)
        return { success: false, error: 'Credenciales inválidas.' }
      }
      if (data.user) supabaseUserId = data.user.id
    } catch {
      return { success: false, error: 'Error de conexión. Por favor, verifique la conectividad de red.' }
    }

    if (!supabaseUserId) {
      await recordFailedAttempt(rateKey)
      return { success: false, error: 'Credenciales rechazadas.' }
    }

    const supabaseAdmin = createAdminClient()
    const { data: userRecord, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, is_active, username')
      .eq('auth_user_id', supabaseUserId)
      .maybeSingle()

    if (lookupError) {
      console.error('[Auth] Error fetching admin user record:', lookupError.message)
      return { success: false, error: 'Error interno al verificar credenciales.' }
    }

    if (!userRecord) {
      return { success: false, error: 'Credenciales rechazadas.' }
    }

    if (!userRecord.is_active) {
      return { success: false, error: 'La cuenta de administrador no está activa.' }
    }

    await clearFailedAttempts(rateKey)

    const authUser: AuthenticatedUser = {
      id: userRecord.id,
      full_name: userRecord.full_name,
      role: userRecord.role,
      username: userRecord.username || '',
    }

    const sessionToken = await createSessionToken(authUser)
    await setSessionCookie(sessionToken)

    return { success: true, user: authUser }
  } catch (err) {
    console.error('[Auth] Admin authentication exception:', err)
    return { success: false, error: 'Error de conexión de administrador.' }
  }
}

// ── Session Management

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const token = await getSessionToken()
    if (!token) return null
    return await verifySessionToken(token)
  } catch {
    return null
  }
}

export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    await clearSessionAndSupabase()
    return { success: true }
  } catch (err) {
    console.error('[Auth] Error clearing session cookie:', err)
    return { success: false, error: 'Error al limpiar sesión.' }
  }
}

export async function logoutUserFull(): Promise<{ success: boolean; error?: string }> {
  try {
    await clearAllAuthAndSupabase()
    return { success: true }
  } catch (err) {
    console.error('[Auth] Error clearing full session:', err)
    return { success: false, error: 'Error al limpiar sesión completa.' }
  }
}
