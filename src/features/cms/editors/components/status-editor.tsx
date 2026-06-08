'use client'

import React, { useEffect, useState } from 'react'
import { Activity, Database, HardDrive, RefreshCw } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { getBucketStats } from '../../media/actions'

interface BucketStats {
  bucket: string
  totalSize: number
  fileCount: number
  loading: boolean
  error?: string
}

export default function StatusEditor() {
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
          if (res.success) {
            return { ...s, totalSize: res.totalSize || 0, fileCount: res.fileCount || 0, loading: false }
          } else {
            return { ...s, loading: false, error: res.error }
          }
        }
        return s
      }))
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <SectionCard 
        title="Estado del Sistema" 
        titleAction={<Activity className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
        description="Monitoriza el uso de almacenamiento de la plataforma. Si el tamaño de los buckets es muy elevado, considera eliminar backups antiguos o imágenes huérfanas."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:flex-1 lg:min-h-0">
        {stats.map(s => (
          <div key={s.bucket} className="bg-card border border-border/40 rounded-xl p-6 shadow-sm flex flex-col gap-6 relative">
            {s.loading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-xl">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                {s.bucket === 'site-images' ? <HardDrive className="w-5 h-5" /> : <Database className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">Bucket: {s.bucket}</h3>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                  {s.bucket === 'site-images' ? 'Almacenamiento Multimedia' : 'Almacenamiento de Contenido'}
                </p>
              </div>
            </div>

            {s.error ? (
              <div className="text-xs text-rose-500 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {s.error}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="flex flex-col gap-1 bg-muted/30 p-3 rounded-lg border border-border/30">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Archivos</span>
                  <span className="text-xl font-extrabold text-foreground">{s.fileCount}</span>
                </div>
                <div className="flex flex-col gap-1 bg-muted/30 p-3 rounded-lg border border-border/30">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tamaño Usado</span>
                  <span className="text-xl font-extrabold text-foreground">{formatBytes(s.totalSize)}</span>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-border/20 flex justify-between items-center">
               <span className="text-[10px] text-muted-foreground">Actualizado justo ahora</span>
               <button onClick={loadStats} className="text-[10px] text-primary hover:underline cursor-pointer font-bold flex items-center gap-1">
                 <RefreshCw className="w-3 h-3" /> Refrescar
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
