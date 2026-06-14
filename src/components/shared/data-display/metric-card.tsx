import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  iconClassName?: string
  color?: 'blue' | 'purple' | 'sky' | 'amber' | 'cyan' | 'emerald' | 'primary' | 'destructive'
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  color = 'primary',
  className
}: MetricCardProps) {
  const colorMap = {
    blue: 'border-l-blue-500 text-blue-500',
    purple: 'border-l-purple-500 text-purple-500',
    sky: 'border-l-sky-500 text-sky-500',
    amber: 'border-l-amber-500 text-amber-500',
    cyan: 'border-l-cyan-500 text-cyan-500',
    emerald: 'border-l-emerald-500 text-emerald-500',
    primary: 'border-l-primary text-primary',
    destructive: 'border-l-destructive text-destructive'
  }

  const selectedColor = colorMap[color]
  const borderClass = selectedColor.split(' ')[0]
  const textClass = selectedColor.split(' ')[1]

  return (
    <div className={cn(
      "@container bg-card border-l-4 border-y border-r border-border p-4 @[250px]:p-5 rounded-xl @[250px]:rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-r-border/80 w-full h-full",
      borderClass,
      className
    )}>
      <div className="flex flex-col justify-between h-full min-h-[80px] @[250px]:min-h-[90px]">
        <div className="flex items-center justify-between mb-2 @[250px]:mb-3">
          <p className="text-[11px] @[150px]:text-[12px] @[250px]:text-xs @[350px]:text-sm font-bold uppercase tracking-wider whitespace-normal mr-2 text-muted-foreground">
            {title}
          </p>
          <Icon className={cn("hidden @[180px]:block w-7 h-7 @[250px]:w-8 @[250px]:h-8 shrink-0 group-hover:scale-110 transition-transform duration-300", textClass, iconClassName)} />
        </div>
        <h3 className="text-2xl @[250px]:text-3xl @[350px]:text-4xl font-extrabold text-foreground tracking-tight">
          {value}
        </h3>
        {description && (
          <span className="hidden @[200px]:block text-xs font-normal text-muted-foreground mt-2">
            {description}
          </span>
        )}
      </div>
    </div>
  )

}
