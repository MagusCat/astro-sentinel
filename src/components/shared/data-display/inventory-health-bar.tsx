'use client'

import React from 'react'

interface InventoryHealthBarProps {
  healthy: number
  low: number
  outOfStock: number
  total: number
}

export function InventoryHealthBar({ healthy, low, outOfStock, total }: InventoryHealthBarProps) {
  if (total === 0) return <div className="h-2 w-full bg-muted rounded-full" />

  const healthyPct = (healthy / total) * 100
  const lowPct = (low / total) * 100
  const outPct = (outOfStock / total) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-full flex rounded-full overflow-hidden shadow-inner bg-muted">
        <div 
          className="h-full bg-emerald-500 transition-all duration-1000" 
          style={{ width: `${healthyPct}%` }} 
          title={`Saludable: ${healthy}`}
        />
        <div 
          className="h-full bg-amber-500 transition-all duration-1000" 
          style={{ width: `${lowPct}%` }} 
          title={`Bajo Stock: ${low}`}
        />
        <div 
          className="h-full bg-rose-500 transition-all duration-1000" 
          style={{ width: `${outPct}%` }} 
          title={`Agotado: ${outOfStock}`}
        />
      </div>
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
        <span>Agotado</span>
        <span>Crítico</span>
        <span>Saludable</span>
      </div>
    </div>
  )
}
