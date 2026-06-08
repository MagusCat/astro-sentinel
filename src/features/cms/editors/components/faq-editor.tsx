'use client'

import React from 'react'
import { Faq, FaqItem } from '../../core/types'
import { HelpCircle } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
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

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <SectionCard 
        title="Configuración FAQ" 
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
        className="lg:flex-1 lg:min-h-0"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:overflow-y-auto pr-2">
          {value.faqs.map((faq, i) => (
            <div key={i} className="border border-border/30 rounded-xl p-4 bg-muted/20 flex flex-col gap-3">
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
                    className="min-h-[100px] resize-y py-2"
                    value={faq.answer}
                    onChange={e => updateFaq(i, 'answer', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
