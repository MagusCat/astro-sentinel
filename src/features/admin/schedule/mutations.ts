'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { uuidSchema } from '@/lib/validation/common'
import { enrollmentSchema, sessionSchema, teacherSchema } from './schemas'

type Result = { success: boolean; error?: string }

const manager = () => requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

export async function saveSession(data: unknown, sessionId?: string): Promise<Result> {
  try {
    const { supabase } = await manager()
    const parsed = sessionSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    const { weekdays, ...fields } = parsed.data

    if (sessionId) {
      if (!uuidSchema.safeParse(sessionId).success) return { success: false, error: 'Horario inválido.' }
      if (weekdays.length !== 1) return { success: false, error: 'Un horario existente solo puede tener un día.' }
      if (fields.capacity !== null) {
        const { count, error } = await supabase
          .from('session_enrollments')
          .select('client_id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
        if (error) throw error
        if ((count ?? 0) > fields.capacity) {
          return { success: false, error: `Hay ${count} alumnos inscritos; el cupo no puede ser menor.` }
        }
      }
      const { error } = await supabase.from('class_sessions').update({ ...fields, weekday: weekdays[0] }).eq('id', sessionId)
      if (error) throw error
    } else {
      // Creating with several days produces one recurring slot per day.
      const { error } = await supabase.from('class_sessions').insert(weekdays.map((weekday) => ({ ...fields, weekday })))
      if (error) throw error
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al guardar el horario.') }
  }
}

export async function deleteSession(sessionId: string): Promise<Result> {
  try {
    const { supabase } = await manager()
    const parsed = uuidSchema.safeParse(sessionId)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const { error } = await supabase.from('class_sessions').update({ is_active: false }).eq('id', parsed.data)
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar el horario.') }
  }
}

export async function saveTeacher(data: unknown, teacherId?: string): Promise<Result> {
  try {
    const { supabase } = await manager()
    const parsed = teacherSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }

    const table = supabase.from('teachers')
    if (teacherId) {
      if (!uuidSchema.safeParse(teacherId).success) return { success: false, error: 'Profesor inválido.' }
      const { error } = await table.update(parsed.data).eq('id', teacherId)
      if (error) throw error
    } else {
      const { error } = await table.insert(parsed.data)
      if (error) throw error
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al guardar el profesor.') }
  }
}

export async function deleteTeacher(teacherId: string): Promise<Result> {
  try {
    const { supabase } = await manager()
    const parsed = uuidSchema.safeParse(teacherId)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const { error } = await supabase.from('teachers').update({ is_active: false }).eq('id', parsed.data)
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar el profesor.') }
  }
}

/** Locked in SQL (enroll_client) so two admins can't overfill the roster at the same time. */
export async function enrollClient(sessionId: string, clientId: string): Promise<Result> {
  try {
    const { supabase } = await manager()
    const parsed = enrollmentSchema.safeParse({ session_id: sessionId, client_id: clientId })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const { error } = await supabase.rpc('enroll_client', { p_session_id: parsed.data.session_id, p_client_id: parsed.data.client_id })
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al inscribir al alumno.') }
  }
}

export async function unenrollClient(sessionId: string, clientId: string): Promise<Result> {
  try {
    const { supabase } = await manager()
    const parsed = enrollmentSchema.safeParse({ session_id: sessionId, client_id: clientId })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
    const { error } = await supabase
      .from('session_enrollments')
      .delete()
      .eq('session_id', parsed.data.session_id)
      .eq('client_id', parsed.data.client_id)
    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al quitar al alumno.') }
  }
}
