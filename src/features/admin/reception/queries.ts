'use server'

import { requireRole } from '@/lib/auth/guard'
import { addDays, daysBetween, todayStr } from '@/lib/dates'
import { one, type Joined } from '@/lib/supabase/joins'
import { ReminderRow } from './types'

/** Memberships that expire, or expired, within ±`windowDays` — the renewal call list. */
export async function getRenewalReminders(windowDays = 7): Promise<ReminderRow[]> {
  try {
    const { supabase } = await requireRole()
    const today = todayStr()
    const { data, error } = await supabase
      .from('memberships')
      .select('id, end_date, clients!inner(full_name, phone_number, is_active), class_plans(classes(name))')
      .in('status', ['active', 'expired'])
      .eq('clients.is_active', true)
      .gte('end_date', addDays(today, -windowDays))
      .lte('end_date', addDays(today, windowDays))
      .order('end_date', { ascending: true })
      .limit(100)
    if (error) throw error

    return (data || []).map((m) => {
      const client = one(m.clients as Joined<{ full_name: string; phone_number: string | null }>)
      const plan = one(m.class_plans as Joined<{ classes: Joined<{ name: string }> }>)
      return {
        membershipId: m.id,
        clientName: client?.full_name || 'Desconocido',
        phone: client?.phone_number || null,
        className: one(plan?.classes ?? null)?.name || 'General',
        endDate: m.end_date,
        daysLeft: daysBetween(today, m.end_date),
      }
    })
  } catch (err) {
    console.error('Error fetching renewal reminders:', err instanceof Error ? err.message : String(err))
    return []
  }
}
