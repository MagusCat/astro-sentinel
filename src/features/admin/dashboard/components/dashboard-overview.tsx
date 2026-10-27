'use client'

import React from 'react'
import { Users, Trophy, CreditCard, Clock, TrendingUp, Package } from 'lucide-react'
import { DashboardListWidget, InventoryHealthBar, MetricCard, PriceDisplay, Sparkline } from '@/components/shared';

import { OverviewStats, DashboardSnapshots } from '../types'

interface DashboardOverviewProps {
  stats: OverviewStats
  snapshots: DashboardSnapshots | null
}

export default function DashboardOverview({ stats, snapshots }: DashboardOverviewProps) {
  return (
    <div className="flex flex-col gap-8 pb-10 w-full max-w-full min-w-0">
      
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Membresías Activas"
          value={stats.activeMembershipsCount}
          icon={Users}
          description="Total de alumnos vigentes"
          trend={snapshots ? (
            <div className="mt-4 border-t border-border/10 pt-4">
              <Sparkline data={snapshots.membershipLifecycle.signups} color="var(--primary)" />
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-2 tracking-tighter">Tendencia de ingresos</p>
            </div>
          ) : undefined}
        />
        
        <MetricCard
          title="Ingresos Hoy"
          value={<PriceDisplay amount={stats.dailyRevenue} variant="neutral" className="text-lg" />}
          icon={CreditCard}
          description="Ventas brutas del día actual"
          trend={snapshots ? (
            <div className="mt-4 border-t border-border/10 pt-4">
              <Sparkline data={snapshots.revenueTrend} color="var(--primary)" />
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-2 tracking-tighter">Frecuencia de pagos</p>
            </div>
          ) : undefined}
        />

        <MetricCard
          title="Clase Líder"
          value={stats.topClass}
          icon={Trophy}
          description="Disciplina con mayor asistencia"
          variant="highlight"
        />

        <MetricCard
          title="Salud de Tienda"
          value={snapshots?.inventoryHealth.healthy ?? 0}
          icon={Package}
          description="Productos con stock óptimo"
          trend={snapshots ? (
            <div className="mt-4 border-t border-border/10 pt-4">
              <InventoryHealthBar {...snapshots.inventoryHealth} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-2 tracking-tighter">Estado global de stock</p>
            </div>
          ) : undefined}
        />
      </div>

      {/* Secondary Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Activity */}
        <div className="space-y-6">
          <DashboardListWidget
            title="Últimos Pagos"
            description="Transacciones procesadas recientemente"
            icon={CreditCard}
            items={stats.recentPayments}
            renderItem={(payment, idx) => (
              <div key={`pay-${idx}`} className="flex justify-between items-center w-full group">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{payment.clientName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{payment.paymentMethod}</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <PriceDisplay amount={payment.totalAmount} variant="badge" className="text-sm" />
                  <span className="text-[10px] font-mono text-muted-foreground">{new Date(payment.transactionDate).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            )}
          />

          <DashboardListWidget
            title="Próximos Vencimientos"
            description="Clientes cuyas membresías expiran pronto"
            icon={Clock}
            items={stats.inactiveMemberships}
            renderItem={(membership, idx) => (
              <div key={`exp-${idx}`} className="flex justify-between items-center w-full">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-bold text-foreground truncate">{membership.clientName}</span>
                  <span className="text-xs text-muted-foreground truncate">{membership.className} — {membership.planName}</span>
                </div>
                <span className="text-sm font-mono font-bold text-rose-500 uppercase shrink-0">{membership.status}</span>
              </div>
            )}
          />
        </div>

        {/* Global Performance */}
        <div className="space-y-6">
          <DashboardListWidget
            title="Ranking de Disciplinas"
            description="Alumnos activos por categoría"
            icon={TrendingUp}
            items={stats.classHeadcounts}
            renderItem={(headcount, idx) => (
              <div key={`head-${idx}`} className="flex flex-col w-full gap-2 py-1">
                <div className="flex justify-between items-end gap-2">
                  <span className="font-bold text-sm text-foreground uppercase tracking-tight truncate min-w-0">{headcount.className}</span>
                  <span className="font-mono font-black text-primary shrink-0">{headcount.activeStudents}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" 
                    style={{ width: `${Math.min((headcount.activeStudents / (stats.activeMembershipsCount || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          />
        </div>

      </div>
    </div>
  )
}
