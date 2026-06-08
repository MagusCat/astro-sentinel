'use client'

import React, { useState } from 'react'
import { Hero, CarouselImage } from '../../core/types'
import { LayoutTemplate, Images } from 'lucide-react'
import { ImageCard } from '../../core/components/image-card'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: Hero
  onChange: (v: Hero) => void 
}

export default function HeroEditor({ value, onChange }: Props) {
  const [devMode] = useState(() => process.env.NODE_ENV === 'development')

  const update = <K extends keyof Hero>(key: K, val: Hero[K]) =>
    onChange({ ...value, [key]: val })

  const updateImage = (i: number, field: keyof CarouselImage, val: string) => {
    const imgs = [...value.carouselImages]
    imgs[i] = { ...imgs[i], [field]: val }
    update('carouselImages', imgs)
  }

  const toggleActive = (i: number) => {
    const imgs = [...value.carouselImages]
    const currentActive = imgs[i].active !== false
    imgs[i] = { ...imgs[i], active: !currentActive }
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

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <SectionCard 
        title="Textos Principales" 
        titleAction={<LayoutTemplate className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
        description="Esta es la primera sección que ven tus clientes al entrar a la página (el banner gigante). Usa textos cortos, llamativos y directos al grano."
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Título Principal"
            value={value.title}
            onChange={e => update('title', e.target.value)}
          />
          <TextField
            label="Subtítulo (Opcional)"
            value={value.subtitle}
            onChange={e => update('subtitle', e.target.value)}
          />
          <TextareaField
            label="Descripción (Opcional)"
            className="min-h-[100px] resize-y"
            value={value.description}
            onChange={e => update('description', e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard 
        title={`Imágenes del Carrusel (${value.carouselImages.length})`} 
        titleAction={<Images className="w-5 h-5 text-muted-foreground" />}
        className="lg:flex-1 lg:min-h-0"
        description="Sube imágenes horizontales de alta calidad. Evita subir imágenes muy pesadas (recomendado: formato WebP o JPG, menos de 500KB). Puedes apagar temporalmente imágenes sin borrarlas usando el interruptor."
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:overflow-y-auto pr-2">
          {value.carouselImages.map((img, i) => {
            return (
              <ImageCard
                key={i}
                url={img.src}
                folder="hero"
                altText={img.alt}
                isActive={img.active !== false}
                onUploadSuccess={(url) => updateImage(i, 'src', url)}
                onMoveUp={() => moveImage(i, 'up')}
                onMoveDown={() => moveImage(i, 'down')}
                onToggleActive={() => toggleActive(i)}
                disableMoveUp={i === 0}
                disableMoveDown={i === value.carouselImages.length - 1}
              >
                {devMode && (
                  <TextField
                    label="URL Manual (Modo Dev)"
                    value={img.src} 
                    onChange={e => updateImage(i, 'src', e.target.value)} 
                    placeholder="/images/hero/h_1.jpg" 
                  />
                )}
                <TextField
                  label="Texto alternativo (Alt)"
                  value={img.alt} 
                  onChange={e => updateImage(i, 'alt', e.target.value)} 
                />
              </ImageCard>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
