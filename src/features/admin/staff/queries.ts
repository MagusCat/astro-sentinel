'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { LocalUser } from './types'
import { LOGICAL_DELETE_MARKER } from './constants'
import { APP_ROLE } from '@/lib/auth/roles'

export async function getUsersList(): Promise<{ success: boolean; users?: LocalUser[]; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !currentUser.role) {
      return { success: false, error: 'Acceso denegado: Sesión inválida.' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('users')
      .select('id, full_name, role, username, is_active, auth_user_id, created_at')
      .neq('password_hash', LOGICAL_DELETE_MARKER)
      .order('created_at', { ascending: false })

    if (currentUser.role === APP_ROLE.ADMIN) {
      query = query.neq('role', APP_ROLE.MAINTAINER)
    } else if (currentUser.role !== APP_ROLE.MAINTAINER) {
      return { success: false, error: 'Acceso denegado: Rol insuficiente.' }
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, users: data as LocalUser[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al obtener personal: ${msg}` }
  }
}
