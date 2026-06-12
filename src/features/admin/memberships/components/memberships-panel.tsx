import React from 'react'
import MembershipsMetrics from './memberships-metrics'
import MembershipsTable from './memberships-table'
import { MembershipsPanelData } from '../types'
import { EmptyState, TableSkeleton, ProgressBar, Skeleton } from '@/components/shared'

interface MembershipsPanelProps {
  data: MembershipsPanelData | null
  isLoading: boolean
  onReload: () => void
}

export default function MembershipsPanel({ data, isLoading, onReload }: MembershipsPanelProps) {
  return (
    <div className="relative flex flex-col gap-4 h-full flex-1 min-h-0">

      {isLoading && !data ? (
        <div className="space-y-6 w-full">
          {/* Metrics Skeleton */}
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          {/* Table Card Skeleton */}
          <div className="bg-card border border-border/40 rounded-xl p-6 shadow-sm flex-1">
            <TableSkeleton rows={6} cols={5} />
          </div>
        </div>
      ) : data ? (
        <div className={isLoading ? "opacity-60 pointer-events-none transition-opacity duration-200 flex-1 flex flex-col min-h-0" : "flex-1 flex flex-col min-h-0"}>
          <div className="hidden lg:block">
            <MembershipsMetrics metrics={data.metrics} />
          </div>

          <div className="flex-1 min-h-0 flex flex-col mt-4">
            <MembershipsTable 
              memberships={data.membershipsList} 
              occupancy={data.classOccupancy} 
              onReload={onReload} 
              mobileMetrics={<MembershipsMetrics metrics={data.metrics} />}
            />
          </div>
        </div>
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
