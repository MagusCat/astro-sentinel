'use client'

import React from 'react'
import MembershipsMetrics from './memberships-metrics'
import MembershipsTable from './memberships-table'
import { MembershipsPanelData } from '../types'
import { LoadingState, EmptyState } from '@/components/shared'

interface MembershipsPanelProps {
  data: MembershipsPanelData | null
  isLoading: boolean
  onReload: () => void
}

export default function MembershipsPanel({ data, isLoading, onReload }: MembershipsPanelProps) {
  return (
    <div className="relative flex flex-col gap-4 h-full flex-1 min-h-0">
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <LoadingState />
        </div>
      )}

      {data ? (
        <>
          <MembershipsMetrics metrics={data.metrics} />

          <div className="flex-1 min-h-0 flex flex-col">
            <MembershipsTable 
              memberships={data.membershipsList} 
              occupancy={data.classOccupancy} 
              onReload={onReload} 
            />
          </div>
        </>
      ) : (
        !isLoading && (
          <div className="flex-1 min-h-0 flex items-center justify-center p-12">
            <EmptyState message="No hay datos de membresías disponibles." />
          </div>
        )
      )}
    </div>
  )
}
