'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, LayoutDashboard, LogOut, AlertTriangle } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { logoutUser } from '@/features/auth/actions'
import { getRoleLabel } from '@/features/auth/components/role-badge'
import { SiteContent, CmsSection } from '../types'
import { getSiteContent, publishSiteContent, getLastPublicationDate } from '../actions'
import { restoreContentBackup } from '@/features/cms/backups/actions'

import CmsToolbar from './cms-toolbar'
import { CMS_SECTIONS, CMS_SYSTEM_SECTIONS } from '../config'
import BackupsModal from '@/features/cms/backups/components/backups-modal'
import { Toast, ToastType, ConfirmDialog, ProgressBar, LoadingState, SessionLoading, Modal, AppSidebar, AppSidebarGroup, AppSidebarItem } from '@/components/shared'
import { useSidebarState } from '@/hooks/use-sidebar-state'
import { cn } from '@/lib/utils'

import GlobalsEditor from '@/features/cms/editors/components/globals-editor'
import HeroEditor from '@/features/cms/editors/components/hero-editor'
import AboutEditor from '@/features/cms/editors/components/about-editor'
import GalleryEditor from '@/features/cms/editors/components/gallery-editor'
import FaqEditor from '@/features/cms/editors/components/faq-editor'
import ContactEditor from '@/features/cms/editors/components/contact-editor'
import ScheduleEditor from '@/features/cms/editors/components/schedule-editor'
import CommentsEditor from '@/features/cms/editors/components/comments-editor'
import ArtEditor from '@/features/cms/editors/components/art-editor'
import PrinciplesEditor from '@/features/cms/editors/components/principles-editor'
import FooterEditor from '@/features/cms/editors/components/footer-editor'
import StorageEditor from '@/features/cms/editors/components/storage-editor'
import BackupsEditor from '@/features/cms/editors/components/backups-editor'
import StatusEditor from '@/features/cms/editors/components/status-editor'

interface CmsShellProps {
  activeUser?: AuthenticatedUser
}

interface ToastState {
  message: string
  type: ToastType
}

import { getActiveModules } from '@/lib/modules'

const { adminEnabled } = getActiveModules()

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return null
  }
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

export default function CmsShell({ activeUser }: CmsShellProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<CmsSection>('base')
  const [content, setContent] = useState<SiteContent | null>(null)
  
  const { isCollapsed, isMounted, enableTransitions, toggleCollapse } = useSidebarState()

  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [showBackups, setShowBackups] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [lastPublished, setLastPublished] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const showToast = (message: string, type: ToastType) => setToast({ message, type })

  const loadContent = useCallback(async () => {
    setLoading(true)
    const [contentRes, dateRes] = await Promise.all([
      getSiteContent(),
      getLastPublicationDate(),
    ])
    if (contentRes.success && contentRes.content) {
      setContent(contentRes.content)
      setDraft(JSON.parse(JSON.stringify(contentRes.content)))
      setIsDirty(false)
    } else {
      showToast(contentRes.error || 'No se pudo cargar el contenido del sitio.', 'error')
    }
    setLastPublished(formatDate(dateRes.date))
    setLoading(false)
  }, [])

  useEffect(() => { loadContent() }, [loadContent])

  const updateDraft = <K extends keyof SiteContent>(section: K, value: SiteContent[K]) => {
    setDraft((prev) => prev ? { ...prev, [section]: value } : prev)
    setIsDirty(true)
  }

  const handleAction = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action)
    } else {
      action()
    }
  }

  const handleGoToAdmin = () => {
    handleAction(() => {
      router.push('/dashboard')
    })
  }

  const cleanEmptyStrings = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanEmptyStrings)
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: any = {}
      for (const [key, val] of Object.entries(obj)) {
        if (val === '') {
          continue // skip empty strings
        }
        cleaned[key] = cleanEmptyStrings(val)
      }
      return cleaned
    }
    return obj
  }

  const handlePublish = async () => {
    if (!draft) return
    setPublishing(true)

    const userIdentifier = activeUser?.full_name || activeUser?.username || 'Usuario Admin'
    draft._metadata = { lastModifiedBy: userIdentifier }

    const cleanedDraft = cleanEmptyStrings(draft)

    const res = await publishSiteContent(cleanedDraft)
    if (res.success) {
      setContent(JSON.parse(JSON.stringify(cleanedDraft)))
      setDraft(JSON.parse(JSON.stringify(cleanedDraft)))
      setIsDirty(false)
      const dateRes = await getLastPublicationDate()
      setLastPublished(formatDate(dateRes.date))
      showToast(res.backupKey ? '¡Publicado exitosamente! Backup guardado.' : '¡Contenido publicado exitosamente!', 'success')
    } else {
      showToast(res.error || 'Error al publicar.', 'error')
    }
    setPublishing(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logoutUser()
    router.replace('/login')
  }

  const handleLogoutWithCheck = () => {
    handleAction(handleLogout)
  }


  const handleDiscard = () => {
    if (!content) return
    setDraft(JSON.parse(JSON.stringify(content)))
    setIsDirty(false)
  }

  const handleRestoreBackup = (backupName: string) => {
    setConfirmRestore(backupName)
  }

  const doRestore = async (backupName: string) => {
    setConfirmRestore(null)
    setLoading(true)
    const res = await restoreContentBackup(backupName)
    if (res.success && res.content) {
      setContent(res.content)
      setDraft(JSON.parse(JSON.stringify(res.content)))
      setIsDirty(false)
      showToast('¡Copia de seguridad restaurada exitosamente!', 'success')
    } else {
      showToast(res.error || 'No se pudo restaurar la copia.', 'error')
    }
    setLoading(false)
  }

  const renderEditor = () => {
    if (!draft) return null
    switch (activeSection) {
      case 'base': return (
        <div className="flex flex-col gap-12 lg:overflow-y-auto h-full pr-2 pb-12">
          <GlobalsEditor 
            value={draft.globals} 
            onChange={(v) => updateDraft('globals', v)} 
            contact={draft.contact}
            onContactChange={(v) => updateDraft('contact', v)}
          />
          <ContactEditor 
            value={draft.contact} 
            onChange={(v) => updateDraft('contact', v)} 
            globals={draft.globals}
            onGlobalsChange={(v) => updateDraft('globals', v)}
          />
          <FooterEditor value={draft.footer} onChange={(v) => updateDraft('footer', v)} />
        </div>
      )
      case 'hero':       return <HeroEditor value={draft.hero} onChange={(v) => updateDraft('hero', v)} />
      case 'identity': return (
        <div className="flex flex-col gap-12 lg:overflow-y-auto h-full pr-2 pb-12">
          <AboutEditor value={draft.about} onChange={(v) => updateDraft('about', v)} />
          <ArtEditor value={draft.art} onChange={(v) => updateDraft('art', v)} />
          <PrinciplesEditor value={draft.principles} onChange={(v) => updateDraft('principles', v)} />
        </div>
      )
      case 'schedule':   return <ScheduleEditor value={draft.schedule} onChange={(v) => updateDraft('schedule', v)} />
      case 'media': return (
        <div className="flex flex-col gap-12 lg:overflow-y-auto h-full pr-2 pb-12">
          <GalleryEditor value={draft.gallery} onChange={(v) => updateDraft('gallery', v)} />
          <CommentsEditor value={draft.comments} onChange={(v) => updateDraft('comments', v)} />
          <FaqEditor value={draft.faq} onChange={(v) => updateDraft('faq', v)} />
        </div>
      )
      case 'storage':    return <StorageEditor />
      case 'backups':    return <BackupsEditor />
      case 'status':     return <StatusEditor />
    }
  }

  if (isLoggingOut) {
    return <SessionLoading />
  }

  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full overflow-hidden transition-opacity duration-200",
      isMounted ? "opacity-100" : "opacity-0"
    )}>
      <AppSidebar
        title="Sentinel"
        subtitle="Editor Web"
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
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
          {CMS_SECTIONS.map((section) => (
            <AppSidebarItem
              key={section.id}
              label={section.label}
              icon={section.icon}
              onClick={() => setActiveSection(section.id)}
              isActive={activeSection === section.id}
            />
          ))}
        </AppSidebarGroup>

        <AppSidebarGroup title="Sistema">
          {CMS_SYSTEM_SECTIONS.map((section) => (
            <AppSidebarItem
              key={section.id}
              label={section.label}
              icon={section.icon}
              onClick={() => setActiveSection(section.id)}
              isActive={activeSection === section.id}
            />
          ))}
        </AppSidebarGroup>
      </AppSidebar>

      <div className={cn(
        "flex-1 h-[calc(100vh-65px)] md:h-screen md:max-h-screen flex flex-col w-full bg-background overflow-hidden",
        enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        isCollapsed ? "md:pl-20" : "md:pl-64"
      )}>
        <div className="px-8 pt-7 pb-4 border-b border-border/10 shrink-0 bg-background z-20 shadow-sm relative">
          <CmsToolbar
            isDirty={isDirty}
            loading={loading}
            publishing={publishing}
            lastPublished={lastPublished}
            lastModifiedBy={content?._metadata?.lastModifiedBy}
            onPublish={handlePublish}
            onDiscard={handleDiscard}
            onReload={loadContent}
            onOpenBackups={() => setShowBackups(true)}
          />

          <ProgressBar indeterminate={loading} className="absolute bottom-0 left-0 right-0 translate-y-1/2" />
        </div>

        <div className="w-full h-full flex-1 px-4 sm:px-6 md:px-10 py-6 flex flex-col justify-start items-stretch relative z-10 overflow-y-auto">
          {draft ? (
            <div key={activeSection} className="h-full animate-in fade-in slide-in-from-bottom-2 duration-200">
              {renderEditor()}
            </div>
          ) : (
            <LoadingState text="Cargando datos del sitio por primera vez..." />
          )}
        </div>
      </div>

      <BackupsModal
        isOpen={showBackups}
        onClose={() => setShowBackups(false)}
        onRestore={handleRestoreBackup}
      />

      <ConfirmDialog
        isOpen={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={() => confirmRestore && doRestore(confirmRestore)}
        title="Restaurar Versión"
        message={`¿Restaurar "${confirmRestore}"? Reemplazará todo el contenido actual publicado.`}
        confirmText="Restaurar"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        title="Cambios sin guardar"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">
              Tienes cambios pendientes de publicar. Si sales ahora, se perderán.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro que deseas salir sin guardar?
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted-foreground/10 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingAction) pendingAction()
                setPendingAction(null)}
              }
              className="text-xs font-bold px-4 py-2 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-all cursor-pointer"
            >
              Sí, salir
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
