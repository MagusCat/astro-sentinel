'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'

const IMAGES_BUCKET = 'site-images'

// 1. Upload image to site-images bucket and return the public URL
export async function uploadSiteImage(
  section: string,
  filename: string,
  fileData: ArrayBuffer,
  mimeType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    const path = `${section}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(path, fileData, { upsert: true, contentType: mimeType })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path)

    return { success: true, url: data.publicUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al subir imagen: ${msg}` }
  }
}

// 2. Delete an image from the site-images bucket
export async function deleteSiteImage(
  section: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    const path = `${section}/${filename}`

    const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([path])

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al eliminar imagen: ${msg}` }
  }
}

// 3. List all images in a section
export async function listSiteImages(
  section?: string
): Promise<{ success: boolean; files?: Array<{ name: string; id: string; created_at: string; url?: string; metadata: Record<string, unknown> | null }>; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.storage.from(IMAGES_BUCKET).list(section || '', {
      sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) throw error

    const filesWithUrls = data.map(f => {
      const { data: urlData } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(`${section ? section + '/' : ''}${f.name}`)
      return { ...f, url: urlData.publicUrl }
    })

    return { success: true, files: filesWithUrls as unknown as Array<{ name: string; id: string; created_at: string; url?: string; metadata: Record<string, unknown> | null }> }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al listar imágenes: ${msg}` }
  }
}

// 4. Get bucket stats
export async function getBucketStats(bucketName: string): Promise<{ success: boolean; totalSize?: number; fileCount?: number; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    
    let totalSize = 0;
    let fileCount = 0;
    
    const foldersToScan = bucketName === 'site-images' ? ['', 'hero', 'gallery', 'about', 'art', 'principles'] : ['', 'backups'];

    for (const folder of foldersToScan) {
      const { data } = await supabase.storage.from(bucketName).list(folder, { limit: 1000 })
      if (data) {
        for (const file of data) {
          if (file.id && file.name !== '.emptyFolderPlaceholder') {
            fileCount++;
            totalSize += (file.metadata?.size || 0);
          }
        }
      }
    }

    return { success: true, totalSize, fileCount }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al calcular estado: ${msg}` }
  }
}
