'use client'

/**
 * AdminShell — Client Component
 *
 * Receives the authenticated user from the Server Component parent (AdminLayout)
 * and renders the interactive shell: sidebar navigation and logout handlers.
 * Keeping this as 'use client' because it uses useRouter for navigation.
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { UserProvider } from '@/features/auth/context'
import { logoutUser, logoutUserFull } from '@/features/auth/actions'
import SidebarNav from '@/features/admin/dashboard/components/sidebar-nav'
import SessionLoading from '@/components/shared/layout/session-loading'
import { useSidebarState } from '@/hooks/use-sidebar-state'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  activeUser: AuthenticatedUser
  children: React.ReactNode
}

export default function AdminShell({ activeUser, children }: AdminShellProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isNavigating } = useNavigationStore()
  
  const { isCollapsed, isMounted, enableTransitions, toggleCollapse } = useSidebarState()

  // iPad (768px) and above now get the sidebar
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // iPad / Mobile Gesture Support
  useEffect(() => {
    if (isDesktop) return

    let touchStartX = 0
    let touchEndX = 0
    const edgeThreshold = 40 // Distance from screen edge to trigger "open"
    const swipeMinDistance = 60 // Minimum distance to count as a swipe

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      const deltaX = touchEndX - touchStartX

      // Swipe from left edge to open
      if (!isMobileOpen && touchStartX <= edgeThreshold && deltaX > swipeMinDistance) {
        setIsMobileOpen(true)
      }
      // Swipe left anywhere to close when open
      else if (isMobileOpen && deltaX < -swipeMinDistance) {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobileOpen, isDesktop])

  useEffect(() => {
    if (isDesktop && isMobileOpen) {
      setIsMobileOpen(false)
    }
  }, [isDesktop, isMobileOpen])

  useEffect(() => {
    if (isMobileOpen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isMobileOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logoutUser()
    router.replace('/login')
  }

  const handleLogoutFull = async () => {
    setIsLoggingOut(true)
    await logoutUserFull()
    router.replace('/login')
  }

  if (isLoggingOut) return <SessionLoading />

  return (
    // UserProvider makes activeUser available to ALL descendant pages via useActiveUser()
    <UserProvider activeUser={activeUser}>
      <div className={cn(
        "min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full overflow-hidden transition-opacity duration-200",
        isMounted ? "opacity-100" : "opacity-0"
      )}>

        {/* Mobile Header — hidden on md: (768px+) where sidebar appears */}
        <div className="md:hidden fixed top-0 left-0 right-0 flex items-center px-6 py-4 border-b border-border/40 bg-card w-full z-40 h-[65px]">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1 rounded-md hover:bg-muted text-foreground transition-colors focus:outline-none cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Backdrop Overlay (Mobile only) */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[55] md:hidden animate-in fade-in duration-300"
            onClick={() => setIsMobileOpen(false)}
          />
        )}



        <SidebarNav
          activeUser={activeUser}
          onLogout={handleLogout}
          onLogoutFull={handleLogoutFull}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />

        <div className={cn(
          "flex-1 h-[calc(100dvh-65px)] md:h-screen md:max-h-screen flex flex-col w-full bg-background overflow-hidden mt-[65px] md:mt-0",
          enableTransitions 
            ? "transition-[padding-left,transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" 
            : "transition-none",
          isCollapsed ? "md:pl-20" : "md:pl-64",
          isMobileOpen && "pointer-events-none select-none"
        )}>


          <main className={cn(
            "w-full h-full flex-1 px-4 sm:px-6 md:px-10 py-6 flex flex-col justify-start items-stretch relative z-10",
            isMobileOpen ? "overflow-hidden" : "overflow-y-auto"
          )}>

            {/* Content Loading Overlay — Fixed to cover full viewport during scroll */}
            {isNavigating && (
              <div className="fixed inset-0 bg-background/40 backdrop-blur-[2px] z-[48] flex items-center justify-center animate-in fade-in duration-300 pointer-events-none">
                <div className="md:hidden flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              </div>
            )}

            {children}
          </main>

        </div>

      </div>
    </UserProvider>
  )
}
