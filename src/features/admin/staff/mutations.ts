'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { hashPassword } from '@/lib/auth/session'
import { createUserSchema, updateUserSchema } from './schemas'
import { LOGICAL_DELETE_MARKER } from './constants'
import { enforceStaffUpdatePolicies } from './policies'
import { APP_ROLE } from '@/lib/auth/roles'

export async function saveNewUser(
  userData: { full_name: string; username: string; password_raw: string; role: string; auth_user_id?: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    const parsed = createUserSchema.safeParse(userData)
    if (!parsed.success) {
      return { 
        success: false, 
        error: parsed.error.issues[0]?.message || 'Datos inválidos.',
        validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    }
    const clean = parsed.data

    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    if (currentUser.role !== APP_ROLE.ADMIN && currentUser.role !== APP_ROLE.MAINTAINER) {
      return { success: false, error: 'Acceso denegado: No autorizado.' }
    }

    if (currentUser.role === APP_ROLE.ADMIN && clean.role !== APP_ROLE.RECEPTION) {
      return { success: false, error: 'Acceso denegado: Un Administrador solo puede registrar Recepcionistas.' }
    }

    if (clean.role === APP_ROLE.ADMIN && currentUser.role !== APP_ROLE.MAINTAINER) {
      return { success: false, error: 'Acceso denegado: Solo un Desarrollador (Maintainer) puede registrar Administradores.' }
    }

    if (clean.role === APP_ROLE.ADMIN && !clean.auth_user_id?.trim()) {
      return { success: false, error: 'El ID de Supabase Auth es obligatorio para vincular la cuenta del Administrador.' }
    }

    const supabase = await createClient()

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', clean.username)
      .maybeSingle()

    if (existingUser) {
      return { success: false, error: 'El nombre de usuario ya está reservado o registrado en el sistema.' }
    }

    const newUserPayload = {
      full_name: clean.full_name,
      username: clean.username,
      password_hash: await hashPassword(clean.password_raw),
      role: clean.role,
      auth_user_id: clean.auth_user_id ?? null,
      is_active: true
    }

    const { error } = await supabase
      .from('users')
      .insert(newUserPayload)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al registrar usuario: ${msg}` }
  }
}

export async function updateUserData(
  targetUserId: string,
  updatedFields: { full_name?: string; password_raw?: string; current_password_raw?: string; is_active?: boolean; role?: string; auth_user_id?: string }
): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    if (currentUser.role !== APP_ROLE.ADMIN && currentUser.role !== APP_ROLE.MAINTAINER) {
      return { success: false, error: 'Acceso denegado: No autorizado.' }
    }

    const supabase = await createClient()

    const { data: targetUser, error: fError } = await supabase
      .from('users')
      .select('id, role, username, is_active, full_name, password_hash')
      .eq('id', targetUserId)
      .maybeSingle()

    if (fError || !targetUser) {
      return { success: false, error: 'No se encontró el usuario solicitado.' }
    }

    const parsedUpdate = updateUserSchema.safeParse(updatedFields)
    if (!parsedUpdate.success) {
      return { 
        success: false, 
        error: parsedUpdate.error.issues[0]?.message || 'Datos inválidos.',
        validationErrors: parsedUpdate.error.flatten().fieldErrors as Record<string, string[]>
      }
    }

    let hashedPw: string | undefined
    if (updatedFields.password_raw) {
      if (currentUser.id === targetUserId) {
        if (!updatedFields.current_password_raw) {
          return { success: false, error: 'Debe ingresar su contraseña actual para cambiarla.' }
        }
        // Necesitamos importar verifyPassword pero ya está importado arriba
        const { verifyPassword } = await import('@/lib/auth/session')
        const isMatch = await verifyPassword(updatedFields.current_password_raw, targetUser.password_hash)
        if (!isMatch) {
          return { success: false, error: 'La contraseña actual ingresada es incorrecta.' }
        }
      }
      hashedPw = await hashPassword(updatedFields.password_raw)
    }

    const { error: policyError, payload } = enforceStaffUpdatePolicies(
      currentUser,
      targetUser,
      updatedFields,
      hashedPw
    )

    if (policyError) {
      return { success: false, error: policyError }
    }

    if (!payload || Object.keys(payload).length === 0) {
      return { success: true }
    }

    const { error: uError } = await supabase
      .from('users')
      .update(payload)
      .eq('id', targetUserId)

    if (uError) throw uError
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al actualizar usuario: ${msg}` }
  }
}

export async function deleteUserData(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    if (currentUser.role !== APP_ROLE.ADMIN && currentUser.role !== APP_ROLE.MAINTAINER) {
      return { success: false, error: 'Acceso denegado: No autorizado.' }
    }

    const supabase = await createClient()

    const { data: targetUser, error: fError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle()

    if (fError || !targetUser) {
      return { success: false, error: 'No se encontró el usuario solicitado.' }
    }

    if (currentUser.id === targetUserId) {
      return { success: false, error: 'No puedes eliminar tu propia cuenta en sesión.' }
    }

    if (currentUser.role === APP_ROLE.ADMIN) {
      if (targetUser.role === APP_ROLE.MAINTAINER || targetUser.role === APP_ROLE.ADMIN) {
        return { success: false, error: 'Acceso denegado: Un Administrador no puede eliminar a otros Administradores o Programadores.' }
      }
      if (targetUser.role !== APP_ROLE.RECEPTION) {
        return { success: false, error: 'Acceso denegado: Solo puedes eliminar cuentas de Recepcionistas.' }
      }
    }

    const { error: dError } = await supabase
      .from('users')
      .update({
        password_hash: LOGICAL_DELETE_MARKER,
        is_active: false,
        auth_user_id: null
      })
      .eq('id', targetUserId)

    if (dError) throw dError
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al eliminar usuario: ${msg}` }
  }
}
