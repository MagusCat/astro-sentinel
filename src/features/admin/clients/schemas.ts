import { z } from 'zod'
import { nameSchema, phoneSchema } from '@/lib/validation/common'

export const createClientSchema = z.object({
  full_name: nameSchema,
  phone_number: phoneSchema,

  email: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s ? s.trim() : null))
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'El correo electrónico ingresado no tiene un formato válido.',
    }),
})

export const updateClientSchema = createClientSchema

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
