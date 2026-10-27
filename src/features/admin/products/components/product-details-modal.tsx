'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Modal, TextField, TextareaField, FormActions, Button, DataTable, StatusBadge, SelectField, ContextualBanner } from '@/components/shared'
import { ProductWithInventory } from '../types'
import { updateProduct } from '../mutations'

interface ProductDetailsModalProps {
  product: ProductWithInventory
  onClose: () => void
  onReload: () => void
  onSuccess?: (msg: string) => void
}

const generateSKU = (name?: string, category?: string) => {
  const catPrefix = category ? category.substring(0, 3).toUpperCase() : 'PRD';
  const cleanName = name ? name.trim().replace(/[^a-zA-Z0-9]/g, '') : '';
  const namePart = cleanName.length > 0 ? cleanName.substring(0, 4).toUpperCase() : 'XXXX';
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${catPrefix}-${namePart}-${randomPart}`;
}

export default function ProductDetailsModal({
  product,
  onClose,
  onReload,
  onSuccess
}: ProductDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [adjustingStock, setAdjustingStock] = useState(false)
  
  const [form, setForm] = useState({
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    sku: product.sku || '',
    category: product.category || ''
  })
  
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setFormError(null)
    setLoading(true)
    const res = await updateProduct(form)
    if (res.success) {
      if (onSuccess) onSuccess('Producto actualizado correctamente')
      onReload()
      onClose()
    } else {
      if (res.error?.includes('validation')) {
        // Simple fallback
        setErrors({ name: [res.error] })
      } else {
        setFormError(res.error || 'Error al actualizar producto')
      }
    }
    setLoading(false)
  }





  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Detalles del Producto"
      size="lg"
      footer={
        <FormActions
          onCancel={onClose}
          submitText="Guardar Cambios"
          isLoading={loading}
          formId="edit-product-form"
        />
      }
    >
      <form id="edit-product-form" onSubmit={handleUpdate} className="flex flex-col gap-4">
        {formError && (
          <ContextualBanner 
            variant="warning"
            message={formError}
          />
        )}
          <TextField
            label="Nombre del Producto"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name?.[0]}
          />

          <TextareaField
            label="Descripción"
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
              <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-foreground">Stock Actual</span>
              <div className="flex h-11 w-full rounded-xl border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center gap-2">
                 <span className="font-mono">{Array.isArray(product.inventory) ? product.inventory[0]?.current_stock : product.inventory?.current_stock || 0}</span>
                 <StatusBadge status={(Array.isArray(product.inventory) ? product.inventory[0]?.current_stock : product.inventory?.current_stock || 0) > 0 ? 'active' : 'out_of_stock'} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2 items-end">
              <TextField
                containerClassName="flex-1"
                label="Código"
                value={form.sku}
                disabled
                className="bg-muted text-muted-foreground font-mono"
              />
            </div>
            <SelectField
              label="Categoría"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              error={errors.category?.[0]}
              options={[
                { label: 'Seleccionar...', value: '' },
                { label: 'Suplemento', value: 'Suplemento' },
                { label: 'Equipo', value: 'Equipo' },
                { label: 'Consumible', value: 'Consumible' },
              ]}
            />
          </div>
        </form>
    </Modal>
  )
}
