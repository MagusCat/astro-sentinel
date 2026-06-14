import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/actions'
import { getActiveModules } from '@/lib/modules'
import LoginPageClient from '@/features/auth/components/login-page-client'

const { adminEnabled, cmsEnabled, anyEnabled } = getActiveModules()

/**
 * Login Page — Server Component
 *
 * Checks session server-side to redirect already-authenticated users
 * before rendering the client-side login UI.
 */
export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    if (adminEnabled) redirect('/dashboard')
    if (cmsEnabled) redirect('/editor')
  }

  return (
    <LoginPageClient
      adminEnabled={adminEnabled}
      cmsEnabled={cmsEnabled}
      anyEnabled={anyEnabled}
    />
  )
}

