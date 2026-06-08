import React from 'react'
import { LucideIcon } from 'lucide-react'

interface DashboardListWidgetProps<T> {
  title: string
  icon: LucideIcon
  iconColorClass?: string
  description?: string
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  emptyMessage?: string
  className?: string
  listClassName?: string
}

export function DashboardListWidget<T>({
  title,
  icon: Icon,
  iconColorClass = 'text-primary',
  description,
  items,
  renderItem,
  emptyMessage = 'Sin registros',
  className = '',
  listClassName = ''
}: DashboardListWidgetProps<T>) {
  return (
    <div className={`bg-card border border-border p-5 lg:p-6 rounded-2xl flex flex-col gap-4 shadow-sm flex-1 min-h-0 ${className}`}>
      <div>
        <h3 className="font-extrabold text-base lg:text-lg text-foreground tracking-tight flex items-center gap-2">
          <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${iconColorClass}`} />
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground/80 mt-0.5">{description}</p>
        )}
      </div>

      <div className={`flex flex-col gap-2 overflow-y-auto pr-1 flex-1 min-h-0 ${listClassName}`}>
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground/60 italic flex items-center justify-center gap-2 border border-dashed border-border/50 rounded-xl flex-1">
            <span>{emptyMessage}</span>
          </div>
        ) : (
          items.map((item, index) => renderItem(item, index))
        )}
      </div>
    </div>
  )
}
