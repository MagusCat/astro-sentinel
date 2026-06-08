'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { SiteContent } from '@/features/cms/core/types'
import { publishSiteContent } from '@/features/cms/core/actions'

const CONTENT_BUCKET = 'site-content'

// 1. Restore a backup version
export async function restoreContentBackup(
  backupName: string
): Promise<{ success: boolean; content?: SiteContent; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    const backupPath = `backups/${backupName}`

    const { data, error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .download(backupPath)

    if (error) throw error

    const text = await data.text()
    const restoredContent = JSON.parse(text) as SiteContent

    const res = await publishSiteContent(restoredContent)
    if (!res.success) throw new Error(res.error)

    return { success: true, content: restoredContent }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al restaurar copia: ${msg}` }
  }
}

// 2. List backup versions for restore UI
export async function listContentBackups(): Promise<{
  success: boolean
  backups?: Array<{ name: string; created_at: string | null }>
  error?: string
}> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .list('backups', { sortBy: { column: 'name', order: 'desc' } })

    if (error) throw error

    const backups = (data || []).map((f) => ({
      name: f.name,
      created_at: f.created_at
    }))

    return { success: true, backups }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al listar versiones: ${msg}` }
  }
}

// 3. Delete a backup version
export async function deleteContentBackup(
  backupName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    const backupPath = `backups/${backupName}`

    const { error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .remove([backupPath])

    if (error) throw error

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al eliminar copia: ${msg}` }
  }
}

export async function getBackupAuthors(
  names: string[]
): Promise<{ success: boolean; authors?: Record<string, string>; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    const authors: Record<string, string> = {}

    await Promise.all(names.map(async (name) => {
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

    return { success: true, authors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al obtener autores: ${msg}` }
  }
}
