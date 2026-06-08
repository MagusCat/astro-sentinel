import { LayoutDashboard, Users, CreditCard, ShieldCheck, BookOpen } from 'lucide-react'
import { SidebarLink } from './types'

export const MAIN_LINKS: SidebarLink[] = [
  { id: 'overview', label: 'Administración', href: '/dashboard?tab=overview', icon: LayoutDashboard },
  { id: 'reception', label: 'Recepción', href: '/dashboard?tab=reception', icon: Users },
  { id: 'checkout', label: 'Registro de Pagos', href: '/dashboard?tab=checkout', icon: CreditCard },
]

export const ADMIN_LINKS: SidebarLink[] = [
  { id: 'admin_users', label: 'Gestión de Personal', href: '/dashboard?tab=admin_users', icon: ShieldCheck },
  { id: 'clients', label: 'Gestión de Clientes', href: '/dashboard?tab=clients', icon: Users },
  { id: 'plans', label: 'Gestión de Clases y Planes', href: '/dashboard?tab=plans', icon: BookOpen },
  { id: 'payments', label: 'Historial de Pagos', href: '/dashboard?tab=payments', icon: CreditCard },
  { id: 'memberships', label: 'Gestión de Membresías', href: '/dashboard?tab=memberships', icon: ShieldCheck },
]
