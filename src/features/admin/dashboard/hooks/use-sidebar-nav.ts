'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { VALID_TABS, TabId } from '../types'
import { Roles } from '@/lib/auth/roles'
import { getRoleLabel } from '@/features/auth/components/role-badge'

export function useSidebarNav() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [transitioningTab, setTransitioningTab] = useState<string | null>(null)

  const rawTab = searchParams.get('tab') as string | null
  const activeTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as TabId)
    : 'overview'

  useEffect(() => {
    setTransitioningTab(null)
  }, [activeTab])

  const navigateToAdmin = (role: string) => {
    if (Roles.canManageStaff(role)) {
      router.push('/dashboard?tab=developer')
    }
  }

  return {
    activeTab,
    transitioningTab,
    setTransitioningTab,
    navigateToAdmin,
    getRoleText: getRoleLabel,
  }
}
