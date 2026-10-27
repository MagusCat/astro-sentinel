import { useState, useLayoutEffect, useRef } from 'react'
import { useMediaQuery } from './use-media-query'
import { useSidebarStore } from '@/store/sidebar-store'

/**
 * useSidebarState — puente UI del SidebarStore.
 *
 * `initialCollapsed` viene del servidor (cookie `sb_collapsed`). Antes de montar,
 * se usa ese valor para que el primer render del cliente coincida con el HTML del
 * servidor (sin mismatch de hidratación ni flash). Al montar, se siembra el store
 * con el mismo valor y se pasa a leer del store — sin cambio visible.
 */
export function useSidebarState(initialCollapsed = true) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  const { isCollapsed: storeCollapsed, toggleCollapse, isMounted, setIsMounted, hydrate } = useSidebarStore()

  const [enableTransitions, setEnableTransitions] = useState(true)
  const lastViewportRef = useRef<'mobile' | 'desktop' | null>(null)

  // useLayoutEffect corre antes del paint: siembra el store desde el valor del
  // servidor y marca montado. También mata las transiciones si cambia el breakpoint.
  useLayoutEffect(() => {
    hydrate(initialCollapsed)
    setIsMounted(true)

    const currentViewport = isMobile ? 'mobile' : 'desktop'
    if (lastViewportRef.current !== null && lastViewportRef.current !== currentViewport) {
      setEnableTransitions(false)
      const timer = setTimeout(() => setEnableTransitions(true), 300)
      return () => clearTimeout(timer)
    }
    lastViewportRef.current = currentViewport
    // initialCollapsed intencionadamente fuera de deps: solo siembra al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, setIsMounted, hydrate])

  // Antes de montar: valor del servidor (coincide con SSR). Después: store.
  const effectiveCollapsed = isMounted ? storeCollapsed : initialCollapsed

  return {
    isCollapsed: isMobile ? false : effectiveCollapsed,
    isMounted,
    enableTransitions,
    toggleCollapse,
  }
}
