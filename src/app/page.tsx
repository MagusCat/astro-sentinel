import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/actions'
import { getActiveModules } from '@/lib/modules'

const { adminEnabled, cmsEnabled } = getActiveModules()

/**
 * Root Auth Gateway — Server Component
 *
 * Routes authenticated users to the appropriate module based on what is enabled.
 * Priority: admin → cms → login (if neither is available, falls back to login).
 * Unauthenticated users always go to /login.
 */
export default async function AuthGateway() {
  const user = await getCurrentUser()
  if (user) {
    if (adminEnabled) redirect('/dashboard')
    if (cmsEnabled) redirect('/editor')
  }
  redirect('/login')
}
