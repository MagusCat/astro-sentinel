'use client'

import React, { useState } from 'react'
import { Hero, HeroCarouselImage } from '../../core/types'
import { LayoutTemplate, Images, Plus } from 'lucide-react'
import { ImageCard } from '../../core/components/image-card'
import { CMS_LIMITS } from '../../core/config'
import { SectionCard } from '@/components/shared'
import { TextField, TextareaField } from '@/components/shared'

interface Props {
  value: Hero
  onChange: (v: Hero) => void
}

export default function HeroEditor({ value, onChange }: Props) {
  const [devMode] = useState(() => process.env.NODE_ENV === 'development')

  const update = <K extends keyof Hero>(key: K, val: Hero[K]) =>
    onChange({ ...value, [key]: val })

  const updateImage = (i: number, field: keyof HeroCarouselImage, val: string) => {
    const imgs = [...value.carouselImages]
    imgs[i] = { ...imgs[i], [field]: val }
    update('carouselImages', imgs)
  }

  const moveImage = (i: number, direction: 'up' | 'down') => {
    const imgs = [...value.carouselImages]
    if (direction === 'up' && i > 0) {
      const temp = imgs[i]
      imgs[i] = imgs[i - 1]
      imgs[i - 1] = temp
      update('carouselImages', imgs)
    } else if (direction === 'down' && i < imgs.length - 1) {
      const temp = imgs[i]
      imgs[i] = imgs[i + 1]
      imgs[i + 1] = temp
      update('carouselImages', imgs)
    }
  }

  const removeImage = (i: number) => {
    if (value.carouselImages.length <= 1) return
    update('carouselImages', value.carouselImages.filter((_, idx) => idx !== i))
  }

  const addImage = () => {
    if (value.carouselImages.length >= CMS_LIMITS.maxHeroImages) return
    update('carouselImages', [
      ...value.carouselImages,
      { id: Date.now().toString(), url: '', title: '' }
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Textos Banner"
        titleAction={<LayoutTemplate className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
 >
        <div className="flex flex-col gap-4">
          <TextField
            label="Título Principal"
            value={value.title}
            onChange={e => update('title', e.target.value)}
          />
          <TextField
            label="Subtítulo"
            value={value.subtitle}
            onChange={e => update('subtitle', e.target.value)}
          />
          <TextareaField
            label="Descripción (Opcional)"
            className="min-h-[200px] resize-y"
            value={value.description}
            onChange={e => update('description', e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={`Imágenes del Carrusel (${value.carouselImages.length})`}
        titleAction={<Images className="w-5 h-5 text-muted-foreground" />}
        className="overflow-y-auto"
        description="Sube imágenes de alta calidad, de preferencia horizontales o en formato cuadrado. Evita subir imágenes muy pesadas."
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 pb-4">
          {value.carouselImages.map((img, i) => {
            return (
              <ImageCard
                key={i}
                url={img.url}
                folder="hero"
                altText={img.title}
                onUploadSuccess={(url) => updateImage(i, 'url', url)}
                onMoveUp={() => moveImage(i, 'up')}
                onMoveDown={() => moveImage(i, 'down')}
                onRemove={value.carouselImages.length > 1 ? () => removeImage(i) : undefined}
                disableMoveUp={i === 0}
                disableMoveDown={i === value.carouselImages.length - 1}
              >
                {devMode && (
                  <TextField
                    label="URL Manual (Modo Dev)"
                    value={img.url}
                    onChange={e => updateImage(i, 'url', e.target.value)}
                    placeholder="/images/hero/h_1.jpg"
                  />
                )}
                <TextField
                  label="Título de la Imagen"
                  value={img.title}
                  onChange={e => updateImage(i, 'title', e.target.value)}
                />
              </ImageCard>
            )
          })}
        </div>
        
        {value.carouselImages.length < CMS_LIMITS.maxHeroImages && (
          <div className="mt-4 border-t border-border/20 pt-4">
            <button
              type="button"
              onClick={addImage}
              className="text-sm font-bold text-primary flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-11 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Imagen ({value.carouselImages.length}/{CMS_LIMITS.maxHeroImages})</span>
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
