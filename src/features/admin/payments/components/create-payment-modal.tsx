'use client'

import React, { useState } from 'react'
import { Modal, TextField, SelectField, FormActions } from '@/components/shared'
import { ClientData } from '@/features/admin/clients/types'

interface CreatePaymentForm {
  client_id: string
  total_amount: string
  payment_method: string
}

interface CreatePaymentModalProps {
  clients: ClientData[]
  loading: boolean
  onSubmit: (form: { client_id: string; total_amount: number; payment_method: string }) => Promise<{ success: boolean; validationErrors?: Record<string, string[]> }>
  onClose: () => void
}

const DEFAULT_FORM: CreatePaymentForm = {
  client_id: '',
  total_amount: '',
  payment_method: 'efectivo',
}

export default function CreatePaymentModal({
  clients,
  loading,
  onSubmit,
  onClose,
}: CreatePaymentModalProps) {
  const [form, setForm] = useState<CreatePaymentForm>({ ...DEFAULT_FORM })
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.full_name} ${c.email ? `(${c.email})` : ''}`
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    const amountNum = Number(form.total_amount)
    const res = await onSubmit({
      client_id: form.client_id,
      total_amount: amountNum,
      payment_method: form.payment_method,
    })

    if (res.validationErrors) {
      setErrors(res.validationErrors)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Registrar Nuevo Pago"
      size="md"
      footer={
        <FormActions
          onCancel={onClose}
          submitText="Registrar Pago"
          isLoading={loading}
          formId="payment-form"
          className="mt-0"
        />
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <SelectField
          label="Cliente"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value || '' })}
          placeholder="Seleccione un cliente"
          error={errors.client_id?.[0]}
          options={clientOptions}
        />

        <TextField
          label="Monto del Pago ($)"
          type="number"
          required
          min="1"
          placeholder="Ej. 25000"
          value={form.total_amount}
          onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
          error={errors.total_amount?.[0]}
        />

        <SelectField
          label="Método de Pago"
          value={form.payment_method}
          onChange={(e) => setForm({ ...form, payment_method: e.target.value || 'efectivo' })}
          error={errors.payment_method?.[0]}
          options={[
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'transferencia', label: 'Transferencia Bancaria' },
            { value: 'tarjeta', label: 'Tarjeta de Débito/Crédito' }
          ]}
        />

      </form>
    </Modal>
  )
}
