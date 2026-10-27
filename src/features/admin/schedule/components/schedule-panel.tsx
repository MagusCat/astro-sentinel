'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CalendarPlus, Clock, Infinity as InfinityIcon, Lock, Pause, Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { Button, ConfirmDialog, EmptyState, FormActions, Modal, SectionCard, Skeleton, TextField, Toast, ToastType } from '@/components/shared'
import { ClassData } from '@/features/admin/classes/types'
import { todayStr, weekdayOf } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { getScheduleData } from '../queries'
import { deleteSession, deleteTeacher, saveTeacher } from '../mutations'
import SessionFormModal, { WEEK_ORDER } from './session-form-modal'
import { ScheduleData, ScheduleSession, Teacher, WEEKDAYS } from '../types'

interface SchedulePanelProps {
  classes: ClassData[]
  refreshTrigger: number
  setLoading: (loading: boolean) => void
}

const EMPTY_TEACHER = { full_name: '', phone_number: '', email: '' }

export default function SchedulePanel({ classes, refreshTrigger, setLoading }: SchedulePanelProps) {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [sessionForm, setSessionForm] = useState<{ session?: ScheduleSession } | null>(null)
  const [teacherForm, setTeacherForm] = useState<{ id?: string; values: typeof EMPTY_TEACHER } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'session' | 'teacher'; id: string; label: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const todayWeekday = weekdayOf(todayStr())

  const load = useCallback(async () => {
    setLoading(true)
    setData(await getScheduleData())
    setLoading(false)
  }, [setLoading])

  useEffect(() => { load() }, [load, refreshTrigger])

  const finish = (res: { success: boolean; error?: string }, okMessage: string) => {
    setSaving(false)
    if (!res.success) {
      setToast({ message: res.error || 'Ocurrió un error.', type: 'error' })
      return false
    }
    setToast({ message: okMessage, type: 'success' })
    load()
    return true
  }

  const submitTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherForm) return
    const v = teacherForm.values
    setSaving(true)
    const res = await saveTeacher({ full_name: v.full_name, phone_number: v.phone_number.trim() || null, email: v.email.trim() || null }, teacherForm.id)
    if (finish(res, 'Profesor guardado.')) setTeacherForm(null)
  }

  const handleDelete = async () => {
    if (!confirm) return
    setSaving(true)
    const res = confirm.kind === 'session' ? await deleteSession(confirm.id) : await deleteTeacher(confirm.id)
    if (finish(res, 'Eliminado.')) setConfirm(null)
  }

  const editTeacher = (t: Teacher) => setTeacherForm({
    id: t.id,
    values: { full_name: t.full_name, phone_number: t.phone_number || '', email: t.email || '' },
  })

  const hoursByTeacher = (teacherId: string) =>
    (data?.sessions || [])
      .filter((s) => s.teacher_id === teacherId && !s.is_paused)
      .reduce((sum, s) => sum + (toMinutes(s.end_time) - toMinutes(s.start_time)) / 60, 0)

  const setTeacherValue = (key: keyof typeof EMPTY_TEACHER, value: string) =>
    setTeacherForm((f) => f && { ...f, values: { ...f.values, [key]: value } })

  return (
    <div className="flex flex-col gap-6 w-full flex-1 min-h-0 overflow-y-auto pb-4">
      <SectionCard
        title="Horario semanal"
        description="Clases recurrentes con su cupo máximo y profesor."
        titleAction={
          <Button onClick={() => setSessionForm({})} disabled={classes.length === 0}>
            <CalendarPlus className="size-4" /> Nuevo horario
          </Button>
        }
      >
        {!data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {WEEK_ORDER.map((d) => <Skeleton key={d} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 stagger-children">
            {WEEK_ORDER.map((day) => {
              const daySessions = data.sessions.filter((s) => s.weekday === day)
              return (
                <div key={day} className={cn('rounded-xl border p-3 flex flex-col gap-2 min-h-[140px]', day === todayWeekday ? 'border-primary bg-primary/5' : 'border-border bg-muted/10')}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{WEEKDAYS[day]}</span>
                    {day === todayWeekday && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Hoy</span>}
                  </div>
                  {daySessions.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Sin clases</span>
                  ) : daySessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSessionForm({ session: s })}
                      className={cn('group text-left rounded-lg border bg-card p-2.5 hover:border-primary/50 hover:shadow-sm transition-all', s.is_paused ? 'border-dashed border-amber-500/60 opacity-70' : 'border-border')}
                    >
                      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Clock className="size-3" /> {s.start_time}–{s.end_time}
                      </div>
                      <p className="font-semibold text-sm text-foreground truncate">{s.class_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.teacher_name || 'Sin profesor'}{s.room ? ` · ${s.room}` : ''}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {s.capacity === null ? <><InfinityIcon className="size-3" /> Sin límite</> : <><Users className="size-3" /> {s.access_mode === 'roster' ? `${s.enrolled}/${s.capacity}` : s.capacity}</>}
                        </span>
                        {s.access_mode === 'roster' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            <Lock className="size-3" /> Inscritos{s.capacity === null ? ` (${s.enrolled})` : ''}
                          </span>
                        )}
                        {s.is_paused && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            <Pause className="size-3" /> Pausado
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Profesores"
        description="Horas semanales calculadas a partir del horario."
        titleAction={
          <Button variant="outline" onClick={() => setTeacherForm({ values: EMPTY_TEACHER })}>
            <UserPlus className="size-4" /> Nuevo profesor
          </Button>
        }
      >
        {!data ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : data.teachers.length === 0 ? (
          <EmptyState message="No hay profesores registrados." icon={<Users className="w-8 h-8" />} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
            {data.teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{t.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{t.phone_number || t.email || 'Sin contacto'}</p>
                  <p className="text-xs font-semibold text-primary mt-1">{hoursByTeacher(t.id).toFixed(1)} h / semana</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon-xs" onClick={() => editTeacher(t)} aria-label={`Editar ${t.full_name}`}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => setConfirm({ kind: 'teacher', id: t.id, label: t.full_name })} aria-label={`Eliminar ${t.full_name}`}><Trash2 className="size-4 text-rose-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {sessionForm && (
        <SessionFormModal
          session={sessionForm.session}
          classes={classes}
          teachers={data?.teachers || []}
          onClose={() => setSessionForm(null)}
          onSaved={(message) => { setSessionForm(null); finish({ success: true }, message) }}
          onError={(message) => setToast({ message, type: 'error' })}
          onDelete={(session) => { setSessionForm(null); setConfirm({ kind: 'session', id: session.id, label: 'este horario' }) }}
        />
      )}

      {teacherForm && (
        <Modal
          isOpen
          onClose={() => setTeacherForm(null)}
          title={teacherForm.id ? 'Editar profesor' : 'Nuevo profesor'}
          footer={<FormActions onCancel={() => setTeacherForm(null)} isLoading={saving} formId="teacher-form" className="mt-0" />}
        >
          <form id="teacher-form" onSubmit={submitTeacher} className="flex flex-col gap-4">
            <TextField label="Nombre completo" required value={teacherForm.values.full_name} onChange={(e) => setTeacherValue('full_name', e.target.value)} />
            <TextField label="Teléfono" type="tel" value={teacherForm.values.phone_number} onChange={(e) => setTeacherValue('phone_number', e.target.value)} />
            <TextField label="Correo" type="email" value={teacherForm.values.email} onChange={(e) => setTeacherValue('email', e.target.value)} />
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Confirmar eliminación"
        message={`¿Eliminar ${confirm?.label}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={saving}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
