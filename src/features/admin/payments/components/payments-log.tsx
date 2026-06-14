'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CreditCard, Filter, ChevronDown } from 'lucide-react'
import { PaymentData, PaymentFilters } from '../types'
import { DataTable, TableSkeleton, SearchInput, SelectField, TextField, EmptyState, PriceDisplay } from '@/components/shared'
import { getPayments } from '../queries'

interface PaymentsLogProps {
  payments: PaymentData[] // initial data
  refreshTrigger?: number
  setLoading?: (loading: boolean) => void
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export default function PaymentsLog({ payments: initialPayments, refreshTrigger, setLoading: setLoadingProp }: PaymentsLogProps) {
  const [localPayments, setLocalPayments] = useState<PaymentData[]>(initialPayments)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  
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
      render: (pay: PaymentData) => <PriceDisplay amount={pay.total_amount} />
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
    }
  ]

  const emptyState = (
    <EmptyState message="No hay registros." />
  )

  return (
    <div className="flex flex-col gap-6 w-full max-w-full h-full flex-1 min-w-0">
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
    </div>
  )
}
