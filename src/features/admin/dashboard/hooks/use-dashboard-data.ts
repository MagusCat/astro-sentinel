import { useState, useCallback } from 'react'
import { getOverviewStats, getDashboardSnapshots } from '../actions'
import { getClients } from '@/features/admin/clients/queries'
import { getClassPlans, getClassesList } from '@/features/admin/classes/queries'
import { getPayments } from '@/features/admin/payments/queries'
import { getMembershipsPanelData } from '@/features/admin/memberships/queries'
import { getProducts } from '@/features/admin/products/queries'
import { ClientData } from '@/features/admin/clients/types'
import { PlanData, ClassData } from '@/features/admin/classes/types'
import { PaymentData } from '@/features/admin/payments/types'
import { ProductWithInventory } from '@/features/admin/products/types'
import { OverviewStats, DashboardSnapshots } from '../types'
import { MembershipsPanelData } from '@/features/admin/memberships/types'

export interface InitialDashboardData {
  stats?: OverviewStats
  clients?: ClientData[]
  plans?: PlanData[]
  classes?: ClassData[]
  payments?: PaymentData[]
  membershipsData?: MembershipsPanelData
  products?: ProductWithInventory[]
  snapshots?: DashboardSnapshots
}

export function useDashboardData(initialData?: InitialDashboardData) {
  const [clients, setClients] = useState<ClientData[]>(initialData?.clients || [])
  const [plans, setPlans] = useState<PlanData[]>(initialData?.plans || [])
  const [classes, setClasses] = useState<ClassData[]>(initialData?.classes || [])
  const [payments, setPayments] = useState<PaymentData[]>(initialData?.payments || [])
  const [products, setProducts] = useState<ProductWithInventory[]>(initialData?.products || [])
  const [snapshots, setSnapshots] = useState<DashboardSnapshots | null>(initialData?.snapshots || null)
  const [membershipsData, setMembershipsData] = useState<MembershipsPanelData | null>(initialData?.membershipsData || null)
  const [stats, setStats] = useState<OverviewStats>(initialData?.stats || {
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
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchDatabaseData = useCallback(async (tab?: string) => {
    setLoadingData(true)
    setFetchError(null)
    try {
      if (!tab || tab === 'overview' || tab === 'reception' || tab === 'reports') {
        const [statsData, snapshotData] = await Promise.all([
          getOverviewStats(),
          getDashboardSnapshots()
        ])
        setStats(statsData)
        setSnapshots(snapshotData)
      }
      
      if (!tab || tab === 'clients') {
        const clientsData = await getClients({ page: 1, limit: 15 })
        setClients(clientsData.data)
      }
      
      if (!tab || tab === 'plans' || tab === 'checkout' || tab === 'attendance' || tab === 'schedule') {
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

      if (tab === 'inventory' || tab === 'store' || !tab) {
        const productsData = await getProducts({ page: 1, limit: 100 })
        setProducts(productsData.data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los datos del panel.'
      console.error('Failed to load dashboard data:', err)
      setFetchError(message)
    } finally {
      setLoadingData(false)
    }
  }, [])

  return {
    clients,
    plans,
    classes,
    payments,
    products,
    snapshots,
    stats,
    membershipsData,
    loadingData,
    fetchError,
    retry: (tab?: string) => fetchDatabaseData(tab),
    clearFetchError: () => setFetchError(null),
    fetchDatabaseData
  }
}
