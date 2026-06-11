'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarContextType {
  isCollapsed: boolean
  isMounted: boolean
  enableTransitions: boolean
}

const SidebarContext = createContext<SidebarContextType>({ isCollapsed: false, isMounted: false, enableTransitions: false })

export interface AppSidebarProps {
  title: React.ReactNode
  subtitle?: string
  onTitleClick?: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  footerContent?: React.ReactNode
  children: React.ReactNode
}

export function AppSidebar({
  title,
  subtitle,
  onTitleClick,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  footerContent,
  children
}: AppSidebarProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [enableTransitions, setEnableTransitions] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => {
      setEnableTransitions(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <SidebarContext.Provider value={{ isCollapsed, isMounted, enableTransitions }}>
      <aside
        className={cn(
          "h-[100dvh] fixed left-0 top-0 bg-sidebar text-sidebar-foreground flex flex-col py-8 border-r border-sidebar-border z-50 shadow-xl overflow-hidden",
          enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isCollapsed ? "w-20 px-2" : "w-64 px-4",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className={cn("mb-10 flex items-center shrink-0", isCollapsed ? "justify-center px-0 min-h-10" : "justify-between px-4 min-h-10")}>
          {!isCollapsed ? (
            <>
              <div>
                {onTitleClick ? (
                  <button
                    type="button"
                    onClick={onTitleClick}
                    className="block text-left hover:opacity-80 cursor-pointer focus:outline-none transition-opacity"
                  >
                    {typeof title === 'string' ? (
                      <span className="font-extrabold text-sidebar-foreground text-2xl tracking-tight leading-none">{title}</span>
                    ) : (
                      title
                    )}
                  </button>
                ) : (
                  typeof title === 'string' ? (
                    <span className="font-extrabold text-sidebar-foreground text-2xl tracking-tight leading-none block text-left">
                      {title}
                    </span>
                  ) : (
                    title
                  )
                )}
                
                {subtitle && (
                  <span className="text-[10px] text-sidebar-foreground/45 font-mono uppercase tracking-widest mt-1.5 block font-bold">
                    {subtitle}
                  </span>
                )}
              </div>
              
              <div className="flex items-center">
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="flex p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors cursor-pointer focus:outline-none"
                    title="Colapsar menú"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {onCloseMobile && (
                  <button
                    onClick={onCloseMobile}
                    className="md:hidden p-1.5 rounded-md hover:bg-sidebar-border/30 text-sidebar-foreground transition-colors focus:outline-none cursor-pointer"
                    aria-label="Cerrar menú"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="flex w-10 h-10 rounded-xl bg-sidebar-accent hover:bg-sidebar-border/50 text-sidebar-foreground items-center justify-center transition-colors cursor-pointer"
                title="Expandir menú"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 flex flex-col justify-between">
          <div className="space-y-6">
            {children}
          </div>

          {footerContent && (
            <div className="mt-auto pt-6 border-t border-sidebar-border shrink-0 space-y-4">
              {footerContent}
            </div>
          )}
        </div>
      </aside>
    </SidebarContext.Provider>
  )
}

export interface AppSidebarGroupProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function AppSidebarGroup({ title, children, className }: AppSidebarGroupProps) {
  const { isCollapsed, enableTransitions } = useContext(SidebarContext)

  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <p className={cn(
          "text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest select-none truncate",
          enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isCollapsed ? "max-h-0 opacity-0 overflow-hidden pb-0 px-0 mb-0" : "max-h-10 opacity-100 px-4 pb-2"
        )}>
          {title}
        </p>
      )}
      {title && (
        <div className={cn(
          "bg-sidebar-border/50 mx-2",
          enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isCollapsed ? "h-px mb-2 opacity-100" : "h-0 opacity-0 mb-0"
        )} />
      )}
      <nav className="space-y-0.5">
        {children}
      </nav>
    </div>
  )
}

export interface AppSidebarItemProps {
  label: string
  icon: React.ElementType
  href?: string
  onClick?: () => void
  isActive?: boolean
  isLoading?: boolean
  variant?: 'default' | 'accent' | 'danger'
}

export function AppSidebarItem({ 
  label, 
  icon: Icon, 
  href, 
  onClick, 
  isActive, 
  isLoading,
  variant = 'default' 
}: AppSidebarItemProps) {
  const { isCollapsed, enableTransitions } = useContext(SidebarContext)

  const content = (
    <>
      <div className="shrink-0 flex items-center justify-center min-w-5">
        {isLoading ? (
          <RefreshCw className="size-4 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
      <span className={cn(
        "text-sm font-semibold truncate origin-left",
        enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        isCollapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[200px] opacity-100"
      )}>
        {label}
      </span>
    </>
  )

  const baseClasses = cn(
    "flex items-center rounded-xl cursor-pointer text-left overflow-hidden",
    enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
    isCollapsed ? "justify-center p-3 gap-0" : "px-4 py-3 gap-3 w-full"
  )
  
  let stateClasses = "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
  if (isActive) {
    stateClasses = "bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-md"
  } else if (variant === 'accent') {
    stateClasses = "border border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground bg-sidebar-accent/30"
  } else if (variant === 'danger') {
    stateClasses = "text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-500"
  }

  const className = cn(baseClasses, stateClasses)
  const titleAttr = isCollapsed ? label : undefined

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className} title={titleAttr}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} title={titleAttr}>
      {content}
    </button>
  )
}
