// TypeScript schema matching content-web-example.json
// Used by the CMS editor to validate and type all editable content

export interface DataMediaItem {
  id: number | string
  title: string
  url?: string
  image?: string
  excerpt?: string
  date?: string
  author?: string
}

export interface DataIconItem {
  icon: string
}

export interface NavItem {
  section: string
  url: string
}

export interface SocialLink extends DataIconItem {
  id?: string
  alt: string
  url: string
  icon: string
  title?: string
}

export interface HeroCarouselImage extends DataMediaItem {
  id: number | string
  url: string
  title: string
}

export interface Header {
  navItems: NavItem[]
  contactItem: NavItem
}

export interface Hero {
  title: string
  subtitle: string
  description: string
  socialLinks: SocialLink[]
  carouselImages: HeroCarouselImage[]
}

export interface About {
  heading: string
  paragraph_1: string
  paragraph_2: string
}

export interface ArtItem {
  title: string
  description: string
  icon: string
}

export interface Art {
  heading: string
  items: ArtItem[]
}

export interface PrincipleItem {
  title: string
  description: string
  icon: string
}

export interface Principles {
  heading: string
  description: string
  items: PrincipleItem[]
}

export interface TimeSlot {
  time: string
  period: 'AM' | 'PM'
}

export interface ScheduleDay {
  active: boolean
  slots: TimeSlot[]
}

export type DayKey = 'L' | 'M' | 'Mi' | 'J' | 'V' | 'S' | 'D'

export interface ScheduleClass {
  name: string
  description: string
  details: string[]
  scheduleDays: Partial<Record<DayKey, ScheduleDay>>
}

export interface Schedule {
  heading: string
  dayLabels: Record<DayKey, string>
  classes: ScheduleClass[]
}

export interface GalleryImage extends DataMediaItem {
  id: number | string
  url: string
  title: string
}

export interface Gallery {
  heading: string
  images: GalleryImage[]
}

export interface Comment {
  name: string
  role: string
  content: string
  theme: 'dark' | 'highlight' | 'light'
}

export interface Comments {
  heading: string
  items: Comment[]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface Faq {
  heading: string
  description: string
  faqs: FaqItem[]
}

export interface ContactItem {
  title: string
  content: string
  icon: string
  url: string
}

export interface ContactChannelConfig {
  label: string
  icon: string
  urlTemplate: string
}

export interface Whatsapp {
  number: string
  message: string
  title: string
}

export interface Contact {
  heading: string
  description: string
  mapEmbedUrl: string
  mapLink: string
  whatsapp: Whatsapp
  contact?: ContactItem[]
}

export interface Footer {
  copyright: number
  owner: string
  footerItems: Array<{ label: string; url: string }>
}

export interface WebGlobals {
  siteTitle: string
  siteDescription: string
  contactPhone: string
  contactEmail: string
  contactAddress: string
  socialLinks: SocialLink[]
}

// Root content schema — the full JSON document
export interface SiteContent {
  globals: WebGlobals
  header: Header
  hero: Hero
  about: About
  art: Art
  principles: Principles
  schedule: Schedule
  gallery: Gallery
  comments: Comments
  faq: Faq
  contact: Contact
  footer: Footer
  _metadata?: {
    lastModifiedBy?: string
  }
}

export type CmsSection =
  | 'base'
  | 'hero'
  | 'about'
  | 'schedule'
  | 'testimonials'
  | 'faq'
  | 'gallery'
  | 'storage'
  | 'backups'

export interface UploadImageConfig {
  maxSizeMB?: number
}

export interface CmsPublishResult {
  success: boolean
  backupKey?: string
  error?: string
  deployHookTriggered?: boolean
  publicUrl?: string
}
