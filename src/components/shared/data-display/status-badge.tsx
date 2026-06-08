import React from "react"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  variant?: "default" | "outline" | "soft"
  className?: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border?: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
  inactive: { bg: "bg-muted", text: "text-muted-foreground" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  error: { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500/20" },
  success: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
}

/**
 * StatusBadge – etiqueta de estado con colores semanticos.
 *
 * Reemplaza los span inline con colores condicionales en tablas y listados.
 */
export function StatusBadge({ status, variant = "soft", className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.inactive

  if (variant === "outline" || config.border) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
          config.bg,
          config.text,
          config.border,
          className
        )}
      >
        {status}
      </span>
    )
  }

  if (variant === "soft") {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
          config.bg,
          config.text,
          className
        )}
      >
        {status}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary",
        className
      )}
    >
      {status}
    </span>
  )
}
