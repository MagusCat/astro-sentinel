export interface OverviewStats {
  activeMembershipsCount: number
  dailyRevenue: number
  topClass: string
  classHeadcounts: { className: string; activeStudents: number }[]
  inactiveMemberships: { clientName: string; status: string; endDate: string | null; planName: string; className: string }[]
  recentPayments: { clientName: string; totalAmount: number; paymentMethod: string; transactionDate: string }[]
  recentClients: { fullName: string; createdAt: string; registrationSource: string | null }[]
  totalClientsCount: number
  totalClassesCount: number
}

export interface SidebarLink {
  id: TabId
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface SidebarNavProps {
  activeUser: import('@/features/auth/types').AuthenticatedUser
  onLogout: () => void
  onLogoutFull?: () => void
  cmsMode?: boolean
  isMobileOpen?: boolean
  onCloseMobile?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const VALID_TABS = [
  'overview',
  'clients',
  'plans',
  'payments',
  'admin_users',
  'developer',
  'cms',
  'checkout',
  'reception',
  'memberships',
] as const

export type TabId = typeof VALID_TABS[number]

export interface ClassHeadcountRow {
  class_name: string
  active_students: number
}

export interface InactiveRow {
  status: string
  end_date: string | null
  clients: { full_name: string } | { full_name: string }[] | null
  class_plans: {
    plan_name: string
    classes: { name: string } | { name: string }[] | null
  } | {
    plan_name: string
    classes: { name: string } | { name: string }[] | null
  }[] | null
}

export interface PaymentRow {
  total_amount: number
  payment_method: string
  transaction_date: string
  clients: { full_name: string } | { full_name: string }[] | null
}

export interface ClientRow {
  full_name: string
  created_at: string
  registration_source: string | null
}

