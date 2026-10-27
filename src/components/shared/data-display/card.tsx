import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div 
      className={cn(
        "group/card p-1.5 rounded-4xl bg-muted/30 transition-all duration-700 ease-[var(--ease-haptic)] hover:bg-muted/50 flex flex-col shadow-sm hover:shadow-md",
        size === "sm" && "rounded-3xl p-1",
        className
      )}
    >
      <div
        data-slot="card"
        data-size={size}
        className={cn(
          "flex flex-col flex-1 gap-5 overflow-hidden rounded-[calc(2rem-0.375rem)] bg-card py-6 text-sm text-card-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-700 ease-[var(--ease-haptic)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 data-[size=sm]:rounded-[calc(1.5rem-0.25rem)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[calc(2rem-0.375rem)] *:[img:last-child]:rounded-b-[calc(2rem-0.375rem)]"
        )}
        {...props}
      />
    </div>
  )
}



function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-2xl px-6 group-data-[size=sm]/card:px-4 [.border-b]:pb-5 group-data-[size=sm]/card:[.border-b]:pb-4",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-lg leading-snug font-extrabold tracking-tight group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground/80", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "self-start mt-0",
        className
      )}
      {...props}
    />
  )
}


function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-2xl border-t bg-muted/40 p-6 group-data-[size=sm]/card:p-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
