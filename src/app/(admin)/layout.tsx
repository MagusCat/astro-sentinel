/**
 * Admin Layout — Server Component
 *
 * Reads the session JWT server-side (no client round-trip).
 * Middleware is the primary guard; this is a secondary safety layer.
 * Passes the verified user to AdminShell (Client Component).
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/features/auth/actions'
import { Roles } from '@/lib/auth/roles'
import AdminShell from './_components/admin-shell'
import { SIDEBAR_COOKIE } from '@/store/sidebar-store'
import { getCurrencySettings } from '@/lib/currency'

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

  // Role guard: Ensure user has dashboard access
  if (!Roles.canAccessDashboard(activeUser.role)) {
    redirect('/login')
  }

  // Sidebar collapse state, known server-side → correct width on first paint (no flash).
  // Default collapsed unless the cookie explicitly says expanded ('0').
  const cookieStore = await cookies()
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value !== '0'

  // Config de moneda resuelta en el servidor: sin fetch en cliente ni parpadeo.
  const currencySettings = await getCurrencySettings()

  return (
    <AdminShell
      activeUser={activeUser}
      initialCollapsed={initialCollapsed}
      currencySettings={currencySettings}
    >
      {children}
    </AdminShell>
  )
}
