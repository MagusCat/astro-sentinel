import { LayoutDashboard, Users, CreditCard, Package, ShoppingBag, BarChart3, ShieldCheck, BookOpen, Coins, CalendarCheck, CalendarDays } from 'lucide-react'
import { SidebarLink } from './types'

export const MAIN_LINKS: SidebarLink[] = [
  { id: 'overview', label: 'Administración', href: '/dashboard?tab=overview', icon: LayoutDashboard },
  { id: 'reception', label: 'Recepción', href: '/dashboard?tab=reception', icon: Users },
  { id: 'checkout', label: 'Pagos Membresía', href: '/dashboard?tab=checkout', icon: CreditCard },
  { id: 'attendance', label: 'Asistencia', href: '/dashboard?tab=attendance', icon: CalendarCheck },
  { id: 'store', label: 'Tienda (Experimental)', href: '/dashboard?tab=store', icon: ShoppingBag },
  { id: 'reports', label: 'Informes y Caja', href: '/dashboard?tab=reports', icon: BarChart3 },
]

export const ADMIN_LINKS: SidebarLink[] = [
  { id: 'admin_users', label: 'Gestión de Personal', href: '/dashboard?tab=admin_users', icon: ShieldCheck },
  { id: 'clients', label: 'Gestión de Clientes', href: '/dashboard?tab=clients', icon: Users },
  { id: 'plans', label: 'Gestión de Clases y Planes', href: '/dashboard?tab=plans', icon: BookOpen },
  { id: 'schedule', label: 'Horarios y Profesores', href: '/dashboard?tab=schedule', icon: CalendarDays },
  { id: 'inventory', label: 'Inventario (Experimental)', href: '/dashboard?tab=inventory', icon: Package },
  { id: 'payments', label: 'Historial de Pagos', href: '/dashboard?tab=payments', icon: CreditCard },
  { id: 'memberships', label: 'Gestión de Membresías', href: '/dashboard?tab=memberships', icon: ShieldCheck },
  { id: 'settings', label: 'Moneda y Tasas', href: '/dashboard?tab=settings', icon: Coins },
]
