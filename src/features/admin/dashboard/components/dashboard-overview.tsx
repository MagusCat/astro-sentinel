'use client'

import React from 'react'
import { Users, Trophy, CreditCard, Clock, UserPlus } from 'lucide-react'
import { DashboardListWidget, MetricCard, StatusBadge, PriceDisplay } from '@/components/shared'
import { OverviewStats } from '../types'
import { MEMBERSHIP_STATUS } from '@/lib/config'

interface DashboardOverviewProps {
  stats: OverviewStats
}

export default function DashboardOverview({ stats }: DashboardOverviewProps) {
  return (
    <div className="flex flex-col gap-4 w-full h-full flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 pb-2 w-full max-w-full min-w-0">
        <MetricCard
          title="Miembros Activos"
          value={stats.activeMembershipsCount}
          description="Alumnos con membresía vigente"
          icon={Users}
          color="blue"
        />

        <MetricCard
          title="Total Clases"
          value={stats.totalClassesCount}
          description="Programas registrados"
          icon={Trophy}
          color="purple"
        />

        <MetricCard
          title="Total Alumnos"
          value={stats.totalClientsCount}
          description="Matrícula histórica"
          icon={Users}
          color="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <DashboardListWidget
          className="lg:col-span-2"
          title="Membresías Inactivas"
          description="Usuarios con membresías vencidas, congeladas o canceladas"
          icon={Clock}
          iconColorClass="text-rose-500"
          items={stats.inactiveMemberships}
          emptyMessage="No hay membresías inactivas registradas."
          renderItem={(membership, idx) => (
            <div key={idx} className="flex justify-between items-center p-2.5 border border-border rounded-xl bg-muted/20 hover:bg-muted/40 hover:shadow-sm transition-all duration-200">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{membership.clientName}</span>
                <span className="text-sm text-muted-foreground/75 font-semibold">
                  {membership.className} • {membership.planName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">
                  {membership.endDate ? new Date(membership.endDate).toLocaleDateString('es-ES') : 'N/A'}
                </span>
                <StatusBadge status={membership.status} />
              </div>
            </div>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2 min-h-0">
          <DashboardListWidget
            title="Últimos Pagos"
            icon={CreditCard}
            iconColorClass="text-emerald-500"
            items={stats.recentPayments}
            renderItem={(payment, idx) => (
              <div key={idx} className="flex flex-col gap-1 p-2.5 lg:p-3 border border-border rounded-xl bg-muted/20 hover:bg-muted/40 hover:shadow-sm transition-all duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">{payment.clientName}</span>
                  <PriceDisplay amount={payment.totalAmount} variant="badge" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground capitalize">{payment.paymentMethod}</span>
                  <span className="text-sm text-muted-foreground font-mono">{new Date(payment.transactionDate).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            )}
          />

          <DashboardListWidget
            title="Nuevos Clientes"
            icon={UserPlus}
            iconColorClass="text-indigo-500"
            items={stats.recentClients}
            renderItem={(client, idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 lg:p-3 border border-border rounded-xl bg-muted/20 hover:bg-muted/40 hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                  <span className="text-sm font-semibold text-foreground truncate">{client.fullName}</span>
                  <span className="text-sm text-muted-foreground capitalize truncate">{client.registrationSource || 'Directo'}</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono whitespace-nowrap shrink-0">{new Date(client.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}
