import { useState, useLayoutEffect, useRef } from 'react'
import { useMediaQuery } from './use-media-query'
import { useSidebarStore } from '@/store/sidebar-store'

/**
 * useSidebarState — UI Bridge for SidebarStore
 * 
 * Consolidates Zustand store state with responsive logic and 
 * transition timing to prevent layout shifts.
 */
export function useSidebarState() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  
  // Use Zustand store for cross-component consistency
  const { isCollapsed, toggleCollapse, isMounted, setIsMounted } = useSidebarStore()
  
  // Local state for transition control
  const [enableTransitions, setEnableTransitions] = useState(true)
  const lastViewportRef = useRef<'mobile' | 'desktop' | null>(null)

  // useLayoutEffect runs before paint. 
  // We synchronously kill transitions ONLY if the breakpoint changed.
  useLayoutEffect(() => {
    setIsMounted(true)
    const currentViewport = isMobile ? 'mobile' : 'desktop'
    
    // If viewport shifts (e.g. 767px -> 768px), kill transitions to prevent visual jumping
    if (lastViewportRef.current !== null && lastViewportRef.current !== currentViewport) {
      setEnableTransitions(false)
      const timer = setTimeout(() => {
        setEnableTransitions(true)
      }, 300)
      return () => clearTimeout(timer)
    }
    
    lastViewportRef.current = currentViewport
  }, [isMobile, setIsMounted])

  return { 
    isCollapsed: isMobile ? false : isCollapsed, 
    isMounted, 
    enableTransitions, 
    toggleCollapse 
  }
}



