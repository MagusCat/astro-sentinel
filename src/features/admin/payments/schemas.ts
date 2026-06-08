import { z } from 'zod'

export const createPaymentSchema = z.object({
  client_id: z
    .string()
    .uuid('Debe seleccionar un cliente registrado válido.'),
  total_amount: z
    .number({ invalid_type_error: 'El monto debe ser un número válido.' })
    .positive('El monto del pago debe ser mayor a cero.'),
  payment_method: z
    .enum(['efectivo', 'transferencia', 'tarjeta'], {
      errorMap: () => ({ message: 'El método de pago seleccionado no es válido.' }),
    }),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
