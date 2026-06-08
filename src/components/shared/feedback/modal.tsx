'use client'

import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: ModalSize
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    
    // Lock body scroll to prevent scrollbar flash on unmount
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalStyle
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className={`bg-card border-0 md:border border-border/40 w-full h-full max-h-screen md:h-auto md:max-h-[90vh] rounded-none md:rounded-xl shadow-xl ${SIZE_CLASSES[size]} flex flex-col gap-4 p-6 animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/10 pb-3 shrink-0">
          <h3 className="font-extrabold text-foreground text-sm">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto pr-1 min-h-0 flex-1 scrollbar-none">{children}</div>
      </div>
    </div>,
    document.body
  )
}
