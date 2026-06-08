import React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children?: React.ReactNode
  icon?: boolean
  className?: string
  contentClassName?: string
}

export default function Tooltip({ content, children, icon = true, className, contentClassName }: TooltipProps) {
  return (
    <div className={cn("relative group inline-block", className)}>
      {children || (icon && (
        <div className="text-muted-foreground hover:text-primary transition-colors cursor-help flex items-center justify-center p-1">
          <Info className="w-5 h-5" />
        </div>
      ))}
      <div className={cn(
        "absolute bottom-full left-0 mb-2 w-max max-w-[280px] p-3 md:left-1/2 md:-translate-x-1/2",
        "bg-popover text-popover-foreground text-xs rounded-xl shadow-xl border border-border/50",
        "opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50",
        "text-center font-medium leading-relaxed",
        contentClassName
      )}>
        {content}
      </div>
    </div>
  )
}
