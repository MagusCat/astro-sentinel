'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { SiteContent, CmsPublishResult } from './types'
import { DEFAULT_CONTENT } from './default-content'
import { APP_CONFIG } from '@/lib/constants'

export async function getSiteContent(): Promise<{ success: boolean; content?: SiteContent; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(APP_CONFIG.BUCKETS.CONTENT)
      .download(APP_CONFIG.KEYS.CONTENT_JSON)

    if (error) {
      if (error.message.includes('not found') || error.message.includes('404') || error.message.includes('Object not found')) {
        const initialJson = JSON.stringify(DEFAULT_CONTENT, null, 2)
        const { error: uploadError } = await supabase.storage
          .from(APP_CONFIG.BUCKETS.CONTENT)
          .upload(APP_CONFIG.KEYS.CONTENT_JSON, new Blob([initialJson], { type: 'application/json' }), {
            upsert: true,
            contentType: 'application/json'
          })

        if (uploadError) throw uploadError
        return { success: true, content: DEFAULT_CONTENT }
      }
      throw error
    }

    const text = await data.text()
    const content = JSON.parse(text) as SiteContent

    if (!content.globals) {
      content.globals = DEFAULT_CONTENT.globals
    }

    return { success: true, content }
  } catch (err) {
    console.error('getSiteContent error:', err)
    return { success: true, content: DEFAULT_CONTENT }
  }
}

export async function publishSiteContent(newContent: SiteContent): Promise<CmsPublishResult> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()

    const { data: currentFile } = await supabase.storage
      .from(APP_CONFIG.BUCKETS.CONTENT)
      .download(APP_CONFIG.KEYS.CONTENT_JSON)

    let backupKey: string | undefined = undefined

    if (currentFile) {
      backupKey = `backups/content_${Date.now()}.json`
      const backupText = await currentFile.text()

      await supabase.storage
        .from(APP_CONFIG.BUCKETS.CONTENT)
        .upload(backupKey, new Blob([backupText], { type: 'application/json' }), {
          upsert: false,
          contentType: 'application/json'
        })
    }

    const newJson = JSON.stringify(newContent, null, 2)
    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.BUCKETS.CONTENT)
      .upload(APP_CONFIG.KEYS.CONTENT_JSON, new Blob([newJson], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json'
      })

    if (uploadError) throw uploadError

    return { success: true, backupKey }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al publicar contenido: ${msg}` }
  }
}

export async function getLastPublicationDate(): Promise<{ date: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(APP_CONFIG.BUCKETS.CONTENT)
      .list('', { search: APP_CONFIG.KEYS.CONTENT_JSON })

    if (error || !data || data.length === 0) return { date: null }

    const file = data.find((f) => f.name === APP_CONFIG.KEYS.CONTENT_JSON)
    return { date: file?.updated_at ?? file?.created_at ?? null }
  } catch {
    return { date: null }
  }
}

export async function uploadImage(
  formData: FormData, 
  folder: string = 'images',
  config?: { maxSizeMB?: number }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const supabase = await createClient()
    
    const file = formData.get('file') as File
    if (!file) throw new Error('Archivo no encontrado en FormData')

    const maxSizeMB = config?.maxSizeMB || APP_CONFIG.IMAGE_UPLOAD.MAX_SIZE_MB
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`El archivo excede el tamaño máximo permitido (${maxSizeMB}MB).`)
    }

    const uuid = crypto.randomUUID()
    const fileName = `${folder}/${uuid}.webp`

    console.log(`[IMAGE UPLOAD] User ${currentUser.id} is uploading image: ${fileName} (Size: ${file.size} bytes)`)

    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.BUCKETS.IMAGES)
      .upload(fileName, file, {
        contentType: 'image/webp',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from(APP_CONFIG.BUCKETS.IMAGES)
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}
