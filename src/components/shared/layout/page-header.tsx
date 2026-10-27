import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: React.ReactNode | string
  actions?: React.ReactNode
}

/**
 * PageHeader - A standardized page or section header component.
 * Displays a title, an optional description, and optional action buttons/controls on the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border/40 p-5 md:p-6 rounded-3xl md:rounded-4xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 shadow-sm w-full transition-all duration-700 ease-[var(--ease-haptic)]",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-lg md:text-xl text-foreground tracking-tight font-black leading-tight uppercase">
          {title}
        </h3>
        {description && (
          <div className="text-[11px] md:text-xs text-muted-foreground mt-1 font-bold tracking-tight leading-relaxed max-w-2xl">
            {description}
          </div>
        )}
      </div>
      
      {actions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto lg:flex-1 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}




