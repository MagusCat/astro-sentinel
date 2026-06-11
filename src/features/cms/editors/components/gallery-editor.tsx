'use client'

import React, { useState } from 'react'
import { Gallery, GalleryImage } from '../../core/types'
import { Images, Plus } from 'lucide-react'
import { ImageCard } from '../../core/components/image-card'
import { CMS_LIMITS } from '../../core/config'
import { SectionCard } from '@/components/shared'
import { TextField } from '@/components/shared'

interface Props {
  value: Gallery
  onChange: (v: Gallery) => void
}

export default function GalleryEditor({ value, onChange }: Props) {
  const [devMode] = useState(() => process.env.NODE_ENV === 'development')

  const updateImage = (i: number, field: keyof GalleryImage, val: string) => {
    const imgs = [...value.images]
    imgs[i] = { ...imgs[i], [field]: val }
    onChange({ ...value, images: imgs })
  }

  const moveImage = (i: number, direction: 'up' | 'down') => {
    const imgs = [...value.images]
    if (direction === 'up' && i > 0) {
      const temp = imgs[i]
      imgs[i] = imgs[i - 1]
      imgs[i - 1] = temp
      onChange({ ...value, images: imgs })
    } else if (direction === 'down' && i < imgs.length - 1) {
      const temp = imgs[i]
      imgs[i] = imgs[i + 1]
      imgs[i + 1] = temp
      onChange({ ...value, images: imgs })
    }
  }

  const removeImage = (i: number) => {
    if (value.images.length <= 4) return
    onChange({ ...value, images: value.images.filter((_, idx) => idx !== i) })
  }

  const addImage = () => {
    if (value.images.length >= CMS_LIMITS.maxGalleryImages) return
    onChange({
      ...value,
      images: [
        ...value.images,
        { id: Date.now().toString(), url: '', title: 'Nueva Imagen' }
      ]
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <SectionCard
        title="Galería de Imágenes"
        titleAction={<Images className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
      >
        <TextField
          label="Encabezado de Sección"
          value={value.heading}
          onChange={e => onChange({ ...value, heading: e.target.value })}
        />
      </SectionCard>

      <SectionCard
        title={`Imágenes de la Galería (${value.images.length})`}
        className="overflow-y-auto"
        description="Sube imágenes de alta calidad, de preferencia cuadradas. Evita subir imágenes muy pesadas."
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 pb-4">
          {value.images.map((img, i) => {
            return (
              <ImageCard
                key={i}
                url={img.url}
                folder="gallery"
                altText={img.title}
                onUploadSuccess={(url) => updateImage(i, 'url', url)}
                onMoveUp={() => moveImage(i, 'up')}
                onMoveDown={() => moveImage(i, 'down')}
                onRemove={value.images.length > 4 ? () => removeImage(i) : undefined}
                disableMoveUp={i === 0}
                disableMoveDown={i === value.images.length - 1}
              >
                <TextField
                  label="Título de la Imagen"
                  value={img.title}
                  onChange={e => updateImage(i, 'title', e.target.value)}
                />
                {devMode && (
                  <TextField
                    label="URL Manual (Modo Dev)"
                    value={img.url}
                    onChange={e => updateImage(i, 'url', e.target.value)}
                    placeholder="/images/gallery/g_1.jpg"
                  />
                )}
              </ImageCard>
            )
          })}
        </div>
        
        {value.images.length < CMS_LIMITS.maxGalleryImages && (
          <div className="mt-4 border-t border-border/20 pt-4">
            <button
              type="button"
              onClick={addImage}
              className="text-sm font-bold text-primary flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-11 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Imagen ({value.images.length}/{CMS_LIMITS.maxGalleryImages})</span>
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
