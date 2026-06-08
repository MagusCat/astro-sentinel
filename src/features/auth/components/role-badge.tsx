'use client'

import { AppRole, APP_ROLE } from '@/lib/auth/roles'

const ROLE_LABELS: Record<AppRole, string> = {
  [APP_ROLE.MAINTAINER]: 'Mantenedor',
  [APP_ROLE.ADMIN]: 'Administrador',
  [APP_ROLE.RECEPTION]: 'Recepcionista',
}

const ROLE_BADGE_STYLES: Record<AppRole, string> = {
  [APP_ROLE.MAINTAINER]: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20',
  [APP_ROLE.ADMIN]: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  [APP_ROLE.RECEPTION]: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
}

const FALLBACK_STYLE = 'bg-muted text-muted-foreground border border-border'

/** Returns the localized display name for a role. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as AppRole] ?? role.charAt(0).toUpperCase() + role.slice(1)
}

interface RoleBadgeProps {
  role: string
  className?: string
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const label = ROLE_LABELS[role as AppRole] ?? role
  const styles = ROLE_BADGE_STYLES[role as AppRole] ?? FALLBACK_STYLE

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles} ${className}`}>
      {label}
    </span>
  )
}
