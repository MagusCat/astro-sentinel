'use server'

import { createClient } from '@/lib/supabase/server'
import { AuthenticatedUser } from './types'
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  createDeviceToken,
  verifyDeviceToken,
} from '@/lib/auth/session'
import { credentialsSchema, localLoginSchema } from './schemas'
import { getSecret, getServiceConfig } from '@/lib/config'
import {
  setSessionCookie,
  setDeviceCookie,
  getSessionToken,
  getDeviceToken,
  deleteSessionCookie,
  deleteDeviceCookie,
  deleteAllAuthCookies,
} from '@/lib/cookies'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  const { supabaseUrl } = getServiceConfig()
  return createSupabaseClient(
    supabaseUrl,
    getSecret('SUPABASE_SERVICE_ROLE_KEY'),
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    }
  )
}

// ── Device Authorization
export async function isDeviceAuthorized(): Promise<boolean> {
  const token = await getDeviceToken()
  if (!token) return false

  const deviceId = await verifyDeviceToken(token)
  if (!deviceId) return false

  try {
    const supabaseAdmin = getAdminClient()
    const { data } = await supabaseAdmin
      .from('authorized_devices')
      .select('device_id')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (!data) {
      await deleteDeviceCookie()
      return false
    }
  } catch {
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
        return { success: false, error: 'Credenciales inválidas.' }
      }

      if (data.user) {
        authUserId = data.user.id
      }
    } catch {
      return { success: false, error: 'Error de conexión. Por favor, verifique la conectividad de red.' }
    }

    if (!authUserId) {
      return { success: false, error: 'Autorización de dispositivo rechazada.' }
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

    const token = await createDeviceToken(deviceId)
    await setDeviceCookie(token)

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error de autorización de dispositivo: ${errorMsg}` }
  }
}

export async function revokeDeviceAuthorization(): Promise<void> {
  try {
    const token = await getDeviceToken()

    if (token) {
      const deviceId = await verifyDeviceToken(token)
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

    await deleteDeviceCookie()
  } catch (err) {
    console.error('Error al revocar autorización de dispositivo:', err)
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

    const deviceToken = await getDeviceToken()
    if (!deviceToken) {
      return {
        success: false,
        error: 'No autorizado.'
      }
    }

    const deviceId = await verifyDeviceToken(deviceToken)
    if (!deviceId) {
      return {
        success: false,
        error: 'El token de autorización es inválido o ha expirado.'
      }
    }

    const supabase = await createClient()

    const { data: deviceData } = await supabase
      .from('authorized_devices')
      .select('device_id')
      .eq('device_id', deviceId)
      .maybeSingle()

    if (!deviceData) {
      await deleteDeviceCookie()
      return { success: false, error: 'La autorización de esta terminal ha sido revocada remotamente.' }
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role, password_hash, is_active, username')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      return { success: false, error: 'Error interno del servidor.' }
    }

    if (!user) {
      return { success: false, error: 'Usuario o contraseña inválidos.' }
    }

    if (!user.is_active) {
      return { success: false, error: 'La cuenta de usuario no está registrada.' }
    }

    const passwordMatch = await verifyPassword(password, user.password_hash)
    if (!passwordMatch) {
      return { success: false, error: 'Usuario o contraseña inválidos.' }
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      username: user.username || ''
    }

    const sessionToken = await createSessionToken(authUser)
    await setSessionCookie(sessionToken)

    return {
      success: true,
      user: authUser
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error de conexión de autenticación: ${errorMsg}` }
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

    const supabase = await createClient()
    let supabaseUser: { id: string; email?: string } | null = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: 'Credenciales inválidas.' }
      }

      if (data.user) {
        supabaseUser = data.user
      }
    } catch {
      return { success: false, error: 'Error de conexión. Por favor, verifique la conectividad de red.' }
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
    }

    if (!userRecord) {
      return { success: false, error: 'Error al obtener información de usuario.' }
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

    const sessionToken = await createSessionToken(authUser)
    await setSessionCookie(sessionToken)

    return {
      success: true,
      user: authUser
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error de conexión de administrador: ${errorMsg}` }
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

export async function logoutUser(): Promise<void> {
  try {
    await deleteSessionCookie()
  } catch (err) {
    console.error('Error al limpiar cookie de sesión:', err)
  }
}

export async function logoutUserFull(): Promise<void> {
  try {
    await deleteAllAuthCookies()
  } catch (err) {
    console.error('Error al limpiar sesión completa:', err)
  }
}
