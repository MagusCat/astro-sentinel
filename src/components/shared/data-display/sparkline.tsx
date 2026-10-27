'use client'

import React from 'react'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  strokeWidth?: number
}

export function Sparkline({ 
  data, 
  color = 'var(--primary)', 
  height = 40, 
  width = 120,
  strokeWidth = 2
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  const points = data.map((val, i) => {
    const x = i * step
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ transition: 'all 0.3s ease' }}
      />
    </svg>
  )
}
