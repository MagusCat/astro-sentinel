import { z } from 'zod'

const SAFE_SEGMENT = z
  .string()
  .min(1, 'El valor es requerido.')
  .max(100, 'El valor no puede exceder los 100 caracteres.')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'El valor contiene caracteres no permitidos.')

export const uploadSiteImageSchema = z.object({
  section: SAFE_SEGMENT,
  filename: SAFE_SEGMENT,
  mimeType: z
    .string()
    .min(1, 'El tipo MIME es requerido.')
    .regex(/^image\//, 'El tipo MIME debe ser de imagen.'),
})

export const deleteSiteImageSchema = z.object({
  section: SAFE_SEGMENT,
  filename: SAFE_SEGMENT,
})

export const bucketNameSchema = z
  .string({ required_error: 'El nombre del bucket es requerido.' })
  .min(1, 'El nombre del bucket es requerido.')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'El nombre del bucket contiene caracteres no permitidos.')
