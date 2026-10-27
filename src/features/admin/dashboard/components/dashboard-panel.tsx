'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { openCommandPalette } from './command-palette'
import { AuthenticatedUser } from '@/features/auth/types'
import { useDashboardData, InitialDashboardData } from '../hooks/use-dashboard-data'
import { Button, ProgressBar, WarningAlert } from '@/components/shared';

import { Roles } from '@/lib/auth/roles'
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
import InventoryPanel from '@/features/admin/products/components/inventory-panel'
import ProductCheckoutPanel from '@/features/admin/products/components/product-checkout-panel'
import SalesReports from './sales-reports'
import CashClosing from './cash-closing'
import CurrencySettings from '@/features/admin/settings/components/currency-settings'
import AttendancePanel from '@/features/admin/attendance/components/attendance-panel'
import SchedulePanel from '@/features/admin/schedule/components/schedule-panel'

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
  | 'inventory'
  | 'store'
  | 'reports'
  | 'settings'
  | 'attendance'
  | 'schedule'

const VALID_TABS: DashboardTab[] = [
  'overview', 'clients', 'plans', 'payments', 'admin_users', 'developer', 'reception', 'checkout', 'memberships', 'inventory', 'store', 'reports', 'settings', 'attendance', 'schedule'
]

export default function DashboardPanel({ activeUser, initialData }: DashboardPanelProps) {
  const isReception = Roles.isReception(activeUser.role)
  const defaultTab: DashboardTab = isReception ? 'reception' : 'overview'

  const { activeTab } = useTabSync<DashboardTab>('tab', defaultTab, VALID_TABS)

  const { clients, plans, classes, payments, products, snapshots, stats, membershipsData, loadingData, fetchDatabaseData } = useDashboardData(initialData)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [childLoading, setChildLoading] = useState(false)
  const isGlobalLoading = loadingData || childLoading

  const initialFetchDone = useRef(false)

  useEffect(() => {
    // El tab inicial ya viene sembrado por el prefetch del servidor (initialData):
    // se evita SOLO su primer refetch. Cualquier cambio de tab posterior recarga
    // sus datos desde el servidor. El estado local (no initialData) es la fuente de
    // verdad de lo que se pinta, así que si no recargamos aquí, la sección queda en
    // blanco hasta un refresh manual — que es justo el bug que esto corrige.
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      const seeded = Boolean(
        ((activeTab === 'overview' || activeTab === 'reception') && initialData?.stats) ||
        (activeTab === 'clients' && initialData?.clients) ||
        (activeTab === 'plans' && initialData?.plans) ||
        ((activeTab === 'checkout' || activeTab === 'attendance' || activeTab === 'schedule') && initialData?.classes) ||
        (activeTab === 'payments' && initialData?.payments) ||
        (activeTab === 'memberships' && initialData?.membershipsData)
      )
      if (seeded) return
    }
    fetchDatabaseData(activeTab)
    // fetchDatabaseData es estable (useCallback); initialData solo importa en el
    // primer render, capturado arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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
      overview: 'Administración',
      inventory: 'Inventario de Tienda',
      store: 'Punto de Venta',
      reports: 'Informes y Cierre de Caja',
      settings: 'Moneda y Tasas',
      attendance: 'Asistencia',
      schedule: 'Horarios y Profesores'
    }
    return labels[activeTab]
  }, [activeTab])

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
    <div className="flex flex-col gap-4 w-full h-full flex-1">
      <div className="flex items-center justify-between gap-4 border-b border-border/10 pb-4 w-full flex-none px-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
        <Button variant="neutral" onClick={openCommandPalette} className="hidden md:inline-flex gap-2" title="Buscar (Ctrl+K)">
          <Search className="w-4 h-4" />
          <span className="text-muted-foreground">Buscar</span>
          <kbd className="hidden lg:inline text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">Ctrl K</kbd>
        </Button>
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
      </div>

      <ProgressBar indeterminate={isGlobalLoading} className="-mt-3 mb-1 flex-none" />

      <div
        key={activeTab}
        className="w-full flex-1 flex flex-col animate-fade-in-up"
      >

        {activeTab === 'overview' && (
          <DashboardOverview
            stats={stats}
            snapshots={snapshots}
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

        {activeTab === 'store' && (
          <ProductCheckoutPanel
            products={products}
            activeUser={activeUser}
            onReload={() => fetchDatabaseData('store')}
          />
        )}

        {activeTab === 'reports' && (
          <div className="flex flex-col gap-6">
            <CashClosing />
            <SalesReports snapshots={snapshots} />
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryPanel
            products={products}
            alerts={snapshots?.alerts}
            onReload={() => fetchDatabaseData('inventory')}
          />
        )}

        {activeTab === 'memberships' && (
          <MembershipsPanel 
            data={membershipsData}
            isLoading={loadingData}
            alerts={snapshots?.alerts}
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
          <PaymentsLog payments={payments} refreshTrigger={refreshTrigger} setLoading={setChildLoading} canManage={hasAdminAccess} />
        )}

        {activeTab === 'admin_users' && (
          hasAdminAccess ? (
            <UserManagement activeUser={activeUser} refreshTrigger={refreshTrigger} setLoading={setChildLoading} />
          ) : (
            renderAccessDenied()
          )
        )}

        {activeTab === 'attendance' && (
          <AttendancePanel classes={classes} canManage={hasAdminAccess} refreshTrigger={refreshTrigger} setLoading={setChildLoading} />
        )}

        {activeTab === 'schedule' && (
          hasAdminAccess ? (
            <SchedulePanel classes={classes} refreshTrigger={refreshTrigger} setLoading={setChildLoading} />
          ) : (
            renderAccessDenied()
          )
        )}

        {activeTab === 'settings' && (
          hasAdminAccess ? (
            <CurrencySettings activeUser={activeUser} />
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
