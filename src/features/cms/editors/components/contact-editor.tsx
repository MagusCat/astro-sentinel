'use client'

import React from 'react'
import { Contact, WebGlobals, SocialLink } from '../../core/types'
import { AlignLeft, MapPin, Share2, MessageCircle, Phone, Mail, Plus, Trash2, Info } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField, TextareaField } from '@/components/shared'

interface Props { 
  value: Contact
  onChange: (v: Contact) => void 
  globals?: WebGlobals
  onGlobalsChange?: (v: WebGlobals) => void
}

export default function ContactEditor({ value, onChange, globals, onGlobalsChange }: Props) {

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Contacto" 
        titleAction={<AlignLeft className="w-5 h-5 text-muted-foreground" />}
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Encabezado"
            value={value.heading}
            onChange={e => onChange({ ...value, heading: e.target.value })}
          />
          <TextareaField
            label="Descripción"
            className="min-h-[80px] resize-y"
            value={value.description}
            onChange={e => onChange({ ...value, description: e.target.value })}
          />
        </div>

        <div className="pt-6 mt-6 border-t border-border/30">
          <h4 className="text-sm font-bold text-foreground mb-4">Atención por WhatsApp</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <TextField
                label="Título del Botón WhatsApp"
                value={globals?.whatsapp?.title || ''}
                onChange={(e) => {
                  if (globals && onGlobalsChange) {
                    onGlobalsChange({ ...globals, whatsapp: { ...(globals.whatsapp || {} as any), title: e.target.value }})
                  }
                }}
                placeholder="Ej: Escríbenos"
              />
            </div>
            <TextField
              label="Mensaje Predefinido WhatsApp"
              value={globals?.whatsapp?.message || ''}
              onChange={(e) => {
                if (globals && onGlobalsChange) {
                  onGlobalsChange({ ...globals, whatsapp: { ...(globals.whatsapp || {} as any), message: e.target.value }})
                }
              }}
              placeholder="Hola, me gustaría más información..."
            />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
