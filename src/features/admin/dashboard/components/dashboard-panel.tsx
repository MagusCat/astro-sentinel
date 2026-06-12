'use client'

import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { AuthenticatedUser } from '@/features/auth/types'
import { useDashboardData } from '../hooks/use-dashboard-data'
import { Button } from '@/components/shared'
import { WarningAlert, ProgressBar } from '@/components/shared'
import { Roles } from '@/lib/auth/roles'

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
}

export default function DashboardPanel({ activeUser }: DashboardPanelProps) {
  const searchParams = useSearchParams()

  const rawTab = searchParams.get('tab')
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
    : 'overview'

  const { clients, plans, classes, payments, stats, membershipsData, loadingData, fetchDatabaseData } = useDashboardData()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [childLoading, setChildLoading] = useState(false)
  const isGlobalLoading = loadingData || childLoading

  useEffect(() => {
    fetchDatabaseData(activeTab)
  }, [activeTab, fetchDatabaseData])

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'clients':
        return { title: 'Control de Clientes' }
      case 'plans':
        return { title: 'Gestión de Clases y  Planes' }
      case 'payments':
        return { title: 'Historial de Pagos' }
      case 'admin_users':
        return { title: 'Gestión de Personal' }
      case 'developer':
        return { title: 'Auditoría' }
      case 'reception':
        return { title: 'Recepción' }
      case 'checkout':
        return { title: 'Registro de Pagos' }
      case 'memberships':
        return { title: 'Control de Membresías' }
      case 'overview':
        return { title: 'Administración' }
      default:
        return { title: '' }
    }
  }

  const { title } = getHeaderInfo()

  const hasAdminAccess = Roles.canManageStaff(activeUser.role)
  const hasDevAccess = Roles.canAccessDeveloper(activeUser.role)

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
