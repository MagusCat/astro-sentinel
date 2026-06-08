'use client'

import React, { useState } from 'react'
import { Schedule, ScheduleClass, DayKey, TimeSlot } from '../../core/types'
import { Plus, Trash2, Calendar, ChevronRight, Copy, ClipboardPaste, Settings2 } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField, TextareaField, ConfirmDialog } from '@/components/shared'

interface Props { 
  value: Schedule
  onChange: (v: Schedule) => void 
}

const DAYS: DayKey[] = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D']

export default function ScheduleEditor({ value, onChange }: Props) {
  const [activeClassIndex, setActiveClassIndex] = useState<number>(0)
  const [clipboardSlots, setClipboardSlots] = useState<TimeSlot[] | null>(null)
  const [classToDelete, setClassToDelete] = useState<number | null>(null)

  const updateClass = (ci: number, updated: ScheduleClass) => {
    const classes = [...value.classes]
    classes[ci] = updated
    onChange({ ...value, classes })
  }

  const toggleDay = (ci: number, day: DayKey) => {
    const cls = { ...value.classes[ci] }
    const current = cls.scheduleDays[day]
    if (current?.active) {
      const d = { ...cls.scheduleDays }
      delete d[day]
      cls.scheduleDays = d
    } else {
      cls.scheduleDays = { ...cls.scheduleDays, [day]: { active: true, slots: [] } }
    }
    updateClass(ci, cls)
  }

  const addSlot = (ci: number, day: DayKey) => {
    const cls = { ...value.classes[ci] }
    const dayData = cls.scheduleDays[day] || { active: true, slots: [] }
    cls.scheduleDays = { 
      ...cls.scheduleDays, 
      [day]: { ...dayData, slots: [...dayData.slots, { time: '08:00 - 09:00', period: 'AM' }] } 
    }
    updateClass(ci, cls)
  }

  const pasteSlots = (ci: number, day: DayKey) => {
    if (!clipboardSlots) return
    const cls = { ...value.classes[ci] }
    const dayData = cls.scheduleDays[day] || { active: true, slots: [] }
    cls.scheduleDays = { 
      ...cls.scheduleDays, 
      [day]: { ...dayData, slots: [...dayData.slots, ...clipboardSlots.map(s => ({...s}))] } 
    }
    updateClass(ci, cls)
  }

  const updateSlot = (ci: number, day: DayKey, si: number, field: keyof TimeSlot, val: string) => {
    const cls = { ...value.classes[ci] }
    const dayData = cls.scheduleDays[day]!
    const slots = [...dayData.slots]
    slots[si] = { ...slots[si], [field]: val }
    cls.scheduleDays = { ...cls.scheduleDays, [day]: { ...dayData, slots } }
    updateClass(ci, cls)
  }

  const removeSlot = (ci: number, day: DayKey, si: number) => {
    const cls = { ...value.classes[ci] }
    const dayData = cls.scheduleDays[day]!
    cls.scheduleDays = { ...cls.scheduleDays, [day]: { ...dayData, slots: dayData.slots.filter((_, j) => j !== si) } }
    updateClass(ci, cls)
  }

  const handleTimeChange = (ci: number, day: DayKey, si: number, isStart: boolean, val24: string) => {
    const cls = { ...value.classes[ci] }
    const dayData = cls.scheduleDays[day]!
    const slots = [...dayData.slots]
    const slot = slots[si]

    const parts = (slot.time || '08:00 - 09:00').split(' - ')
    let currentStart12 = parts[0] || '08:00'
    let currentEnd12 = parts[1] || '09:00'

    if (isStart) {
      currentStart12 = format12Hour(val24)
      if (val24) slot.period = getPeriod(val24)
    } else {
      currentEnd12 = format12Hour(val24)
    }

    slot.time = `${currentStart12} - ${currentEnd12}`
    cls.scheduleDays = { ...cls.scheduleDays, [day]: { ...dayData, slots } }
    updateClass(ci, cls)
  }

  const format12Hour = (val24: string) => {
    if (!val24) return ''
    const [h, m] = val24.split(':')
    let hour = parseInt(h, 10)
    hour = hour % 12
    if (hour === 0) hour = 12
    return `${hour.toString().padStart(2, '0')}:${m}`
  }

  const getPeriod = (val24: string) => {
    if (!val24) return 'AM'
    const [h] = val24.split(':')
    const hour = parseInt(h, 10)
    return hour >= 12 ? 'PM' : 'AM'
  }

  // Parse 12-hour string like "02:30" to 24-hour input value
  const to24HourApprox = (time12: string, period: string, isEnd: boolean, start24Approx: string) => {
    if (!time12 || !time12.includes(':')) return ''
    const [h, m] = time12.split(':')
    let hour = parseInt(h, 10)
    
    // Attempt to guess if end time crossed noon based on start time
    let isPM = period === 'PM'
    if (isEnd && start24Approx) {
       const startHour = parseInt(start24Approx.split(':')[0], 10)
       if (period === 'AM' && (hour < (startHour % 12) || hour === 12)) isPM = true
    }

    if (isPM && hour < 12) hour += 12
    if (!isPM && hour === 12) hour = 0
    return `${hour.toString().padStart(2, '0')}:${m}`
  }

  const currentClass = value.classes[activeClassIndex]

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start lg:items-stretch lg:h-full lg:min-h-0">
        
        <div className="lg:col-span-1 flex flex-col gap-6 lg:overflow-y-auto pr-1"> 
          <SectionCard 
            title="General" 
            titleAction={<Settings2 className="w-5 h-5 text-muted-foreground" />}
          >
            <TextField
              label="Encabezado de Sección"
              value={value.heading}
              onChange={e => onChange({ ...value, heading: e.target.value })}
            />
          </SectionCard>

          <div className="bg-card border border-border/40 rounded-lg p-4 flex flex-col gap-2 shadow-sm lg:flex-1 lg:min-h-0">
            <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider mb-2 shrink-0">Clases</h4>
            <div className="flex flex-col gap-1 lg:flex-1 lg:overflow-y-auto pr-2">
              {value.classes.map((cls, ci) => (
                <button
                  key={ci}
                  type="button"
                  onClick={() => setActiveClassIndex(ci)}
                  className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-md flex items-center justify-between transition-all cursor-pointer ${activeClassIndex === ci ? 'bg-primary text-white shadow-sm shadow-primary/10' : 'hover:bg-muted text-foreground'}`}
                >
                  <span className="truncate">{cls.name || 'Nueva Clase'}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ))}
            </div>

            <div className="h-[1px] bg-border/20 my-2" />

            <button 
              type="button"
              onClick={() => {
                const newCls: ScheduleClass = { name: 'Nueva Clase', description: '', details: [], scheduleDays: {} }
                onChange({ ...value, classes: [...value.classes, newCls] })
                setActiveClassIndex(value.classes.length)
              }}
              className="w-full text-sm font-bold text-primary flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Clase</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col lg:min-h-0">
          {currentClass ? (
            <div className="bg-card border border-border/40 rounded-lg p-6 shadow-sm flex flex-col gap-5 animate-in fade-in duration-200 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-border/10 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-primary" />
                  <h3 className="font-extrabold text-sm text-foreground">Editando: {currentClass.name || 'Nueva Clase'}</h3>
                </div>
                {value.classes.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => setClassToDelete(activeClassIndex)}
                    className="text-sm font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-md cursor-pointer transition-all"
                  >
                    Eliminar Clase
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <TextField
                  label="Nombre de la Clase"
                  value={currentClass.name}
                  onChange={e => updateClass(activeClassIndex, { ...currentClass, name: e.target.value })}
                />
                <TextareaField
                  label="Descripción de la Clase"
                  className="min-h-[80px] resize-y"
                  value={currentClass.description}
                  onChange={e => updateClass(activeClassIndex, { ...currentClass, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider">Días Activos de la Clase</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => {
                    const isActive = !!currentClass.scheduleDays[day]?.active
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(activeClassIndex, day)}
                        className={`w-12 h-12 font-mono text-sm font-extrabold rounded-md flex items-center justify-center cursor-pointer border transition-all ${isActive ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10' : 'bg-background border-border/60 text-muted-foreground hover:text-foreground'}`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0">
                <label className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider">Horarios por Día Activo</label>
                
                <div className="flex flex-col lg:flex-row lg:overflow-x-auto gap-4 pb-4 snap-x lg:flex-1 lg:min-h-0 items-start lg:items-stretch">
                  {DAYS.filter(day => currentClass.scheduleDays[day]?.active).map(day => {
                    const dayData = currentClass.scheduleDays[day]!
                    return (
                      <div key={day} className="bg-background border border-border/40 rounded-lg p-4 shadow-sm flex flex-col gap-2.5 shrink-0 w-full lg:w-[320px] snap-center lg:h-full">
                        
                        <div className="flex justify-between items-center border-b border-border/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-foreground">{value.dayLabels[day]}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setClipboardSlots([...(dayData.slots || [])])}
                                className="text-sm font-bold text-muted-foreground flex items-center gap-1 cursor-pointer hover:bg-muted px-2 py-1 rounded transition-all"
                                title="Copiar horarios de este día"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {clipboardSlots && (
                                <button
                                  type="button"
                                  onClick={() => pasteSlots(activeClassIndex, day)}
                                  className="text-sm font-bold text-primary flex items-center gap-1 cursor-pointer hover:bg-primary/10 px-2 py-1 rounded transition-all"
                                  title="Pegar horarios"
                                >
                                  <ClipboardPaste className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSlot(activeClassIndex, day)}
                            className="text-sm font-bold text-primary flex items-center gap-1 cursor-pointer hover:bg-primary/5 px-2.5 py-1 rounded transition-all ml-1"
                          >
                            <Plus className="w-4 h-4" /> 
                            <span>Añadir</span>
                          </button>
                        </div>

                        <div className="flex flex-col gap-2 lg:overflow-y-auto pr-1 lg:flex-1">
                          {dayData.slots.map((slot, si) => {
                            const parts = (slot.time || '').split(' - ')
                            const start24 = to24HourApprox(parts[0], slot.period, false, '')
                            const end24 = to24HourApprox(parts[1], slot.period, true, start24)

                            return (
                              <div key={si} className="flex gap-1.5 items-center bg-muted/20 p-1.5 rounded-md border border-border/40">
                                <div className="flex flex-col gap-1 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold uppercase text-muted-foreground w-8">De:</span>
                                    <TextField 
                                      type="time"
                                      containerClassName="flex-1"
                                      className="text-sm px-2 py-1 rounded-lg border border-border/60 bg-background flex-1 focus:outline-none focus:border-primary font-mono text-foreground h-[36px] font-semibold !p-1"
                                      value={start24} 
                                      onChange={e => handleTimeChange(activeClassIndex, day, si, true, e.target.value)} 
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold uppercase text-muted-foreground w-8">A:</span>
                                    <TextField 
                                      type="time"
                                      containerClassName="flex-1"
                                      className="text-sm px-2 py-1 rounded-lg border border-border/60 bg-background flex-1 focus:outline-none focus:border-primary font-mono text-foreground h-[36px] font-semibold !p-1"
                                      value={end24} 
                                      onChange={e => handleTimeChange(activeClassIndex, day, si, false, e.target.value)} 
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1 px-2">
                                  <span className="text-sm font-extrabold text-primary bg-primary/10 px-2 py-1 rounded">{slot.period}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                                  <button 
                                    type="button"
                                    onClick={() => removeSlot(activeClassIndex, day, si)} 
                                    className="text-rose-500 hover:text-rose-600 cursor-pointer p-1 hover:bg-rose-50 rounded transition-all"
                                    title="Eliminar bloque"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                          {dayData.slots.length === 0 && (
                            <p className="text-sm text-muted-foreground italic text-center py-2">Sin horarios asignados</p>
                          )}
                        </div>

                      </div>
                    )
                  })}
                </div>

                {DAYS.filter(day => currentClass.scheduleDays[day]?.active).length === 0 && (
                  <div className="text-center py-8 bg-background border border-dashed border-border/40 rounded-lg">
                    <p className="text-sm text-muted-foreground">No has activado ningún día de clase todavía.</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Selecciona días arriba para configurar sus horarios.</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-card border border-border/40 rounded-lg p-12 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">Selecciona una clase para editarla o crea una nueva.</p>
            </div>
          )}
        </div>

      </div>

      <ConfirmDialog
        isOpen={classToDelete !== null}
        onClose={() => setClassToDelete(null)}
        onConfirm={() => {
          if (classToDelete !== null) {
            onChange({ ...value, classes: value.classes.filter((_, j) => j !== classToDelete) })
            setActiveClassIndex(0)
            setClassToDelete(null)
          }
        }}
        title="Eliminar Clase"
        message={`¿Estás seguro de que deseas eliminar la clase "${classToDelete !== null ? value.classes[classToDelete]?.name : ''}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
