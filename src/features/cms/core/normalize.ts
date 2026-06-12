import { SiteContent, SocialLink } from './types'
import { DEFAULT_CONTENT } from './default-content'

export function normalizeContent(raw: unknown): SiteContent {
  const content = raw as SiteContent

  if (!content.globals) {
    content.globals = DEFAULT_CONTENT.globals
  }

  if (!content.hero) {
    content.hero = DEFAULT_CONTENT.hero
  } else if (!content.hero.socialLinks) {
    content.hero.socialLinks = []
  }

  if (!content.contact) {
    content.contact = DEFAULT_CONTENT.contact
  } else {
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
  }

  const AUTO_ICONS = ['phone', 'mail', 'map-pin']
  if (content.globals.socialLinks) {
    content.globals.socialLinks = content.globals.socialLinks.filter(
      (l: SocialLink) => !AUTO_ICONS.some(ic => (l.icon || '').toLowerCase().includes(ic))
    )
  }

  return content
}
