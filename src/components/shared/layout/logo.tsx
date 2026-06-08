import React from 'react'
import { Activity } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  subtitle?: string
  animate?: boolean
  centered?: boolean
}

export default function Logo({ 
  size = 'md', 
  subtitle, 
  animate = false, 
  centered = false 
}: LogoProps) {
  const containerClasses = centered ? 'text-center' : 'flex items-center gap-2.5'
  
  // Icon and text sizing
  let iconBgClass = 'w-8.5 h-8.5 rounded-lg'
  let iconClass = 'w-4.5 h-4.5'
  let titleClass = 'font-bold text-sm tracking-tight text-foreground'
  let subtitleClass = 'text-[8px] text-primary font-mono block tracking-widest uppercase font-bold'
  
  if (size === 'sm') {
    iconBgClass = 'w-8 h-8 rounded-lg'
    iconClass = 'w-4 h-4'
    titleClass = 'font-bold text-xs tracking-tight text-foreground'
    subtitleClass = 'text-[7px] text-primary font-mono block tracking-widest uppercase font-bold'
  } else if (size === 'lg') {
    iconBgClass = 'w-14 h-14 rounded-xl shadow-lg shadow-primary/20'
    iconClass = 'w-8 h-8'
    titleClass = 'font-bold text-xl text-foreground tracking-tight'
    subtitleClass = 'text-[10px] text-primary font-mono tracking-widest uppercase font-bold'
  }

  const iconElement = (
    <div className={`${iconBgClass} bg-primary flex items-center justify-center ${centered ? 'mx-auto mb-4' : ''}`}>
      <Activity className={`${iconClass} text-white ${animate ? 'animate-pulse' : ''}`} />
    </div>
  )

  if (centered) {
    return (
      <div className={containerClasses}>
        {iconElement}
        <h1 className={titleClass}>SENTINEL</h1>
        {subtitle && <p className={subtitleClass}>{subtitle}</p>}
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      {iconElement}
      <div>
        <span className="font-bold text-sm tracking-tight text-foreground block leading-none">SENTINEL</span>
        {subtitle && <span className={subtitleClass}>{subtitle}</span>}
      </div>
    </div>
  )
}
