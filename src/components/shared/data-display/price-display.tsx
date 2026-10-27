'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { formatMoney, baseToLocal } from '@/lib/format'
import { useCurrency } from '@/lib/currency-context'

export interface PriceDisplayProps {
  amount: number | string
  currency?: string
  locale?: string
  showSecondary?: boolean
  className?: string
  variant?: 'default' | 'badge' | 'primary-badge' | 'highlight' | 'neutral'
}

const VARIANT_CLASSES: Record<NonNullable<PriceDisplayProps['variant']>, string> = {
  badge:
    'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 shadow-sm/5',
  'primary-badge':
    'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold font-mono text-primary bg-primary/10 border border-primary/20 shadow-sm/5',
  highlight: 'text-2xl font-extrabold text-foreground font-mono tracking-tight',
  neutral: 'font-bold font-mono text-foreground',
  default: 'font-bold font-mono text-emerald-600',
}

export function PriceDisplay({
  amount,
  currency,
  locale,
  showSecondary = false,
  className,
  variant = 'default',
}: PriceDisplayProps) {
  const { base, secondary: secondaryCurrency } = useCurrency()

  const resolvedCurrency = currency ?? base.code
  const resolvedLocale = locale ?? (currency ? undefined : base.locale)
  const formatted = formatMoney(amount, resolvedCurrency, resolvedLocale ?? base.locale)

  const isBase = resolvedCurrency === base.code
  const secondary =
    showSecondary && secondaryCurrency && isBase
      ? formatMoney(
          baseToLocal(amount, secondaryCurrency.unitsPerBase),
          secondaryCurrency.code,
          secondaryCurrency.locale
        )
      : null

  if (!secondary) {
    return <span className={cn(VARIANT_CLASSES[variant], className)}>{formatted}</span>
  }

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className={VARIANT_CLASSES[variant]}>{formatted}</span>
      <span className="text-[11px] font-mono font-semibold text-muted-foreground/70">
        {secondary}
      </span>
    </span>
  )
}
