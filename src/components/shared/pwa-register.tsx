'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    workbox?: unknown
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox === undefined // Avoid double registration if using tools
    ) {
      // Register service worker on window load
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registrado con éxito:', reg.scope)
          })
          .catch((err) => {
            console.error('[PWA] Error al registrar el Service Worker:', err)
          })
      }

      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [])

  return null
}
