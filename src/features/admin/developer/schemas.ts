import { z } from 'zod'

export const revokeDeviceSchema = z.object({
  deviceId: z
    .string({ required_error: 'El ID del dispositivo es requerido.' })
    .min(1, 'El ID del dispositivo es requerido.')
    .uuid('El ID del dispositivo no es válido.'),
})
