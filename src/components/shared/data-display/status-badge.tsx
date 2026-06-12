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
  expired: { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500/20" },
  frozen: { bg: "bg-cyan-500/10", text: "text-cyan-600", border: "border-cyan-500/20" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20" },
  transferred: { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-500/20" },
}

const LABEL_MAP: Record<string, string> = {
  active: 'Activo',
  expired: 'Vencida',
  frozen: 'Pausada',
  cancelled: 'Cancelada',
  transferred: 'Transferida',
  inactive: 'Inactivo',
  pending: 'Pendiente',
}

/**
 * StatusBadge – etiqueta de estado con colores semanticos.
 *
 * Reemplaza los span inline con colores condicionales en tablas y listados.
 */
export function StatusBadge({ status, variant = "soft", className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase()
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.inactive
  const label = LABEL_MAP[normalizedStatus] || status

  if (variant === "outline" || config.border) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider border transition-colors duration-150",
          config.bg,
          config.text,
          config.border,
          className
        )}
      >
        {label}
      </span>
    )
  }

  if (variant === "soft") {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150",
          config.bg,
          config.text,
          className
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 transition-colors duration-150",
        className
      )}
    >
      {label}
    </span>
  )
}
