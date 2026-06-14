'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Syncs tab state with the URL search parameters.
 * 
 * Ensures that navigating between sections updates the browser history,
 * allowing for deep linking and a consistent "back" button experience.
 */
export function useTabSync<T extends string>(
  paramName: string,
  defaultTab: T,
  validTabs: T[]
) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTab = useMemo(() => {
    const rawTab = searchParams.get(paramName) as T
    return validTabs.includes(rawTab) ? rawTab : defaultTab
  }, [searchParams, paramName, defaultTab, validTabs])

  const setTab = useCallback((newTab: T) => {
    if (newTab === activeTab) return
    
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, newTab)
    
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams, paramName, activeTab])

  return { activeTab, setTab }
}
