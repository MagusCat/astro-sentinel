export interface OverviewStats {
  activeMembershipsCount: number
  dailyRevenue: number
  topClass: string
  classHeadcounts: { className: string; activeStudents: number }[]
  inactiveMemberships: { clientName: string; status: string; endDate: string | null; planName: string; className: string }[]
  recentPayments: { clientName: string; totalAmount: number; paymentMethod: string; transactionDate: string }[]
  recentClients: { fullName: string; createdAt: string }[]
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
  'store',
  'reports',
  'settings',
  'inventory',
  'attendance',
  'schedule'
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
}

export interface InactiveMembershipViewRow {
  client_name: string
  status: string
  end_date: string | null
  plan_name: string
  class_name: string
}

export interface PaymentViewRow {
  client_name: string
  total_amount: number
  payment_method: string
  transaction_date: string
}

export interface ClientViewRow {
  full_name: string
  created_at: string
}

export interface DashboardSnapshots {
  revenueTrend: number[]
  inventoryHealth: {
    healthy: number
    low: number
    outOfStock: number
    total: number
  }
  membershipLifecycle: {
    signups: number[]
    expirations: number[]
  }
  alerts: {
    lowStockCount: number
    expiringSoonCount: number
  }
}

export interface UploadImageConfig {
  maxSizeMB?: number
}

