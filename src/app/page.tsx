'use client'

export const runtime = 'edge';

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/actions'
import { SessionLoading } from '@/components/shared'

import { getActiveModules } from '@/lib/modules'

const { adminEnabled, cmsEnabled } = getActiveModules()

/**
 * Root Auth Gateway
 *
 * Routes authenticated users to the appropriate module based on what is enabled.
 * Priority: admin → cms → login (if neither is available, falls back to login).
 * Unauthenticated users always go to /login.
 */
export default function AuthGateway() {
  const router = useRouter()

  useEffect(() => {
    const route = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          if (adminEnabled) {
            router.replace('/dashboard')
          } else if (cmsEnabled) {
            router.replace('/editor')
          } else {
            router.replace('/login')
          }
        } else {
          router.replace('/login')
        }
      } catch {
        router.replace('/login')
      }
    }
    route()
  }, [router])

  return <SessionLoading />
}
