import React from "react"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

interface LoadingStateProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
}

/**
 * LoadingState – spinner con texto opcional para estados de carga.
 *
 * Reemplaza el bloque de carga inline del login-panel y otros puntos.
 */
export function LoadingState({
  size = "md",
  text = "Cargando...",
  className,
}: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col gap-2 items-center justify-center p-8", className)}>
      <RefreshCw className={cn(sizeMap[size], "text-primary animate-spin")} />
      {text && (
        <span className="text-xs text-muted-foreground font-mono">{text}</span>
      )}
    </div>
  )
}
