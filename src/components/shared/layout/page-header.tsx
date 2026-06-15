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
        "@container bg-card border border-border/40 p-5 @[1024px]:p-6 rounded-[1.5rem] @[1024px]:rounded-[2rem] flex flex-col @[1024px]:flex-row @[1024px]:items-center justify-between gap-6 shadow-sm w-full transition-all duration-700 ease-[var(--ease-haptic)]",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-lg @[1024px]:text-xl text-foreground tracking-tight font-black leading-tight uppercase">
          {title}
        </h3>
        {description && (
          <div className="text-[11px] @[1024px]:text-xs text-muted-foreground mt-1 font-bold tracking-tight leading-relaxed max-w-2xl">
            {description}
          </div>
        )}
      </div>
      
      {actions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full @[1024px]:w-auto @[1024px]:flex-1 @[1024px]:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}




