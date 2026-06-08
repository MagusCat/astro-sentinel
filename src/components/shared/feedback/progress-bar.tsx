import React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value?: number
  indeterminate?: boolean
  className?: string
  barClassName?: string
}

/**
 * ProgressBar – barra de progreso con soporte para estado indeterminado.
 *
 * Reemplaza las instancias inline de:
 *   <div className="relative h-1 w-full bg-muted rounded-full overflow-hidden">
 *     <div className="absolute h-full bg-primary ..." style={{...}} />
 *   </div>
 */
export function ProgressBar({
  value = 0,
  indeterminate = false,
  className,
  barClassName,
}: ProgressBarProps) {
  return (
    <div
      className={cn(
        "relative h-1.5 w-full bg-gray-200/80 rounded-full overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "absolute h-full bg-primary rounded-full transition-all duration-500",
          indeterminate && "animate-[progress-indeterminate_1.5s_ease-in-out_infinite]",
          barClassName
        )}
        style={
          indeterminate
            ? undefined
            : {
                width: `${Math.min(Math.max(value, 0), 100)}%`,
              }
        }
      />
    </div>
  )
}
