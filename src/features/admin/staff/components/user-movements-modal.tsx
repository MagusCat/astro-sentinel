'use client'

import React, { useEffect, useState } from 'react'
import { Button, DataTable, EmptyState, Modal, PriceDisplay, TableSkeleton } from '@/components/shared';

import { getUserMovements } from '../queries'
import { LocalUser } from '../types'
import { History, ShoppingBag, ShieldCheck } from 'lucide-react'

interface UserMovementsModalProps {
  user: LocalUser
  onClose: () => void
}

interface MovementData {
  id: string
  date: string
  category: string
  client_name: string
  amount: number
}

export default function UserMovementsModal({ user, onClose }: UserMovementsModalProps) {
  const [movements, setMovements] = useState<MovementData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true)
      const res = await getUserMovements(user.id)
      if (res.success && res.movements) {
        setMovements(res.movements as MovementData[])
      }
      setLoading(false)
    }
    fetchMovements()
  }, [user.id])

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Movimientos de: ${user.full_name}`}
      size="2xl"
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : movements.length === 0 ? (
          <EmptyState 
            icon={<History className="w-12 h-12" />}
            message="No se encontraron movimientos para este operador." 
          />
        ) : (
          <div className="bg-muted/30 border border-border/50 rounded-2xl overflow-hidden">
            <DataTable
              data={movements}
              keyExtractor={(m) => m.id}
              columns={[
                {
                  key: 'date',
                  header: 'Fecha',
                  render: (m: MovementData) => (
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      {new Date(m.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )
                },
                {
                  key: 'category',
                  header: 'Tipo',
                  render: (m: MovementData) => (
                    <div className="flex items-center gap-1.5">
                      {m.category === 'PRODUCT' ? (
                        <div className="bg-amber-500/10 text-amber-600 p-1 rounded-md">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="bg-primary/10 text-primary p-1 rounded-md">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground">
                        {m.category === 'PRODUCT' ? 'Tienda' : 'Plan'}
                      </span>
                    </div>
                  )
                },
                {
                  key: 'client',
                  header: 'Cliente',
                  render: (m: MovementData) => <span className="text-sm font-bold text-foreground">{m.client_name}</span>
                },
                {
                  key: 'amount',
                  header: 'Monto',
                  className: 'text-right',
                  render: (m: MovementData) => <PriceDisplay amount={m.amount} variant="badge" />
                }
              ]}
            />
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="neutral" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}
