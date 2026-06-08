import React, { useState } from 'react'
import Image from 'next/image'
import { ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { ImageUploader, Toast, ToastType } from '@/components/shared'

interface ImageCardProps {
  url: string
  folder?: string
  altText?: string
  isActive?: boolean
  onUploadSuccess: (url: string) => void
  onUploadError?: (err: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onToggleActive?: () => void
  onRemove?: () => void
  disableMoveUp?: boolean
  disableMoveDown?: boolean
  children?: React.ReactNode
}

export function ImageCard({
  url,
  folder,
  altText = 'Imagen',
  isActive = true,
  onUploadSuccess,
  onUploadError,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onRemove,
  disableMoveUp,
  disableMoveDown,
  children
}: ImageCardProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const handleError = (err: string) => {
    if (onUploadError) {
      onUploadError(err)
    } else {
      setToast({ message: err, type: 'error' })
    }
  }

  return (
    <div className={`flex flex-col sm:flex-row gap-6 items-start border border-border/30 rounded-lg p-5 bg-muted/20 transition-all ${isActive ? 'opacity-100' : 'opacity-60 grayscale'}`}>
      
      {/* Lado izquierdo: Imagen grande 1:1 y botón de subida */}
      <div className="flex flex-col gap-3 w-full sm:w-48 shrink-0">
        <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden border border-border/60 shadow-sm flex items-center justify-center">
          {url ? (
            <Image
              src={url}
              alt={altText}
              fill
              className="object-cover transition-all"
              sizes="(max-width: 768px) 100vw, 192px"
            />
          ) : (
            <span className="text-[10px] text-muted-foreground font-mono">Sin imagen</span>
          )}
        </div>
        <ImageUploader 
          currentUrl={url}
          folder={folder}
          onUploadSuccess={onUploadSuccess}
          onUploadError={handleError}
        />
      </div>

      {/* Lado derecho: Inputs (children) y controles */}
      <div className="flex-1 flex flex-col gap-4 w-full justify-between h-full min-h-[12rem]">
        <div className="flex flex-col gap-3">
          {children}
        </div>
        
        {/* Controles */}
        <div className="flex gap-1 items-center justify-end border-t border-border/20 pt-3 mt-auto">
          {onMoveUp && (
            <button 
              type="button"
              onClick={onMoveUp}
              disabled={disableMoveUp}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer disabled:opacity-30 transition-all"
              title="Mover arriba"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button 
              type="button"
              onClick={onMoveDown}
              disabled={disableMoveDown}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer disabled:opacity-30 transition-all"
              title="Mover abajo"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          )}
          {onToggleActive && (
            <button 
              type="button"
              onClick={onToggleActive}
              className={`p-2 transition-all rounded-md cursor-pointer flex items-center justify-center ${isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}`}
              title={isActive ? "Desactivar imagen" : "Activar imagen"}
            >
              {isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
          )}
          {onRemove && (
            <button 
              type="button"
              onClick={onRemove}
              className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-all ml-1"
              title="Eliminar imagen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
