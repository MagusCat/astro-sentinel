import React from 'react'
import { cn } from '@/lib/utils'

export interface PriceDisplayProps {
  amount: number | string
  currency?: string
  className?: string
  variant?: 'default' | 'badge' | 'primary-badge' | 'highlight' | 'neutral'
}

/**
 * PriceDisplay - Centralized component for rendering currency and pricing.
 * Ensures all monetary values look consistent and premium across Sentinel.
 */
export function PriceDisplay({
  amount,
  currency = '$',
  className,
  variant = 'default'
}: PriceDisplayProps) {
  const numericAmount = typeof amount === 'string' ? Number(amount) : amount
  const formatted = `${currency}${isNaN(numericAmount) ? '0.00' : numericAmount.toFixed(2)}`

  if (variant === 'badge') {
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 shadow-sm/5",
        className
      )}>
        {formatted}
      </span>
    )
  }

  if (variant === 'primary-badge') {
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold font-mono text-primary bg-primary/10 border border-primary/20 shadow-sm/5",
        className
      )}>
        {formatted}
      </span>
    )
  }

  if (variant === 'highlight') {
    return (
      <span className={cn(
        "text-2xl font-extrabold text-foreground font-mono tracking-tight",
        className
      )}>
        {formatted}
      </span>
    )
  }

  if (variant === 'neutral') {
    return (
      <span className={cn(
        "font-bold font-mono text-foreground",
        className
      )}>
        {formatted}
      </span>
    )
  }

  // default variant (emerald text color for completed payments / transactions)
  return (
    <span className={cn(
      "font-bold font-mono text-emerald-600",
      className
    )}>
      {formatted}
    </span>
  )
}
