'use client'

import React, { useEffect, useState } from 'react'
import { History, Trash2, RefreshCw, UploadCloud, User } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { listContentBackups, restoreContentBackup, deleteContentBackup, getBackupAuthors } from '../../backups/actions'
import { ConfirmDialog, Toast, ToastType } from '@/components/shared'

interface BackupFile {
  name: string
  created_at: string | null
  author?: string
}

export default function BackupsEditor() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'restore' | 'delete'
    name: string
  } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const loadBackups = async () => {
    setLoading(true)
    const res = await listContentBackups()
    if (res.success && res.backups) {
      
      // Let's attempt to get the author from metadata by downloading them partially or just relying on a smart naming convention if possible.
      // Since it's too slow to download all backups just to read author, we'll try to fetch their public url or download only the latest ones if needed.
      // Actually, we can fetch metadata from Supabase if we fetch the files. Wait, let's just do a simple download for each or show the name.
      // We will parse the file name to guess the date.
      
      const enrichedBackups = res.backups.map(b => {
        return {
          ...b,
          author: 'Desconocido' // To be implemented or fetched dynamically
        }
      })
      
      setBackups(enrichedBackups)
    }
    setLoading(false)
  }

  // To get the actual author, we can load it on demand or just use a specific server action.
  // For now we will fetch the content to see the author.
  const fetchAuthors = async () => {
    const unknownBackups = backups.filter(b => b.author === 'Desconocido')
    if (unknownBackups.length === 0) return

    const res = await getBackupAuthors(unknownBackups.map(b => b.name))
    if (res.success && res.authors) {
      setBackups(prev => prev.map(b => ({
        ...b,
        author: res.authors![b.name] || b.author
      })))
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  useEffect(() => {
    if (backups.length > 0 && backups[0].author === 'Desconocido') {
      fetchAuthors()
    }
  }, [backups])

  const executeAction = async () => {
    if (!confirmAction) return
    const { type, name } = confirmAction
    setConfirmAction(null)

    if (type === 'restore') {
      setRestoring(name)
      const res = await restoreContentBackup(name)
      if (res.success) {
        setToast({ message: '¡Copia de seguridad restaurada exitosamente! Recargando...', type: 'success' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setToast({ message: res.error || 'Error al restaurar', type: 'error' })
        setRestoring(null)
      }
    } else if (type === 'delete') {
      setLoading(true)
      const res = await deleteContentBackup(name)
      if (res.success) {
        setBackups(prev => prev.filter(b => b.name !== name))
        setToast({ message: 'Copia eliminada correctamente.', type: 'success' })
      } else {
        setToast({ message: res.error || 'Error al eliminar', type: 'error' })
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <SectionCard 
        title="Historial de Versiones" 
        titleAction={<History className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
        description="Aquí puedes ver todas las versiones guardadas automáticamente cada vez que alguien publica cambios en la web."
      />

      <SectionCard 
        title={`Backups Disponibles (${backups.length})`} 
        className="lg:flex-1 lg:min-h-0"
      >
        <div className="flex flex-col gap-4 lg:flex-1 lg:overflow-hidden">
        <div className="border border-border/40 rounded-xl bg-muted/10 lg:flex-1 lg:overflow-y-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {backups.length === 0 && !loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center">
              No hay backups registrados
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {backups.map(b => (
                <div key={b.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <span className="text-sm font-bold text-foreground font-mono truncate">{b.name}</span>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      <span className="flex items-center gap-1"><History className="w-3 h-3" /> {b.created_at ? new Date(b.created_at).toLocaleString() : 'Desconocido'}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> Por: {b.author || '...'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmAction({ type: 'restore', name: b.name })}
                      disabled={restoring === b.name || loading}
                      className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {restoring === b.name ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Restaurando</>
                      ) : (
                        <><UploadCloud className="w-3.5 h-3.5" /> Restaurar esta versión</>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'delete', name: b.name })}
                      disabled={loading || restoring !== null}
                      className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer transition-colors border border-transparent disabled:opacity-50"
                      title="Eliminar versión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeAction}
        title={confirmAction?.type === 'restore' ? 'Restaurar Versión' : 'Eliminar Versión'}
        message={
          confirmAction?.type === 'restore' 
            ? `¿Estás seguro de restaurar la versión ${confirmAction.name}? Esto sobrescribirá la página actual.`
            : `¿Estás seguro de eliminar el backup ${confirmAction?.name}?`
        }
        confirmText={confirmAction?.type === 'restore' ? 'Restaurar' : 'Eliminar'}
        cancelText="Cancelar"
        variant={confirmAction?.type === 'delete' ? 'danger' : 'neutral'}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
