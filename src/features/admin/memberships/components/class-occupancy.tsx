import React from 'react'
import { Activity } from 'lucide-react'
import { MembershipsPanelData } from '../types'
import { EmptyState } from '@/components/shared'

interface ClassOccupancyProps {
  occupancy: MembershipsPanelData['classOccupancy']
}

export default function ClassOccupancy({ occupancy }: ClassOccupancyProps) {

  return (
    <div className="bg-card border border-border p-3 lg:p-4 rounded-xl flex flex-col gap-2 shadow-sm w-full lg:h-full">
      <div className="flex-none flex items-center justify-between lg:flex-col lg:items-start lg:justify-start">
        <div>
          <h3 className="font-bold text-sm lg:text-base text-foreground tracking-tight flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-500" />
            Ocupación
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 hidden lg:block">Alumnos por clase</p>
        </div>
      </div>

      <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto scrollbar-none lg:pr-1 w-full mt-1 min-h-0">
        {occupancy.length === 0 ? (
          <div className="w-full flex-1 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
            <EmptyState message="No hay datos" className="py-6" />
          </div>
        ) : (
          occupancy.map((cls, idx) => (
            <div key={idx} className="flex-none lg:flex-auto flex justify-start items-center gap-3 text-sm font-medium py-1.5 px-2 lg:px-0 bg-muted/20 lg:bg-transparent rounded-md lg:rounded-none lg:border-b lg:border-border/30 lg:last:border-0 border border-border/30 lg:border-transparent whitespace-nowrap">
              <span className="text-foreground/70 bg-background lg:bg-muted px-2 py-0.5 rounded font-mono text-sm border border-border/40 min-w-[24px] text-center">
                {cls.activeStudents}
              </span>
              <span className="text-foreground/90 truncate">{cls.className}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
