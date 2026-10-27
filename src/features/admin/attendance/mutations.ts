'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { uuidSchema } from '@/lib/validation/common'
import { checkInSchema } from './schemas'

/**
 * Registers attendance. Membership, roster, pause and capacity are validated
 * inside one locked SQL call (check_in), so concurrent terminals cannot overbook.
 */
export async function checkInClient(data: {
  client_id: string
  class_id: string
  session_id: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, supabase } = await requireRole()

    const parsed = checkInSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }

    const { error } = await supabase.rpc('check_in', {
      p_client_id: parsed.data.client_id,
      p_class_id: parsed.data.class_id,
      p_session_id: parsed.data.session_id,
      p_user_id: user.id,
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al registrar asistencia.') }
  }
}

export async function removeAttendance(attendanceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const parsed = uuidSchema.safeParse(attendanceId)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

    const { error } = await supabase.from('attendance').delete().eq('id', parsed.data)
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar asistencia.') }
  }
}
