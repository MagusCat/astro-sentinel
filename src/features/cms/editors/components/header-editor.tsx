'use client'

import React from 'react'
import { Header, NavItem } from '../../core/types'
import { Plus, Trash2 } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField } from '@/components/shared'

interface Props { 
  value: Header
  onChange: (v: Header) => void 
}

export default function HeaderEditor({ value, onChange }: Props) {
  const updateNav = (i: number, field: keyof NavItem, val: string) => {
    const items = [...value.navItems]
    items[i] = { ...items[i], [field]: val }
    onChange({ ...value, navItems: items })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Ítems de Navegación">
        <div className="flex flex-col gap-4">
        {value.navItems.map((item, i) => (
          <div key={i} className="flex gap-3 items-end">
            <TextField
              label="Texto"
              containerClassName="flex-1"
              value={item.section}
              onChange={e => updateNav(i, 'section', e.target.value)}
            />
            <TextField
              label="URL"
              containerClassName="flex-1"
              value={item.url}
              onChange={e => updateNav(i, 'url', e.target.value)}
            />
            <button 
              onClick={() => onChange({ ...value, navItems: value.navItems.filter((_, j) => j !== i) })}
              className="mb-0.5 p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button 
          onClick={() => onChange({ ...value, navItems: [...value.navItems, { section: '', url: '' }] })}
          className="text-xs font-bold text-primary flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer w-fit"
          type="button"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar Ítem
        </button>
        </div>
      </SectionCard>
      
      <SectionCard title="Botón de Contacto">
        <div className="flex gap-3">
          <TextField
            label="Texto"
            containerClassName="flex-1"
            value={value.contactItem.section}
            onChange={e => onChange({ ...value, contactItem: { ...value.contactItem, section: e.target.value } })}
          />
          <TextField
            label="URL"
            containerClassName="flex-1"
            value={value.contactItem.url}
            onChange={e => onChange({ ...value, contactItem: { ...value.contactItem, url: e.target.value } })}
          />
        </div>
      </SectionCard>
    </div>
  )
}
