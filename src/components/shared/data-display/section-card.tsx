import React from "react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card"

interface SectionCardProps extends React.ComponentProps<"div"> {
  title?: string
  titleAction?: React.ReactNode
  description?: string
  footer?: React.ReactNode
  size?: "default" | "sm"
  headerClassName?: string
}

/**
 * SectionCard – wrapper sobre Card con titulo, descripcion y footer.
 *
 * Reemplaza las tarjetas inline de class-plans, dashboard-panel, etc.:
 *   <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
 */
export function SectionCard({
  title,
  description,
  titleAction,
  footer,
  children,
  className,
  headerClassName,
  size,
  ...props
}: SectionCardProps) {
  return (
    <Card
      size={size}
      // Card owns the transition (duration-700 ease-haptic); no override here.
      className={cn("flex flex-col", className)}
      {...props}
    >
      {(title || description || titleAction) && (
        <CardHeader className={cn("pb-0 flex flex-col lg:flex-row lg:items-start justify-between gap-6 shrink-0", headerClassName)}>
          <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
            {title && <CardTitle className="text-left">{title}</CardTitle>}
            {description && <CardDescription className="text-left">{description}</CardDescription>}
          </div>
          {titleAction && (
            <div data-slot="card-action" className="w-full lg:w-auto flex justify-center lg:justify-end shrink-0">
              {titleAction}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="flex-1 flex flex-col">{children}</CardContent>
      {footer && <CardFooter className="shrink-0">{footer}</CardFooter>}
    </Card>
  )
}
