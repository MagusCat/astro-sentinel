'use client'

import React from 'react'
import { Comments, Comment } from '../../core/types'
import { MessageSquare } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { TextField, TextareaField, SelectField } from '@/components/shared'
import { CMS_LIMITS } from '../../core/config'
import { Plus, Trash2 } from 'lucide-react'

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

  const removeItem = (i: number) => {
    if (value.items.length <= 1) return
    onChange({ ...value, items: value.items.filter((_, idx) => idx !== i) })
  }

  const addItem = () => {
    if (value.items.length >= CMS_LIMITS.maxTestimonials) return
    onChange({
      ...value,
      items: [...value.items, { name: '', role: '', content: '', theme: 'light' }]
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Testimonios" 
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
        className="overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
          {value.items.map((item, i) => (
            <div key={i} className="border border-border/30 rounded-xl p-4 bg-muted/20 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              <div className="flex gap-3 items-end">
                <TextField
                  label="Nombre"
                  containerClassName="flex-1"
                  value={item.name}
                  onChange={e => updateItem(i, 'name', e.target.value)}
                />
                
                <div className="flex-1">
                  <SelectField
                    label="Tema Visual"
                    value={item.theme}
                    onChange={(e) => updateItem(i, 'theme', e.target.value as Comment['theme'])}
                    options={[
                      { value: 'light', label: 'Claro' },
                      { value: 'dark', label: 'Oscuro' },
                      { value: 'highlight', label: 'Resaltado' }
                    ]}
                  />
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <TextareaField
                  label="Contenido del Testimonio"
                  className="min-h-[140px] resize-y"
                  containerClassName="flex-1"
                  value={item.content}
                  onChange={e => updateItem(i, 'content', e.target.value)}
                />
                
                {value.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="mt-7 p-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-all border border-transparent shrink-0"
                    title="Eliminar testimonio"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {value.items.length < CMS_LIMITS.maxTestimonials && (
          <div className="mt-4 border-t border-border/20 pt-4">
            <button
              type="button"
              onClick={addItem}
              className="text-sm font-bold text-primary flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-11 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Testimonio ({value.items.length}/{CMS_LIMITS.maxTestimonials})</span>
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
