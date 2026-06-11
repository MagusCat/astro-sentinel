export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  FROZEN: 'frozen',
  CANCELLED: 'cancelled',
  TRANSFERRED: 'transferred',
} as const

export type MembershipStatus = typeof MEMBERSHIP_STATUS[keyof typeof MEMBERSHIP_STATUS]

export const APP_ROLE = {
  MAINTAINER: 'maintainer',
  ADMIN: 'admin',
  RECEPTION: 'reception',
} as const

export type AppRole = typeof APP_ROLE[keyof typeof APP_ROLE]

export const Roles = {
  canAccessDashboard: (role: string): boolean =>
    Object.values(APP_ROLE).includes(role as AppRole),

  canAccessCms: (role: string): boolean =>
    ([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN] as AppRole[]).includes(role as AppRole),

  canManageStaff: (role: string): boolean =>
    ([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN] as AppRole[]).includes(role as AppRole),

  canAccessDeveloper: (role: string): boolean =>
    role === APP_ROLE.MAINTAINER,

  canManageAdmins: (role: string): boolean =>
    role === APP_ROLE.MAINTAINER,
} as const
