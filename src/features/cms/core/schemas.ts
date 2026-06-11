import { z } from 'zod'

export const uploadImageSchema = z.object({
  folder: z
    .string()
    .min(1, 'La carpeta de destino es requerida.')
    .max(50, 'La carpeta no puede exceder los 50 caracteres.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'El nombre de la carpeta contiene caracteres no permitidos.'),
  maxSizeMB: z
    .number()
    .positive('El tamaño máximo debe ser un valor positivo.')
    .optional(),
})
