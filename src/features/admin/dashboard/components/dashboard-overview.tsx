'use client'

import React from 'react'
import { Users, Trophy, CreditCard, Clock, UserPlus } from 'lucide-react'
import { DashboardListWidget } from '@/components/shared/data-display/dashboard-list-widget'
import { MetricCard } from '@/components/shared/data-display/metric-card'
import { StatusBadge } from '@/components/shared/data-display/status-badge'
import { PriceDisplay } from '@/components/shared/data-display/price-display'
import { OverviewStats } from '../types'

interface DashboardOverviewProps {
  stats: OverviewStats
}

export default function DashboardOverview({ stats }: DashboardOverviewProps) {
  return (
    <div className="flex flex-col gap-8 w-full h-full flex-1 min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-[var(--ease-haptic)]">
      
      {/* Metrics Grid — Robust 2-column layout for Mobile/Tablet, 4 for Desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 w-full">

        <MetricCard
          title="Miembros Activos"
          value={stats.activeMembershipsCount}
          description="Suscripciones vigentes"
          icon={Users}
          color="blue"
        />

        <MetricCard
          title="Ingresos del Día"
          value={`$${stats.dailyRevenue}`}
          description="Caja diaria estimada"
          icon={CreditCard}
          color="emerald"
        />

        <MetricCard
          title="Total Clases"
          value={stats.totalClassesCount}
          description="Disciplinas activas"
          icon={Trophy}
          color="purple"
        />

        <MetricCard
          title="Total Alumnos"
          value={stats.totalClientsCount}
          description="Registro histórico"
          icon={Users}
          color="sky"
        />
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <DashboardListWidget
          className="lg:col-span-2"
          title="Membresías Inactivas"
          description="Atención requerida: usuarios con estados irregulares"
          icon={Clock}
          iconColorClass="text-rose-500"
          items={stats.inactiveMemberships}
          emptyMessage="No hay membresías inactivas registradas."
          renderItem={(membership, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 border border-border/60 rounded-xl bg-card hover:bg-muted/30 hover:shadow-sm transition-all duration-500 ease-[var(--ease-haptic)]">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{membership.clientName}</span>
                <span className="text-xs text-muted-foreground/90 font-medium">
                  {membership.className} • {membership.planName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-tight">
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
