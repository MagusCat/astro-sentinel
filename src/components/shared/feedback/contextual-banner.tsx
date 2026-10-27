'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ContextualBannerProps {
  message: string
  variant?: 'warning' | 'critical' | 'info'
  className?: string
}

export function ContextualBanner({ 
  message, 
  variant = 'info', 
  className 
}: ContextualBannerProps) {
  const styles = {
    info: 'bg-primary/5 border-primary/20 text-primary',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-600',
    critical: 'bg-rose-500/5 border-rose-500/20 text-rose-600'
  }

  return (
    <div className={cn(
      "p-4 rounded-2xl border-l-4 font-bold text-sm tracking-wide animate-fade-in-up",
      styles[variant],
      className
    )}>
      {message.toUpperCase()}
    </div>
  )
}
