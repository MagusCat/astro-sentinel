import { z } from 'zod'

/**
 * Common Zod Sanitizers & Field Validators
 * 
 * Provides reusable logic for cleaning and validating standard fields 
 * across the entire application.
 */

/**
 * Sanitizes a string by trimming it and stripping all HTML tags.
 */
export const sanitizedString = z.string().transform((s) => 
  s.trim().replace(/<[^>]*>/g, '')
)

/**
 * Common Name Field — 3-100 chars, sanitized.
 */
export const nameSchema = sanitizedString.pipe(
  z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder los 100 caracteres.')
)

/**
 * Common Phone Field — Extracts digits and validates minimum length.
 */
export const phoneSchema = sanitizedString.pipe(
  z.string()
    .min(8, 'El número de teléfono debe ser válido.')
    .max(30, 'El número de teléfono es demasiado largo.')
    .refine((val) => val.replace(/\D/g, '').length >= 8, {
      message: 'El número de teléfono debe tener al menos 8 dígitos válidos.',
    })
)


/**
 * Common Email Field — Sanitized and validated.
 */
export const emailSchema = z.string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().email('Formato de correo electrónico inválido.'))

/**
 * UUID Field — Standard format.
 */
export const uuidSchema = z.string().uuid('ID de formato inválido.')
