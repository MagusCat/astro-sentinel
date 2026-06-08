/**
 * Auth Input Validation Schemas (Zod)
 *
 * Single responsibility: define and export validation schemas
 * for all auth-related server action inputs.
 * Imported by auth/actions.ts — never by client components.
 */

import { z } from 'zod'

/** Admin and device authorization — email + password */
export const credentialsSchema = z.object({
  email: z.string().email('Correo electrónico inválido.').max(255),
  password: z.string().min(1, 'La contraseña es requerida.').max(255),
})

/** Local staff login — username + password */
export const localLoginSchema = z.object({
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres.')
    .max(30, 'El usuario no puede exceder 30 caracteres.')
    .regex(
      /^[a-z0-9_]+$/,
      'El usuario solo acepta letras minúsculas, números y guiones bajos.'
    ),
  password: z.string().min(1, 'La contraseña es requerida.').max(255),
})
