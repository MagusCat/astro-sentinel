'use client'

import React, { useEffect, useState } from 'react'
import { Infinity as InfinityIcon, Lock, Pause, Play, Trash2, UserMinus, UserPlus, Users } from 'lucide-react'
import { Button, FormActions, Modal, SearchInput, SelectField, TextField, ToggleButtonGroup } from '@/components/shared'
import { ClassData } from '@/features/admin/classes/types'
import { ClientData } from '@/features/admin/clients/types'
import { searchClients } from '@/features/admin/clients/queries'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { getSessionRoster } from '../queries'
import { enrollClient, saveSession, unenrollClient } from '../mutations'
import { RosterMember, ScheduleSession, SessionAccessMode, Teacher, WEEKDAYS } from '../types'

// Monday-first, the way academies read a week.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

interface SessionFormModalProps {
  session?: ScheduleSession
  classes: ClassData[]
  teachers: Teacher[]
  onClose: () => void
  onSaved: (message: string) => void
  onError: (message: string) => void
  onDelete: (session: ScheduleSession) => void
}

export default function SessionFormModal({ session, classes, teachers, onClose, onSaved, onError, onDelete }: SessionFormModalProps) {
  const isEdit = !!session
  const [classId, setClassId] = useState(session?.class_id ?? '')
  const [teacherId, setTeacherId] = useState(session?.teacher_id ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(session ? [session.weekday] : [1])
  const [startTime, setStartTime] = useState(session?.start_time ?? '18:00')
  const [endTime, setEndTime] = useState(session?.end_time ?? '19:00')
  const [unlimited, setUnlimited] = useState(session ? session.capacity === null : false)
  const [capacity, setCapacity] = useState(String(session?.capacity ?? 20))
  const [accessMode, setAccessMode] = useState<SessionAccessMode>(session?.access_mode ?? 'open')
  const [isPaused, setIsPaused] = useState(session?.is_paused ?? false)
  const [room, setRoom] = useState(session?.room ?? '')
  const [saving, setSaving] = useState(false)

  const [roster, setRoster] = useState<RosterMember[]>([])
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterResults, setRosterResults] = useState<ClientData[]>([])
  const [rosterBusy, setRosterBusy] = useState<string | null>(null)
  const debouncedRosterSearch = useDebounce(rosterSearch, 300)

  useEffect(() => {
    if (session) getSessionRoster(session.id).then(setRoster)
  }, [session])

  useEffect(() => {
    let isMounted = true
    if (debouncedRosterSearch.trim().length < 2) {
      setRosterResults([])
      return
    }
    searchClients(debouncedRosterSearch).then((res) => { if (isMounted) setRosterResults(res.slice(0, 6)) })
    return () => { isMounted = false }
  }, [debouncedRosterSearch])

  const toggleDay = (day: number) => {
    // An existing slot lives on exactly one day; new ones can be created on several at once.
    if (isEdit) return setWeekdays([day])
    setWeekdays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await saveSession({
      class_id: classId,
      teacher_id: teacherId || null,
      weekdays,
      start_time: startTime,
      end_time: endTime,
      capacity: unlimited ? null : Number(capacity),
      access_mode: accessMode,
      is_paused: isPaused,
      room: room.trim() || null,
    }, session?.id)
    setSaving(false)
    if (!res.success) return onError(res.error || 'No se pudo guardar el horario.')
    onSaved(!isEdit && weekdays.length > 1 ? `${weekdays.length} horarios creados.` : 'Horario guardado.')
  }

  const addToRoster = async (client: ClientData) => {
    if (!session) return
    setRosterBusy(client.id)
    const res = await enrollClient(session.id, client.id)
    setRosterBusy(null)
    if (!res.success) return onError(res.error || 'No se pudo inscribir al alumno.')
    setRosterSearch('')
    setRoster(await getSessionRoster(session.id))
  }

  const removeFromRoster = async (clientId: string) => {
    if (!session) return
    setRosterBusy(clientId)
    const res = await unenrollClient(session.id, clientId)
    setRosterBusy(null)
    if (!res.success) return onError(res.error || 'No se pudo quitar al alumno.')
    setRoster((r) => r.filter((m) => m.client_id !== clientId))
  }

  const capacityNumber = unlimited ? null : Number(capacity) || 0
  const rosterFull = capacityNumber !== null && roster.length >= capacityNumber
  const enrolledIds = new Set(roster.map((m) => m.client_id))

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar horario' : 'Nuevo horario'}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {session ? (
            <Button variant="ghost" onClick={() => onDelete(session)}>
              <Trash2 className="size-4 text-rose-500" /> Eliminar
            </Button>
          ) : <span />}
          <FormActions onCancel={onClose} isLoading={saving} formId="session-form" className="mt-0" submitText={!isEdit && weekdays.length > 1 ? `Crear ${weekdays.length} horarios` : 'Guardar'} />
        </div>
      }
    >
      <form id="session-form" onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField containerClassName="sm:col-span-2" label="Clase" placeholder="Selecciona una clase" required value={classId} onChange={(e) => setClassId(e.target.value)} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
          <TextField label="Inicio" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <TextField label="Fin" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          <SelectField label="Profesor" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} options={[{ value: '', label: 'Sin profesor' }, ...teachers.map((t) => ({ value: t.id, label: t.full_name }))]} />
          <TextField label="Salón (opcional)" value={room} onChange={(e) => setRoom(e.target.value)} />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-foreground mb-2">{isEdit ? 'Día' : 'Días (puedes elegir varios)'}</legend>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {WEEK_ORDER.map((day) => {
              const selected = weekdays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={selected}
                  className={cn(
                    'h-11 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {WEEKDAYS[day].slice(0, 3)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-foreground mb-2">Cupo</legend>
          <ToggleButtonGroup
            value={unlimited ? 'unlimited' : 'limited'}
            onChange={(v) => setUnlimited(v === 'unlimited')}
            options={[
              { value: 'limited', label: 'Limitado', icon: <Users className="size-4" /> },
              { value: 'unlimited', label: 'Sin límite', icon: <InfinityIcon className="size-4" /> },
            ]}
          />
          {!unlimited && (
            <TextField label="Cupo máximo por clase" type="number" min={Math.max(1, roster.length)} max={500} required value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-foreground mb-2">¿Quién puede asistir?</legend>
          <ToggleButtonGroup
            value={accessMode}
            onChange={(v) => setAccessMode(v as SessionAccessMode)}
            options={[
              { value: 'open', label: 'Todos los alumnos de la clase', icon: <Users className="size-4" /> },
              { value: 'roster', label: 'Solo inscritos', icon: <Lock className="size-4" /> },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {accessMode === 'open'
              ? 'Cualquier alumno con membresía vigente de esta clase puede registrar asistencia, hasta llenar el cupo.'
              : 'Solo los alumnos de la lista pueden registrar asistencia en este horario.'}
          </p>
        </fieldset>

        {isEdit && (
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className={cn('flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors', isPaused ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-card')}
            aria-pressed={isPaused}
          >
            {isPaused ? <Play className="size-5 text-amber-600" /> : <Pause className="size-5 text-muted-foreground" />}
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{isPaused ? 'Horario pausado' : 'Horario activo'}</span>
              <span className="text-xs text-muted-foreground">{isPaused ? 'No acepta asistencias. Toca para reactivarlo.' : 'Pausa temporalmente sin borrarlo (vacaciones, feriados).'}</span>
            </span>
          </button>
        )}
      </form>

      {accessMode === 'roster' && (
        <section className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Alumnos inscritos</h4>
            <span className={cn('text-xs font-semibold tabular-nums', rosterFull ? 'text-rose-600' : 'text-muted-foreground')}>
              {roster.length}{capacityNumber !== null ? ` / ${capacityNumber}` : ''} {rosterFull && '· Lleno'}
            </span>
          </div>

          {!isEdit ? (
            <p className="text-sm text-muted-foreground italic">Guarda el horario primero para inscribir alumnos.</p>
          ) : (
            <>
              <SearchInput
                placeholder={rosterFull ? 'No quedan cupos' : 'Buscar alumno para inscribir...'}
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                disabled={rosterFull}
                containerClassName="w-full sm:max-w-none"
              />
              {rosterResults.length > 0 && (
                <ul className="flex flex-col gap-1.5 stagger-children">
                  {rosterResults.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                      <span className="text-sm text-foreground truncate">{c.full_name}</span>
                      {enrolledIds.has(c.id) ? (
                        <span className="text-xs text-muted-foreground">Ya inscrito</span>
                      ) : (
                        <Button size="xs" onClick={() => addToRoster(c)} disabled={rosterBusy === c.id}>
                          <UserPlus className="size-3.5" /> Inscribir
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {roster.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nadie inscrito todavía.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {roster.map((m) => (
                    <li key={m.client_id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 pl-3 pr-1 py-1 text-sm text-foreground animate-fade-in-up">
                      {m.full_name}
                      <button
                        type="button"
                        onClick={() => removeFromRoster(m.client_id)}
                        disabled={rosterBusy === m.client_id}
                        className="size-8 inline-flex items-center justify-center rounded-full hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                        aria-label={`Quitar a ${m.full_name}`}
                      >
                        <UserMinus className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </Modal>
  )
}
