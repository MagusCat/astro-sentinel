import { z } from 'zod'

export const classSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: 'El nombre de la disciplina debe tener al menos 2 caracteres.' }),
  description: z.string()
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null)
})

export const classPlanSchema = z.object({
  class_id: z.string()
    .uuid({ message: 'Debes seleccionar una disciplina base válida.' })
    .optional(), // class_id is not required for update plan, but required for save new plan
  plan_name: z.string()
    .trim()
    .min(2, { message: 'El nombre del plan debe tener al menos 2 caracteres.' }),
  duration_days: z.number()
    .int({ message: 'La duración debe ser un número entero de días.' })
    .positive({ message: 'La duración en días debe ser mayor a 0.' }),
  price: z.number()
    .nonnegative({ message: 'El precio no puede ser negativo.' })
})
