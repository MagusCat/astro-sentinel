'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button, ConfirmDialog, DatePicker, EmptyState, Modal, PriceDisplay, Skeleton, Toast, ToastType } from '@/components/shared';

import { ClientData, GroupedClientMemberships, ClientMembershipView } from '../types'
import { getClientPayments, getClientMemberships, getAllClientMemberships } from '../queries'
import { freezeMembership, unfreezeMembership, cancelMembership } from '@/features/admin/memberships/mutations'
import { MEMBERSHIP_STATUS } from '@/lib/config'
import { User, Phone, Mail, Calendar, CalendarCheck, CreditCard, Pause, Play, Clock, Ban, History } from 'lucide-react'
import { getClientAttendance } from '@/features/admin/attendance/queries'
import { formatCalendarDate } from '@/lib/dates'
import { calcRemainingDays } from '@/features/admin/memberships/utils'
import { addDays, todayStr } from '@/lib/dates'

interface ClientDetailsModalProps {
  client: ClientData
  onClose: () => void
}

export default function ClientDetailsModal({ client, onClose }: ClientDetailsModalProps) {
  const [payments, setPayments] = useState<{ id: string; total_amount: number; payment_method: string; transaction_date: string }[]>([])
  const [totalPayments, setTotalPayments] = useState(0)
  const [memberships, setMemberships] = useState<GroupedClientMemberships[]>([])
  const [loading, setLoading] = useState(true)
  const [freezeLoading, setFreezeLoading] = useState<string | null>(null)
  const [membershipToFreezeId, setMembershipToFreezeId] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState<string>('')
  const [targetDateError, setTargetDateError] = useState<string | null>(null)
  const [membershipToCancel, setMembershipToCancel] = useState<{ id: string, isCurrent: boolean, hasFutures: boolean } | null>(null)
  
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [attendance, setAttendance] = useState<{ date: string; className: string }[]>([])
  const [allMemberships, setAllMemberships] = useState<ClientMembershipView[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const getPreviewFreezeDays = () => {
    if (!targetDate) return 0
    const todayDate = new Date(todayStr() + 'T00:00:00')
    const target = new Date(targetDate + 'T00:00:00')
    if (target <= todayDate) return 0
    const freezeMs = target.getTime() - todayDate.getTime()
    return Math.ceil(freezeMs / (1000 * 60 * 60 * 24))
  }

  const previewFreezeDays = getPreviewFreezeDays()

  const loadData = useCallback(async () => {
    setLoading(true)
    const [paymentsRes, membershipsData, attendanceData] = await Promise.all([
      getClientPayments(client.id),
      getClientMemberships(client.id),
      getClientAttendance(client.id)
    ])
    setAttendance(attendanceData)
    setPayments(paymentsRes.data)
    setTotalPayments(paymentsRes.count)
    setMemberships(membershipsData)
    setLoading(false)
  }, [client.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadHistory = async () => {
    setHistoryLoading(true)
    const data = await getAllClientMemberships(client.id)
    setAllMemberships(data)
    setHistoryLoading(false)
    setShowFullHistory(true)
  }

  const handleFreeze = async (membershipId: string, date: string) => {
    setFreezeLoading(membershipId)
    const res = await freezeMembership(membershipId, date)
    setFreezeLoading(null)
    
    if (res.success) {
      setToast({ message: 'Membresía pausada exitosamente.', type: 'success' })
      setMembershipToFreezeId(null)
      setTargetDate('')
      setTargetDateError(null)
      loadData()
    } else {
      setTargetDateError(res.error || 'Error al pausar.')
      setToast({ message: res.error || 'Error al pausar.', type: 'error' })
    }
  }

  const handleUnfreeze = async (membershipId: string) => {
    setFreezeLoading(membershipId)
    const res = await unfreezeMembership(membershipId)
    setFreezeLoading(null)
    
    if (res.success) {
      setToast({ message: 'Membresía reanudada exitosamente.', type: 'success' })
      loadData()
    } else {
      setToast({ message: res.error || 'Error al reanudar.', type: 'error' })
    }
  }

  const handleCancel = async (membershipId: string) => {
    setFreezeLoading(membershipId)
    const res = await cancelMembership(membershipId)
    setFreezeLoading(null)
    
    if (res.success) {
      setToast({ message: 'Membresía cancelada exitosamente.', type: 'success' })
      loadData()
    } else {
      setToast({ message: res.error || 'Error al cancelar.', type: 'error' })
    }
  }

  const classesWithMemberships = memberships

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Detalles del Cliente" size="4xl">
        <div className="flex flex-col md:flex-row gap-6 w-full md:overflow-hidden">
          
          <div className="contents md:flex w-full md:w-[40%] lg:w-[38%] flex-col gap-6 overflow-visible md:overflow-y-auto pr-0 md:pr-2 min-w-0">
            <div className="order-1 md:order-none bg-muted/30 border border-border/50 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight truncate">{client.full_name}</h3>
                  <span className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
                    Registrado: {new Date(client.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-muted text-muted-foreground p-1.5 rounded-md"><Phone className="w-4 h-4 stroke-[2.5]" /></div>
                  <span className="truncate font-medium">{client.phone_number || 'No especificado'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="bg-muted text-muted-foreground p-1.5 rounded-md"><Mail className="w-4 h-4 stroke-[2.5]" /></div>
                  <span className="truncate font-medium">{client.email || 'No especificado'}</span>
                </div>
              </div>
            </div>

            <div className="order-3 md:order-none bg-card border border-border/50 rounded-xl p-4 flex flex-col flex-1 min-h-[250px]">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 stroke-[2]" />
                Últimos Pagos
              </h4>
              
              <div className="flex-1 overflow-visible md:overflow-y-auto">
                {loading ? (
                  <div className="space-y-2.5">
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground italic">Sin pagos registrados.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border border-border/40 bg-muted/10">
                        <div className="flex flex-col gap-1">
                          <PriceDisplay amount={p.total_amount} variant="badge" />
                          <span className="text-sm text-muted-foreground uppercase">{p.payment_method}</span>
                        </div>
                        <span className="text-sm font-mono text-muted-foreground">
                          {new Date(p.transaction_date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    ))}
                    {totalPayments > 5 && (
                      <div className="text-center mt-2">
                        <span className="text-sm text-muted-foreground italic">Mostrando los 5 últimos pagos ({totalPayments} en total).</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="order-4 md:order-none bg-card border border-border/50 rounded-xl p-4 flex flex-col">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 stroke-[2]" />
                Asistencias recientes ({attendance.length})
              </h4>
              {loading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : attendance.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground italic">Sin asistencias registradas.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {attendance.map((a, i) => (
                    <span key={`${a.date}-${i}`} title={a.className} className="text-xs font-mono px-2 py-1 rounded-md bg-primary/10 text-primary">
                      {formatCalendarDate(a.date, { day: '2-digit', month: 'short' })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="order-2 md:order-none w-full md:w-[60%] lg:w-[62%] flex flex-col gap-4 overflow-visible md:overflow-y-auto pr-0 md:pr-2 min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h4 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 stroke-[2] text-primary" />
                Membresías por Disciplina
              </h4>
              <Button variant="neutral" size="sm" onClick={loadHistory} className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2">
                <History className="w-3.5 h-3.5" />
                Historial
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : classesWithMemberships.length === 0 ? (
              <div className="py-12 border border-border/50 rounded-xl bg-muted/20">
                <EmptyState message="El cliente no tiene ninguna membresía activa o futura." />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {classesWithMemberships.map((group) => {
                  const current = group.current
                  const futures = group.future

                  if (!current) return null

                  const isFrozen = current.status === MEMBERSHIP_STATUS.FROZEN
                  const isCancelled = current.status === MEMBERSHIP_STATUS.CANCELLED
                  
                  let displayRemainingDays = current.remaining_days
                  if (isCancelled) {
                    displayRemainingDays = 0
                  } else if (current.status === MEMBERSHIP_STATUS.ACTIVE) {
                    displayRemainingDays = calcRemainingDays(current.end_date)
                  }

                  return (
                    <div key={group.class_name} className="flex flex-col gap-2">
                      <h5 className="font-bold text-foreground text-sm pl-1">{group.class_name}</h5>
                      
                      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                        isCancelled
                          ? 'bg-muted/50 border-muted-foreground/20 opacity-70 grayscale'
                          : isFrozen 
                            ? 'bg-slate-500/10 border-slate-500/30 grayscale-[0.5]' 
                            : 'bg-card border-primary/30 shadow-sm'
                      }`}>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              isCancelled ? 'bg-muted-foreground/20 text-muted-foreground' :
                              isFrozen ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300' : 'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {isCancelled ? 'Cancelada' : isFrozen ? 'Pausada' : 'Activa'}
                            </span>
                            <span className="font-semibold text-foreground">{current.plan_name}</span>
                          </div>
                          
                          {isFrozen ? (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                              <span>Inicio: <span className="font-mono font-medium text-foreground">{new Date(current.start_date + 'T00:00:00').toLocaleDateString('es-ES')}</span></span>
                              <span>Fin: <span className="font-mono font-medium text-foreground">{new Date(current.end_date + 'T00:00:00').toLocaleDateString('es-ES')}</span></span>
                              {current.frozen_days ? (
                                <span>Pausa: <span className="font-bold text-foreground">{current.frozen_days} días</span></span>
                              ) : null}
                              <div className="flex items-center gap-1.5 text-slate-700/80 dark:text-slate-300/80 font-medium">
                                <Pause className="w-4 h-4 stroke-[2.5]" />
                                {displayRemainingDays} días restantes
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                              <span>Inicio: <span className="font-mono font-medium text-foreground">{new Date(current.start_date + 'T00:00:00').toLocaleDateString('es-ES')}</span></span>
                              <span>Fin: <span className="font-mono font-medium text-foreground">{new Date(current.end_date + 'T00:00:00').toLocaleDateString('es-ES')}</span></span>
                              <span>Restantes: <span className="font-bold text-foreground">{displayRemainingDays} días</span></span>
                            </div>
                          )}
                        </div>

                        {!isCancelled && (
                          <div className="flex shrink-0 items-center justify-end w-full sm:w-auto gap-2 mt-2 sm:mt-0">
                            {isFrozen ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1 sm:flex-none border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/50 transition-colors"
                                onClick={() => handleUnfreeze(current.id)}
                                disabled={freezeLoading === current.id}
                              >
                                <Play className="w-4 h-4 mr-1.5 shrink-0 stroke-[2.5]" />
                                {freezeLoading === current.id ? 'Reanudando...' : 'Reanudar'}
                              </Button>
                            ) : displayRemainingDays >= 5 ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="flex-1 sm:flex-none text-foreground hover:bg-muted"
                                onClick={() => {
                                  setMembershipToFreezeId(current.id)
                                  setTargetDate('')
                                  setTargetDateError(null)
                                }}
                                disabled={freezeLoading === current.id}
                                title="Pausar"
                              >
                                <Pause className="w-4 h-4 mr-1.5 shrink-0 stroke-[2.5]" />
                                {freezeLoading === current.id ? 'Pausando...' : 'Pausar'}
                              </Button>
                            ) : null}
                            {(current.status === MEMBERSHIP_STATUS.ACTIVE || current.status === MEMBERSHIP_STATUS.FROZEN) && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                title="Cancelar Membresía"
                                className="shrink-0 w-10 px-0"
                                onClick={() => setMembershipToCancel({ id: current.id, isCurrent: true, hasFutures: futures.length > 0 })}
                                disabled={freezeLoading === current.id}
                              >
                                <Ban className="w-4 h-4 stroke-[2.5]" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {futures.length > 0 && (
                        <div className="flex flex-col gap-1.5 pl-4 mt-1 border-l-2 border-border/60">
                          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80 mb-0.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> En Cola
                          </p>
                          {futures.map((fut) => {
                            const isFutCancelled = fut.status === MEMBERSHIP_STATUS.CANCELLED
                            return (
                            <div key={fut.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 transition-all ${
                              isFutCancelled ? 'bg-muted/10 border-border/20 opacity-50 grayscale' : 'border-border/40 bg-muted/30 opacity-80 grayscale hover:grayscale-0'
                            }`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-bold px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground uppercase shrink-0">
                                  {isFutCancelled ? 'Cancelada' : 'Futuro'}
                                </span>
                                <span className="text-sm font-semibold text-foreground truncate">{fut.plan_name}</span>
                              </div>
                              
                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0">
                                <span className="text-sm font-mono text-muted-foreground truncate">
                                  Inicio: {new Date(fut.start_date + 'T00:00:00').toLocaleDateString('es-ES')} - Fin: {new Date(fut.end_date + 'T00:00:00').toLocaleDateString('es-ES')}
                                </span>
                                {(fut.status === MEMBERSHIP_STATUS.ACTIVE || fut.status === MEMBERSHIP_STATUS.FROZEN) && (
                                  <button 
                                    onClick={() => setMembershipToCancel({ id: fut.id, isCurrent: false, hasFutures: false })}
                                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50 flex items-center justify-center p-1"
                                    disabled={freezeLoading === fut.id}
                                    title="Cancelar Membresía Futura"
                                  >
                                    <Ban className="w-4 h-4 stroke-[2.5]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </Modal>

      <Modal
        isOpen={!!membershipToFreezeId}
        onClose={() => setMembershipToFreezeId(null)}
        title="Pausar Membresía"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setMembershipToFreezeId(null)} disabled={freezeLoading === membershipToFreezeId}>
              Volver
            </Button>
            <Button
              size="sm"
              onClick={() => membershipToFreezeId && handleFreeze(membershipToFreezeId, targetDate)}
              disabled={freezeLoading === membershipToFreezeId || !targetDate}
            >
              {freezeLoading === membershipToFreezeId ? 'Pausando...' : 'Confirmar pausa'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Selecciona la fecha hasta la cual deseas pausar esta membresía. El cliente perderá acceso inmediatamente y la duración se calculará automáticamente.
          </p>
          <DatePicker
            label="Fecha de reactivación"
            min={addDays(todayStr(), 1)}
            value={targetDate}
            onChange={(event) => {
              setTargetDate(event.target.value)
              setTargetDateError(null)
            }}
            error={targetDateError ?? undefined}
            className="max-w-45"
          />
          {previewFreezeDays > 0 && !targetDateError && (
            <div className="bg-primary/5 border border-primary/20 text-primary rounded-xl p-3.5 text-sm font-medium flex items-center gap-3 mt-2">
              <Pause className="w-5 h-5 text-primary shrink-0" />
              <span>La membresía estará pausada por <strong className="font-bold font-mono text-foreground text-base">{previewFreezeDays}</strong> {previewFreezeDays === 1 ? 'día' : 'días'}.</span>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showFullHistory}
        onClose={() => setShowFullHistory(false)}
        title={`Historial de Membresías: ${client.full_name}`}
        size="2xl"
      >
        <div className="flex flex-col gap-4">
          {historyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : allMemberships.length === 0 ? (
            <EmptyState message="No hay registros históricos." />
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {allMemberships.map((m) => (
                <div key={m.id} className="p-3 border border-border/40 rounded-xl bg-muted/10 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{m.class_name}</span>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-border/50 ${
                        m.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                        m.status === 'expired' ? 'bg-rose-500/10 text-rose-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{m.plan_name}</span>
                  </div>
                  <div className="text-right flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                      {new Date(m.start_date + 'T00:00:00').toLocaleDateString('es-ES')} - {new Date(m.end_date + 'T00:00:00').toLocaleDateString('es-ES')}
                    </span>
                    <span className="font-bold text-sm text-foreground">{m.duration_days || 0} días</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="neutral" onClick={() => setShowFullHistory(false)}>Cerrar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!membershipToCancel}
        title="Cancelar Membresía"
        message={
          membershipToCancel?.isCurrent && membershipToCancel?.hasFutures
            ? "Esta acción no es reversible. Al cancelar esta membresía activa el cliente perderá acceso de inmediato, y la membresía que está en cola SÓLO se habilitará cuando llegue su fecha de inicio original establecida."
            : "¿Estás seguro que deseas cancelar esta membresía? Esta acción es permanente y no podrá deshacerse."
        }
        confirmText="Sí, Cancelar Membresía"
        cancelText="Volver"
        onConfirm={() => {
          if (membershipToCancel) handleCancel(membershipToCancel.id)
          setMembershipToCancel(null)
        }}
        onClose={() => setMembershipToCancel(null)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
