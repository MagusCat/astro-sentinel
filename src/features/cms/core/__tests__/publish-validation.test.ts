import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publishSiteContent } from '../actions'
import { DEFAULT_CONTENT } from '../default-content'
import { SiteContent } from '../types'
import { AuthorizationError } from '@/lib/auth/guard'

const mockUpload = vi.fn()
const mockDownload = vi.fn()
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://example.com/content.json' } }))

const mockStorageFrom = {
  download: mockDownload,
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}

const mockSupabase = {
  storage: {
    from: vi.fn(() => mockStorageFrom),
  },
}

let mockRoleError: Error | null = null

vi.mock('@/lib/auth/guard', () => ({
  requireRole: vi.fn(async () => {
    if (mockRoleError) throw mockRoleError
    return {
      user: { id: 'u1', full_name: 'Admin', role: 'admin', username: 'admin' },
      supabase: mockSupabase,
    }
  }),
  toActionError: vi.fn((err: unknown, fallback = 'Ocurrió un error inesperado.') => {
    if (err instanceof AuthorizationError) return err.message
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthorizationError') {
      return (err as Error).message
    }
    return fallback
  }),
  AuthorizationError: class AuthorizationError extends Error {
    constructor(msg = 'Acceso denegado: No autorizado.') {
      super(msg)
      this.name = 'AuthorizationError'
    }
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/config', () => ({
  APP_CONFIG: {
    buckets: { content: 'cms-content' },
    keys: { contentJson: 'content.json' },
  },
  getServiceConfig: vi.fn(() => ({
    deployHookUrl: '',
  })),
}))

describe('CMS Publish Content Zod Schema Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoleError = null
    mockDownload.mockResolvedValue({ data: null, error: null })
    mockUpload.mockResolvedValue({ data: { path: 'content.json' }, error: null })
  })

  it('successfully validates and publishes valid full site content (DEFAULT_CONTENT)', async () => {
    const res = await publishSiteContent(DEFAULT_CONTENT)

    expect(res.success).toBe(true)
    expect(res.error).toBeUndefined()
    expect(res.publicUrl).toContain('https://example.com/content.json')
    expect(mockUpload).toHaveBeenCalledTimes(1) // uploaded content.json
  })

  it('creates backup when existing content is present in storage', async () => {
    mockDownload.mockResolvedValue({
      data: {
        text: async () => JSON.stringify(DEFAULT_CONTENT),
      },
      error: null,
    })

    const res = await publishSiteContent(DEFAULT_CONTENT)

    expect(res.success).toBe(true)
    expect(res.backupKey).toMatch(/^backups\/content_\d+\.json$/)
    expect(mockUpload).toHaveBeenCalledTimes(2) // 1 backup + 1 content.json
  })

  describe('Zod Schema Validation for Content Sections', () => {
    it('fails when globals.siteTitle is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.globals.siteTitle = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El título del sitio es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when hero.title is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.hero.title = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El título principal es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when about.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.about.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Sobre Nosotros es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when art.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.art.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Arte es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when principles.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.principles.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Principios es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when schedule.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.schedule.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Horarios es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when gallery.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.gallery.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Galería es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when comments.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.comments.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Testimonios es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when faq.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.faq.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de FAQ es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when contact.heading is missing or empty', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT)
      invalidContent.contact.heading = ''

      const res = await publishSiteContent(invalidContent)

      expect(res.success).toBe(false)
      expect(res.error).toBe('El encabezado de Contacto es requerido.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when footer section is missing or has invalid copyright', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT) as unknown as Record<string, unknown>
      delete invalidContent.footer

      const res = await publishSiteContent(invalidContent as unknown as SiteContent)

      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails when an entire section is missing from payload', async () => {
      const invalidContent = structuredClone(DEFAULT_CONTENT) as unknown as Record<string, unknown>
      delete invalidContent.hero

      const res = await publishSiteContent(invalidContent as unknown as SiteContent)

      expect(res.success).toBe(false)
      expect(res.error).toBeTruthy()
      expect(mockUpload).not.toHaveBeenCalled()
    })
  })

  describe('Authorization and Storage Error Handling', () => {
    it('blocks unauthorized roles from publishing content', async () => {
      mockRoleError = new AuthorizationError('Acceso denegado: Permisos insuficientes.')

      const res = await publishSiteContent(DEFAULT_CONTENT)

      expect(res.success).toBe(false)
      expect(res.error).toBe('Acceso denegado: Permisos insuficientes.')
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('sanitizes unexpected storage upload errors without leaking internals', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: new Error('S3 Connection timeout error on endpoint: supabase.internal:9000'),
      })

      const res = await publishSiteContent(DEFAULT_CONTENT)

      expect(res.success).toBe(false)
      expect(res.error).toBe('Error al publicar contenido.')
      expect(res.error).not.toContain('supabase.internal')
    })
  })
})
