'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, ShieldAlert, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error:   ShieldAlert,
  info:    Info,
  warning: AlertTriangle,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 border-emerald-700 text-white',
  error:   'bg-rose-600 border-rose-700 text-white',
  info:    'bg-blue-600 border-blue-700 text-white',
  warning: 'bg-amber-500 border-amber-600 text-white',
}

export default function Toast({ message, type = 'info', duration = 4000, onClose }: ToastProps) {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }, [onClose])

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(handleClose, duration)
    return () => clearTimeout(timer)
  }, [duration, handleClose])

  const Icon = ICONS[type]

  return createPortal(
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl border shadow-xl text-sm font-bold max-w-sm w-full 
      ${isClosing 
        ? 'animate-out fade-out slide-out-to-bottom-2 duration-300 ease-in' 
        : 'animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out fill-mode-both'} 
      ${STYLES[type]}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 tracking-tight">{message}</span>
      <button
        type="button"
        onClick={handleClose}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body
  )
}
