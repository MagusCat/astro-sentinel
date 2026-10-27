'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { SiteContent } from '@/features/cms/core/types'
import { BackupEntry } from './types'
import { restoreBackupSchema, deleteBackupSchema, backupAuthorsSchema } from './schemas'
import { publishSiteContent } from '@/features/cms/core/actions'
import { APP_CONFIG } from '@/lib/config'

const CONTENT_BUCKET = APP_CONFIG.buckets.content

export async function restoreContentBackup(
  backupName: string
): Promise<{ success: boolean; content?: SiteContent; error?: string }> {
  try {
    const parsed = restoreBackupSchema.safeParse({ backupName })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const backupPath = `backups/${parsed.data.backupName}`

    const { data, error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .download(backupPath)

    if (error) throw error

    const text = await data.text()
    const restoredContent = JSON.parse(text) as SiteContent

    const res = await publishSiteContent(restoredContent)
    if (!res.success) {
      return { success: false, error: res.error || 'Error al restaurar copia de respaldo.' }
    }

    return { success: true, content: restoredContent }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al restaurar copia de respaldo.') }
  }
}

export async function listContentBackups(): Promise<{
  success: boolean
  data?: BackupEntry[]
  error?: string
}> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const { data, error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .list('backups', { sortBy: { column: 'name', order: 'desc' } })

    if (error) throw error

    const backups: BackupEntry[] = (data || []).map((f) => ({
      name: f.name,
      created_at: f.created_at
    }))

    return { success: true, data: backups }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al listar versiones de respaldo.') }
  }
}

export async function deleteContentBackup(
  backupName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = deleteBackupSchema.safeParse({ backupName })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const backupPath = `backups/${parsed.data.backupName}`

    const { error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .remove([backupPath])

    if (error) throw error

    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar copia de respaldo.') }
  }
}

export async function getBackupAuthors(
  names: string[]
): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> {
  try {
    const parsed = backupAuthorsSchema.safeParse({ names })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const authors: Record<string, string> = {}

    const CHUNK_SIZE = 5
    const parsedNames = parsed.data.names
    for (let i = 0; i < parsedNames.length; i += CHUNK_SIZE) {
      await Promise.all(parsedNames.slice(i, i + CHUNK_SIZE).map(async (name) => {
        try {
          const { data, error } = await supabase.storage
            .from(CONTENT_BUCKET)
            .download(`backups/${name}`)

          if (!error && data) {
            const text = await data.text()
            const json = JSON.parse(text)
            authors[name] = json._metadata?.lastModifiedBy || 'Usuario Anónimo'
          } else {
            authors[name] = 'Desconocido'
          }
        } catch {
          authors[name] = 'Desconocido'
        }
      }))
    }

    return { success: true, data: authors }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al obtener autores de los respaldos.') }
  }
}
