'use client'

import React, { useState, useMemo } from 'react'
import { Ban, Pause, Play } from 'lucide-react'
import { MembershipsTableRow, MembershipsPanelData } from '../types'
import { freezeMembership, unfreezeMembership, cancelMembership } from '../mutations'
import { DataTable, SearchInput, SelectField, ConfirmDialog, Modal, DatePicker, Toast, ToastType, StatusBadge } from '@/components/shared'
import ClassOccupancy from './class-occupancy'
import { Button } from '@/components/shared'
import { MEMBERSHIP_STATUS } from '@/lib/config'

interface MembershipsTableProps {
  memberships: MembershipsTableRow[]
  onReload: () => void
  occupancy?: MembershipsPanelData['classOccupancy']
  mobileMetrics?: React.ReactNode
}

const STATUS_LABELS: Record<string, string> = {
  [MEMBERSHIP_STATUS.ACTIVE]: 'Activa',
  [MEMBERSHIP_STATUS.EXPIRED]: 'Vencida',
  [MEMBERSHIP_STATUS.FROZEN]: 'Pausada',
  [MEMBERSHIP_STATUS.CANCELLED]: 'Cancelada',
  [MEMBERSHIP_STATUS.TRANSFERRED]: 'Transferida'
}

const STATUS_COLORS: Record<string, string> = {
  [MEMBERSHIP_STATUS.ACTIVE]: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  [MEMBERSHIP_STATUS.EXPIRED]: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  [MEMBERSHIP_STATUS.FROZEN]: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  [MEMBERSHIP_STATUS.CANCELLED]: 'bg-red-500/10 text-red-600 border-red-500/20',
  [MEMBERSHIP_STATUS.TRANSFERRED]: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
}

export default function MembershipsTable({ memberships, onReload, occupancy, mobileMetrics }: MembershipsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    id: string
    action: 'unfreeze' | 'cancel'
    message: string
  } | null>(null)
  const [pauseMembership, setPauseMembership] = useState<{ id: string; targetDate: string } | null>(null)
  const [pauseError, setPauseError] = useState<string | null>(null)

  const filteredData = useMemo(() => {
    return memberships.filter(m => {
      const matchSearch = m.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'all' || m.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [memberships, searchTerm, statusFilter])

  const executeAction = async () => {
    if (!confirmAction) return
    setIsProcessing(true)
    
    let actionFn
    if (confirmAction.action === 'unfreeze') actionFn = unfreezeMembership
    else actionFn = cancelMembership

    const res = await actionFn(confirmAction.id)
    setIsProcessing(false)
    setConfirmAction(null)

    if (res.success) {
      onReload()
    } else {
      setToast({ message: res.error || 'Error al procesar la solicitud.', type: 'error' })
    }
  }

  const promptAction = (action: 'unfreeze' | 'cancel', id: string, message: string) => {
    setConfirmAction({ id, action, message })
  }

  const columns = [
    {
      key: 'clientName',
      header: 'Cliente',
      className: 'w-[25%]',
      render: (row: MembershipsTableRow) => <span className="font-semibold text-foreground">{row.clientName}</span>
    },
    {
      key: 'className',
      header: 'Clase',
      className: 'w-[10%]',
      render: (row: MembershipsTableRow) => <span className="font-medium text-foreground">{row.className}</span>
    },
    {
      key: 'planName',
      header: 'Plan',
      className: 'w-[10%]',
      render: (row: MembershipsTableRow) => <span className="text-muted-foreground">{row.planName}</span>
    },
    {
      key: 'startDate',
      header: 'Inicio',
      className: 'w-[8%] min-w-[70px] whitespace-nowrap',
      render: (row: MembershipsTableRow) => <span className="font-mono text-muted-foreground">{new Date(row.startDate).toLocaleDateString('es-ES')}</span>
    },
    {
      key: 'endDate',
      header: 'Vencimiento',
      className: 'w-[8%] min-w-[70px] whitespace-nowrap',
      render: (row: MembershipsTableRow) => <span className="font-mono font-semibold text-foreground">{new Date(row.endDate).toLocaleDateString('es-ES')}</span>
    },
    {
      key: 'status',
      header: 'Estado',
      className: 'w-[8%] min-w-[70px] whitespace-nowrap',
      render: (row: MembershipsTableRow) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[8%] min-w-[70px] whitespace-nowrap text-right',
      render: (row: MembershipsTableRow) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === MEMBERSHIP_STATUS.ACTIVE && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground" 
              disabled={isProcessing}
              title="Pausar"
              onClick={() => {
                setPauseMembership({ id: row.id, targetDate: '' })
                setPauseError(null)
              }}
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {row.status === MEMBERSHIP_STATUS.FROZEN && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground" 
              disabled={isProcessing}
              title="Reanudar"
              onClick={() => promptAction('unfreeze', row.id, '¿Seguro que deseas reanudar esta membresía?')}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(row.status === MEMBERSHIP_STATUS.ACTIVE || row.status === MEMBERSHIP_STATUS.FROZEN) && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive" 
              disabled={isProcessing}
              title="Cancelar"
              onClick={() => promptAction('cancel', row.id, '¿Estás completamente seguro de cancelar esta membresía? Esta acción es permanente y no podrá deshacerse.')}
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ]


  return (
    <div className="flex flex-col gap-4 h-full flex-1 min-h-0 w-full">
      <div className="bg-card border border-border p-4 lg:p-5 rounded-xl shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between shrink-0">
        <div>
          <h3 className="font-extrabold text-base lg:text-lg text-foreground tracking-tight">
            Registro General
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <SearchInput
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="w-full lg:w-64 sm:max-w-none"
          />

          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            containerClassName="w-full lg:w-auto sm:min-w-[140px]"
            options={[
              { value: 'all', label: 'Todos' },
              { value: MEMBERSHIP_STATUS.ACTIVE, label: 'Activas' },
              { value: MEMBERSHIP_STATUS.FROZEN, label: 'Pausadas' },
              { value: MEMBERSHIP_STATUS.EXPIRED, label: 'Vencidas' },
              { value: MEMBERSHIP_STATUS.CANCELLED, label: 'Canceladas' }
            ]}
          />
        </div>
      </div>

      {mobileMetrics && (
        <div className="block lg:hidden">
          {mobileMetrics}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 w-full">
        {occupancy && (
          <div className="flex-none lg:w-55 xl:w-65 flex flex-col min-h-0 lg:h-full">
            <ClassOccupancy occupancy={occupancy} />
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <DataTable 
            className="flex-1" 
            tableClassName="min-w-[900px] w-full"
            columns={columns} 
            data={filteredData} 
            keyExtractor={(row: MembershipsTableRow) => row.id} 
          />
        </div>
      </div>

      <Modal
        isOpen={!!pauseMembership}
        onClose={() => setPauseMembership(null)}
        title="Pausar Membresía"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Selecciona la fecha hasta la cual deseas pausar esta membresía. El cliente perderá acceso de inmediato hasta que la membresía se reanude.
          </p>
          <DatePicker
            label="Fecha de reactivación"
            min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}
            value={pauseMembership?.targetDate ?? ''}
            onChange={(event) => {
              setPauseMembership((prev) => prev ? { ...prev, targetDate: event.target.value } : { id: '', targetDate: '' })
              setPauseError(null)
            }}
            error={pauseError ?? undefined}
            className="max-w-45"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant="ghost" size="sm" onClick={() => setPauseMembership(null)} disabled={isProcessing}>
              Volver
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!pauseMembership) return
                if (!pauseMembership.targetDate) {
                  setPauseError('Ingresa una fecha de reactivación válida.')
                  return
                }
                setIsProcessing(true)
                const res = await freezeMembership(pauseMembership.id, pauseMembership.targetDate)
                setIsProcessing(false)
                setPauseMembership(null)
                if (res.success) {
                  onReload()
                } else {
                  setToast({ message: res.error || 'Error al pausar la membresía.', type: 'error' })
                }
              }}
              disabled={isProcessing || !pauseMembership?.targetDate}
            >
              {isProcessing ? 'Pausando...' : 'Confirmar pausa'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeAction}
        title={
          confirmAction?.action === 'unfreeze' ? 'Reanudar Membresía' : 'Cancelar Membresía'
        }
        message={confirmAction?.message || ''}
        confirmText={
          confirmAction?.action === 'unfreeze' ? 'Reanudar' : 'Cancelar Membresía'
        }
        cancelText="Volver"
        variant={confirmAction?.action === 'cancel' ? 'danger' : 'neutral'}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
