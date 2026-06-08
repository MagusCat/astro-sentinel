import { z } from 'zod'

export const createClientSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre es requerido.' })
    .min(3, 'El nombre completo debe tener al menos 3 caracteres.')
    .max(100, 'El nombre completo no puede exceder los 100 caracteres.')
    .transform((s) => s.trim().replace(/<[^>]*>/g, '')),

  phone_number: z
    .string({ required_error: 'El número de teléfono es requerido.' })
    .min(8, 'El número de teléfono es requerido y debe ser válido.')
    .max(30, 'El número de teléfono no puede exceder los 30 caracteres.')
    .transform((s) => s.trim())
    .refine((val) => val.replace(/\D/g, '').length >= 8, {
      message: 'El número de teléfono debe tener al menos 8 dígitos válidos.',
    }),

  email: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s ? s.trim() : null))
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'El correo electrónico ingresado no tiene un formato válido.',
    }),

  registration_source: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s ? s.trim() : null))
    .refine((val) => !val || val.length <= 50, {
      message: 'El medio de inscripción no puede exceder los 50 caracteres.',
    }),
})

export const updateClientSchema = createClientSchema

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
