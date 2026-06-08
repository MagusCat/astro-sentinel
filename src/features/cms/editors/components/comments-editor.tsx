'use client'

import React from 'react'
import { Comments, Comment } from '../../core/types'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: Comments
  onChange: (v: Comments) => void 
}

export default function CommentsEditor({ value, onChange }: Props) {
  const updateItem = (i: number, field: keyof Comment, val: string) => {
    const items = [...value.items]
    items[i] = { ...items[i], [field]: val }
    onChange({ ...value, items })
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <SectionCard 
        title="Testimonios — Configuración" 
        titleAction={<MessageSquare className="w-5 h-5 text-muted-foreground" />}
        className="shrink-0"
      >
        <TextField
          label="Encabezado"
          value={value.heading}
          onChange={e => onChange({ ...value, heading: e.target.value })}
        />
      </SectionCard>

      <SectionCard 
        title={`Testimonios (${value.items.length})`} 
        className="lg:flex-1 lg:min-h-0"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:overflow-y-auto pr-2">
          {value.items.map((item, i) => (
            <div key={i} className="border border-border/30 rounded-xl p-4 bg-muted/20 flex flex-col gap-3">
              <div className="flex gap-3 items-end">
                <TextField
                  label="Nombre"
                  containerClassName="flex-1"
                  value={item.name}
                  onChange={e => updateItem(i, 'name', e.target.value)}
                />
                
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider select-none">
                    Tema
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'light', label: 'Claro' },
                      { value: 'dark', label: 'Oscuro' },
                      { value: 'highlight', label: 'Resaltado' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateItem(i, 'theme', opt.value as Comment['theme'])}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all border ${
                          item.theme === opt.value
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-background text-foreground/70 border-border/60 hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <TextareaField
                label="Contenido del Testimonio"
                className="min-h-[80px] resize-y"
                value={item.content}
                onChange={e => updateItem(i, 'content', e.target.value)}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
