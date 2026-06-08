/**
 * Role-Based Access Control Helpers
 *
 * Single source of truth for all role permission checks across the app.
 * Edge Runtime compatible — no Node.js-only APIs.
 *
 * Usage:
 *   import { Roles } from '@/lib/auth/roles'
 *   if (Roles.canManageStaff(user.role)) { ... }
 */

export const APP_ROLE = {
  MAINTAINER: 'maintainer',
  ADMIN: 'admin',
  RECEPTION: 'reception'
} as const

export type AppRole = typeof APP_ROLE[keyof typeof APP_ROLE]

export const Roles = {
  /** Any authenticated user can access the admin dashboard */
  canAccessDashboard: (role: string): boolean =>
    Object.values(APP_ROLE).includes(role as AppRole),

  /** Only admin and maintainer can access the CMS editor */
  canAccessCms: (role: string): boolean =>
    ([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN] as AppRole[]).includes(role as AppRole),

  /** Admin and maintainer can view and manage staff users */
  canManageStaff: (role: string): boolean =>
    ([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN] as AppRole[]).includes(role as AppRole),

  /** Only maintainer can access the developer/system panel */
  canAccessDeveloper: (role: string): boolean =>
    role === APP_ROLE.MAINTAINER,

  /** Only maintainer can create or modify admin accounts */
  canManageAdmins: (role: string): boolean =>
    role === APP_ROLE.MAINTAINER,
} as const
