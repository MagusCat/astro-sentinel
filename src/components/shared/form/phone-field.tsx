import React, { useId } from "react"
import { cn } from "@/lib/utils"

export interface PhoneFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string
  error?: string
  containerClassName?: string
  defaultCountryCode?: string // e.g. "+505"
  format?: string // e.g. "0000 0000" using '0' as digit placeholder
  onChange?: (val: string) => void
  value?: string
}

/**
 * PhoneField - Configurable format phone field.
 * Prioritizes a country code and formats digits according to the mask.
 * Allows using other country codes if the user deletes the default prefix.
 */
export const PhoneField = React.forwardRef<HTMLInputElement, PhoneFieldProps>(
  ({ label, error, containerClassName, className, id, defaultCountryCode = "+505", format = "0000 0000", onChange, value, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!e.target.value) {
        onChange?.(defaultCountryCode + " ")
      }
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value

      if (!val) {
        props.onBlur?.(e)
        return
      }

      // If the user tried to delete and only part of the prefix remained, clear it
      if (defaultCountryCode.startsWith(val) || val.trim() === defaultCountryCode) {
        onChange?.("")
        props.onBlur?.(e)
        return
      }

      if (val.startsWith("+") && !val.startsWith(defaultCountryCode)) {
        onChange?.(val.replace(/[^0-9+ \-()]/g, ""))
        props.onBlur?.(e)
        return
      }

      let digits = val.replace(/\D/g, "")
      const prefixDigits = defaultCountryCode.replace(/\D/g, "")
      
      if (digits.startsWith(prefixDigits)) {
        digits = digits.slice(prefixDigits.length)
      }

      let result = defaultCountryCode + " "
      let digitIdx = 0

      for (let i = 0; i < format.length; i++) {
        if (digitIdx >= digits.length) break
        
        if (format[i] === "0") {
          result += digits[digitIdx]
          digitIdx++
        } else {
          result += format[i]
        }
      }

      onChange?.(result)
      props.onBlur?.(e)
    }

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
        <input
          id={inputId}
          ref={ref}
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={cn(
            "w-full text-sm px-4 py-3 rounded-xl border border-border/60 bg-background placeholder:text-muted-foreground/40 hover:border-border focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all text-foreground font-medium relative focus:z-10",
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

PhoneField.displayName = "PhoneField"
