'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Database, Trash2, RefreshCw, Folder, HardDrive, Activity } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { listSiteImages, deleteSiteImage, getBucketStats } from '../../media/actions'
import { ConfirmDialog, Toast, ToastType } from '@/components/shared'

interface StorageFile {
  name: string
  id: string
  created_at: string
  url?: string
  metadata?: Record<string, unknown> | null
}

interface BucketStats {
  bucket: string
  totalSize: number
  fileCount: number
  loading: boolean
  error?: string
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function StorageEditor() {
  const [folders] = useState(['hero', 'gallery'])
  const [activeFolder, setActiveFolder] = useState<string>('hero')
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [stats, setStats] = useState<BucketStats[]>([
    { bucket: 'site-images', totalSize: 0, fileCount: 0, loading: true },
    { bucket: 'site-content', totalSize: 0, fileCount: 0, loading: true }
  ])

  const loadStats = async () => {
    const buckets = ['site-images', 'site-content']

    for (const b of buckets) {
      setStats(prev => prev.map(s => s.bucket === b ? { ...s, loading: true } : s))

      const res = await getBucketStats(b)

      setStats(prev => prev.map(s => {
        if (s.bucket === b) {
        if (res.success && res.data) {
          return { ...s, totalSize: res.data.totalSize, fileCount: res.data.fileCount, loading: false }
          } else {
            return { ...s, loading: false, error: res.error }
          }
        }
        return s
      }))
    }
  }

  const loadFiles = async (folder: string) => {
    setLoading(true)
    const res = await listSiteImages(folder)
    if (res.success && res.data) {
      setFiles(res.data.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadStats()
  }, [])

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
      await loadStats()
    } else {
      setToast({ message: res.error || 'Error al eliminar.', type: 'error' })
    }
    setFileToDelete(null)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <SectionCard
        title="Almacenamiento del Sistema"
        titleAction={<Activity className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
        description="Monitoriza el uso de almacenamiento y administra los archivos subidos."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.bucket} className="bg-muted/30 border border-border/30 rounded-xl p-4 flex flex-col gap-3 relative">
              {s.loading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-xl">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  {s.bucket === 'site-images' ? <HardDrive className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-foreground">{s.bucket}</h4>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                    {s.bucket === 'site-images' ? 'Multimedia' : 'Contenido'}
                  </p>
                </div>
              </div>
              {s.error ? (
                <div className="text-[10px] text-rose-500">{s.error}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5 bg-background p-2 rounded-lg border border-border/20">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Archivos</span>
                    <span className="text-lg font-extrabold text-foreground">{s.fileCount}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-background p-2 rounded-lg border border-border/20">
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Tamaño</span>
                    <span className="text-lg font-extrabold text-foreground">{formatBytes(s.totalSize)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={loadStats} className="text-[10px] text-primary hover:underline cursor-pointer font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refrescar
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={`Explorador de Archivos — ${activeFolder}`}
        className="overflow-y-auto"
      >
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
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

          <div className="border border-border/40 rounded-xl bg-muted/10 flex-1 overflow-y-auto max-h-[50vh] relative">
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
                          <Image src={f.url} alt={f.name} width={40} height={40} className="w-full h-full object-cover" />
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
