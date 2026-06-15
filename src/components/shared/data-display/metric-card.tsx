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
      "@container bg-card border-l-4 border-y border-r border-border p-4 @[250px]:p-6 rounded-[2rem] relative overflow-hidden group transition-all duration-700 ease-[var(--ease-haptic)] hover:shadow-2xl hover:-translate-y-1 hover:border-r-border/80 w-full h-full min-h-[140px]",
      borderClass,
      className
    )}>
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[10px] @[200px]:text-[11px] @[300px]:text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-1">
              {title}
            </p>
            <h3 className="text-2xl @[250px]:text-3xl @[350px]:text-4xl font-black text-foreground tracking-tighter leading-none">
              {value}
            </h3>
          </div>
          <div className={cn("p-2.5 rounded-2xl bg-muted/30 group-hover:bg-muted/50 transition-colors duration-500", !Icon && "hidden")}>
            <Icon className={cn("w-5 h-5 @[250px]:w-6 @[250px]:h-6 group-hover:scale-110 transition-transform duration-500", textClass, iconClassName)} />
          </div>
        </div>

        {description && (
          <div className="mt-auto pt-2 border-t border-border/5">
            <span className="text-[10px] @[300px]:text-[11px] font-bold text-muted-foreground/80 leading-snug">
              {description}
            </span>
          </div>
        )}
      </div>

      {/* Decorative background element for premium feel */}
      <div className={cn("absolute -bottom-6 -right-6 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700", textClass)}>
        {Icon && <Icon className="w-full h-full rotate-12" />}
      </div>
    </div>
  )



}
