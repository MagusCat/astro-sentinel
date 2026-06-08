'use client'

import React from 'react'
import { Users, DollarSign, Trophy, AlertCircle, CreditCard, Clock, UserPlus } from 'lucide-react'
import { DashboardListWidget } from '@/components/shared'
import { OverviewStats } from '../types'
import { MEMBERSHIP_STATUS } from '@/lib/constants'

interface DashboardOverviewProps {
  stats: OverviewStats
  operatorName: string
}

export default function DashboardOverview({ stats, operatorName }: DashboardOverviewProps) {
  return (
    <div className="flex flex-col gap-4 w-full h-full flex-1 min-h-0 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-none">
        <div className="bg-card border-l-4 border-l-blue-500 border-y border-r border-border p-4 lg:p-5 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80">
          <div className="flex flex-col justify-between h-full min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Miembros Activos</p>
              <Users className="w-4 h-4 text-blue-500 shrink-0 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.activeMembershipsCount}
            </h3>
            <span className="text-[10px] lg:text-xs text-secondary font-bold mt-1">
              Alumnos con membresía vigente
            </span>
          </div>
        </div>

        <div className="bg-card border-l-4 border-l-purple-500 border-y border-r border-border p-4 lg:p-5 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80">
          <div className="flex flex-col justify-between h-full min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total de Clases</p>
              <Trophy className="w-4 h-4 text-purple-500 shrink-0 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.totalClassesCount}
            </h3>
            <span className="text-[10px] lg:text-xs text-secondary font-bold mt-1">
              Programas registrados
            </span>
          </div>
        </div>

        <div className="bg-card border-l-4 border-l-sky-500 border-y border-r border-border p-4 lg:p-5 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80">
          <div className="flex flex-col justify-between h-full min-h-[80px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Alumnos</p>
              <Users className="w-4 h-4 text-sky-500 shrink-0 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.totalClientsCount}
            </h3>
            <span className="text-[10px] lg:text-xs text-secondary font-bold mt-1">
              Matrícula histórica
            </span>
          </div>
        </div>
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
                <span className="text-xs lg:text-sm font-semibold text-foreground">{membership.clientName}</span>
                <span className="text-[10px] text-muted-foreground/75 font-semibold">
                  {membership.className} • {membership.planName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] lg:text-xs font-mono text-muted-foreground">
                  {membership.endDate ? new Date(membership.endDate).toLocaleDateString('es-ES') : 'N/A'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  membership.status === MEMBERSHIP_STATUS.EXPIRED 
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                    : membership.status === MEMBERSHIP_STATUS.CANCELLED
                      ? 'bg-red-500/10 text-red-600 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {membership.status === MEMBERSHIP_STATUS.EXPIRED 
                    ? 'Vencida' 
                    : membership.status === MEMBERSHIP_STATUS.CANCELLED
                      ? 'Cancelada'
                      : 'Congelada'}
                </span>
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
                  <span className="text-xs lg:text-sm font-semibold text-foreground truncate max-w-[150px]">{payment.clientName}</span>
                  <span className="text-sm font-bold font-mono text-emerald-600">${payment.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] lg:text-xs text-muted-foreground capitalize">{payment.paymentMethod}</span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground font-mono">{new Date(payment.transactionDate).toLocaleDateString('es-ES')}</span>
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
                  <span className="text-xs lg:text-sm font-semibold text-foreground truncate">{client.fullName}</span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground capitalize truncate">{client.registrationSource || 'Directo'}</span>
                </div>
                <span className="text-[10px] lg:text-xs text-muted-foreground font-mono whitespace-nowrap shrink-0">{new Date(client.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}
