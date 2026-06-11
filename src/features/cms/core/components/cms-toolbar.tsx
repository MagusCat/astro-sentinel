'use client'

import React from 'react'
import { Upload, RotateCcw, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared'

interface CmsToolbarProps {
  isDirty: boolean
  loading: boolean
  publishing: boolean
  lastPublished: string | null
  lastModifiedBy?: string
  onPublish: () => void
  onDiscard: () => void
  onReload: () => void
  onOpenBackups?: () => void
}

export default function CmsToolbar({
  isDirty,
  loading,
  publishing,
  lastPublished,
  lastModifiedBy,
  onPublish,
  onDiscard,
  onReload,
}: CmsToolbarProps) {
  const actions = (
    <>
      <button
        type="button"
        onClick={onReload}
        disabled={loading || publishing}
        title="Deshacer cambios y recargar la información actual publicada"
        className="px-4 py-2.5 bg-muted text-foreground hover:bg-muted-foreground/10 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-sm font-bold"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>

      {isDirty && (
        <button
          type="button"
          onClick={onDiscard}
          disabled={publishing}
          title="Borrar ediciones pendientes"
          className="text-sm font-bold px-4 py-2.5 bg-muted text-muted-foreground hover:bg-muted-foreground/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Descartar</span>
        </button>
      )}

      <button
        type="button"
        onClick={onPublish}
        disabled={!isDirty || publishing || loading}
        title="Guardar y mostrar en la web pública inmediatamente"
        className="text-sm font-bold px-4 py-2.5 bg-primary text-primary-foreground rounded-xl flex items-center gap-1.5 hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-40"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">{publishing ? 'Publicando...' : 'Publicar'}</span>
      </button>
    </>
  )

  const description = (
    <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5 select-none mt-1">
      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
      <span>Última publicación:</span>
      <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded font-mono text-sm">
        {loading ? '...' : lastPublished ?? 'Sin publicaciones'}
      </span>
      {lastModifiedBy && (
        <span className="text-sm text-muted-foreground/60 truncate" title={`Publicado por: ${lastModifiedBy}`}>
          • Por: {lastModifiedBy}
        </span>
      )}
    </span>
  )

  return (
    <PageHeader
      title="Editor de Sitio Web"
      description={description}
      actions={actions}
      className="p-0 border-none shadow-none bg-transparent"
    />
  )
}
