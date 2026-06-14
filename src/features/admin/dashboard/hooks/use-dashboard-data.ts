import { useState, useCallback } from 'react'
import { getOverviewStats } from '../actions'
import { getClients } from '@/features/admin/clients/queries'
import { getClassPlans, getClassesList } from '@/features/admin/classes/queries'
import { getPayments } from '@/features/admin/payments/queries'
import { getMembershipsPanelData } from '@/features/admin/memberships/queries'
import { ClientData } from '@/features/admin/clients/types'
import { PlanData, ClassData } from '@/features/admin/classes/types'
import { PaymentData } from '@/features/admin/payments/types'
import { OverviewStats } from '../types'
import { MembershipsPanelData } from '@/features/admin/memberships/types'

export function useDashboardData() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [plans, setPlans] = useState<PlanData[]>([])
  const [classes, setClasses] = useState<ClassData[]>([])
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [membershipsData, setMembershipsData] = useState<MembershipsPanelData | null>(null)
  const [stats, setStats] = useState<OverviewStats>({
    activeMembershipsCount: 0,
    dailyRevenue: 0,
    topClass: 'Sin sesiones activas',
    classHeadcounts: [],
    inactiveMemberships: [],
    recentPayments: [],
    recentClients: [],
    totalClientsCount: 0,
    totalClassesCount: 0
  })
  const [loadingData, setLoadingData] = useState(false)

  const fetchDatabaseData = useCallback(async (tab?: string) => {
    setLoadingData(true)
    try {
      if (!tab || tab === 'overview' || tab === 'reception') {
        const statsData = await getOverviewStats()
        setStats(statsData)
      }
      
      if (!tab || tab === 'clients') {
        const clientsData = await getClients({ page: 1, limit: 15 })
        setClients(clientsData.data)
      }
      
      if (!tab || tab === 'plans' || tab === 'checkout') {
        const [plansData, classesRes] = await Promise.all([
          getClassPlans(),
          getClassesList()
        ])
        setPlans(plansData)
        if (classesRes.success && classesRes.classes) {
          setClasses(classesRes.classes)
        }
      }

      if (tab === 'payments') {
        const paymentsData = await getPayments()
        setPayments(paymentsData.data)
      }

      if (tab === 'memberships' || !tab || tab === 'reception') {
        const data = await getMembershipsPanelData()
        setMembershipsData(data)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  return { clients, plans, classes, payments, stats, membershipsData, loadingData, fetchDatabaseData }
}
