import React from "react"
import { cn } from "@/lib/utils"

interface ToggleButtonGroupProps {
  value: string
  onChange: (value: string) => void
  options: {
    value: string
    label: string
    icon?: React.ReactNode
  }[]
  className?: string
}

/**
 * ToggleButtonGroup – grupo de botones de seleccion unica.
 *
 * Reemplaza el grid de tabs del login-panel (Local/Admin)
 * y cualquier otro switcher de modo.
 */
export function ToggleButtonGroup({
  value,
  onChange,
  options,
  className,
}: ToggleButtonGroupProps) {
  const activeIndex = options.findIndex((opt) => opt.value === value)
  const safeIndex = activeIndex >= 0 ? activeIndex : 0

  return (
    <div
      className={cn(
        "relative flex bg-muted/60 p-1.5 rounded-xl border border-border shadow-inner",
        className
      )}
    >
      <div 
        className="absolute top-1.5 bottom-1.5 rounded-lg bg-background shadow-md border border-border/50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ 
          width: `calc((100% - 12px) / ${options.length})`,
          left: '6px',
          transform: `translateX(calc(100% * ${safeIndex}))`
        }}
      />
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 cursor-pointer flex items-center justify-center gap-2",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
