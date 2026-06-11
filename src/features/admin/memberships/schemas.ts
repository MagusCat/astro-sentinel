import { z } from 'zod'

export const freezeMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
  freezeDays: z.number().int().positive('Debe indicar un número de días válido').min(1, 'La cantidad de días debe ser al menos 1'),
})

export const unfreezeMembershipSchema = z.object({
  membershipId: z.string().uuid('ID de membresía inválido'),
})
