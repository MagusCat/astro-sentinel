'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import { SiteContent, CmsPublishResult, UploadImageConfig, SocialLink } from './types'
import { DEFAULT_CONTENT } from './default-content'
import { APP_CONFIG } from '@/lib/config'
import { uploadImageSchema } from './schemas'

export async function getSiteContent(): Promise<{ success: boolean; content?: SiteContent; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(APP_CONFIG.buckets.content)
      .download(APP_CONFIG.keys.contentJson)

    if (error) {
      if (error.message.includes('not found') || error.message.includes('404') || error.message.includes('Object not found')) {
        const initialJson = JSON.stringify(DEFAULT_CONTENT, null, 2)
        const { error: uploadError } = await supabase.storage
          .from(APP_CONFIG.buckets.content)
          .upload(APP_CONFIG.keys.contentJson, new Blob([initialJson], { type: 'application/json' }), {
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

    if (!content.hero.socialLinks) {
      content.hero.socialLinks = []
    }

    if (!content.contact.whatsapp && (content.globals as unknown as Record<string, unknown>).whatsapp) {
      content.contact.whatsapp = (content.globals as unknown as Record<string, unknown>).whatsapp as SiteContent['contact']['whatsapp']
      delete (content.globals as unknown as Record<string, unknown>).whatsapp
    }

    if (!content.contact.whatsapp) {
      content.contact.whatsapp = DEFAULT_CONTENT.contact.whatsapp
    }

    if (!content.contact.mapLink) {
      content.contact.mapLink = ''
    }

    const AUTO_ICONS = ['phone', 'mail', 'map-pin']
    content.globals.socialLinks = content.globals.socialLinks.filter(
      (l: SocialLink) => !AUTO_ICONS.some(ic => (l.icon || '').toLowerCase().includes(ic))
    )

    return { success: true, content }
  } catch (err) {
    console.error('getSiteContent error:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
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
      .from(APP_CONFIG.buckets.content)
      .download(APP_CONFIG.keys.contentJson)

    let backupKey: string | undefined = undefined

    if (currentFile) {
      backupKey = `backups/content_${Date.now()}.json`
      const backupText = await currentFile.text()

      await supabase.storage
        .from(APP_CONFIG.buckets.content)
        .upload(backupKey, new Blob([backupText], { type: 'application/json' }), {
          upsert: false,
          contentType: 'application/json'
        })
    }

    const newJson = JSON.stringify(newContent, null, 2)
    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.buckets.content)
      .upload(APP_CONFIG.keys.contentJson, new Blob([newJson], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json'
      })

    if (uploadError) throw uploadError

    const { getServiceConfig } = await import('@/lib/config')
    const { deployHookUrl } = getServiceConfig()

    if (deployHookUrl) {
      try {
        await fetch(deployHookUrl, { method: 'POST' })
      } catch (hookError) {
        console.error('Failed to trigger deploy hook:', hookError)
      }
    }

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
      .from(APP_CONFIG.buckets.content)
      .list('', { search: APP_CONFIG.keys.contentJson })

    if (error || !data || data.length === 0) return { date: null }

    const file = data.find((f) => f.name === APP_CONFIG.keys.contentJson)
    return { date: file?.updated_at ?? file?.created_at ?? null }
  } catch {
    return { date: null }
  }
}

export async function uploadImage(
  formData: FormData,
  folder: string = 'images',
  config?: UploadImageConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !Roles.canAccessCms(currentUser.role)) {
      return { success: false, error: 'Acceso denegado: Permisos de editor CMS requeridos.' }
    }

    const parsed = uploadImageSchema.safeParse({ folder, maxSizeMB: config?.maxSizeMB })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'Archivo no encontrado en FormData.' }
    }

    const maxSizeMB = parsed.data.maxSizeMB || APP_CONFIG.imageUpload.maxSizeMb
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { success: false, error: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB).` }
    }

    const uuid = crypto.randomUUID()
    const fileName = `${parsed.data.folder}/${uuid}.webp`

    console.log(`[IMAGE UPLOAD] User ${currentUser.id} is uploading image: ${fileName} (Size: ${file.size} bytes)`)

    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.buckets.images)
      .upload(fileName, file, {
        contentType: 'image/webp',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from(APP_CONFIG.buckets.images)
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al subir imagen: ${msg}` }
  }
}
