import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/shared"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "neutral"
  loading?: boolean
}

/**
 * ConfirmDialog – modal de confirmacion reutilizable.
 *
 * Reemplaza los bloques repetidos de confirmacion de eliminacion
 * presentes en class-plans (x2), cms-shell, user-management, etc.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  loading,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null



  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-card border border-border/40 rounded-xl shadow-xl w-full max-w-sm flex flex-col gap-4 p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-extrabold text-foreground text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : variant === "warning" ? "secondary" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
