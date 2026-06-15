'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { VALID_TABS, TabId } from '../types'
import { Roles } from '@/lib/auth/roles'
import { getRoleLabel } from '@/features/auth/components/role-badge'
import { useNavigationStore } from '@/store/navigation-store'

export function useSidebarNav(role?: string) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isNavigating, setIsNavigating } = useNavigationStore()

  const rawTab = searchParams.get('tab') as string | null
  const activeTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as TabId)
    : (role === 'reception' ? 'reception' : 'overview')

  useEffect(() => {
    // End navigation state when active tab actually changes
    setIsNavigating(false)
  }, [activeTab, setIsNavigating])

  const navigateToAdmin = (role: string) => {
    if (Roles.canManageStaff(role)) {
      setIsNavigating(true)
      void router.push('/dashboard?tab=developer')
    }
  }

  return {
    activeTab,
    transitioningTab: isNavigating ? 'loading' : null, // Generic loading state
    setTransitioningTab: (tab: string | null) => setIsNavigating(!!tab),
    navigateToAdmin,
    getRoleText: getRoleLabel,
  }
}

