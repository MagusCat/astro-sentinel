import React from "react"
import { cn } from "@/lib/utils"
import { Button } from '@/components/shared';


interface FormActionsProps {
  onCancel?: () => void
  onSubmit?: () => void
  cancelText?: string
  submitText?: string
  isLoading?: boolean
  disabled?: boolean
  submitVariant?: "default" | "destructive" | "primary"
  className?: string
  formId?: string
}

/**
 * FormActions – botones de accion para modales/formularios.
 *
 * Reemplaza los bloques repetidos de Cancelar + Confirmar/Guardar
 * en modales de creacion y edicion.
 */
export function FormActions({
  onCancel,
  onSubmit,
  cancelText = "Cancelar",
  submitText = "Guardar",
  isLoading,
  disabled,
  submitVariant = "default",
  className,
  formId,
}: FormActionsProps) {
  return (
    <div className={cn("flex gap-2 justify-end mt-4", className)}>
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          size="default"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      )}
      <Button
        type="submit"
        form={formId}
        variant={submitVariant === "destructive" ? "destructive" : "default"}
        size="default"
        onClick={onSubmit}
        isLoading={isLoading}
        disabled={disabled || isLoading}
      >
        {submitText}
      </Button>
    </div>
  )
}
