import { AppRole, APP_ROLE } from '@/lib/config/domain'

/**
 * Centralized Role-Based Access Control (RBAC) Guards
 * 
 * Used to protect routes (Server-side) and UI elements (Client-side).
 */
export const AuthGuard = {
  /** Can access the main dashboard and common admin modules */
  canAccessDashboard: (role: string): boolean =>
    Object.values(APP_ROLE).includes(role as AppRole),

  /** Can access the CMS editor and publish content */
  canAccessCms: (role: string): boolean =>
    ([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN] as AppRole[]).includes(role as AppRole),

  /** Can manage staff and receptionists */
  canManageStaff: (role: string): boolean =>
    ([APP_ROLE.MAINTAINER, APP_ROLE.ADMIN] as AppRole[]).includes(role as AppRole),

  /** Can access developer-specific tools (authorized devices, etc.) */
  canAccessDeveloper: (role: string): boolean =>
    role === APP_ROLE.MAINTAINER,

  /** Can modify administrator accounts */
  canManageAdmins: (role: string): boolean =>
    role === APP_ROLE.MAINTAINER,

  /** Whether the actor can create a user with the given target role */
  canCreateRole: (actorRole: string, targetRole: string): boolean => {
    if (actorRole === APP_ROLE.MAINTAINER) return true
    if (actorRole === APP_ROLE.ADMIN) return targetRole === APP_ROLE.RECEPTION
    return false
  },

  /** Whether the actor can delete a user with the given target role */
  canDeleteUser: (actorRole: string, targetRole: string): boolean => {
    if (actorRole === APP_ROLE.MAINTAINER) return true
    if (actorRole === APP_ROLE.ADMIN) return targetRole === APP_ROLE.RECEPTION
    return false
  },
} as const
