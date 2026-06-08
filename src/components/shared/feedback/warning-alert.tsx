import React from "react"
import { cn } from "@/lib/utils"
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from "lucide-react"

interface WarningAlertProps {
  title?: string
  message: string
  variant?: "error" | "warning" | "info"
  className?: string
}

/**
 * WarningAlert – bloque de alerta visual reutilizable.
 *
 * Reemplaza el bloque inline del dispositivo no autorizado
 * y otros mensajes de error/estado en login-panel y dashboard-panel.
 */
export function WarningAlert({
  title,
  message,
  variant = "error",
  className,
}: WarningAlertProps) {
  const icons = {
    error: ShieldAlert,
    warning: AlertTriangle,
    info: Info,
  }

  const colors = {
    error: {
      iconBg: "bg-rose-500/10 border-rose-500/20",
      iconColor: "text-rose-500",
      titleColor: "text-foreground",
      mono: "text-rose-500",
    },
    warning: {
      iconBg: "bg-amber-500/10 border-amber-500/20",
      iconColor: "text-amber-500",
      titleColor: "text-foreground",
      mono: "text-amber-600",
    },
    info: {
      iconBg: "bg-primary/10 border-primary/20",
      iconColor: "text-primary",
      titleColor: "text-foreground",
      mono: "text-primary",
    },
  }

  const Icon = icons[variant]
  const styles = colors[variant]

  return (
    <div className={cn("text-center", className)}>
      <div
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 border-2 shadow-sm",
          styles.iconBg
        )}
      >
        <Icon className={cn("w-7 h-7", styles.iconColor)} />
      </div>
      {title && (
        <h2 className={cn("font-extrabold text-lg tracking-tight", styles.titleColor)}>
          {title}
        </h2>
      )}
      <p className={cn("text-[10px] font-mono tracking-widest uppercase font-black mt-1.5", styles.mono)}>
        {variant === "error" ? "Requiere Autorizacion" : "Aviso Importante"}
      </p>
      <div className="h-[2px] w-12 bg-border mx-auto my-4 rounded-full" />
      <p className="text-sm text-foreground/80 font-medium leading-relaxed px-4">{message}</p>
    </div>
  )
}
