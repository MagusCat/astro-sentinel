'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children?: React.ReactNode
  icon?: boolean
  className?: string
  contentClassName?: string
}

export default function Tooltip({ content, children, icon = true, className, contentClassName }: TooltipProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setIsMounted(true) }, [])

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setTooltipStyle({
      position: 'fixed',
      left: rect.left + rect.width / 2,
      bottom: window.innerHeight - rect.top + 8,
      transform: 'translateX(-50%)',
      zIndex: 99999,
    })
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
    }
  }, [isVisible])

  if (!isMounted) {
    return (
      <div className={cn("relative inline-block", className)} ref={triggerRef}>
        {children || (icon && (
          <div className="text-muted-foreground hover:text-primary transition-colors cursor-help flex items-center justify-center p-1">
            <Info className="w-5 h-5" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div
        className={cn("relative inline-block", className)}
        ref={triggerRef}
        onMouseEnter={() => { setIsVisible(true) }}
        onMouseLeave={() => { setIsVisible(false) }}
        onFocus={() => { setIsVisible(true) }}
        onBlur={() => { setIsVisible(false) }}
      >
        {children || (icon && (
          <div className="text-muted-foreground hover:text-primary transition-colors cursor-help flex items-center justify-center p-1">
            <Info className="w-5 h-5" />
          </div>
        ))}
      </div>
      {isVisible && createPortal(
        <div
          className={cn(
            "w-max max-w-[280px] p-3",
            "bg-popover text-popover-foreground text-xs rounded-xl shadow-xl border border-border/50",
            "animate-in fade-in zoom-in-95 duration-150",
            "text-center font-medium leading-relaxed",
            contentClassName
          )}
          style={tooltipStyle}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
