'use client'

import React, { useEffect, useState } from 'react'
import { Database, Trash2, RefreshCw, Folder } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { listSiteImages, deleteSiteImage } from '../../media/actions'
import { ConfirmDialog, Toast, ToastType } from '@/components/shared'

interface StorageFile {
  name: string
  id: string
  created_at: string
  url?: string
  metadata?: Record<string, unknown> | null
}

export default function StorageEditor() {
  const [folders] = useState(['hero', 'gallery'])
  const [activeFolder, setActiveFolder] = useState<string>('hero')
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const loadFiles = async (folder: string) => {
    setLoading(true)
    const res = await listSiteImages(folder)
    if (res.success && res.files) {
      // Filtrar subcarpetas que devuelve supabase con .emptyFolderPlaceholder
      setFiles(res.files.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFiles(activeFolder)
  }, [activeFolder])

  const executeDelete = async () => {
    if (!fileToDelete) return
    
    setLoading(true)
    const res = await deleteSiteImage(activeFolder, fileToDelete)
    if (res.success) {
      setToast({ message: 'Archivo eliminado correctamente.', type: 'success' })
      await loadFiles(activeFolder)
    } else {
      setToast({ message: res.error || 'Error al eliminar.', type: 'error' })
    }
    setFileToDelete(null)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <SectionCard 
        title="Archivos del Sistema (Bucket)" 
        titleAction={<Database className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
        description="Administra los archivos subidos al bucket de imágenes. Puedes limpiar imágenes huérfanas o viejas."
      />

      <SectionCard 
        title={`Explorador de Archivos — ${activeFolder}`} 
        className="lg:flex-1 lg:min-h-0"
      >
        <div className="flex flex-col gap-4 lg:flex-1 lg:overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
          {folders.map(f => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFolder === f ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="capitalize">{f}</span>
            </button>
          ))}
        </div>

        <div className="border border-border/40 rounded-xl bg-muted/10 lg:flex-1 lg:overflow-y-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          
          {files.length === 0 && !loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center">
              Carpeta vacía
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 bg-muted rounded-md overflow-hidden border border-border/50 flex items-center justify-center">
                      {f.url ? (
                        <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Database className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-foreground truncate hover:underline">
                        {f.name}
                      </a>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(f.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setFileToDelete(f.name)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={executeDelete}
        title="Eliminar Archivo"
        message={`¿Estás seguro de eliminar el archivo "${fileToDelete}"? Esta acción no se puede deshacer y podría romper enlaces existentes.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
