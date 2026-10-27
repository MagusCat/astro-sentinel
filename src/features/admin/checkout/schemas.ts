import { z } from 'zod'
import { discountSchema, paymentMethodSchema } from '@/lib/validation/common'

// Only identifiers and the payment method cross the wire. Price and duration
// are resolved server-side from class_plans by the process_membership_checkout
// RPC — the client can no longer dictate the amount charged.
export const processCheckoutSchema = z.object({
  client_id: z.string().uuid('ID de cliente inválido'),
  class_plan_id: z.string().uuid('ID de plan inválido'),
  payment_method: paymentMethodSchema,
  discount: discountSchema,
})
