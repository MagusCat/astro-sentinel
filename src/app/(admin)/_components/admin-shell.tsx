'use client'

/**
 * AdminShell — Client Component
 *
 * Receives the authenticated user from the Server Component parent (AdminLayout)
 * and renders the interactive shell: sidebar navigation and logout handlers.
 * Keeping this as 'use client' because it uses useRouter for navigation.
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { UserProvider } from '@/features/auth/context'
import { logoutUser, logoutUserFull } from '@/features/auth/actions'
import SidebarNav from '@/features/admin/dashboard/components/sidebar-nav'
import { SessionLoading } from '@/components/shared'
import { useSidebarState } from '@/hooks/use-sidebar-state'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  activeUser: AuthenticatedUser
  children: React.ReactNode
}

export default function AdminShell({ activeUser, children }: AdminShellProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  const { isCollapsed, isMounted, enableTransitions, toggleCollapse } = useSidebarState()

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

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-start gap-10  px-6 py-4 border-b border-border/40 bg-card w-full shrink-0 z-40">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1 rounded-md hover:bg-muted text-foreground transition-colors focus:outline-none cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <span className="font-extrabold text-foreground text-lg tracking-tight">Sentinel</span>
        </div>

        {/* Sidebar Backdrop Overlay (Mobile only) */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
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
          "flex-1 h-[calc(100vh-65px)] md:h-screen md:max-h-screen flex flex-col w-full bg-background overflow-hidden",
          enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}>
          <main className="w-full h-full flex-1 px-4 sm:px-6 md:px-10 py-6 flex flex-col justify-start items-stretch relative z-10 overflow-y-auto">
            {children}
          </main>
        </div>

      </div>
    </UserProvider>
  )
}
