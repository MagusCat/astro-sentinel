import { z } from 'zod'

export const freezeMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
  targetDate: z.string().date('Debe indicar una fecha de reactivación válida'),
})

export const unfreezeMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
})
