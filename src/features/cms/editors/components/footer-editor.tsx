'use client'

import React from 'react'
import { Footer } from '../../core/types'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField } from '@/components/shared'

interface Props { 
  value: Footer
  onChange: (v: Footer) => void 
}

export default function FooterEditor({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Derechos de Autor">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Nombre / Propietario"
            value={value.owner}
            onChange={e => onChange({ ...value, owner: e.target.value })}
          />
          <TextField
            label="Año de Copyright"
            type="number"
            value={value.copyright}
            onChange={e => onChange({ ...value, copyright: Number(e.target.value) })}
          />
        </div>
      </SectionCard>
    </div>
  )
}
