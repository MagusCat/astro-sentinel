'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ProgressBar } from './progress-bar'

/**
 * NavigationIndicator - A top-level progress bar that reacts to route changes.
 * Especially useful for mobile where full-page loading indicators can be jarring or missing.
 */
export function NavigationIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // When path or params change, we consider navigation started
    // In a real scenario, we might want to start this BEFORE the change, 
    // but in App Router, this is usually fast enough to show "finishing" progress.
    setIsNavigating(true)
    setProgress(30)
    
    const timer = setTimeout(() => {
      setProgress(100)
      const hideTimer = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(hideTimer)
    }, 400)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!isNavigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 pointer-events-none">
      <ProgressBar 
        value={progress} 
        className="h-full bg-transparent rounded-none" 
        barClassName="h-full rounded-none shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
      />
    </div>
  )
}
