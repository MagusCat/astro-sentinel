'use server'

import { requireRole } from '@/lib/auth/guard'
import { todayStr, weekdayOf } from '@/lib/dates'
import { one, type Joined } from '@/lib/supabase/joins'
import { uuidSchema } from '@/lib/validation/common'
import { AttendanceRow, TodayAttendance, TodaySession } from './types'

export async function getTodayAttendance(): Promise<TodayAttendance> {
  try {
    const { supabase } = await requireRole()
    const today = todayStr()

    const [attendanceRes, sessionsRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('id, client_id, class_id, session_id, checked_in_at, clients(full_name), classes(name)')
        .eq('attended_on', today)
        .order('checked_in_at', { ascending: false }),
      supabase
        .from('class_sessions')
        .select('id, class_id, start_time, end_time, capacity, access_mode, is_paused, classes(name), teachers(full_name)')
        .eq('is_active', true)
        .eq('weekday', weekdayOf(today))
        .order('start_time', { ascending: true }),
    ])

    if (attendanceRes.error) throw attendanceRes.error
    if (sessionsRes.error) throw sessionsRes.error

    const rows: AttendanceRow[] = (attendanceRes.data || []).map((a) => ({
      id: a.id,
      clientId: a.client_id,
      clientName: one(a.clients as Joined<{ full_name: string }>)?.full_name || 'Desconocido',
      classId: a.class_id,
      className: one(a.classes as Joined<{ name: string }>)?.name || 'General',
      sessionId: a.session_id,
      checkedInAt: a.checked_in_at,
    }))

    const sessions: TodaySession[] = (sessionsRes.data || []).map((s) => ({
      id: s.id,
      classId: s.class_id,
      className: one(s.classes as Joined<{ name: string }>)?.name || 'General',
      teacherName: one(s.teachers as Joined<{ full_name: string }>)?.full_name || null,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      capacity: s.capacity,
      accessMode: s.access_mode,
      isPaused: s.is_paused,
      attendees: rows.filter((r) => r.sessionId === s.id).length,
    }))

    return { rows, sessions }
  } catch (err) {
    console.error('Error fetching attendance:', err instanceof Error ? err.message : String(err))
    return { rows: [], sessions: [] }
  }
}

export async function getClientAttendance(clientId: string): Promise<{ date: string; className: string }[]> {
  try {
    const { supabase } = await requireRole()
    if (!uuidSchema.safeParse(clientId).success) return []
    const { data, error } = await supabase
      .from('attendance')
      .select('attended_on, classes(name)')
      .eq('client_id', clientId)
      .order('attended_on', { ascending: false })
      .limit(30)
    if (error) throw error
    return (data || []).map((a) => ({ date: a.attended_on, className: one(a.classes as Joined<{ name: string }>)?.name || 'General' }))
  } catch (err) {
    console.error('Error fetching client attendance:', err instanceof Error ? err.message : String(err))
    return []
  }
}
