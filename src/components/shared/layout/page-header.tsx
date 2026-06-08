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
        "bg-card border border-border/40 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm w-full",
        className
      )}
      {...props}
    >
      <div>
        <h3 className="text-lg text-foreground tracking-tight font-bold">{title}</h3>
        {description && (
          <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
