import React from "react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/shared/data-display/card"

interface SectionCardProps extends React.ComponentProps<"div"> {
  title?: string
  titleAction?: React.ReactNode
  description?: string
  footer?: React.ReactNode
  size?: "default" | "sm"
}

/**
 * SectionCard – wrapper sobre Card con titulo, descripcion y footer.
 *
 * Reemplaza las tarjetas inline de class-plans, dashboard-panel, etc.:
 *   <div className="bg-card border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
 */
export function SectionCard({
  children,
  title,
  titleAction,
  description,
  footer,
  size = "default",
  className,
  ...props
}: SectionCardProps) {
  return (
    <Card
      data-slot="section-card"
      size={size}
      className={cn("shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/80", className)}
      {...(props as React.ComponentProps<"div">)}
    >
      {(title || description || titleAction) && (
        <CardHeader className="pb-0">
          {titleAction && <CardAction>{titleAction}</CardAction>}
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
