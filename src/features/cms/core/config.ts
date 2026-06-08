import { Image, Star, Calendar, Grid, Settings, Database, History, Activity } from 'lucide-react'
import { CmsSection } from './types'

export const CMS_SECTIONS: Array<{ id: CmsSection; label: string; icon: React.ElementType }> = [
  { id: 'base',        label: 'Datos Generales',        icon: Settings },
  { id: 'hero',        label: 'Banner Principal',       icon: Image },
  { id: 'identity',    label: 'Sección Sobre Nosotros', icon: Star },
  { id: 'schedule',    label: 'Horarios de Atención',   icon: Calendar },
  { id: 'media',       label: 'Multimedia y Reseñas',   icon: Grid },
]

export const CMS_SYSTEM_SECTIONS: Array<{ id: CmsSection; label: string; icon: React.ElementType }> = [
  { id: 'storage',     label: 'Gestor de Archivos',     icon: Database },
  { id: 'backups',     label: 'Historial de Versiones', icon: History },
  { id: 'status',      label: 'Estado de la Web',       icon: Activity },
]
