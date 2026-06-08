import React from "react"
import { cn } from "@/lib/utils"
import { Inbox } from "lucide-react"

interface EmptyStateProps {
  message?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * EmptyState – estado vacio reutilizable para listas/tabla sin datos.
 *
 * Default: icono Inbox + mensaje centrado con estilo muted.
 */
export function EmptyState({
  message = "No hay registros.",
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-3 text-muted-foreground/40">{icon}</div>
      ) : (
        <Inbox className="w-8 h-8 text-muted-foreground/40 mb-3" />
      )}
      <p className="text-xs text-muted-foreground italic">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
