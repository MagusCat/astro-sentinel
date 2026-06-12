import React, { useState } from 'react'
import { Modal, Toast, ToastType, TextField, TextareaField, FormActions } from '@/components/shared'
import { saveNewClass, updateClass } from '../mutations'
import { ClassData } from '../types'

interface CreateClassModalProps {
  initialData?: ClassData
  onClose: () => void
  onSuccess: () => void
}

export default function CreateClassModal({ initialData, onClose, onSuccess }: CreateClassModalProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setToast(null)

    let res;
    if (initialData) {
      res = await updateClass(initialData.id, { name, description })
    } else {
      res = await saveNewClass({ name, description })
    }

    if (res.success) {
      setToast({ message: initialData ? 'Clase actualizada.' : 'Clase creada exitosamente.', type: 'success' })
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
      title={initialData ? "Editar Clase" : "Registrar Clase"}
      size="md"
      footer={
        <FormActions
          onCancel={onClose}
          submitText={initialData ? 'Guardar Cambios' : 'Registrar Disciplina'}
          isLoading={loading}
          formId="class-form"
          className="mt-0"
        />
      }
    >
      <form id="class-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre de la Clase"
          type="text"
          required
          placeholder="Ej. Crossfit, Yoga..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextareaField
          label="Descripción (Opcional)"
          placeholder="Breve descripción de la clase..."
          className="min-h-[80px] resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

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
