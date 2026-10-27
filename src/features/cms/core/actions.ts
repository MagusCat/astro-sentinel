'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { SiteContent, CmsPublishResult, UploadImageConfig } from './types'
import { DEFAULT_CONTENT } from './default-content'
import { APP_CONFIG } from '@/lib/config'
import { uploadImageSchema } from './schemas'
import { normalizeContent } from './normalize'
import { revalidatePath } from 'next/cache'
import { getServiceConfig } from '@/lib/config'
import { z } from 'zod'

const siteContentSchema = z.object({
  globals: z.object({
    siteTitle: z.string().min(1, 'El título del sitio es requerido.'),
    siteDescription: z.string().optional().default(''),
    contactPhone: z.string().optional().default(''),
    contactEmail: z.string().optional().default(''),
    contactAddress: z.string().optional().default(''),
    socialLinks: z.array(z.any()).optional().default([]),
  }).passthrough(),
  header: z.object({
    navItems: z.array(z.any()).optional().default([]),
    contactItem: z.any().optional(),
  }).passthrough(),
  hero: z.object({
    title: z.string().min(1, 'El título principal es requerido.'),
    subtitle: z.string().optional().default(''),
    description: z.string().optional().default(''),
    socialLinks: z.array(z.any()).optional().default([]),
    carouselImages: z.array(z.any()).optional().default([]),
  }).passthrough(),
  about: z.object({
    heading: z.string().min(1, 'El encabezado de Sobre Nosotros es requerido.'),
    paragraph_1: z.string().optional().default(''),
    paragraph_2: z.string().optional().default(''),
  }).passthrough(),
  art: z.object({
    heading: z.string().min(1, 'El encabezado de Arte es requerido.'),
    items: z.array(z.any()).optional().default([]),
  }).passthrough(),
  principles: z.object({
    heading: z.string().min(1, 'El encabezado de Principios es requerido.'),
    description: z.string().optional().default(''),
    items: z.array(z.any()).optional().default([]),
  }).passthrough(),
  schedule: z.object({
    heading: z.string().min(1, 'El encabezado de Horarios es requerido.'),
    dayLabels: z.record(z.string()).optional().default({}),
    classes: z.array(z.any()).optional().default([]),
  }).passthrough(),
  gallery: z.object({
    heading: z.string().min(1, 'El encabezado de Galería es requerido.'),
    images: z.array(z.any()).optional().default([]),
  }).passthrough(),
  comments: z.object({
    heading: z.string().min(1, 'El encabezado de Testimonios es requerido.'),
    items: z.array(z.any()).optional().default([]),
  }).passthrough(),
  faq: z.object({
    heading: z.string().min(1, 'El encabezado de FAQ es requerido.'),
    description: z.string().optional().default(''),
    faqs: z.array(z.any()).optional().default([]),
  }).passthrough(),
  contact: z.object({
    heading: z.string().min(1, 'El encabezado de Contacto es requerido.'),
    description: z.string().optional().default(''),
    whatsapp: z.object({
      number: z.string().optional().default(''),
      message: z.string().optional().default(''),
      title: z.string().optional().default(''),
    }).passthrough().optional(),
    mapEmbedUrl: z.string().optional().default(''),
    mapLink: z.string().optional().default(''),
  }).passthrough(),
  footer: z.object({
    copyright: z.union([z.number(), z.string()]),
    owner: z.string().optional().default(''),
    footerItems: z.array(z.any()).optional().default([]),
  }).passthrough(),
  _metadata: z.object({
    lastModifiedBy: z.string().optional(),
  }).passthrough().optional(),
}).passthrough()

export async function getSiteContent(): Promise<{ success: boolean; content?: SiteContent; error?: string; isBucketMissing?: boolean }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const { data, error } = await supabase.storage
      .from(APP_CONFIG.buckets.content)
      .download(APP_CONFIG.keys.contentJson)

    if (error) {
      // Check if bucket itself is missing
      if (error.message.includes('Bucket not found')) {
        return { success: false, error: 'Infraestructura de almacenamiento no inicializada.', isBucketMissing: true }
      }

      if (error.message.includes('not found') || error.message.includes('404') || error.message.includes('Object not found')) {
        const initialJson = JSON.stringify(DEFAULT_CONTENT, null, 2)
        const { error: uploadError } = await supabase.storage
          .from(APP_CONFIG.buckets.content)
          .upload(APP_CONFIG.keys.contentJson, new Blob([initialJson], { type: 'application/json' }), {
            upsert: true,
            contentType: 'application/json'
          })

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            return { success: false, error: 'Infraestructura de almacenamiento no inicializada.', isBucketMissing: true }
          }
          throw uploadError
        }
        return { success: true, content: DEFAULT_CONTENT }
      }
      throw error
    }

    const text = await data.text()
    const content = normalizeContent(JSON.parse(text))

    return { success: true, content }
  } catch (err) {
    const isBucketMissing = err instanceof Error && err.message.includes('Bucket not found')
    const fallback = isBucketMissing
      ? 'Infraestructura de almacenamiento no inicializada.'
      : 'Error al obtener contenido del sitio.'
    return {
      success: false,
      error: toActionError(err, fallback),
      isBucketMissing,
    }
  }
}


export async function publishSiteContent(newContent: SiteContent): Promise<CmsPublishResult> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = siteContentSchema.safeParse(newContent)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Estructura de contenido inválida.'
      }
    }

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

    const newJson = JSON.stringify(parsed.data, null, 2)
    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.buckets.content)
      .upload(APP_CONFIG.keys.contentJson, newJson, {
        upsert: true,
        contentType: 'application/json'
      })

    if (uploadError) throw uploadError

    revalidatePath('/', 'layout')

    const { deployHookUrl } = getServiceConfig()

    if (deployHookUrl) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        await fetch(deployHookUrl, { method: 'POST', signal: controller.signal })
        clearTimeout(timeoutId)
      } catch (hookError) {
        console.error('Failed to trigger deploy hook:', hookError)
      }
    }

    const { data: { publicUrl } } = supabase.storage
      .from(APP_CONFIG.buckets.content)
      .getPublicUrl(APP_CONFIG.keys.contentJson)

    const finalPublicUrl = `${publicUrl}?t=${Date.now()}`

    console.info('[CMS] Content published', {
      url: finalPublicUrl,
      modifiedBy: newContent._metadata?.lastModifiedBy,
      backupKey,
    })

    return { success: true, backupKey, deployHookTriggered: !!deployHookUrl, publicUrl: finalPublicUrl }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al publicar contenido.') }
  }
}

export async function getLastPublicationDate(): Promise<{ date: string | null }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)
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
    const { user: currentUser, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = uploadImageSchema.safeParse({ folder, maxSizeMB: config?.maxSizeMB })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

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

    console.info('[CMS] Image upload', { userId: currentUser.id, fileName, size: file.size })

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
    return { success: false, error: toActionError(err, 'Error al subir imagen.') }
  }
}
