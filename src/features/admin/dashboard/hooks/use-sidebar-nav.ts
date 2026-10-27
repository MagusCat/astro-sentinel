'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { VALID_TABS, TabId } from '../types'
import { Roles } from '@/lib/auth/roles'
import { getRoleLabel } from '@/features/auth/components/role-badge'
import { useNavigationStore } from '@/store/navigation-store'

export function useSidebarNav(role?: string) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { isNavigating, transitioningTabId, setIsNavigating } = useNavigationStore()

  const rawTab = searchParams.get('tab') as string | null
  const activeTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as TabId)
    : (role && Roles.isReception(role) ? 'reception' : 'overview')

  useEffect(() => {
    // End navigation state when active tab actually changes or pathname changes (e.g., navigating to /editor)
    setIsNavigating(false)
  }, [activeTab, pathname, setIsNavigating])

  const navigateToAdmin = (role: string) => {
    if (Roles.canAccessDeveloper(role)) {
      setIsNavigating(true, 'developer')
      void router.push('/dashboard?tab=developer')
    } else if (Roles.canManageStaff(role)) {
      setIsNavigating(true, 'overview')
      void router.push('/dashboard?tab=overview')
    }
  }

  return {
    activeTab,
    transitioningTab: isNavigating ? transitioningTabId : null,
    setTransitioningTab: (tab: string | null) => setIsNavigating(!!tab, tab),
    navigateToAdmin,
    getRoleText: getRoleLabel,
  }
}
