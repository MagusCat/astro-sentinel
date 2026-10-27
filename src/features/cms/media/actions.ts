'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { APP_CONFIG } from '@/lib/config'
import { StorageFile, BucketStats } from './types'
import { uploadSiteImageSchema, deleteSiteImageSchema, bucketNameSchema } from './schemas'

const IMAGES_BUCKET = APP_CONFIG.buckets.images

export async function uploadSiteImage(
  section: string,
  filename: string,
  fileData: ArrayBuffer,
  mimeType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const parsed = uploadSiteImageSchema.safeParse({ section, filename, mimeType })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const path = `${parsed.data.section}/${parsed.data.filename}`

    const { error: uploadError } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(path, fileData, { upsert: true, contentType: parsed.data.mimeType })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path)

    return { success: true, url: data.publicUrl }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al subir imagen.') }
  }
}

export async function deleteSiteImage(
  section: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = deleteSiteImageSchema.safeParse({ section, filename })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const path = `${parsed.data.section}/${parsed.data.filename}`

    const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([path])

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al eliminar imagen.') }
  }
}

export async function listSiteImages(
  section?: string
): Promise<{ success: boolean; data?: StorageFile[]; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
    const { data, error } = await supabase.storage.from(IMAGES_BUCKET).list(section || '', {
      sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) throw error

    const filesWithUrls: StorageFile[] = data.map(f => {
      const { data: urlData } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(`${section ? section + '/' : ''}${f.name}`)
      return { ...f, url: urlData.publicUrl } as StorageFile
    })

    return { success: true, data: filesWithUrls }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al listar imágenes.') }
  }
}

export async function getBucketStats(bucketName: string): Promise<{ success: boolean; data?: BucketStats; error?: string }> {
  try {
    const parsed = bucketNameSchema.safeParse(bucketName)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    let totalSize = 0;
    let fileCount = 0;

    const foldersToScan = parsed.data === 'site-images' ? ['', 'hero', 'gallery', 'about', 'art', 'principles'] : ['', 'backups'];

    const results = await Promise.all(
      foldersToScan.map(folder => supabase.storage.from(parsed.data).list(folder, { limit: 1000 }))
    )
    for (const { data } of results) {
      if (data) {
        for (const file of data) {
          if (file.id && file.name !== '.emptyFolderPlaceholder') {
            fileCount++;
            totalSize += (file.metadata?.size || 0);
          }
        }
      }
    }

    return { success: true, data: { totalSize, fileCount } }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al calcular estado del almacenamiento.') }
  }
}
