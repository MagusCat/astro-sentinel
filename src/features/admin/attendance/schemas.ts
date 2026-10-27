import { z } from 'zod'

export const checkInSchema = z.object({
  client_id: z.string().uuid('ID de cliente inválido'),
  class_id: z.string().uuid('Selecciona una clase'),
  session_id: z.string().uuid().nullable(),
})
