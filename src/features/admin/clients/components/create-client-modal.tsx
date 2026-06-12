'use client'

import React, { useState } from 'react'
import { Modal, TextField, SelectField, PhoneField, FormActions } from '@/components/shared'

import { ClientData } from '../types'

interface CreateClientForm {
  full_name: string
  phone_number: string
  email: string
  registration_source: string
}

interface CreateClientModalProps {
  initialData?: ClientData
  loading: boolean
  onSubmit: (form: CreateClientForm) => Promise<{ success: boolean; validationErrors?: Record<string, string[]> }>
  onClose: () => void
}

export default function CreateClientModal({
  initialData,
  loading,
  onSubmit,
  onClose,
}: CreateClientModalProps) {
  const isEditing = !!initialData

  const [form, setForm] = useState<CreateClientForm>({
    full_name: initialData?.full_name || '',
    phone_number: initialData?.phone_number || '',
    email: initialData?.email || '',
    registration_source: initialData?.registration_source || '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const res = await onSubmit(form)
    if (res.validationErrors) {
      setErrors(res.validationErrors)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Editar Cliente" : "Registrar Nuevo Cliente"}
      size="md"
      footer={
        <FormActions
          onCancel={onClose}
          submitText={isEditing ? "Guardar Cambios" : "Registrar Cliente"}
          isLoading={loading}
          formId="client-form"
          className="mt-0"
        />
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre Completo"
          type="text"
          required
          placeholder="Ej. Juan Pérez"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          error={errors.full_name?.[0]}
        />

        <TextField
          label="Correo Electrónico (Opcional)"
          type="email"
          placeholder="Ej. juan.perez@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email?.[0]}
        />

        <PhoneField
          label="Número de Teléfono"
          required
          placeholder="Ej. +505 0000 0000"
          value={form.phone_number}
          defaultCountryCode="+505"
          format="0000 0000"
          onChange={(val) => setForm({ ...form, phone_number: val })}
          error={errors.phone_number?.[0]}
        />

        <SelectField
          label="Medio de Inscripción (Opcional)"
          value={form.registration_source}
          onChange={(e) => setForm({ ...form, registration_source: e.target.value })}
          error={errors.registration_source?.[0]}
          placeholder="No especificado"
          options={[
            { value: "Facebook", label: "Facebook" },
            { value: "Instagram", label: "Instagram" },
            { value: "WhatsApp", label: "WhatsApp" },
            { value: "Recomendación", label: "Amigo / Recomendación" },
            { value: "Otro", label: "Otro" }
          ]}
        />

      </form>
    </Modal>
  )
}
