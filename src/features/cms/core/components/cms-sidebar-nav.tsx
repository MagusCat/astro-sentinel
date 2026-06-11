'use client'

import React, { useState, useEffect } from 'react'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { getRoleLabel } from '@/features/auth/components/role-badge'
import { CmsSection } from '../types'
import { CMS_SECTIONS, CMS_SYSTEM_SECTIONS } from '../config'
import { AppSidebar, AppSidebarGroup, AppSidebarItem } from '@/components/shared'
import { cn } from '@/lib/utils'
import { getActiveModules } from '@/lib/modules'

const { adminEnabled } = getActiveModules()

interface CmsSidebarNavProps {
  activeUser?: AuthenticatedUser
  activeSection: CmsSection
  navigateToSection: (section: CmsSection) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
  isDirty: boolean
  handleGoToAdmin: () => void
  handleLogoutWithCheck: () => void
}

function DirtyBanner({ isDirty }: { isDirty: boolean }) {
  const [show, setShow] = useState(isDirty)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (isDirty) {
      setShow(true)
      setClosing(false)
    } else if (show) {
      setClosing(true)
      const timer = setTimeout(() => {
        setShow(false)
        setClosing(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isDirty, show])

  if (!show) return null

  return (
    <div className={`mt-4 p-4 bg-amber-500 rounded-xl flex flex-col gap-1.5 shadow-lg shadow-amber-500/20 text-white
      ${closing
        ? 'animate-out fade-out slide-out-to-bottom-2 zoom-out-95 duration-300 ease-in'
        : 'animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-500 ease-out fill-mode-both'}`}>
      <p className="text-[13px] font-black flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white inline-block animate-pulse" />
        Cambios Pendientes
      </p>
      <p className="text-[10px] text-amber-50 font-medium leading-tight tracking-wide">Tienes ediciones sin publicar. No olvides guardar.</p>
    </div>
  )
}

import { Logo } from '@/components/shared'

export default function CmsSidebarNav({
  activeUser,
  activeSection,
  navigateToSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  isDirty,
  handleGoToAdmin,
  handleLogoutWithCheck,
}: CmsSidebarNavProps) {
  return (
    <AppSidebar
      title={<Logo size="md" subtitle="Editor Web" color="white" />}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobileOpen={isMobileOpen}
      onCloseMobile={onCloseMobile}
      footerContent={
        <>
          {adminEnabled && (
            <div className="mb-2">
              <button
                type="button"
                onClick={handleGoToAdmin}
                className={cn(
                  "flex items-center justify-center transition-all duration-200 cursor-pointer border border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground bg-sidebar-accent/30 font-semibold text-xs",
                  isCollapsed ? "w-10 h-10 rounded-xl mx-auto" : "w-full gap-3 px-4 py-3 rounded-xl"
                )}
                title="Regresar al Admin"
              >
                <LayoutDashboard className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!isCollapsed && <span className="font-bold uppercase tracking-wider text-left">Regresar al Admin</span>}
              </button>
            </div>
          )}

          {!isCollapsed && (
            <div className="space-y-1">
              <DirtyBanner isDirty={isDirty} />
            </div>
          )}

          {activeUser && (
            <div className={cn("pt-4 w-full border-t border-sidebar-border mt-4 flex flex-col", isCollapsed ? "items-center gap-3" : "space-y-4")}>
              {!isCollapsed && (
                <div className="px-4">
                  <p className="text-sm font-bold text-sidebar-foreground/90 truncate">
                    {activeUser.full_name || activeUser.username}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 font-mono uppercase tracking-wider mt-0.5">
                    {getRoleLabel(activeUser.role)}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogoutWithCheck}
                className={cn(
                  "bg-sidebar-accent hover:bg-sidebar-accent/85 text-sidebar-foreground font-bold flex items-center justify-center transition-all cursor-pointer",
                  isCollapsed ? "w-10 h-10 rounded-xl mx-auto" : "w-full py-3 rounded-xl gap-2 text-sm"
                )}
                title="Cerrar Sesión"
              >
                <LogOut className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-3.5 h-3.5")} />
                {!isCollapsed && <span>Cerrar Sesión</span>}
              </button>
            </div>
          )}
        </>
      }
    >
      <AppSidebarGroup title="Secciones">
        {CMS_SECTIONS.filter(s => !s.hidden).map((section) => (
          <AppSidebarItem
            key={section.id}
            label={section.label}
            icon={section.icon}
            onClick={() => navigateToSection(section.id)}
            isActive={activeSection === section.id}
          />
        ))}
      </AppSidebarGroup>

      <AppSidebarGroup title="Sistema">
        {CMS_SYSTEM_SECTIONS.filter(s => !s.hidden).map((section) => (
          <AppSidebarItem
            key={section.id}
            label={section.label}
            icon={section.icon}
            onClick={() => navigateToSection(section.id)}
            isActive={activeSection === section.id}
          />
        ))}
      </AppSidebarGroup>
    </AppSidebar>
  )
}
