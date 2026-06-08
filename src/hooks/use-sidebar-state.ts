import { useState, useEffect } from 'react'
import { useMediaQuery } from './use-media-query'

export function useSidebarState() {
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [enableTransitions, setEnableTransitions] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('sentinel-sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    } else {
      setIsCollapsed(isTablet)
    }

    const timer = setTimeout(() => {
      setEnableTransitions(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [isTablet])

  const toggleCollapse = () => {
    const newVal = !isCollapsed
    setIsCollapsed(newVal)
    localStorage.setItem('sentinel-sidebar-collapsed', String(newVal))
  }

  return { isCollapsed, isMounted, enableTransitions, toggleCollapse }
}
