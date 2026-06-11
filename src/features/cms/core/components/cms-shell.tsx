'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Menu } from 'lucide-react'
import { AuthenticatedUser } from '@/features/auth/types'
import { logoutUser } from '@/features/auth/actions'
import { SiteContent, CmsSection } from '../types'
import { getSiteContent, publishSiteContent, getLastPublicationDate } from '../actions'
import { restoreContentBackup } from '@/features/cms/backups/actions'
import { deriveHeroSocialLinks, deriveContactItems, buildWhatsapp } from '../derive'

import CmsToolbar from './cms-toolbar'
import BackupsModal from '@/features/cms/backups/components/backups-modal'
import { Toast, ToastType, ConfirmDialog, ProgressBar, LoadingState, SessionLoading, Modal } from '@/components/shared'
import { useSidebarState } from '@/hooks/use-sidebar-state'
import { cn } from '@/lib/utils'

import CmsSidebarNav from './cms-sidebar-nav'
import GlobalsEditor from '@/features/cms/editors/components/globals-editor'
import HeroEditor from '@/features/cms/editors/components/hero-editor'
import AboutEditor from '@/features/cms/editors/components/about-editor'
import ArtEditor from '@/features/cms/editors/components/art-editor'
import PrinciplesEditor from '@/features/cms/editors/components/principles-editor'
import GalleryEditor from '@/features/cms/editors/components/gallery-editor'
import FaqEditor from '@/features/cms/editors/components/faq-editor'
import ContactEditor from '@/features/cms/editors/components/contact-editor'
import ScheduleEditor from '@/features/cms/editors/components/schedule-editor'
import CommentsEditor from '@/features/cms/editors/components/comments-editor'
import FooterEditor from '@/features/cms/editors/components/footer-editor'
import StorageEditor from '@/features/cms/editors/components/storage-editor'
import BackupsEditor from '@/features/cms/editors/components/backups-editor'

interface CmsShellProps {
  activeUser?: AuthenticatedUser
}

interface ToastState {
  message: string
  type: ToastType
}

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



export default function CmsShell({ activeUser }: CmsShellProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<CmsSection>('base')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pendingSection, setPendingSection] = useState<CmsSection | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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

  const navigateToSection = (section: CmsSection) => {
    if (section === activeSection || isTransitioning) return
    setPendingSection(section)
    setIsTransitioning(true)
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!isTransitioning || !pendingSection) return
    const timer = setTimeout(() => {
      setActiveSection(pendingSection)
      setPendingSection(null)
      setIsTransitioning(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [isTransitioning, pendingSection])

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

  const cleanEmptyStrings = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(cleanEmptyStrings)
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {}
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

    const derivedDraft: SiteContent = {
      ...draft,
      hero: {
        ...draft.hero,
        socialLinks: deriveHeroSocialLinks(draft.globals, draft.contact),
      },
      contact: {
        ...draft.contact,
        whatsapp: buildWhatsapp(draft.globals.contactPhone, draft.contact.whatsapp),
        contact: deriveContactItems(draft.globals, draft.contact),
      },
      _metadata: { lastModifiedBy: userIdentifier },
    }

    const cleanedDraft = cleanEmptyStrings(derivedDraft)

    const res = await publishSiteContent(cleanedDraft as SiteContent)
    if (res.success) {
      setContent(JSON.parse(JSON.stringify(cleanedDraft)))
      setDraft(JSON.parse(JSON.stringify(cleanedDraft)))
      setIsDirty(false)
      const dateRes = await getLastPublicationDate()
      setLastPublished(formatDate(dateRes.date))
      const baseMsg = res.backupKey ? '¡Publicado exitosamente! Backup guardado.' : '¡Contenido publicado exitosamente!'
      const delayMsg = res.deployHookTriggered ? ' Los cambios tardarán de 5 a 10 min en ser mostrados en la web.' : ''
      showToast(`${baseMsg}${delayMsg}`, 'success')
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
        <div className="flex flex-col gap-12">
          <GlobalsEditor
            value={draft.globals}
            onChange={(v) => updateDraft('globals', v)}
          />
          <ContactEditor
            value={draft.contact}
            onChange={(v) => updateDraft('contact', v)}
          />
          <FooterEditor value={draft.footer} onChange={(v) => updateDraft('footer', v)} />
        </div>
      )
      case 'hero': return <HeroEditor value={draft.hero} onChange={(v) => updateDraft('hero', v)} />
      case 'about': return (
        <div className="flex flex-col gap-12">
          <AboutEditor value={draft.about} onChange={(v) => updateDraft('about', v)} />
          <ArtEditor value={draft.art} onChange={(v) => updateDraft('art', v)} />
          <PrinciplesEditor value={draft.principles} onChange={(v) => updateDraft('principles', v)} />
        </div>
      )
      case 'schedule': return <ScheduleEditor value={draft.schedule} onChange={(v) => updateDraft('schedule', v)} />
      case 'testimonials': return <CommentsEditor value={draft.comments} onChange={(v) => updateDraft('comments', v)} />
      case 'faq': return <FaqEditor value={draft.faq} onChange={(v) => updateDraft('faq', v)} />
      case 'gallery': return <GalleryEditor value={draft.gallery} onChange={(v) => updateDraft('gallery', v)} />
      case 'storage': return <StorageEditor />
  case 'backups': return <BackupsEditor />
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
      <CmsSidebarNav
        activeUser={activeUser}
        activeSection={activeSection}
        navigateToSection={navigateToSection}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isDirty={isDirty}
        handleGoToAdmin={handleGoToAdmin}
        handleLogoutWithCheck={handleLogoutWithCheck}
      />

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={cn(
          "h-[100dvh] flex flex-col w-full bg-background",
          enableTransitions && "transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}>
          <div className="px-4 sm:px-8 pt-4 sm:pt-7 pb-3 sm:pb-4 border-b border-border/10 shrink-0 bg-background z-20 shadow-sm sticky top-0">
        
        <div className="flex flex-row justify-between items-start gap-10">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden mb-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          aria-label="Abrir menú"
        >

          <Menu className="w-5 h-5" />
        </button>

        
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
</div>
          <ProgressBar indeterminate={loading} className="absolute bottom-0 left-0 right-0 translate-y-1/2" />
        </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 md:px-10 py-6 overflow-y-auto">
        {draft ? (
          <div key={activeSection} className={cn(
            isTransitioning
              ? "animate-out fade-out slide-out-to-bottom-2 duration-150 ease-in"
              : "animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out fill-mode-both"
          )}>
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
