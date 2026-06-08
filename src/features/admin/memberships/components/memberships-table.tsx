'use client'

import React, { useState, useMemo } from 'react'
import { MoreVertical, Ban, Pause, Play, Search, Filter } from 'lucide-react'
import { MembershipsTableRow, MembershipsPanelData } from '../types'
import { freezeMembership, unfreezeMembership, cancelMembership } from '../mutations'
import { AuthenticatedUser } from '@/features/auth/types'
import { DataTable, SearchInput, SelectField, ConfirmDialog, Toast, ToastType } from '@/components/shared'
import ClassOccupancy from './class-occupancy'
import { Button } from '@/components/shared'
import { MEMBERSHIP_STATUS } from '@/lib/constants'

interface MembershipsTableProps {
  memberships: MembershipsTableRow[]
  activeUser: AuthenticatedUser
  onReload: () => void
  occupancy?: MembershipsPanelData['classOccupancy']
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

export default function MembershipsTable({ memberships, activeUser, onReload, occupancy }: MembershipsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    id: string
    action: 'freeze' | 'unfreeze' | 'cancel'
    message: string
  } | null>(null)

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
    if (confirmAction.action === 'freeze') actionFn = freezeMembership
    else if (confirmAction.action === 'unfreeze') actionFn = unfreezeMembership
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

  const promptAction = (action: 'freeze' | 'unfreeze' | 'cancel', id: string, message: string) => {
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
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
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
              onClick={() => promptAction('freeze', row.id, '¿Estás seguro que deseas pausar esta membresía? Los días restantes se congelarán y el cliente perderá acceso inmediatamente hasta que la membresía sea reanudada.')}
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

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 w-full">
        {occupancy && (
          <div className="flex-none lg:w-[220px] xl:w-[260px] flex flex-col min-h-0 lg:h-full">
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

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeAction}
        title={
          confirmAction?.action === 'freeze' ? 'Pausar Membresía' :
          confirmAction?.action === 'unfreeze' ? 'Reanudar Membresía' : 'Cancelar Membresía'
        }
        message={confirmAction?.message || ''}
        confirmText={
          confirmAction?.action === 'freeze' ? 'Pausar' :
          confirmAction?.action === 'unfreeze' ? 'Reanudar' : 'Cancelar Membresía'
        }
        cancelText="Volver"
        variant={confirmAction?.action === 'cancel' ? 'danger' : 'neutral'}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
