'use client'

import React, { useState, useEffect } from 'react'
import { FormActions, Modal, TextField, TextareaField, SelectField, Button } from '@/components/shared';
import { RefreshCw } from 'lucide-react';

interface CreateProductForm {
  name: string
  description: string
  price: number
  sku: string
  category: string
  initial_stock: number
}

interface CreateProductModalProps {
  loading: boolean
  onSubmit: (form: CreateProductForm) => Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string[]> }>
  onClose: () => void
}

const generateSKU = (name?: string, category?: string) => {
  const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'PRD';
  const cleanName = name ? name.trim().replace(/[^a-zA-Z0-9]/g, '') : '';
  const namePart = cleanName.length > 0 ? cleanName.substring(0, 4).toUpperCase() : 'XXXX';
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${catPrefix}-${namePart}-${randomPart}`;
}

export default function CreateProductModal({
  loading,
  onSubmit,
  onClose,
}: CreateProductModalProps) {
  const [form, setForm] = useState<CreateProductForm>({
    name: '',
    description: '',
    price: 0,
    sku: generateSKU(),
    category: '',
    initial_stock: 0
  })
  const [isSkuManual, setIsSkuManual] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!isSkuManual && (form.name || form.category)) {
      setForm(prev => ({ ...prev, sku: generateSKU(prev.name, prev.category) }))
    }
  }, [form.name, form.category, isSkuManual])

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
      title="Registrar Nuevo Producto"
      size="lg"
      footer={
        <FormActions
          onCancel={onClose}
          submitText="Registrar Producto"
          isLoading={loading}
          formId="product-form"
          className="mt-0"
        />
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nombre del Producto"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name?.[0]}
        />

        <TextareaField
          label="Descripción (Opcional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          error={errors.description?.[0]}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Precio de Venta"
            type="number"
            step="0.01"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
            error={errors.price?.[0]}
          />
          <TextField
            label="Stock Inicial"
            type="number"
            value={form.initial_stock}
            onChange={(e) => setForm({ ...form, initial_stock: parseInt(e.target.value) })}
            error={errors.initial_stock?.[0]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex gap-2 items-end">
            <TextField
              containerClassName="flex-1"
              label="Código"
              value={form.sku}
              onChange={(e) => {
                setIsSkuManual(true)
                setForm({ ...form, sku: e.target.value })
              }}
              error={errors.sku?.[0]}
            />
            <Button
              type="button"
              variant="neutral"
              size="icon"
              className="mb-[5px] h-11 w-11 shrink-0"
              onClick={() => {
                setIsSkuManual(false)
                setForm({ ...form, sku: generateSKU(form.name, form.category) })
              }}
              title="Generar nuevo código"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <SelectField
            label="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            error={errors.category?.[0]}
            options={[
              { label: 'Seleccionar...', value: '' },
              { label: 'Suplemento', value: 'suplemento' },
              { label: 'Equipo', value: 'equipo' },
              { label: 'Consumible', value: 'consumible' }
            ]}
          />
        </div>
      </form>
    </Modal>
  )
}
