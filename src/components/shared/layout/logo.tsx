import React from 'react'
import { BookLock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  subtitle?: string
  animate?: boolean
  centered?: boolean
  color?: 'default' | 'white'
}

export default function Logo({ 
  size = 'md', 
  subtitle, 
  animate = false, 
  centered = false,
  color = 'default'
}: LogoProps) {
  const containerClasses = centered ? 'text-center' : 'flex items-center gap-3'
  
  // Icon and text sizing
  let iconBgClass = 'w-12 h-12 rounded-xl'
  let iconClass = 'w-6 h-6'
  let titleClass = 'font-bold text-xl tracking-tight'
  let subtitleClass = 'text-[10px] font-mono block tracking-widest uppercase font-bold'
  
  if (size === 'sm') {
    iconBgClass = 'w-10 h-10 rounded-xl'
    iconClass = 'w-5 h-5'
    titleClass = 'font-bold text-lg tracking-tight'
    subtitleClass = 'text-[9px] font-mono block tracking-widest uppercase font-bold'
  } else if (size === 'lg') {
    iconBgClass = 'w-16 h-16 rounded-2xl shadow-lg shadow-primary/20'
    iconClass = 'w-9 h-9'
    titleClass = 'font-extrabold text-3xl tracking-tight'
    subtitleClass = 'text-xs font-mono tracking-widest uppercase font-bold'
  }

  const textColorClass = color === 'white' ? 'text-white' : 'text-foreground'
  const subtitleColorClass = color === 'white' ? 'text-white/80' : 'text-primary'

  const iconElement = (
    <div className={`${iconBgClass} bg-primary flex items-center justify-center shrink-0 ${centered ? 'mx-auto mb-4' : ''}`}>
      <BookLock className={`${iconClass} text-white ${animate ? 'animate-pulse' : ''}`} />
    </div>
  )

  if (centered) {
    return (
      <div className={containerClasses}>
        {iconElement}
        <h1 className={cn(titleClass, textColorClass)}>Sentinel</h1>
        {subtitle && <p className={cn(subtitleClass, subtitleColorClass)}>{subtitle}</p>}
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      {iconElement}
      <div className="flex flex-col justify-center">
        <span className={cn(titleClass, "block leading-none", textColorClass)}>Sentinel</span>
        {subtitle && <span className={cn(subtitleClass, "mt-1", subtitleColorClass)}>{subtitle}</span>}
      </div>
    </div>
  )
}
