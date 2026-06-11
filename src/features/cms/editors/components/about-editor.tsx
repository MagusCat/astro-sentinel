'use client'

import React from 'react'
import { About } from '../../core/types'
import { Info } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: About
  onChange: (v: About) => void 
}

export default function AboutEditor({ value, onChange }: Props) {
  const update = <K extends keyof About>(key: K, val: About[K]) => onChange({ ...value, [key]: val })
  
  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Sobre Nosotros" 
        titleAction={<Info className="w-5 h-5 text-muted-foreground" />}
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Encabezado de Sección"
            value={value.heading}
            onChange={e => update('heading', e.target.value)}
          />
          <TextareaField
            label="Párrafo 1"
            className="min-h-[120px] resize-y"
            value={value.paragraph_1}
            onChange={e => update('paragraph_1', e.target.value)}
          />
          <TextareaField
            label="Párrafo 2 — Instalaciones (Opcional)"
            className="min-h-[120px] resize-y"
            value={value.paragraph_2}
            onChange={e => update('paragraph_2', e.target.value)}
          />
        </div>
      </SectionCard>
    </div>
  )
}
