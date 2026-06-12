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
  value,
  indeterminate,
  className,
  barClassName,
}: ProgressBarProps) {
  const isIndeterminate = indeterminate ?? (value === undefined)
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
          isIndeterminate ? "animate-progress-indeterminate" : "",
          barClassName
        )}
        style={
          isIndeterminate
            ? undefined
            : {
                width: `${Math.min(Math.max(value ?? 0, 0), 100)}%`,
              }
        }
      />
    </div>
  )
}
