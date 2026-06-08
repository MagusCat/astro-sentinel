import { z } from 'zod'

export const freezeMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
})

export const unfreezeMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
})
