'use server'

import { requireRole } from '@/lib/auth/guard'
import { one, type Joined } from '@/lib/supabase/joins'
import { uuidSchema } from '@/lib/validation/common'
import { RosterMember, ScheduleData } from './types'

export async function getScheduleData(): Promise<ScheduleData> {
  try {
    const { supabase } = await requireRole()
    const [sessionsRes, teachersRes, enrollmentsRes] = await Promise.all([
      supabase
        .from('class_sessions')
        .select('id, class_id, teacher_id, weekday, start_time, end_time, capacity, access_mode, is_paused, room, classes(name), teachers(full_name)')
        .eq('is_active', true)
        .order('weekday')
        .order('start_time'),
      supabase.from('teachers').select('id, full_name, phone_number, email').eq('is_active', true).order('full_name'),
      supabase.from('session_enrollments').select('session_id'),
    ])
    if (sessionsRes.error) throw sessionsRes.error
    if (teachersRes.error) throw teachersRes.error
    if (enrollmentsRes.error) throw enrollmentsRes.error

    const enrolledBySession = new Map<string, number>()
    for (const e of enrollmentsRes.data || []) enrolledBySession.set(e.session_id, (enrolledBySession.get(e.session_id) ?? 0) + 1)

    return {
      sessions: (sessionsRes.data || []).map((s) => ({
        id: s.id,
        class_id: s.class_id,
        class_name: one(s.classes as Joined<{ name: string }>)?.name || 'General',
        teacher_id: s.teacher_id,
        teacher_name: one(s.teachers as Joined<{ full_name: string }>)?.full_name || null,
        weekday: s.weekday,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
        capacity: s.capacity,
        access_mode: s.access_mode,
        is_paused: s.is_paused,
        enrolled: enrolledBySession.get(s.id) ?? 0,
        room: s.room,
      })),
      teachers: teachersRes.data || [],
    }
  } catch (err) {
    console.error('Error fetching schedule:', err instanceof Error ? err.message : String(err))
    return { sessions: [], teachers: [] }
  }
}

export async function getSessionRoster(sessionId: string): Promise<RosterMember[]> {
  try {
    const { supabase } = await requireRole()
    if (!uuidSchema.safeParse(sessionId).success) return []
    const { data, error } = await supabase
      .from('session_enrollments')
      .select('client_id, clients(full_name)')
      .eq('session_id', sessionId)
      .order('created_at')
    if (error) throw error
    return (data || []).map((e) => ({
      client_id: e.client_id,
      full_name: one(e.clients as Joined<{ full_name: string }>)?.full_name || 'Desconocido',
    }))
  } catch (err) {
    console.error('Error fetching roster:', err instanceof Error ? err.message : String(err))
    return []
  }
}
