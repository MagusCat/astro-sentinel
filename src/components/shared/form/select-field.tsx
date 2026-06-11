import React, { useState, useRef, useEffect, useId, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"
import Tooltip from "../feedback/tooltip"

export interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string
  placeholder?: string
  error?: string
  containerClassName?: string
  options: Array<{ value: string; label: string }>
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  tooltip?: string
}

/**
 * SelectField - Custom encapsulated dropdown with label and error handling.
 * Uses a React Portal to ensure the list is never clipped by containers with overflow.
 */
export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, containerClassName, className, id, options, placeholder, value, onChange, disabled, name, tooltip, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
    
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const generatedId = useId()
    const selectId = id || generatedId

    useEffect(() => {
      setIsMounted(true)
    }, [])

    // Handle click outside container to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        if (
          containerRef.current && 
          !containerRef.current.contains(target) && 
          !(target instanceof Element && target.closest('.select-dropdown'))
        ) {
          setIsOpen(false)
        }
      }
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside)
      }
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    const updatePosition = useCallback(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = 250 // Estimation of max-h-60 (240px) + margin

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Deploy upwards
        setDropdownStyle({
          position: "fixed",
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 99999,
        })
      } else {
        // Deploy downwards
        setDropdownStyle({
          position: "fixed",
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 99999,
        })
      }
    }, [])

    // Calculate position and handle scroll
    useEffect(() => {
      if (isOpen && triggerRef.current) {
        updatePosition()

        const handleScroll = (e: Event) => {
          if ((e.target as HTMLElement)?.closest?.('.select-dropdown')) return
          updatePosition() // Updates position on devices without scroll repaint or closes it
          setIsOpen(false)
        }
        
        window.addEventListener("scroll", handleScroll, true)
        window.addEventListener("resize", updatePosition)
        
        return () => {
          window.removeEventListener("scroll", handleScroll, true)
          window.removeEventListener("resize", updatePosition)
        }
      }
    }, [isOpen, updatePosition])

    const selectedOption = options.find((opt) => opt.value === value)
    
    const items = placeholder ? [{ value: "", label: placeholder }, ...options] : options

    const handleSelect = (val: string) => {
      setIsOpen(false)
      if (onChange) {
        onChange({
          target: { value: val, name: name },
          currentTarget: { value: val, name: name }
        } as React.ChangeEvent<HTMLSelectElement>)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault()
          setIsOpen(true)
          updatePosition()
          const idx = items.findIndex(item => item.value === value)
          setHighlightedIndex(idx >= 0 ? idx : 0)
        }
        return
      }

      switch (e.key) {
        case "Escape":
        case "Tab":
          setIsOpen(false)
          break
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev))
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev))
          break
        case "Enter":
        case " ":
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            handleSelect(items[highlightedIndex].value)
          }
          break
      }
    }

    useEffect(() => {
      if (isOpen && highlightedIndex >= 0 && listRef.current) {
        const li = listRef.current.children[highlightedIndex] as HTMLElement
        if (li) {
          li.scrollIntoView({ block: "nearest" })
        }
      }
    }, [highlightedIndex, isOpen])

    return (
      <div className={cn("flex flex-col gap-2 p-1 relative", containerClassName)} ref={containerRef}>
        {label && (
          <div className="flex items-center gap-1.5 ml-1">
            <label className="text-sm font-semibold text-foreground/80 select-none">
              {label}
            </label>
            {tooltip && <Tooltip content={tooltip} />}
          </div>
        )}
        <div className="relative">
          <select 
            id={selectId}
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
            name={name}
            className="hidden"
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            type="button"
            ref={triggerRef}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onClick={() => {
              if (!isOpen) {
                updatePosition()
                const idx = items.findIndex(item => item.value === value)
                setHighlightedIndex(idx >= 0 ? idx : 0)
              }
              setIsOpen(!isOpen)
            }}
            className={cn(
              "w-full flex items-center justify-between text-sm px-3 h-11 rounded-lg border bg-background transition-all text-left font-medium relative focus:z-10 focus:outline-none",
              isOpen 
                ? "border-primary ring-[3px] ring-primary/15" 
                : "border-border/60 hover:border-border focus:border-primary focus:ring-[3px] focus:ring-primary/15",
              error && "border-destructive focus:border-destructive focus:ring-destructive/15 hover:border-destructive",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <span className={cn("truncate", !selectedOption && "text-muted-foreground/60")}>
              {selectedOption ? selectedOption.label : placeholder || "Seleccionar..."}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground/70 transition-transform", isOpen && "rotate-180")} />
          </button>

          {isMounted && isOpen && !disabled && createPortal(
            <div 
              className="select-dropdown animate-fade-in-up bg-card border border-border/80 rounded-lg shadow-lg overflow-hidden"
              style={dropdownStyle}
            >
              <div className="max-h-[240px] overflow-y-auto py-1.5 scrollbar-none">
                <ul className="flex flex-col w-full" ref={listRef}>
                  {items.map((opt, index) => (
                    <li
                      key={opt.value}
                      className={cn(
                        "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between",
                        highlightedIndex === index ? "bg-muted" : "",
                        value === opt.value ? "bg-primary/5 text-primary font-bold" : "text-foreground font-medium",
                        opt.value === "" && !value && "italic"
                      )}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {opt.label}
                      {value === opt.value && opt.value !== "" && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            document.body
          )}
        </div>
        {error ? <span className="text-xs text-destructive font-semibold ml-1">{error}</span> : null}
      </div>
    )
  }
)

SelectField.displayName = "SelectField"
