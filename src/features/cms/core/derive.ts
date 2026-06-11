import { SocialLink, ContactItem, WebGlobals, Whatsapp, Contact } from '@/features/cms/core/types'
import { CMS_CONTACT_CONFIG } from '@/features/cms/core/config'

const STRIP_PHONE_RE = /[^0-9+]/g

const AUTO_INJECTED_TITLES = new Set(['teléfono', 'email', 'ubicación', 'correo', 'tel', 'mail', 'phone', 'address', 'dirección', 'direccion'])

export function isAutoInjectedItem(item: { title?: string; alt?: string; icon?: string }): boolean {
  const title = (item.title || item.alt || '').toLowerCase()
  const icon = (item.icon || '').toLowerCase()
  if (AUTO_INJECTED_TITLES.has(title)) return true
  if (icon.includes('phone') || icon.includes('mail') || icon.includes('map-pin')) return true
  if (title.includes('tel:') || title.includes('mailto:')) return true
  return false
}

function stripAutoInjected(links: SocialLink[]): SocialLink[] {
  return links.filter(l => !isAutoInjectedItem(l))
}

function stripAutoInjectedItems(items: ContactItem[]): ContactItem[] {
  return items.filter(i => !isAutoInjectedItem(i))
}

export function deriveWhatsappNumber(contactPhone: string): string {
  let digits = contactPhone.replace(STRIP_PHONE_RE, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  return digits
}

export function deriveHeroSocialLinks(globals: WebGlobals, contact: Contact): SocialLink[] {
  const links: SocialLink[] = [...stripAutoInjected(globals.socialLinks)]
  if (globals.contactPhone) {
    links.push({
      alt: CMS_CONTACT_CONFIG.phone.label,
      url: CMS_CONTACT_CONFIG.phone.urlTemplate.replace('{value}', globals.contactPhone.replace(STRIP_PHONE_RE, '')),
      icon: CMS_CONTACT_CONFIG.phone.icon,
    })
  }
  const mapUrl = contact.mapLink || (globals.contactAddress ? CMS_CONTACT_CONFIG.location.urlTemplate.replace('{value}', encodeURIComponent(globals.contactAddress)) : '')
  if (mapUrl) {
    links.push({
      alt: CMS_CONTACT_CONFIG.location.label,
      url: mapUrl,
      icon: CMS_CONTACT_CONFIG.location.icon,
    })
  }
  return links
}

export function deriveContactItems(globals: WebGlobals, contact: Contact): ContactItem[] {
  const existing = contact.contact ? stripAutoInjectedItems(contact.contact) : []
  const items: ContactItem[] = [...stripAutoInjected(globals.socialLinks)].map((link) => ({
    title: link.alt,
    content: link.url,
    icon: link.icon,
    url: link.url,
  }))
  if (globals.contactPhone) {
    items.push({
      title: CMS_CONTACT_CONFIG.phone.label,
      content: globals.contactPhone,
      icon: CMS_CONTACT_CONFIG.phone.icon,
      url: CMS_CONTACT_CONFIG.phone.urlTemplate.replace('{value}', globals.contactPhone.replace(STRIP_PHONE_RE, '')),
    })
  }
  if (globals.contactEmail) {
    items.push({
      title: CMS_CONTACT_CONFIG.email.label,
      content: globals.contactEmail,
      icon: CMS_CONTACT_CONFIG.email.icon,
      url: CMS_CONTACT_CONFIG.email.urlTemplate.replace('{value}', globals.contactEmail),
    })
  }
  const mapUrl = contact.mapLink || (globals.contactAddress ? CMS_CONTACT_CONFIG.location.urlTemplate.replace('{value}', encodeURIComponent(globals.contactAddress)) : '')
  if (mapUrl) {
    items.push({
      title: CMS_CONTACT_CONFIG.location.label,
      content: globals.contactAddress || '',
      icon: CMS_CONTACT_CONFIG.location.icon,
      url: mapUrl,
    })
  }
  if (existing.length > 0) {
    items.push(...existing)
  }
  return items
}

export function buildWhatsapp(contactPhone: string, partial: Partial<Whatsapp> = {}): Whatsapp {
  const number = partial.number ?? deriveWhatsappNumber(contactPhone)
  return {
    number,
    message: partial.message || '',
    title: partial.title || '',
  }
}
