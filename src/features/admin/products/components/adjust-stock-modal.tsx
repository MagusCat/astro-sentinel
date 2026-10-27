import React, { useState } from 'react'
import { Modal, TextField, FormActions, SelectField } from '@/components/shared'
import { ProductWithInventory } from '../types'
import { ArrowRightLeft } from 'lucide-react'

interface AdjustStockModalProps {
  product: ProductWithInventory
  loading: boolean
  onSubmit: (data: { product_id: string; quantity: number; type: 'ADD' | 'SET' }) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}

export default function AdjustStockModal({
  product,
  loading,
  onSubmit,
  onClose
}: AdjustStockModalProps) {
  const [stockAdjQuantity, setStockAdjQuantity] = useState<number | ''>('')
  const [stockAdjType, setStockAdjType] = useState<'ADD' | 'SET'>('ADD')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stockAdjQuantity === '') return
    if (stockAdjType === 'ADD' && stockAdjQuantity === 0) return
    const res = await onSubmit({
      product_id: product.id,
      quantity: Number(stockAdjQuantity),
      type: stockAdjType
    })
    if (res.success) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Ajuste de Stock Rápido"
      size="md"
      footer={
        <FormActions
          onCancel={onClose}
          submitText="Aplicar Ajuste"
          isLoading={loading}
          formId="adjust-stock-form"
          disabled={stockAdjQuantity === '' || (stockAdjType === 'ADD' && stockAdjQuantity === 0)}
        />
      }
    >
      <form id="adjust-stock-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-muted p-4 rounded-xl flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">{product.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Stock Actual</span>
            <span className="text-xl font-mono font-bold text-foreground">{product.inventory?.current_stock || 0}</span>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-4 mb-2">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80">
                Atención: Al aplicar el ajuste, el stock se modificará inmediatamente y dejará un registro permanente en el historial de movimientos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Tipo de Ajuste"
            value={stockAdjType}
            onChange={(e) => setStockAdjType(e.target.value as 'ADD' | 'SET')}
            options={[
              { label: 'Sumar / Restar Stock', value: 'ADD' },
              { label: 'Establecer Stock Fijo', value: 'SET' }
            ]}
          />
          <TextField
            label="Cantidad a Ajustar"
            type="number"
            placeholder={stockAdjType === 'ADD' ? "Ej: 5 o -3" : "Ej: 20"}
            value={stockAdjQuantity}
            onChange={(e) => setStockAdjQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
            autoFocus
          />
        </div>
      </form>
    </Modal>
  )
}
