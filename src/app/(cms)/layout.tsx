/**
 * CMS Layout — Server Component
 *
 * Reads the session JWT server-side and enforces CMS role access (admin | maintainer).
 * Middleware is the primary guard; this is a secondary safety layer.
 * Passes the verified user to CmsShell (Client Component).
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import CmsShell from './_components/cms-shell'

import { getActiveModules } from '@/lib/modules'

const { adminEnabled, cmsEnabled } = getActiveModules()

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Module availability guard
  if (!cmsEnabled) {
    redirect(adminEnabled ? '/dashboard' : '/login')
  }

  // Read session JWT server-side — no useEffect, no round-trip
  const activeUser = await getCurrentUser()
  if (!activeUser) {
    redirect('/login')
  }

  // Role guard: CMS requires admin or maintainer
  if (!Roles.canAccessCms(activeUser.role)) {
    redirect('/dashboard')
  }

  return (
    <CmsShell activeUser={activeUser}>
      {children}
    </CmsShell>
  )
}
