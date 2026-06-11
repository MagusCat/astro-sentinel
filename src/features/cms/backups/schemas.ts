import { z } from 'zod'

const BACKUP_NAME_REGEX = /^content_\d+\.json$/

export const backupNameSchema = z
  .string({ required_error: 'El nombre del respaldo es requerido.' })
  .min(1, 'El nombre del respaldo es requerido.')
  .regex(BACKUP_NAME_REGEX, 'El nombre del respaldo no es válido.')

export const backupNamesSchema = z
  .array(z.string().min(1))
  .min(1, 'Se requiere al menos un nombre de respaldo.')

export const restoreBackupSchema = z.object({
  backupName: backupNameSchema,
})

export const deleteBackupSchema = z.object({
  backupName: backupNameSchema,
})

export const backupAuthorsSchema = z.object({
  names: backupNamesSchema,
})
