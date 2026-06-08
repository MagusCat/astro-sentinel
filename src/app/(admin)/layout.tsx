/**
 * Admin Layout — Server Component
 *
 * Reads the session JWT server-side (no client round-trip).
 * Middleware is the primary guard; this is a secondary safety layer.
 * Passes the verified user to AdminShell (Client Component).
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/actions'
import AdminShell from './_components/admin-shell'

import { getActiveModules } from '@/lib/modules'

const { adminEnabled, cmsEnabled } = getActiveModules()

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Module availability guard
  if (!adminEnabled) {
    redirect(cmsEnabled ? '/editor' : '/login')
  }

  // Read session JWT server-side — no useEffect, no round-trip
  const activeUser = await getCurrentUser()
  if (!activeUser) {
    redirect('/login')
  }

  return (
    <AdminShell activeUser={activeUser}>
      {children}
    </AdminShell>
  )
}
