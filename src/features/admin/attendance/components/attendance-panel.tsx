'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CalendarCheck, CheckCircle2, Clock, Infinity as InfinityIcon, Lock, Pause, RefreshCw, Search, Trash2, Users } from 'lucide-react'
import { Button, EmptyState, SearchInput, SectionCard, SelectField, Skeleton, Toast, ToastType } from '@/components/shared'
import { ClassData } from '@/features/admin/classes/types'
import { ClientData } from '@/features/admin/clients/types'
import { searchClients } from '@/features/admin/clients/queries'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { getTodayAttendance } from '../queries'
import { checkInClient, removeAttendance } from '../mutations'
import { TodayAttendance } from '../types'
import { getSessionRoster } from '@/features/admin/schedule/queries'
import { RosterMember } from '@/features/admin/schedule/types'

interface AttendancePanelProps {
  classes: ClassData[]
  canManage: boolean
  refreshTrigger: number
  setLoading: (loading: boolean) => void
}

export default function AttendancePanel({ classes, canManage, refreshTrigger, setLoading }: AttendancePanelProps) {
  const [today, setToday] = useState<TodayAttendance | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [classId, setClassId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<ClientData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null)
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  const load = useCallback(async () => {
    setLoading(true)
    setToday(await getTodayAttendance())
    setLoading(false)
  }, [setLoading])

  useEffect(() => { load() }, [load, refreshTrigger])

  useEffect(() => {
    let isMounted = true
    if (debouncedSearch.trim().length < 2) {
      setResults([])
      return
    }
    setIsSearching(true)
    searchClients(debouncedSearch).then((data) => {
      if (!isMounted) return
      setResults(data)
      setIsSearching(false)
    })
    return () => { isMounted = false }
  }, [debouncedSearch])

  const selectedSession = today?.sessions.find((s) => s.id === sessionId)

  useEffect(() => {
    let isMounted = true
    if (!sessionId || selectedSession?.accessMode !== 'roster') {
      setRoster([])
      return
    }
    getSessionRoster(sessionId).then((r) => { if (isMounted) setRoster(r) })
    return () => { isMounted = false }
  }, [sessionId, selectedSession?.accessMode])

  const selectSession = (id: string, sessionClassId: string) => {
    setSessionId(id)
    setClassId(sessionClassId)
  }

  const handleCheckIn = async (client: Pick<ClientData, 'id' | 'full_name'>) => {
    if (!classId) {
      setToast({ message: 'Selecciona primero un horario o una clase.', type: 'warning' })
      return
    }
    setBusyId(client.id)
    const res = await checkInClient({ client_id: client.id, class_id: classId, session_id: sessionId })
    setBusyId(null)
    if (res.success) {
      setLastCheckIn(client.full_name)
      setSearchTerm('')
      setToast({ message: `Asistencia registrada: ${client.full_name}`, type: 'success' })
      load()
    } else {
      setToast({ message: res.error || 'No se pudo registrar la asistencia.', type: 'error' })
    }
  }

  const handleRemove = async (id: string) => {
    setBusyId(id)
    const res = await removeAttendance(id)
    setBusyId(null)
    if (res.success) load()
    else setToast({ message: res.error || 'No se pudo eliminar.', type: 'error' })
  }

  const selectedClassName = classes.find((c) => c.id === classId)?.name

  return (
    <div className="flex flex-col gap-6 w-full flex-1 min-h-0 overflow-y-auto pb-4">
      <SectionCard title="Horarios de hoy" description="Toca un horario para registrar asistencia en él.">
        {!today ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : today.sessions.length === 0 ? (
          <EmptyState message="No hay horarios configurados para hoy. Puedes registrar por clase abajo." icon={<Clock className="w-8 h-8" />} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 stagger-children">
            {today.sessions.map((s) => {
              const pct = s.capacity === null ? 0 : Math.min(100, Math.round((s.attendees / s.capacity) * 100))
              const full = s.capacity !== null && s.attendees >= s.capacity
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSession(s.id, s.classId)}
                  disabled={s.isPaused}
                  aria-pressed={sessionId === s.id}
                  className={cn(
                    'text-left rounded-xl border-2 p-4 transition-all hover:shadow-md active:scale-[0.98] flex flex-col gap-2 disabled:opacity-50 disabled:pointer-events-none',
                    sessionId === s.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground truncate">{s.className}</span>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{s.startTime}–{s.endTime}</span>
                  </div>
                  <span className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    {s.accessMode === 'roster' && <Lock className="size-3 shrink-0" aria-label="Solo inscritos" />}
                    {s.teacherName || 'Sin profesor asignado'}
                  </span>
                  {s.isPaused ? (
                    <span className="text-xs font-semibold text-amber-600 flex items-center gap-1"><Pause className="size-3" /> Pausado hoy</span>
                  ) : s.capacity === null ? (
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><InfinityIcon className="size-3" /> {s.attendees} alumnos · sin límite</span>
                  ) : (
                    <>
                      <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={s.attendees} aria-valuemax={s.capacity} aria-label="Ocupación">
                        <div className={cn('h-full rounded-full transition-all duration-500', full ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={cn('text-xs font-semibold', full ? 'text-rose-600' : 'text-muted-foreground')}>
                        {s.attendees}/{s.capacity} {full ? '· Cupo lleno' : 'alumnos'}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SectionCard className="lg:col-span-3" title="Registrar asistencia">
          <div className="flex flex-col gap-4">
            <SelectField
              label="Clase"
              placeholder="Selecciona una clase"
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSessionId(null) }}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SearchInput
              placeholder="Buscar alumno por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 rounded-xl text-base"
              containerClassName="w-full sm:max-w-none"
              autoFocus
            />

            {roster.length > 0 && !searchTerm && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Lock className="size-4 text-primary" /> Inscritos en este horario</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 stagger-children">
                  {roster.map((m) => {
                    const done = today?.rows.some((r) => r.clientId === m.client_id && r.classId === classId)
                    return (
                      <button
                        key={m.client_id}
                        type="button"
                        onClick={() => handleCheckIn({ id: m.client_id, full_name: m.full_name })}
                        disabled={done || busyId === m.client_id}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-xl border-2 p-3 text-left text-sm font-medium transition-all active:scale-[0.98]',
                          done ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-border bg-card text-foreground hover:border-primary/50'
                        )}
                      >
                        <span className="truncate">{m.full_name}</span>
                        {done ? <CheckCircle2 className="size-4 shrink-0" /> : <CalendarCheck className="size-4 shrink-0 text-muted-foreground" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {lastCheckIn && !searchTerm && (
              <div key={lastCheckIn} className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 animate-fade-in-up">
                <CheckCircle2 className="size-8 text-emerald-600 animate-pop-in" />
                <div>
                  <p className="font-bold text-foreground">{lastCheckIn}</p>
                  <p className="text-sm text-muted-foreground">Asistencia registrada{selectedClassName ? ` en ${selectedClassName}` : ''}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 stagger-children" aria-live="polite">
              {isSearching ? (
                <div className="py-6 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
              ) : searchTerm.trim().length >= 2 && results.length === 0 ? (
                <EmptyState message="No se encontraron alumnos." icon={<Search className="w-8 h-8" />} />
              ) : (
                results.map((client) => (
                  <div key={client.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{client.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {client.has_active_membership ? `${client.current_class_name || 'General'} · ${client.current_plan_name || 'Plan'}` : 'Sin membresía activa'}
                      </p>
                    </div>
                    <Button onClick={() => handleCheckIn(client)} disabled={busyId === client.id} className="shrink-0">
                      <CalendarCheck className="size-4" />
                      {busyId === client.id ? 'Registrando...' : 'Registrar'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title={`Asistencias de hoy (${today?.rows.length ?? 0})`}
          titleAction={<Users className="size-5 text-primary" />}
        >
          {!today ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : today.rows.length === 0 ? (
            <EmptyState message="Aún no hay asistencias registradas hoy." />
          ) : (
            <ul className="flex flex-col gap-2 max-h-[420px] overflow-y-auto stagger-children">
              {today.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/10">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.className} · {new Date(r.checkedInAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-xs" onClick={() => handleRemove(r.id)} disabled={busyId === r.id} aria-label={`Eliminar asistencia de ${r.clientName}`}>
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
