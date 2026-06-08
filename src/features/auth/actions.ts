'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { AuthenticatedUser } from './types'
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  createDeviceToken,
  verifyDeviceToken,
} from '@/lib/auth/session'
import { credentialsSchema, localLoginSchema } from './schemas'
import { parseDuration } from '@/lib/utils'
// TODO: Implement security audit logging (Vercel Drains + Supabase)

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    }
  )
}

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'sentinel_session'
const DEVICE_COOKIE = process.env.DEVICE_COOKIE_NAME || 'sentinel_device_token'

const SESSION_MAX_AGE = parseDuration(process.env.SESSION_MAX_AGE || '7d')
const DEVICE_MAX_AGE = parseDuration(process.env.DEVICE_MAX_AGE || '365d')

// ── Device Authorization
export async function isDeviceAuthorized(): Promise<boolean> {
  const cookieStore = await cookies()
  
  // Slow path
  const token = cookieStore.get(DEVICE_COOKIE)
  if (!token || !token.value) return false

  const deviceId = await verifyDeviceToken(token.value)
  if (!deviceId) return false

  try {
    const supabaseAdmin = getAdminClient()
    const { data } = await supabaseAdmin
      .from('authorized_devices')
      .select('device_id')
      .eq('device_id', deviceId)
      .maybeSingle()

    // If there is no DB record, the device has been deleted.
    if (!data) {
      cookieStore.delete(DEVICE_COOKIE)
      return false
    }
  } catch {
    // Fallback to strict DB check
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

    const supabase = await createClient()
    let authUserId: string | null = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        authUserId = data.user.id
      }
    } catch {
      return { success: false, error: 'API connection failed. Please check network connectivity.' }
    }

    if (!authUserId) {
      return { success: false, error: 'Device authorization rejected.' }
    }

    const deviceId = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('authorized_devices')
      .insert({
        device_id: deviceId,
        authorized_by: authUserId,
      })

    if (insertError) {
      return { success: false, error: `Error de base de datos: ${insertError.message}` }
    }

    // Create a signed long-lived JWT and store in cookie
    const token = await createDeviceToken(deviceId)
    const cookieStore = await cookies()
    cookieStore.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DEVICE_MAX_AGE,
      path: '/'
    })

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Device authorization exception: ${errorMsg}` }
  }
}

export async function revokeDeviceAuthorization(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(DEVICE_COOKIE)

    if (token?.value) {
      const deviceId = await verifyDeviceToken(token.value)
      if (deviceId) {
        const supabase = await createClient()
        const { error: updateError } = await supabase
          .from('authorized_devices')
          .delete()
          .eq('device_id', deviceId)

        if (updateError) {
          console.error('Error al revocar en BD (puede ser por permisos RLS):', updateError.message)
        }
      }
    }

    cookieStore.delete(DEVICE_COOKIE)
  } catch (err) {
    console.error('Failed to revoke device authorization:', err)
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

    const cookieStore = await cookies()
    const deviceToken = cookieStore.get(DEVICE_COOKIE)
    if (!deviceToken || !deviceToken.value) {
      return {
        success: false,
        error: 'Unauthorized.'
      }
    }

    // Verify device JWT signature locally (fast path)
    const deviceId = await verifyDeviceToken(deviceToken.value)
    if (!deviceId) {
      return {
        success: false,
        error: 'Authorization token is invalid or expired.'
      }
    }

    const supabase = await createClient()

    // Check if device is active in DB (defense in depth)
    const { data: deviceData } = await supabase
      .from('authorized_devices')
      .select('device_id')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (!deviceData) {
       // Revoke local cookie immediately since it's inactive in DB
       cookieStore.delete(DEVICE_COOKIE)
       return { success: false, error: 'La autorización de esta terminal ha sido revocada remotamente.' }
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role, password_hash, is_active, username')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      return { success: false, error: 'Internal error' }
    }

    if (!user) {
      return { success: false, error: 'Invalid username or password' }
    }

    if (!user.is_active) {
      return { success: false, error: 'User account is not registered' }
    }

    const passwordMatch = await verifyPassword(password, user.password_hash)
    if (!passwordMatch) {
      return { success: false, error: 'Invalid username or password' }
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      username: user.username || ''
    }

    // Create signed session JWT and set as HTTP-only cookie
    const sessionToken = await createSessionToken(authUser)
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/'
    })

    return {
      success: true,
      user: authUser
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Auth connection error: ${errorMsg}` }
  }
}

// ── Admin Authentication

/**
 * Authenticate an admin via Supabase Auth, then issue a local
 * signed session JWT cookie.
 */
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()
    let supabaseUser: { id: string; email?: string } | null = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        supabaseUser = data.user
      }
    } catch {
      return { success: false, error: 'API connection failed. Please check network connectivity.' }
    }

    if (!supabaseUser) {
      return { success: false, error: 'Credenciales rechazadas.' }
    }

    let userRecord = null

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, full_name, role, is_active, username')
        .eq('auth_user_id', supabaseUser.id)
        .maybeSingle()

      if (user) {
        userRecord = user
      }
    } catch {
      // ignore
    }

    if (!userRecord) {
      return { success: false, error: 'Error al obtener información de usuario' }
    }

    if (!userRecord.is_active) {
      return { success: false, error: 'La cuenta de administrador no está activa.' }
    }

    const authUser: AuthenticatedUser = {
      id: userRecord.id,
      full_name: userRecord.full_name,
      role: userRecord.role,
      username: userRecord.username || ''
    }

    // Create signed session JWT and set as HTTP-only cookie
    const sessionToken = await createSessionToken(authUser)
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/'
    })

    return {
      success: true,
      user: authUser
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error de conexión admin: ${errorMsg}` }
  }
}

// ── Session Management

/**
 * Read and verify the session JWT from the cookie.
 * Returns the authenticated user payload or null if invalid/expired.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)

    if (!sessionCookie || !sessionCookie.value) {
      return null
    }

    return await verifySessionToken(sessionCookie.value)
  } catch {
    return null
  }
}

export async function logoutUser(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
  } catch (err) {
    console.error('Failed to clear session cookie:', err)
  }
}

export async function logoutUserFull(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    cookieStore.delete(DEVICE_COOKIE)
  } catch (err) {
    console.error('Failed to clear full session:', err)
  }
}
