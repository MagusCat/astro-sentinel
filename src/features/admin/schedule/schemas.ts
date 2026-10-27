import { z } from 'zod'
import { sanitizedString } from '@/lib/validation/common'

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM)')

export const sessionSchema = z.object({
  class_id: z.string().uuid('Selecciona una clase'),
  teacher_id: z.string().uuid().nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Selecciona al menos un día').transform((d) => [...new Set(d)]),
  start_time: time,
  end_time: time,
  capacity: z.number().int().min(1, 'El cupo debe ser al menos 1').max(500).nullable(),
  access_mode: z.enum(['open', 'roster']),
  is_paused: z.boolean(),
  room: sanitizedString.pipe(z.string().max(60)).nullable(),
}).refine((s) => s.end_time > s.start_time, { message: 'La hora de fin debe ser posterior al inicio', path: ['end_time'] })

export const teacherSchema = z.object({
  full_name: sanitizedString.pipe(z.string().min(2, 'El nombre es obligatorio').max(120)),
  phone_number: z.string().trim().max(30).nullable(),
  email: z.string().trim().email('Correo inválido').nullable().or(z.literal('').transform(() => null)),
})

export const enrollmentSchema = z.object({
  session_id: z.string().uuid('Horario inválido.'),
  client_id: z.string().uuid('Alumno inválido.'),
})
