import React, { useId } from "react"
import { cn } from "@/lib/utils"
import Tooltip from "../feedback/tooltip"

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string
  error?: string
  containerClassName?: string
  tooltip?: string
}

/**
 * TextField – input encapsulado con label y manejo de errores.
 *
 * Reemplaza la duplicacion de:
 *   <div className="flex flex-col gap-1.5">
 *     <label className="text-[10px] font-bold ..." />
 *     <input className="w-full text-xs px-3 py-2.5 ..." />
 *   </div>
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, containerClassName, className, id, tooltip, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    return (
      <div className={cn("flex flex-col gap-2 p-1 relative", containerClassName)}>
        {label && (
          <div className="flex items-center gap-1.5 ml-1">
            <label
              htmlFor={inputId}
              className="text-sm font-semibold text-foreground/80 select-none"
            >
              {label}
            </label>
            {tooltip && <Tooltip content={tooltip} />}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full text-sm px-3 h-11 rounded-lg border border-border/60 bg-background placeholder:text-muted-foreground/40 hover:border-border focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all text-foreground font-medium relative focus:z-10",
            error && "border-destructive focus:border-destructive focus:ring-destructive/15 hover:border-destructive",
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-destructive font-semibold ml-1">{error}</span>
        ) : null}
      </div>
    )
  }
)

TextField.displayName = "TextField"
