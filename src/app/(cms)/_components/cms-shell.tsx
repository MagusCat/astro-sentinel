'use client'

/**
 * CmsShell — Client Component
 *
 * Receives the authenticated user from the Server Component parent (CmsLayout)
 * and renders the CMS context provider. Kept as 'use client' because
 * UserProvider uses React context which requires a client component boundary.
 */

import React from 'react'
import { AuthenticatedUser } from '@/features/auth/types'
import { UserProvider } from '@/features/auth/context'

interface CmsShellProps {
  activeUser: AuthenticatedUser
  children: React.ReactNode
}

export default function CmsShell({ activeUser, children }: CmsShellProps) {
  return (
    <UserProvider activeUser={activeUser}>
      <div className="h-screen overflow-hidden bg-background text-foreground antialiased flex flex-col w-full">
        <main className="flex-1 overflow-hidden w-full">
          {children}
        </main>
      </div>
    </UserProvider>
  )
}
