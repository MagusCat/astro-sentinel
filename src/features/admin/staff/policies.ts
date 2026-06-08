import { AuthenticatedUser } from '@/features/auth/types'
import { LocalUser } from './types'
import { APP_ROLE } from '@/lib/auth/roles'

export interface UpdatePayload {
  full_name?: string
  password_hash?: string
  is_active?: boolean
  role?: string
  auth_user_id?: string | null
}

export function enforceStaffUpdatePolicies(
  currentUser: AuthenticatedUser,
  targetUser: LocalUser,
  updatedFields: { full_name?: string; password_raw?: string; is_active?: boolean; role?: string; auth_user_id?: string },
  hashedPassword?: string
): { error?: string; payload?: UpdatePayload } {
  // Prevent self-locking or self-deactivation
  if (currentUser.id === targetUser.id) {
    if (updatedFields.is_active === false) {
      return { error: 'No puedes desactivar tu propia cuenta de terminal.' }
    }
  }

  const payload: UpdatePayload = {}

  // 1. Admin Role policies
  if (currentUser.role === APP_ROLE.ADMIN) {
    // Admin cannot modify a Maintainer
    if (targetUser.role === APP_ROLE.MAINTAINER) {
      return { error: 'Acceso denegado: No puedes alterar a un Programador (Maintainer).' }
    }

    // Admin modifying another Admin: CAN ONLY toggle is_active!
    if (targetUser.role === APP_ROLE.ADMIN) {
      if (targetUser.id === currentUser.id) {
        // Can modify their own name and password
        if (updatedFields.full_name !== undefined) payload.full_name = updatedFields.full_name.replace(/<[^>]*>/g, '').trim()
        if (hashedPassword) payload.password_hash = hashedPassword
      } else {
        // Modifying other admin -> ONLY is_active allowed!
        if (updatedFields.full_name || updatedFields.password_raw || updatedFields.role || updatedFields.auth_user_id) {
          return { error: 'Un Administrador solo puede activar o desactivar a otros Administradores.' }
        }
        if (updatedFields.is_active !== undefined) {
          payload.is_active = updatedFields.is_active
        }
      }
    }

    // Admin modifying a receptionist: fully allowed
    if (targetUser.role === APP_ROLE.RECEPTION) {
      if (updatedFields.full_name !== undefined) payload.full_name = updatedFields.full_name.replace(/<[^>]*>/g, '').trim()
      if (hashedPassword) payload.password_hash = hashedPassword
      if (updatedFields.is_active !== undefined) payload.is_active = updatedFields.is_active
    }
  }

  // 2. Maintainer Role policies
  if (currentUser.role === APP_ROLE.MAINTAINER) {
    // Can modify anything except changing usernames
    if (updatedFields.full_name !== undefined) payload.full_name = updatedFields.full_name.replace(/<[^>]*>/g, '').trim()
    if (hashedPassword) payload.password_hash = hashedPassword
    if (updatedFields.is_active !== undefined) payload.is_active = updatedFields.is_active
    if (updatedFields.role !== undefined) payload.role = updatedFields.role
    if (updatedFields.auth_user_id !== undefined) {
      payload.auth_user_id = updatedFields.auth_user_id?.trim() || null
    }
  }

  return { payload }
}
