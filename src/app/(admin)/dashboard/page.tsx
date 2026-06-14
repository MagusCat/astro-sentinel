import React from 'react'
import { getCurrentUser } from '@/features/auth/actions'
import DashboardPanel from '@/features/admin/dashboard/components/dashboard-panel'
import { redirect } from 'next/navigation'


// Data Fetching imports
import { getOverviewStats } from '@/features/admin/dashboard/actions'
import { getClients } from '@/features/admin/clients/queries'
import { getClassPlans, getClassesList } from '@/features/admin/classes/queries'
import { getPayments } from '@/features/admin/payments/queries'
import { getMembershipsPanelData } from '@/features/admin/memberships/queries'
import { InitialDashboardData } from '@/features/admin/dashboard/hooks/use-dashboard-data'

/**
 * Dashboard Page — Server Component (Next.js 15)
 *
 * Pre-fetches the initial data based on the active tab before rendering
 * the interactive DashboardPanel. This eliminates the client-side
 * "waterfall" and ensures immediate visibility of content.
 */
export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const activeUser = await getCurrentUser()

  if (!activeUser) {
    redirect('/login')
  }

  const rawTab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined
  const isReception = activeUser.role === 'reception'
  const activeTab = (
    rawTab === 'overview' ||
    rawTab === 'clients' ||
    rawTab === 'plans' ||
    rawTab === 'payments' ||
    rawTab === 'admin_users' ||
    rawTab === 'developer' ||
    rawTab === 'reception' ||
    rawTab === 'checkout' ||
    rawTab === 'memberships'
  )
    ? rawTab
    : (isReception ? 'reception' : 'overview')

  // Pre-fetch data based on active tab
  const initialData: InitialDashboardData = {}

  try {
    if (activeTab === 'overview' || activeTab === 'reception') {
      initialData.stats = await getOverviewStats()
    } else if (activeTab === 'clients') {
      const clientsData = await getClients({ page: 1, limit: 15 })
      initialData.clients = clientsData.data
    } else if (activeTab === 'plans' || activeTab === 'checkout') {
      const [plansData, classesRes] = await Promise.all([
        getClassPlans(),
        getClassesList()
      ])
      initialData.plans = plansData
      if (classesRes.success && classesRes.classes) {
        initialData.classes = classesRes.classes
      }
    } else if (activeTab === 'payments') {
      const paymentsData = await getPayments()
      initialData.payments = paymentsData.data
    } else if (activeTab === 'memberships') {
      initialData.membershipsData = await getMembershipsPanelData()
    }
  } catch (err) {
    console.error('[DashboardPage] Pre-fetching failed:', err)
    // Fallback: DashboardPanel will fetch client-side if initialData is missing
  }

  return (
    <DashboardPanel 
      activeUser={activeUser} 
      initialData={initialData} 
    />
  )
}
