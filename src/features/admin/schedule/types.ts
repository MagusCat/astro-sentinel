export interface Teacher {
  id: string
  full_name: string
  phone_number: string | null
  email: string | null
}

export interface ScheduleSession {
  id: string
  class_id: string
  class_name: string
  teacher_id: string | null
  teacher_name: string | null
  weekday: number
  start_time: string
  end_time: string
  capacity: number | null // null = sin límite
  access_mode: SessionAccessMode
  is_paused: boolean
  enrolled: number
  room: string | null
}

export type SessionAccessMode = 'open' | 'roster'

export interface RosterMember {
  client_id: string
  full_name: string
}

export interface ScheduleData {
  sessions: ScheduleSession[]
  teachers: Teacher[]
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const
