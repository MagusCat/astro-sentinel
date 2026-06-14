import { SiteContent, SocialLink } from './types'
import { DEFAULT_CONTENT } from './default-content'

const AUTO_ICONS = ['phone', 'mail', 'map-pin']

export function normalizeContent(raw: unknown): SiteContent {
  const src = raw as Partial<SiteContent>

  const globals = src.globals ? { ...src.globals } : { ...DEFAULT_CONTENT.globals }

  // Strip legacy auto-injected social links (phone, mail, map-pin) from globals
  if (globals.socialLinks) {
    globals.socialLinks = globals.socialLinks.filter(
      (l: SocialLink) => !AUTO_ICONS.some(ic => (l.icon || '').toLowerCase().includes(ic))
    )
  }

  const hero = src.hero
    ? { ...src.hero, socialLinks: src.hero.socialLinks ?? [] }
    : { ...DEFAULT_CONTENT.hero }

  let contact = src.contact ? { ...src.contact } : { ...DEFAULT_CONTENT.contact }

  // Migrate legacy whatsapp from globals to contact
  const globalsRecord = globals as unknown as Record<string, unknown>
  if (!contact.whatsapp && globalsRecord.whatsapp) {
    contact = { ...contact, whatsapp: globalsRecord.whatsapp as SiteContent['contact']['whatsapp'] }
    // Remove from globals copy (not the original input)
    delete globalsRecord.whatsapp
  }

  if (!contact.whatsapp) {
    contact = { ...contact, whatsapp: { ...DEFAULT_CONTENT.contact.whatsapp } }
  }

  if (!contact.mapLink) {
    contact = { ...contact, mapLink: '' }
  }

  return {
    ...DEFAULT_CONTENT,
    ...src,
    globals,
    hero,
    contact,
  }
}

