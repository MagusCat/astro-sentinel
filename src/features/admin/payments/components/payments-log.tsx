'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CreditCard, Filter, ChevronDown, Printer, Plus, Ban } from 'lucide-react'
import { PaymentData, PaymentFilters } from '../types'
import { Button, DataTable, EmptyState, FormActions, Modal, PageHeader, PriceDisplay, SearchInput, SelectField, StatusBadge, TableSkeleton, TextareaField, TextField, Toast, ToastType } from '@/components/shared';
import { generateTicketPDF } from '@/features/admin/products/utils';
import CreatePaymentModal from './create-payment-modal'
import { saveNewPayment, voidPayment } from '../mutations'
import { getClients } from '@/features/admin/clients/queries'
import { ClientData } from '@/features/admin/clients/types'

import { getPayments } from '../queries'
import { cn } from '@/lib/utils'

interface PaymentsLogProps {
  payments: PaymentData[] // initial data
  clients?: ClientData[]
  refreshTrigger?: number
  setLoading?: (loading: boolean) => void
  /** Managers can void payments and record manual ones. */
  canManage?: boolean
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export default function PaymentsLog({ payments: initialPayments, clients: initialClients, refreshTrigger, setLoading: setLoadingProp, canManage = false }: PaymentsLogProps) {
  const [voidTarget, setVoidTarget] = useState<PaymentData | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const [localPayments, setLocalPayments] = useState<PaymentData[]>(initialPayments)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [clientsList, setClientsList] = useState<ClientData[]>(initialClients || [])
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 15,
    sortBy: 'transaction_date',
    sortOrder: 'desc'
  })

  const fetchFilteredData = useCallback(async () => {
    setLoading(true)
    const res = await getPayments(filters)
    setLocalPayments(res.data)
    setTotalCount(res.count)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchFilteredData()
  }, [fetchFilteredData, refreshTrigger])

  useEffect(() => {
    setLoadingProp?.(loading)
    return () => setLoadingProp?.(false)
  }, [loading, setLoadingProp])

  const handleFilterChange = (key: keyof PaymentFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })) // reset to page 1 on filter change
  }

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  const loadClients = useCallback(async () => {
    try {
      const res = await getClients({ page: 1, limit: 100 })
      if (res && res.data) {
        setClientsList(res.data)
      }
    } catch (err) {
      console.error('Error fetching clients for payment modal:', err)
    }
  }, [])

  const handleOpenCreateModal = () => {
    if (clientsList.length === 0) {
      loadClients()
    }
    setIsCreateOpen(true)
  }

  const handleCreatePaymentSubmit = async (form: {
    client_id: string
    total_amount: number
    payment_method: string
  }) => {
    setIsCreatingPayment(true)
    try {
      const res = await saveNewPayment(form)
      if (res.success) {
        setToast({ message: 'Pago registrado exitosamente.', type: 'success' })
        setIsCreateOpen(false)
        fetchFilteredData()
        return { success: true }
      } else {
        setToast({ message: res.error || 'Error al registrar el pago.', type: 'error' })
        return { success: false, validationErrors: res.validationErrors }
      }
    } catch {
      setToast({ message: 'Error de conexión al servidor.', type: 'error' })
      return { success: false }
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voidTarget) return
    setIsVoiding(true)
    const res = await voidPayment({ payment_id: voidTarget.id, reason: voidReason })
    setIsVoiding(false)
    if (res.success) {
      setVoidTarget(null)
      setToast({ message: 'Pago anulado. La membresía se canceló y el stock volvió al inventario.', type: 'success' })
      fetchFilteredData()
    } else {
      setToast({ message: res.error || 'No se pudo anular el pago.', type: 'error' })
    }
  }

  const totalPages = Math.ceil(totalCount / filters.limit)
  const columns = [
    {
      key: 'client_name',
      header: 'Cliente',
      className: 'whitespace-nowrap',
      render: (pay: PaymentData) => <span className="font-semibold text-foreground">{pay.client_name}</span>
    },
    {
      key: 'total_amount',
      header: 'Monto',
      className: 'whitespace-nowrap',
      render: (pay: PaymentData) => (
        <div className="flex items-center gap-2">
          <PriceDisplay amount={pay.total_amount} className={cn(pay.voided_at && 'line-through opacity-50')} />
          {pay.voided_at && <StatusBadge status="voided" />}
          {!pay.voided_at && (pay.discount_amount ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground">desc. <PriceDisplay amount={pay.discount_amount ?? 0} /></span>
          )}
        </div>
      )
    },
    {
      key: 'payment_method',
      header: 'Método',
      className: 'whitespace-nowrap',
      render: (pay: PaymentData) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4 text-primary" />
          {PAYMENT_METHOD_LABELS[pay.payment_method] ?? pay.payment_method}
        </span>
      )
    },
    {
      key: 'user_name',
      header: 'Registrado por',
      className: 'whitespace-nowrap',
      render: (pay: PaymentData) => (
        <span className="text-sm font-medium text-muted-foreground">
          {pay.user_name}
        </span>
      )
    },
    {
      key: 'transaction_date',
      header: 'Fecha',
      className: 'whitespace-nowrap',
      render: (pay: PaymentData) => (
        <span className="font-semibold font-mono text-muted-foreground">
          {new Date(pay.transaction_date).toLocaleDateString('es-ES')}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
 className: 'w-24 text-right',
      render: (pay: PaymentData) => (
        <div className="flex justify-end gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          title="Reimprimir Recibo"
          onClick={() => {
            const isProduct = pay.category === 'PRODUCT'
            generateTicketPDF({
              id: pay.id,
              clientName: pay.client_name,
              date: pay.transaction_date,
              paymentMethod: pay.payment_method,
              items: isProduct && Array.isArray(pay.metadata)
                ? (pay.metadata as Record<string, unknown>[]).map((item) => ({
                    name: (item.product_name as string) || 'Producto',
                    quantity: (item.quantity as number) || 1,
                    price: (item.price as number) || 0
                  }))
                : [{ name: 'Pago de Membresía', quantity: 1, price: pay.total_amount }],
              total: pay.total_amount,
              type: isProduct ? 'PRODUCT' : 'MEMBERSHIP',
              discount: pay.discount_amount,
              voidReason: pay.void_reason,
            })
          }}
        >
          <Printer className="w-4 h-4 text-muted-foreground" />
        </Button>
        {canManage && !pay.voided_at && (
          <Button
            variant="ghost"
            size="icon"
            title="Anular pago"
            aria-label={`Anular pago de ${pay.client_name}`}
            onClick={() => { setVoidTarget(pay); setVoidReason('') }}
          >
            <Ban className="w-4 h-4 text-rose-500" />
          </Button>
        )}
        </div>
      )
    }
  ]

  const emptyState = (
    <EmptyState message="No hay registros." />
  )

  return (
    <div className="flex flex-col gap-6 w-full max-w-full h-full flex-1 min-w-0">
      <PageHeader
        title="Historial de Pagos"
        description="Registro y seguimiento de todas las transacciones realizadas"
        actions={canManage && (
          <Button
            onClick={handleOpenCreateModal}
            className="shrink-0 rounded-full h-10 @[640px]:h-11 px-4 @[640px]:px-6 text-[10px] @[640px]:text-xs font-black uppercase tracking-widest gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar Pago
          </Button>
        )}
      />

      {/* Filter Bar */}
      <div className="bg-card border border-border/40 p-6 rounded-xl flex flex-col gap-6 shadow-sm w-full">
        <button 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center justify-between w-full lg:cursor-default"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Filter className="w-4.5 h-4.5 text-primary" />
            <span>Filtros de Búsqueda</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform lg:hidden ${isFiltersOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full ${!isFiltersOpen ? 'hidden lg:grid' : ''}`}>
          <div className="flex flex-col gap-2 p-1 relative w-full">
            <label className="text-[13px] font-semibold text-foreground/80 ml-1 select-none">Buscar Cliente</label>
            <SearchInput
              placeholder="Nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFilterChange('searchTerm', searchTerm || undefined)
                }
              }}
              onBlur={() => handleFilterChange('searchTerm', searchTerm || undefined)}
              containerClassName="w-full"
            />
          </div>

          <SelectField
            label="Método"
            value={filters.paymentMethod || ''}
            onChange={(e) => handleFilterChange('paymentMethod', e.target.value || undefined)}
            placeholder="Todos"
            containerClassName="w-full"
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'tarjeta', label: 'Tarjeta' },
              { value: 'transferencia', label: 'Transferencia' }
            ]}
          />

          <TextField
            label="Desde"
            type="date"
            containerClassName="w-full"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
          />

          <TextField
            label="Hasta"
            type="date"
            containerClassName="w-full"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
          />

          <SelectField
            label="Orden"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-')
              setFilters(prev => ({ 
                ...prev, 
                sortBy: by as PaymentFilters['sortBy'], 
                sortOrder: order as PaymentFilters['sortOrder'], 
                page: 1 
              }))
            }}
            containerClassName="w-full"
            options={[
              { value: 'transaction_date-desc', label: 'Más recientes' },
              { value: 'transaction_date-asc', label: 'Más antiguos' },
              { value: 'total_amount-desc', label: 'Monto mayor' },
              { value: 'total_amount-asc', label: 'Monto menor' }
            ]}
          />
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm w-full max-w-full flex flex-col relative flex-1 min-h-[300px]">

        {loading && localPayments.length === 0 ? (
          <div className="p-6 flex-1 flex flex-col justify-center">
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : (
          <div className={loading ? "opacity-60 pointer-events-none transition-opacity duration-200 flex-1 flex flex-col" : "flex-1 flex flex-col"}>
            <DataTable
              className="flex-1"
              data={localPayments}
              columns={columns}
              keyExtractor={(pay, index) => `${pay.id}-${index}`}
              emptyState={emptyState}
              pagination={{
                currentPage: filters.page || 1,
                totalPages: totalPages,
                totalCount: totalCount,
                onPageChange: handlePageChange,
                disabled: loading
              }}
            />
          </div>
        )}
      </div>

      {isCreateOpen && (
        <CreatePaymentModal
          clients={clientsList}
          loading={isCreatingPayment}
          onSubmit={handleCreatePaymentSubmit}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {voidTarget && (
        <Modal
          isOpen
          onClose={() => setVoidTarget(null)}
          title="Anular pago"
          size="sm"
          footer={<FormActions onCancel={() => setVoidTarget(null)} submitText="Anular pago" submitVariant="destructive" isLoading={isVoiding} formId="void-payment-form" className="mt-0" />}
        >
          <form id="void-payment-form" onSubmit={handleVoid} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              El pago de <strong className="text-foreground">{voidTarget.client_name}</strong> dejará de contar como ingreso,
              su membresía se cancelará y los productos vuelven al inventario. El pago no se borra: queda marcado como anulado.
            </p>
            <TextareaField
              label="Motivo"
              required
              minLength={5}
              maxLength={300}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Ej. cobro duplicado, devolución al cliente…"
            />
          </form>
        </Modal>
      )}
    </div>
  )
}
