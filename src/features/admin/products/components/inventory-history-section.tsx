import React, { useState, useEffect, useCallback } from 'react'
import { ProductWithInventory, InventoryMovement } from '../types'
import { getProductMovements } from '../queries'
import { DataTable, Modal } from '@/components/shared'
import { User, Calendar, Tag, Layers } from 'lucide-react'

export default function InventoryHistorySection({ product, onClose }: { product: ProductWithInventory, onClose: () => void }) {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    const res = await getProductMovements(product.id)
    if (res.success && res.data) {
      setMovements(res.data)
    }
    setLoading(false)
  }, [product.id])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const columns = [
    {
      key: 'date',
      header: 'Fecha',
      render: (m: InventoryMovement) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm">{new Date(m.created_at).toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'operator',
      header: 'Operador',
      render: (m: InventoryMovement) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{m.user?.full_name || 'Sistema'}</span>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (m: InventoryMovement) => {
        const isAddition = m.movement_type === 'ADD' || m.movement_type === 'INITIAL'
        const isSet = m.movement_type === 'SET'
        return (
          <div className="flex items-center gap-1.5">
            <Tag className={`w-3 h-3 ${isAddition ? 'text-emerald-500' : isSet ? 'text-indigo-500' : 'text-rose-500'}`} />
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isAddition ? 'bg-emerald-500/10 text-emerald-600' : isSet ? 'bg-indigo-500/10 text-indigo-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {isSet ? 'Ajuste Manual' : isAddition ? 'Entrada' : 'Salida'}
            </span>
          </div>
        )
      }
    },
    {
      key: 'quantity',
      header: 'Movimiento',
      render: (m: InventoryMovement) => (
        <span className={`font-mono font-bold ${m.movement_type === 'SALE' ? 'text-rose-500' : 'text-emerald-500'}`}>
          {m.movement_type === 'SALE' ? `-${m.quantity}` : `+${m.quantity}`}
        </span>
      )
    },
    {
      key: 'stock',
      header: 'Stock Final',
      render: (m: InventoryMovement) => (
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono">{m.new_stock}</span>
        </div>
      )
    }
  ]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Historial de Movimientos: ${product.name}`}
      size="4xl"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="bg-muted p-4 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">Stock Actual</span>
            <span className="text-xs text-muted-foreground">Cantidad verificada en el último movimiento</span>
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">
            {movements.length > 0 ? movements[0].new_stock : (product.inventory?.current_stock || 0)}
          </div>
        </div>

        <div className="border border-border/40 rounded-xl overflow-hidden bg-card min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex justify-center p-8 m-auto"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <DataTable
              columns={columns}
              data={movements}
              keyExtractor={(m) => m.id}
              emptyState={<div className="p-8 text-center text-muted-foreground">No hay movimientos registrados.</div>}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
