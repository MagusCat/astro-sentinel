import { z } from 'zod'

export const processCheckoutSchema = z.object({
  client_id: z.string().uuid('ID de cliente inválido'),
  class_plan_id: z.string().uuid('ID de plan inválido'),
  class_id: z.string().uuid('ID de clase inválido'),
  payment_method: z.enum(['efectivo', 'tarjeta', 'transferencia'], {
    errorMap: () => ({ message: 'El método de pago seleccionado no es válido.' }),
  }),
  total_amount: z.number().min(0, 'El monto debe ser positivo'),
  duration_days: z.number().min(1, 'La duración debe ser mayor a 0')
})
