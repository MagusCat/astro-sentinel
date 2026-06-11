import { Settings, Image, Star, Calendar, MessageSquare, HelpCircle, Images, Database, History } from 'lucide-react'
import { CmsSection } from './types'

export const CMS_SECTIONS: Array<{ id: CmsSection; label: string; icon: React.ElementType; hidden?: boolean }> = [
  { id: 'base', label: 'Datos Generales', icon: Settings },
  { id: 'about', label: 'Sobre Nosotros', icon: Star },
  { id: 'hero', label: 'Banner Principal', icon: Image },
  { id: 'gallery', label: 'Galería', icon: Images },
  { id: 'schedule', label: 'Horarios de Atención', icon: Calendar },
  { id: 'testimonials', label: 'Testimonios', icon: MessageSquare },
  { id: 'faq', label: 'Preguntas Frecuentes', icon: HelpCircle },
]

export const CMS_SYSTEM_SECTIONS: Array<{ id: CmsSection; label: string; icon: React.ElementType; hidden?: boolean }> = [
  { id: 'storage', label: 'Gestor de Archivos', icon: Database },
  { id: 'backups', label: 'Historial de Versiones', icon: History },
]

export const CMS_LIMITS = {
  maxGalleryImages: 10,
  maxTestimonials: 6,
  maxClasses: 10,
  maxHeroImages: 8,
  maxSocialLinks: 8,
  maxFaqItems: 16,
}

export const CMS_SOCIAL_NETWORKS = [
  { id: 'facebook', name: 'Facebook', icon: 'mingcute:facebook-fill', urlTemplate: 'https://facebook.com/{username}' },
  { id: 'instagram', name: 'Instagram', icon: 'mingcute:ins-fill', urlTemplate: 'https://instagram.com/{username}' },
  { id: 'tiktok', name: 'TikTok', icon: 'mingcute:tiktok-fill', urlTemplate: 'https://tiktok.com/@{username}' },
  { id: 'twitter', name: 'X (Twitter)', icon: 'mingcute:social-x-line', urlTemplate: 'https://twitter.com/{username}' },
  { id: 'youtube', name: 'YouTube', icon: 'mingcute:youtube-fill', urlTemplate: 'https://youtube.com/@{username}' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'mingcute:linkedin-fill', urlTemplate: 'https://linkedin.com/in/{username}' },
]
