'use client'

import React from 'react'
import { Principles, PrincipleItem } from '../../core/types'
import { Star } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: Principles
  onChange: (v: Principles) => void 
}

export default function PrinciplesEditor({ value, onChange }: Props) {
  const updateItem = (i: number, field: keyof PrincipleItem, val: string) => {
    const items = [...value.items]
    items[i] = { ...items[i], [field]: val }
    onChange({ ...value, items })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Principios" 
        titleAction={<Star className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Encabezado"
            value={value.heading}
            onChange={e => onChange({ ...value, heading: e.target.value })}
          />
          <TextareaField
            label="Descripción (Opcional)"
            className="min-h-[80px] resize-y py-2"
            value={value.description}
            onChange={e => onChange({ ...value, description: e.target.value })}
          />
        </div>
      </SectionCard>

      <SectionCard 
        title={`Tarjetas de Principios (${value.items.length})`} 
        titleAction={<Star className="w-5 h-5 text-muted-foreground" />}
        className="overflow-y-auto"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
          {value.items.map((item, i) => (
            <div key={i} className="border border-border/30 rounded-lg p-4 bg-muted/20 flex flex-col gap-3 transition-all duration-300 ease-out hover:border-primary/30 hover:shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              <div className="flex gap-2 items-end">
                <TextField
                  label="Título"
                  containerClassName="flex-1"
                  value={item.title}
                  onChange={e => updateItem(i, 'title', e.target.value)}
                />
              </div>

              <TextareaField
                label="Descripción"
                className="min-h-[100px] resize-y py-2"
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
