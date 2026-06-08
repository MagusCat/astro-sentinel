'use client'

import React, { useState } from 'react'
import { Gallery, GalleryImage } from '../../core/types'
import { Plus, Images } from 'lucide-react'
import { ImageCard } from '../../core/components/image-card'
import { SectionCard } from '@/components/shared/data-display/section-card'
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

  const toggleActive = (i: number) => {
    const imgs = [...value.images]
    const currentActive = imgs[i].active !== false
    imgs[i] = { ...imgs[i], active: !currentActive }
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

  return (
    <div className="flex flex-col gap-6 lg:h-full">
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
        className="lg:flex-1 lg:min-h-0"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:overflow-y-auto pr-2">
          {value.images.map((img, i) => {
            return (
              <ImageCard
                key={i}
                url={img.url}
                folder="gallery"
                altText={img.title}
                isActive={img.active !== false}
                onUploadSuccess={(url) => updateImage(i, 'url', url)}
                onMoveUp={() => moveImage(i, 'up')}
                onMoveDown={() => moveImage(i, 'down')}
                onToggleActive={() => toggleActive(i)}
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
      </SectionCard>
    </div>
  )
}
