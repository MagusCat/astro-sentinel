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
  footer?: React.ReactNode
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl',
  '3xl': 'md:max-w-3xl',
  '4xl': 'md:max-w-4xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
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
        className={`bg-card border-0 md:border border-border/40 w-full h-full max-h-screen md:h-auto md:max-h-[90vh] rounded-none md:rounded-xl shadow-xl ${SIZE_CLASSES[size]} flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/10 px-6 pt-6 pb-4 shrink-0">
          <h3 className="font-extrabold text-foreground text-sm">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-2 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1 scrollbar-none px-6 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-card border-t border-border/10 p-4 px-6 flex gap-2 justify-end mt-auto shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
