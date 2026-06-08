import React, { useId } from "react"
import { cn } from "@/lib/utils"

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  containerClassName?: string
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, containerClassName, className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    return (
      <div className={cn("flex flex-col gap-2 p-1 relative", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-foreground/80 ml-1 select-none"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "w-full text-sm px-4 py-3 rounded-xl border border-border/60 bg-background placeholder:text-muted-foreground/40 hover:border-border focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all text-foreground font-medium min-h-[100px] relative focus:z-10",
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

TextareaField.displayName = "TextareaField"
