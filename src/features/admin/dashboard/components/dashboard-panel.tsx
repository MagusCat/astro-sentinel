'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { useDashboardData, InitialDashboardData } from '../hooks/use-dashboard-data'
import { Button } from '@/components/shared/form/button'
import { WarningAlert } from '@/components/shared/feedback/warning-alert'
import { ProgressBar } from '@/components/shared/feedback/progress-bar'
import { AuthGuard } from '@/lib/auth/guard'
import { useTabSync } from '@/hooks/use-tab-sync'

import DashboardOverview from './dashboard-overview'
import ClientRegistry from '@/features/admin/clients/components/client-registry'
import ClassPlans from '@/features/admin/classes/components/class-plans'
import PaymentsLog from '@/features/admin/payments/components/payments-log'
import UserManagement from '@/features/admin/staff/components/user-management'
import DeveloperPanel from '@/features/admin/developer/components/developer-panel'
import CheckoutPanel from '@/features/admin/checkout/components/checkout-panel'
import ReceptionPanel from '@/features/admin/reception/components/reception-panel'
import MembershipsPanel from '@/features/admin/memberships/components/memberships-panel'

interface DashboardPanelProps {
  activeUser: AuthenticatedUser
  initialData?: InitialDashboardData
}

type DashboardTab = 
  | 'overview' 
  | 'clients' 
  | 'plans' 
  | 'payments' 
  | 'admin_users' 
  | 'developer' 
  | 'reception' 
  | 'checkout' 
  | 'memberships'

const VALID_TABS: DashboardTab[] = [
  'overview', 'clients', 'plans', 'payments', 'admin_users', 'developer', 'reception', 'checkout', 'memberships'
]

export default function DashboardPanel({ activeUser, initialData }: DashboardPanelProps) {
  const isReception = activeUser.role === 'reception'
  const defaultTab: DashboardTab = isReception ? 'reception' : 'overview'

  const { activeTab } = useTabSync<DashboardTab>('tab', defaultTab, VALID_TABS)

  const { clients, plans, classes, payments, stats, membershipsData, loadingData, fetchDatabaseData } = useDashboardData(initialData)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [childLoading, setChildLoading] = useState(false)
  const isGlobalLoading = loadingData || childLoading

  useEffect(() => {
    const hasInitialDataForTab = (
      (activeTab === 'overview' && initialData?.stats) ||
      (activeTab === 'clients' && initialData?.clients?.length) ||
      (activeTab === 'plans' && initialData?.plans?.length) ||
      (activeTab === 'checkout' && initialData?.classes?.length) ||
      (activeTab === 'payments' && initialData?.payments?.length) ||
      (activeTab === 'memberships' && initialData?.membershipsData) ||
      (activeTab === 'reception' && initialData?.stats)
    )

    if (!hasInitialDataForTab) {
      fetchDatabaseData(activeTab)
    }
  }, [activeTab, fetchDatabaseData, initialData])

  const title = useMemo(() => {
    const labels: Record<DashboardTab, string> = {
      clients: 'Control de Clientes',
      plans: 'Gestión de Clases y Planes',
      payments: 'Historial de Pagos',
      admin_users: 'Gestión de Personal',
      developer: 'Auditoría',
      reception: 'Recepción',
      checkout: 'Registro de Pagos',
      memberships: 'Control de Membresías',
      overview: 'Administración'
    }
    return labels[activeTab]
  }, [activeTab])

  const hasAdminAccess = AuthGuard.canManageStaff(activeUser.role)
  const hasDevAccess = AuthGuard.canAccessDeveloper(activeUser.role)


  const renderAccessDenied = () => (
    <WarningAlert
      title="Acceso Restringido"
      message="Tu operador de terminal actual no cuenta con las credenciales de seguridad requeridas para auditar esta sección."
      variant="error"
    />
  )

  return (
    <div className="flex flex-col gap-4 w-full h-full flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border/10 pb-4 w-full flex-none">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {title}
          </h1>
        </div>

        <Button
          variant="neutral"
          size="icon"
          onClick={() => {
            fetchDatabaseData(activeTab)
            setRefreshTrigger(prev => prev + 1)
          }}
          disabled={isGlobalLoading}
          title="Sincronizar Base de Datos"
        >
          <RefreshCw className={`w-4 h-4 ${isGlobalLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ProgressBar indeterminate={isGlobalLoading} className="-mt-3 mb-1 flex-none" />

      <div
        key={activeTab}
        className="w-full flex-1 min-h-0 flex flex-col animate-fade-in-up"
      >
        {activeTab === 'overview' && (
          <DashboardOverview
            stats={stats}
          />
        )}

        {activeTab === 'reception' && (
          <ReceptionPanel stats={stats} />
        )}

        {activeTab === 'checkout' && (
          <CheckoutPanel
            classes={classes}
            plans={plans}
            clients={clients}
            activeUser={activeUser}
            onReload={() => fetchDatabaseData('checkout')}
          />
        )}

        {activeTab === 'memberships' && (
          <MembershipsPanel 
            data={membershipsData}
            isLoading={loadingData}
            onReload={() => fetchDatabaseData('memberships')}
          />
        )}

        {activeTab === 'clients' && (
          <ClientRegistry 
            clients={clients} 
            activeUser={activeUser}
            onReload={() => fetchDatabaseData('clients')}
            refreshTrigger={refreshTrigger}
            setLoading={setChildLoading}
          />
        )}

        {activeTab === 'plans' && (
          <ClassPlans plans={plans} classes={classes} onReload={() => fetchDatabaseData('plans')} isLoading={isGlobalLoading} />
        )}
        
        {activeTab === 'payments' && (
          <PaymentsLog payments={payments} refreshTrigger={refreshTrigger} setLoading={setChildLoading} />
        )}

        {activeTab === 'admin_users' && (
          hasAdminAccess ? (
            <UserManagement activeUser={activeUser} refreshTrigger={refreshTrigger} setLoading={setChildLoading} />
          ) : (
            renderAccessDenied()
          )
        )}

        {activeTab === 'developer' && (
          hasDevAccess ? (
            <DeveloperPanel refreshTrigger={refreshTrigger} setLoading={setChildLoading} />
          ) : (
            renderAccessDenied()
          )
        )}
      </div>
    </div>
  )
}
