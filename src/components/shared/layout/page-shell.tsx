import React from "react"
import { cn } from "@/lib/utils"

interface PageShellProps {
  children: React.ReactNode
  variant?: "auth" | "admin" | "cms" | "centered"
  className?: string
}

/**
 * PageShell – wrapper de nivel superior para todas las páginas.
 *
 * Variantes:
 *  - "auth"     → pantalla de login (centra verticalmente, max-w-5xl)
 *  - "admin"    → layout administrativo con sidebar + pl-64
 *  - "cms"      → CMS pantalla completa sin sidebar
 *  - "centered" → página centrada tipo health-check (max-w-xl)
 */
export function PageShell({ children, variant = "auth", className }: PageShellProps) {
  const variants: Record<NonNullable<PageShellProps["variant"]>, string> = {
    auth: "min-h-screen bg-background text-foreground flex flex-col justify-center antialiased font-sans relative",
    admin:
      "min-h-screen bg-background text-foreground antialiased flex flex-row w-full overflow-x-hidden",
    cms: "h-screen overflow-hidden bg-background text-foreground antialiased flex flex-col w-full",
    centered: "min-h-screen bg-background text-foreground flex flex-col justify-center antialiased font-sans",
  }

  return <div className={cn(variants[variant], className)}>{children}</div>
}
