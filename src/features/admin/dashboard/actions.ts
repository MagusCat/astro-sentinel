'use server'

import { unstable_cache } from 'next/cache'
import { requireRole } from '@/lib/auth/guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { toMinor, fromMinor } from '@/lib/format'
import { OverviewStats, ClassHeadcountRow, InactiveMembershipViewRow, PaymentViewRow, ClientViewRow, DashboardSnapshots } from './types'
import { APP_CONFIG } from '@/lib/config'
import { DASHBOARD_CACHE_TAG } from './cache'
import { toLocalDate } from '@/lib/dates'

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

/**
 * Fetch cacheado de las métricas del overview (datos globales de la academia,
 * no por usuario). La autorización va FUERA (en getOverviewStats): el cache
 * guarda los datos, no el permiso. Usa el cliente service role (sin cookies),
 * requisito de unstable_cache. Se revalida cada 30s o al invalidar el tag
 * 'dashboard' tras un cobro/venta.
 */
const fetchOverviewStats = unstable_cache(
  async (): Promise<OverviewStats> => {
    const supabase = createAdminClient()

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
        .select('full_name, created_at')
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
      activeMembershipsCount: statsData?.active_members_count || 0,
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
        createdAt: c.created_at
      })),
      totalClientsCount: statsData?.total_clients_count || 0,
      totalClassesCount: statsData?.total_classes_count || 0
    }
  },
  ['dashboard-overview-stats'],
  { revalidate: 30, tags: [DASHBOARD_CACHE_TAG] }
)

export async function getOverviewStats(): Promise<OverviewStats> {
  try {
    // Autoriza en cada petición; el cache guarda los datos globales, no el permiso.
    await requireRole()
    return await fetchOverviewStats()
  } catch (err) {
    console.error('Error fetching overview stats:', err)
    return defaultStats
  }
}

export async function getDashboardSnapshots(): Promise<DashboardSnapshots> {
  try {
    const { supabase } = await requireRole()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

    const [paymentsRes, inventoryRes, membershipRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount_base, transaction_date')
        .is('voided_at', null)
        .gte('transaction_date', thirtyDaysAgoStr)
        .order('transaction_date', { ascending: true }),
      supabase
        .from('inventory')
        .select('current_stock'),
      supabase
        .from('memberships')
        .select('created_at, end_date')
        .or(`created_at.gte.${thirtyDaysAgoStr},end_date.gte.${thirtyDaysAgoStr}`)
    ])

    // 1. Process Revenue Trend
    const dailyRevenue: Record<string, number> = {}
    paymentsRes.data?.forEach(p => {
      const day = toLocalDate(p.transaction_date)
      // Acumular en unidades mínimas enteras (sin deriva de coma flotante).
      dailyRevenue[day] = (dailyRevenue[day] || 0) + toMinor(p.amount_base)
    })
    const revenueTrend = Object.values(dailyRevenue).map(fromMinor)

    // 2. Process Inventory Health
    const stocks = inventoryRes.data || []
    const health = {
      healthy: stocks.filter(s => s.current_stock > 10).length,
      low: stocks.filter(s => s.current_stock <= 10 && s.current_stock > 0).length,
      outOfStock: stocks.filter(s => s.current_stock <= 0).length,
      total: stocks.length
    }

    // 3. Process Membership Lifecycle
    const dailySignups: Record<string, number> = {}
    const dailyExpirations: Record<string, number> = {}
    
    membershipRes.data?.forEach(m => {
      const signupDay = m.created_at.split('T')[0]
      const expiryDay = m.end_date
      
      if (signupDay >= thirtyDaysAgoStr.split('T')[0]) {
        dailySignups[signupDay] = (dailySignups[signupDay] || 0) + 1
      }
      if (expiryDay >= thirtyDaysAgoStr.split('T')[0]) {
        dailyExpirations[expiryDay] = (dailyExpirations[expiryDay] || 0) + 1
      }
    })

    // 4. Alerts
    const expiringSoonCount = membershipRes.data?.filter(m => {
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      return new Date(m.end_date) <= threeDaysFromNow && new Date(m.end_date) >= new Date()
    }).length || 0

    return {
      revenueTrend: revenueTrend.length > 0 ? revenueTrend : [0, 0],
      inventoryHealth: health,
      membershipLifecycle: {
        signups: Object.values(dailySignups),
        expirations: Object.values(dailyExpirations)
      },
      alerts: {
        lowStockCount: health.low + health.outOfStock,
        expiringSoonCount
      }
    }
  } catch (err) {
    console.error('Error fetching dashboard snapshots:', err)
    return {
      revenueTrend: [0, 0],
      inventoryHealth: { healthy: 0, low: 0, outOfStock: 0, total: 0 },
      membershipLifecycle: { signups: [0, 0], expirations: [0, 0] },
      alerts: { lowStockCount: 0, expiringSoonCount: 0 }
    }
  }
}
