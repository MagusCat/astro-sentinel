/**
 * Staff Input Validation Schemas (Zod)
 *
 * Single responsibility: define and export validation schemas
 * for all staff management server action inputs.
 * Replaces the manual validateAndSanitizeUser() function in actions.ts.
 */

import { z } from 'zod'
import { APP_ROLE } from '@/lib/auth/roles'

const fullNameField = z
  .string()
  .transform((s) => s.replace(/<[^>]*>/g, '').trim())  // strip HTML tags
  .pipe(
    z
      .string()
      .min(3, 'El nombre completo debe tener entre 3 y 100 caracteres.')
      .max(100, 'El nombre completo debe tener entre 3 y 100 caracteres.')
  )

const usernameField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3, 'El nombre de usuario debe tener de 3 a 30 caracteres alfanuméricos o guiones bajos.')
      .max(30, 'El nombre de usuario debe tener de 3 a 30 caracteres alfanuméricos o guiones bajos.')
      .regex(
        /^[a-z0-9_]+$/,
        'El nombre de usuario debe tener de 3 a 30 caracteres alfanuméricos o guiones bajos.'
      )
  )

const roleField = z.enum([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN, APP_ROLE.RECEPTION], {
  errorMap: () => ({ message: 'El rol seleccionado no es válido en el sistema.' }),
})

const authUserIdField = z
  .string()
  .uuid('El ID de Supabase Auth debe ser un UUID de formato válido.')
  .nullable()
  .optional()

/** Schema for creating a new staff user */
export const createUserSchema = z.object({
  full_name: fullNameField,
  username: usernameField,
  password_raw: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: roleField,
  auth_user_id: authUserIdField,
})

/** Schema for updating an existing staff user (all fields optional except constraints) */
export const updateUserSchema = z.object({
  full_name: fullNameField.optional(),
  password_raw: z
    .string()
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres.')
    .optional(),
  role: roleField.optional(),
  auth_user_id: authUserIdField,
  is_active: z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
