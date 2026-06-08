'use client'

import React, { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadImage } from '@/features/cms/core/actions'
import { APP_CONFIG } from '@/lib/constants'
import imageCompression from 'browser-image-compression'

interface ImageUploaderProps {
  currentUrl?: string
  folder?: string
  onUploadSuccess: (url: string) => void
  onUploadError?: (error: string) => void
  disabled?: boolean
  maxSizeMB?: number
  maxDimension?: number
}

export default function ImageUploader({ 
  currentUrl, 
  folder, 
  onUploadSuccess, 
  onUploadError, 
  disabled,
  maxSizeMB = APP_CONFIG.IMAGE_UPLOAD.MAX_SIZE_MB,
  maxDimension = APP_CONFIG.IMAGE_UPLOAD.MAX_DIMENSION
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      onUploadError?.(`El archivo es demasiado grande (Máximo ${maxSizeMB}MB).`)
      return
    }

    setIsUploading(true)

    try {
      await validateDimensions(file)

      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: maxDimension,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.9
      }

      const compressedFile = await imageCompression(file, options)

      const formData = new FormData()
      formData.append('file', compressedFile, 'image.webp')
      
      const res = await uploadImage(formData, folder || 'images', { maxSizeMB })

      if (res.success && res.url) {
        onUploadSuccess(res.url)
      } else {
        onUploadError?.(res.error || 'Error al subir la imagen.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error procesando la imagen.'
      onUploadError?.(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const validateDimensions = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        
        const minDim = APP_CONFIG.IMAGE_UPLOAD.MIN_DIMENSION
        if (img.width < minDim || img.height < minDim) {
          reject(new Error(`La imagen debe tener al menos ${minDim}x${minDim} píxeles.`))
          return
        }
        
        resolve()
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('El archivo no es una imagen válida.'))
      }
      
      img.src = url
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isUploading || disabled}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{isUploading ? 'Subiendo...' : 'Subir Imagen'}</span>
        </button>
        {currentUrl && (
          <button
            type="button"
            disabled={isUploading || disabled}
            onClick={() => onUploadSuccess('')}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-all border border-transparent disabled:opacity-50"
            title="Eliminar imagen"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
