'use client'

import React from 'react'
import MembershipsMetrics from './memberships-metrics'
import MembershipsTable from './memberships-table'
import { MembershipsPanelData } from '../types'
import { AuthenticatedUser } from '@/features/auth/types'

interface MembershipsPanelProps {
  data: MembershipsPanelData | null
  activeUser: AuthenticatedUser
  onReload: () => void
}

export default function MembershipsPanel({ data, activeUser, onReload }: MembershipsPanelProps) {
  if (!data) return null

  return (
    <div className="flex flex-col gap-4 h-full flex-1 min-h-0">
      <MembershipsMetrics metrics={data.metrics} />

      <div className="flex-1 min-h-0 flex flex-col">
        <MembershipsTable 
          memberships={data.membershipsList} 
          occupancy={data.classOccupancy} 
          activeUser={activeUser} 
          onReload={onReload} 
        />
      </div>
    </div>
  )
}
