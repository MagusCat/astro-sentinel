'use client'

import React from 'react'
import { Art, ArtItem } from '../../core/types'
import { Palette } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: Art
  onChange: (v: Art) => void 
}

export default function ArtEditor({ value, onChange }: Props) {
  const updateItem = (i: number, field: keyof ArtItem, val: string) => {
    const items = [...value.items]
    items[i] = { ...items[i], [field]: val }
    onChange({ ...value, items })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Sección de Valores" 
        titleAction={<Palette className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
      >
        <TextField
          label="Encabezado de la Sección"
          value={value.heading}
          onChange={e => onChange({ ...value, heading: e.target.value })}
        />
      </SectionCard>

      <SectionCard 
        title="Tarjetas de Valores" 
        titleAction={<Palette className="w-5 h-5 text-muted-foreground" />}
        className="overflow-y-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
          {value.items.map((item, i) => (
            <div key={i} className="bg-background border border-border/40 rounded-lg p-5 shadow-sm flex flex-col gap-3 relative animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              <TextField
                label="Título"
                value={item.title}
                onChange={e => updateItem(i, 'title', e.target.value)}
              />
              <TextareaField
                label="Descripción"
                className="min-h-[70px] resize-y py-2"
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
