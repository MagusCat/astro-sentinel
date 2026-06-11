'use server'

import { createClient } from '@/lib/supabase/server'
import { MembershipsPanelData, MembershipsTableRow, OccupancyQueryRow } from './types'

export async function getMembershipsPanelData(): Promise<MembershipsPanelData> {
  const supabase = await createClient()

  const [
    membershipsRes,
    activeRes,
    expiringRes,
    frozenRes,
    occupancyRes
  ] = await Promise.all([
    supabase
      .from('vw_memberships_extended')
      .select('id, client_id, status, start_date, end_date, client_name, plan_name, class_name')
      .order('created_at', { ascending: false }),
    supabase
      .from('vw_active_memberships')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('vw_active_memberships')
      .select('*', { count: 'exact', head: true })
      .lte('days_remaining', 7),
    supabase
      .from('vw_memberships_extended')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'frozen'),
    supabase
      .from('vw_class_headcounts')
      .select('class_name, active_students')
  ])

  const membershipsList: MembershipsTableRow[] = (membershipsRes.data || []).map((m: { id: string; client_id: string; client_name: string | null; class_name: string | null; plan_name: string | null; start_date: string; end_date: string; status: string }) => ({
    id: m.id,
    clientId: m.client_id,
    clientName: m.client_name || 'Desconocido',
    className: m.class_name || 'General',
    planName: m.plan_name || 'Plan',
    startDate: m.start_date,
    endDate: m.end_date,
    status: m.status as MembershipsTableRow['status']
  }))

  // Supabase returns an array even for head queries; cast is safe as we control the select
  const classOccupancy = ((occupancyRes.data || []) as unknown as OccupancyQueryRow[]).map((row) => ({
    className: row.class_name,
    activeStudents: Number(row.active_students)
  }))

  return {
    metrics: {
      totalActive: activeRes.count || 0,
      expiringSoon: expiringRes.count || 0,
      frozen: frozenRes.count || 0
    },
    classOccupancy,
    membershipsList
  }
}
