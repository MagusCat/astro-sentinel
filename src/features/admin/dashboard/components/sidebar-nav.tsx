'use client'

import { Roles } from '@/lib/auth/roles'
import { SidebarNavProps } from '../types'
import { useSidebarNav } from '../hooks/use-sidebar-nav'
import { MAIN_LINKS, ADMIN_LINKS } from '../config'
import { AppSidebar, AppSidebarGroup, AppSidebarItem } from '@/components/shared'
import { LogOut, Power, FileEdit, Terminal, Users, UserCheck, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActiveModules } from '@/lib/modules'

import { Logo } from '@/components/shared'

export default function SidebarNav({
  activeUser,
  onLogout,
  onLogoutFull,
  cmsMode = false,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse
}: SidebarNavProps) {
  const { activeTab, transitioningTab, setTransitioningTab, navigateToAdmin, getRoleText } = useSidebarNav(activeUser.role)
  const { localLoginEnabled } = getActiveModules()

  const isReception = activeUser.role === 'reception'
  const showAdminMenu = Roles.canManageStaff(activeUser.role)
  const showDevMenu = Roles.canAccessDeveloper(activeUser.role)
  const isElevated = Roles.canManageStaff(activeUser.role)

  const handleLinkClick = (tab: string) => {
    setTransitioningTab(tab)
    if (onCloseMobile) onCloseMobile()
  }

  const handleTitleClick = () => {
    navigateToAdmin(activeUser.role)
    if (onCloseMobile) onCloseMobile()
  }

  const footerContent = (
    <>
      {(showAdminMenu || showDevMenu) && (
        <div className={cn("mb-4", isCollapsed ? "space-y-3" : "space-y-2")}>
          {showAdminMenu && (
            <AppSidebarItem
              label="Editor de Sitio Web"
              icon={FileEdit}
              href="/editor"
              onClick={() => handleLinkClick('cms')}
              isActive={cmsMode}
              isLoading={transitioningTab === 'cms'}
              variant="accent"
            />
          )}
          {showDevMenu && (
            <AppSidebarItem
              label="Mantenimiento"
              icon={Terminal}
              href="/dashboard?tab=developer"
              onClick={() => handleLinkClick('developer')}
              isActive={activeTab === 'developer' && !cmsMode}
              isLoading={transitioningTab === 'developer'}
              variant="accent"
            />
          )}
        </div>
      )}

      <div className={cn("pt-4 border-t border-sidebar-border w-full flex flex-col", isCollapsed ? "items-center gap-3" : "space-y-4")}>
        {!isCollapsed && (
          <div className="px-4">
            <p className="text-sm font-bold text-sidebar-foreground/90 truncate">
              {activeUser.full_name || activeUser.username}
            </p>
            <p className="text-xs text-sidebar-foreground/50 font-mono uppercase tracking-wider mt-0.5">
              {getRoleText(activeUser.role)}
            </p>
          </div>
        )}

        {isElevated && localLoginEnabled ? (
          <div className={cn("flex w-full", isCollapsed ? "flex-col items-center gap-3" : "flex-col gap-2")}>
            <button
              onClick={onLogoutFull || onLogout}
              className={cn(
                "bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer shadow-md shadow-rose-900/10",
                isCollapsed ? "w-10 h-10 rounded-xl" : "w-full py-3.5 rounded-xl gap-2 text-sm"
              )}
              title="Cerrar Terminal y Quitar Permisos"
            >
              <Power className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-3.5 h-3.5")} />
              <span className={cn(
                "truncate transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                isCollapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[150px] opacity-100"
              )}>Cerrar Terminal</span>
            </button>
            <button
              onClick={onLogout}
              className={cn(
                "bg-sidebar-accent hover:bg-sidebar-accent/85 text-sidebar-foreground font-bold flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer",
                isCollapsed ? "w-10 h-10 rounded-xl" : "w-full py-3 rounded-xl gap-2 text-sm"
              )}
              title="Cerrar solo sesión operativa"
            >
              <LogOut className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-3.5 h-3.5")} />
              <span className={cn(
                "truncate transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                isCollapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[150px] opacity-100"
              )}>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className={cn(
              "bg-sidebar-accent hover:bg-sidebar-accent/85 text-sidebar-foreground font-bold flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer",
              isCollapsed ? "w-10 h-10 rounded-xl mx-auto" : "w-full py-3 rounded-xl gap-2 text-sm"
            )}
            title="Cerrar Sesión"
          >
            <LogOut className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-3.5 h-3.5")} />
            <span className={cn(
              "truncate transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              isCollapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[150px] opacity-100"
            )}>Cerrar Sesión</span>
          </button>
        )}
      </div>
    </>
  )

  const subtitleLabel = isReception ? "Recepcionista" : "Administrador"

  return (
    <AppSidebar
      title={<Logo size="md" subtitle={subtitleLabel} color="white" />}
      onTitleClick={handleTitleClick}
      isMobileOpen={isMobileOpen}
      onCloseMobile={onCloseMobile}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      footerContent={footerContent}
    >
      {isReception ? (
        <>
          <AppSidebarGroup title="Recepción">
            <AppSidebarItem
              label="Recepción"
              icon={UserCheck}
              href="/dashboard?tab=reception"
              onClick={() => handleLinkClick('reception')}
              isActive={activeTab === 'reception' && !cmsMode}
              isLoading={transitioningTab === 'reception'}
            />
            <AppSidebarItem
              label="Gestión de Clientes"
              icon={Users}
              href="/dashboard?tab=clients"
              onClick={() => handleLinkClick('clients')}
              isActive={activeTab === 'clients' && !cmsMode}
              isLoading={transitioningTab === 'clients'}
            />
          </AppSidebarGroup>

          <AppSidebarGroup title="Pagos">
            <AppSidebarItem
              label="Registro de Pagos"
              icon={CreditCard}
              href="/dashboard?tab=checkout"
              onClick={() => handleLinkClick('checkout')}
              isActive={activeTab === 'checkout' && !cmsMode}
              isLoading={transitioningTab === 'checkout'}
            />
            <AppSidebarItem
              label="Historial de Pagos"
              icon={CreditCard}
              href="/dashboard?tab=payments"
              onClick={() => handleLinkClick('payments')}
              isActive={activeTab === 'payments' && !cmsMode}
              isLoading={transitioningTab === 'payments'}
            />
          </AppSidebarGroup>
        </>
      ) : (
        <>
          <AppSidebarGroup>
            {MAIN_LINKS.map((link) => (
              <AppSidebarItem
                key={link.id}
                label={link.label}
                icon={link.icon}
                href={link.href}
                onClick={() => handleLinkClick(link.id)}
                isActive={activeTab === link.id && !cmsMode}
                isLoading={transitioningTab === link.id}
              />
            ))}
          </AppSidebarGroup>

          {showAdminMenu && (
            <AppSidebarGroup title="Administrar">
              {ADMIN_LINKS.map((link) => (
                <AppSidebarItem
                  key={link.id}
                  label={link.label}
                  icon={link.icon}
                  href={link.href}
                  onClick={() => handleLinkClick(link.id)}
                  isActive={activeTab === link.id && !cmsMode}
                  isLoading={transitioningTab === link.id}
                />
              ))}
            </AppSidebarGroup>
          )}
        </>
      )}
    </AppSidebar>
  )
}
