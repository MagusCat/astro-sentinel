import { useState, useEffect } from 'react'
import { useMediaQuery } from './use-media-query'
import { useSidebarStore } from '@/store/sidebar-store'

/**
 * useSidebarState — UI Bridge for SidebarStore
 * 
 * Consolidates Zustand store state with responsive logic and 
 * transition timing to prevent layout shifts.
 */
export function useSidebarState() {
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)')
  const isMobile = useMediaQuery('(max-width: 767px)')
  
  // Use Zustand store for cross-component consistency
  const { isCollapsed, toggleCollapse, isMounted, setIsMounted } = useSidebarStore()
  
  // Local state for transition delay
  const [enableTransitions, setEnableTransitions] = useState(false)

  useEffect(() => {
    // Sync mounting state
    setIsMounted(true)

    // Handle tablet auto-collapse only on first mount if not manually overridden
    const saved = localStorage.getItem('sentinel-sidebar-state')
    if (saved === null && isTablet) {
      // Logic for default tablet behavior could go here if needed
    }

    // Delay transitions until after hydration + small buffer to prevent jumping
    const timer = setTimeout(() => {
      setEnableTransitions(true)
    }, 150)

    return () => clearTimeout(timer)
  }, [setIsMounted, isTablet])

  return { 
    isCollapsed: isMobile ? false : isCollapsed, 
    isMounted, 
    enableTransitions, 
    toggleCollapse 
  }
}
