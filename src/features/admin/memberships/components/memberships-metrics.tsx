import React from 'react'
import { Users, AlertTriangle, Pause } from 'lucide-react'
import { MembershipsPanelData } from '../types'

interface MembershipsMetricsProps {
  metrics: MembershipsPanelData['metrics']
}

export default function MembershipsMetrics({ metrics }: MembershipsMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-none">
      <div className="bg-card border-l-4 border-l-blue-500 border-y border-r border-border p-5 lg:p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80">
        <div className="flex flex-col justify-between h-full min-h-[80px]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Activas Total</p>
            <Users className="w-5 h-5 text-blue-500 shrink-0 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
            {metrics.totalActive}
          </h3>
          <span className="text-xs text-secondary font-bold mt-1">
            Membresías vigentes
          </span>
        </div>
      </div>

      <div className="bg-card border-l-4 border-l-amber-500 border-y border-r border-border p-5 lg:p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80">
        <div className="flex flex-col justify-between h-full min-h-[80px]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Por Vencer</p>
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
            {metrics.expiringSoon}
          </h3>
          <span className="text-xs text-secondary font-bold mt-1">
            Próximos 7 días
          </span>
        </div>
      </div>

      <div className="bg-card border-l-4 border-l-cyan-500 border-y border-r border-border p-5 lg:p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80">
        <div className="flex flex-col justify-between h-full min-h-[80px]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Pausadas</p>
            <Pause className="w-5 h-5 text-cyan-500 shrink-0 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
            {metrics.frozen}
          </h3>
          <span className="text-xs text-secondary font-bold mt-1">
            Pausadas temporalmente
          </span>
        </div>
      </div>
    </div>
  )
}
