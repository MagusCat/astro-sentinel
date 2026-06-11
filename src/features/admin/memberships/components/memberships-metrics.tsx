import React from 'react'
import { Users, AlertTriangle, Pause } from 'lucide-react'
import { MetricCard } from '@/components/shared'
import { MembershipsPanelData } from '../types'

interface MembershipsMetricsProps {
  metrics: MembershipsPanelData['metrics']
}

export default function MembershipsMetrics({ metrics }: MembershipsMetricsProps) {
  return (
    <div className="flex flex-row  gap-4 pb-2 w-full max-w-full min-w-0">
      <MetricCard
        title="Activas Total"
        value={metrics.totalActive}
        description="Membresías vigentes"
        icon={Users}
        color="blue"
      />

      <MetricCard
        title="Por Vencer"
        value={metrics.expiringSoon}
        description="Próximos 7 días"
        icon={AlertTriangle}
        color="amber"
      />

      <MetricCard
        title="Pausadas"
        value={metrics.frozen}
        description="Pausadas temporalmente"
        icon={Pause}
        color="cyan"
      />
    </div>
  )
}
