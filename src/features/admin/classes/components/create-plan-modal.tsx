'use client'

import React, { useState } from 'react'
import { Modal, Toast, ToastType, TextField, FormActions } from '@/components/shared'
import { saveNewClassPlan, updateClassPlan } from '../mutations'
import { PlanData } from '../types'

interface CreatePlanModalProps {
  initialData?: PlanData
  defaultClassId?: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreatePlanModal({ initialData, defaultClassId, onClose, onSuccess }: CreatePlanModalProps) {
  const classId = initialData?.class_id || defaultClassId || ''
  const [planName, setPlanName] = useState(initialData?.plan_name || '')
  const [durationDays, setDurationDays] = useState<number | string>(initialData?.duration_days ?? 30)
  const [price, setPrice] = useState<number | string>(initialData?.price ?? 0)

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setToast(null)

    const parsedDuration = parseInt(String(durationDays)) || 30
    const parsedPrice = parseFloat(String(price)) || 0

    let res
    if (initialData) {
      res = await updateClassPlan(initialData.id, {
        plan_name: planName,
        duration_days: parsedDuration,
        price: parsedPrice
      })
    } else {
      res = await saveNewClassPlan({
        class_id: classId,
        plan_name: planName,
        duration_days: parsedDuration,
        price: parsedPrice
      })
    }

    if (res.success) {
      setToast({ message: initialData ? 'Plan actualizado.' : 'Plan creado exitosamente.', type: 'success' })
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } else {
      setToast({ message: res.error || 'Error desconocido.', type: 'error' })
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={initialData ? "Editar Plan de Pago" : "Crear Plan de Pago"}
      size="md"
      footer={
        <FormActions
          onCancel={onClose}
          submitText={initialData ? 'Guardar Cambios' : 'Crear Plan'}
          isLoading={loading}
          formId="plan-form"
          className="mt-0"
        />
      }
    >
      <form id="plan-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

        <TextField
          label="Nombre del Plan"
          type="text"
          required
          placeholder="Ej. Mensualidad Premium, Clase Suelta..."
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Duración (Días)"
            type="number"
            required
            min={1}
            step={1}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
          />

          <TextField
            label="Precio ($)"
            type="number"
            required
            min={0}
            step={0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

      </form>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Modal>
  )
}
