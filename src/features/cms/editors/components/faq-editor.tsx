'use client'

import React from 'react'
import { Faq, FaqItem } from '../../core/types'
import { HelpCircle, Plus, Trash2 } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { CMS_LIMITS } from '../../core/config'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: Faq
  onChange: (v: Faq) => void 
}

export default function FaqEditor({ value, onChange }: Props) {
  const updateFaq = (i: number, field: keyof FaqItem, val: string) => {
    const faqs = [...value.faqs]
    faqs[i] = { ...faqs[i], [field]: val }
    onChange({ ...value, faqs })
  }

  const removeFaq = (i: number) => {
    if (value.faqs.length <= 4) return
    onChange({ ...value, faqs: value.faqs.filter((_, idx) => idx !== i) })
  }

  const addFaq = () => {
    if (value.faqs.length >= CMS_LIMITS.maxFaqItems) return
    onChange({
      ...value,
      faqs: [...value.faqs, { question: '', answer: '' }]
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Preguntas frecuentes" 
        titleAction={<HelpCircle className="w-5 h-5 text-muted-foreground" />}
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
        title={`Preguntas y Respuestas (${value.faqs.length})`}
        className="overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
          {value.faqs.map((faq, i) => (
            <div key={i} className="border border-border/30 rounded-xl p-4 bg-muted/20 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-muted-foreground font-mono mt-2.5 shrink-0">#{i + 1}</span>
                <div className="flex-1 flex flex-col gap-2">
                  <TextField
                    label="Pregunta"
                    value={faq.question}
                    onChange={e => updateFaq(i, 'question', e.target.value)}
                  />
                    <TextareaField
                      label="Respuesta"
                      className="min-h-[200px] resize-y py-2"
                      value={faq.answer}
                      onChange={e => updateFaq(i, 'answer', e.target.value)}
                    />
                  </div>
                  
                  {value.faqs.length > 4 && (
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      className="mt-6 p-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-all border border-transparent shrink-0"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
            </div>
          ))}
        </div>
        
        {value.faqs.length < CMS_LIMITS.maxFaqItems && (
          <div className="mt-4 border-t border-border/20 pt-4">
            <button
              type="button"
              onClick={addFaq}
              className="text-sm font-bold text-primary flex items-center justify-center gap-2 w-full sm:w-auto px-6 h-11 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Pregunta ({value.faqs.length}/{CMS_LIMITS.maxFaqItems})</span>
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
