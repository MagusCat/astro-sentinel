'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { OverviewStats, ClassHeadcountRow, InactiveMembershipViewRow, PaymentViewRow, ClientViewRow } from './types'
import { APP_CONFIG } from '@/lib/config'

const defaultStats: OverviewStats = {
  activeMembershipsCount: 0,
  dailyRevenue: 0,
  topClass: 'Sin sesiones activas',
  classHeadcounts: [],
  inactiveMemberships: [],
  recentPayments: [],
  recentClients: [],
  totalClientsCount: 0,
  totalClassesCount: 0
}

export async function getOverviewStats(): Promise<OverviewStats> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return defaultStats

    const supabase = await createClient()

    const [
      statsRes,
      classHeadcountsRes,
      inactiveMembershipsRes,
      recentPaymentsRes,
      recentClientsRes
    ] = await Promise.all([
      supabase.from('vw_dashboard_stats').select('*').single(),
      supabase.from('vw_class_headcounts').select('class_name, active_students'),
      supabase
        .from('vw_memberships_extended')
        .select('client_name, status, end_date, plan_name, class_name')
        .in('status', APP_CONFIG.dashboard.inactiveStatuses)
        .order('end_date', { ascending: false })
        .limit(APP_CONFIG.dashboard.listLimit),
      supabase
        .from('vw_payments_extended')
        .select('client_name, total_amount, payment_method, transaction_date')
        .order('transaction_date', { ascending: false })
        .limit(APP_CONFIG.dashboard.listLimit),
      supabase
        .from('clients')
        .select('full_name, created_at, registration_source')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(APP_CONFIG.dashboard.listLimit)
    ])

    const { data: statsData, error: sError } = statsRes
    const { data: headData, error: hError } = classHeadcountsRes
    const { data: inactiveData } = inactiveMembershipsRes
    const { data: recentPaymentsData } = recentPaymentsRes
    const { data: recentClientsData } = recentClientsRes

    if (hError) console.error('Error fetching class headcounts:', hError)
    if (sError) console.error('Error fetching stats:', sError)

    const classHeadcounts = ((headData || []) as ClassHeadcountRow[]).map((h) => ({
      className: h.class_name,
      activeStudents: Number(h.active_students)
    }))

    const topClass = classHeadcounts.length > 0 ? classHeadcounts[0].className : 'Sin sesiones activas'

    return {
      activeMembershipsCount: statsData?.active_memberships_count || 0,
      dailyRevenue: statsData?.daily_revenue || 0,
      topClass,
      classHeadcounts,
      inactiveMemberships: (inactiveData || []).map((m: InactiveMembershipViewRow) => ({
        clientName: m.client_name,
        status: m.status,
        endDate: m.end_date,
        planName: m.plan_name,
        className: m.class_name
      })),
      recentPayments: (recentPaymentsData || []).map((p: PaymentViewRow) => ({
        clientName: p.client_name,
        totalAmount: Number(p.total_amount),
        paymentMethod: p.payment_method,
        transactionDate: p.transaction_date
      })),
      recentClients: (recentClientsData || []).map((c: ClientViewRow) => ({
        fullName: c.full_name,
        createdAt: c.created_at,
        registrationSource: c.registration_source
      })),
      totalClientsCount: statsData?.total_clients_count || 0,
      totalClassesCount: statsData?.total_classes_count || 0
    }
  } catch (err) {
    console.error('Error fetching overview stats:', err)
    return defaultStats
  }
}
