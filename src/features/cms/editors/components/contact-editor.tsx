'use client'

import React from 'react'
import { Contact } from '../../core/types'
import { AlignLeft, MessageCircle } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { TextField, TextareaField, Tooltip } from '@/components/shared'

interface Props {
  value: Contact
  onChange: (v: Contact) => void
}

export default function ContactEditor({ value, onChange }: Props) {
  const updateWhatsapp = <K extends keyof Contact['whatsapp']>(key: K, val: Contact['whatsapp'][K]) => {
    onChange({
      ...value,
      whatsapp: { ...value.whatsapp, [key]: val },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Contacto"
        titleAction={<AlignLeft className="w-5 h-5 text-muted-foreground" />}
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Título de la Sección"
            value={value.heading || ''}
            onChange={e => onChange({ ...value, heading: e.target.value })}
          />
          <TextareaField
            label="Mensaje de Invitación"
            className="min-h-[80px] resize-y"
            value={value.description || ''}
            onChange={e => onChange({ ...value, description: e.target.value })}
          />
        </div>

        <div className="pt-6 mt-6 border-t border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-bold text-foreground">Botón de WhatsApp</h4>
            <Tooltip content="El número se toma automáticamente de tu Teléfono configurado en Datos de Contacto. Solo personaliza el texto del botón y el mensaje." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Texto del Botón"
              value={value.whatsapp?.title || ''}
              onChange={(e) => updateWhatsapp('title', e.target.value)}
              placeholder="Ej: Escríbenos"
            />
            <TextField
              label="Mensaje Automático"
              value={value.whatsapp?.message || ''}
              onChange={(e) => updateWhatsapp('message', e.target.value)}
              placeholder="Hola, me gustaría más información..."
            />
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-border/30">
          <h4 className="text-sm font-bold text-foreground mb-4">Ubicación en Google Maps</h4>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <TextField
                  label="Enlace de Ubicación"
                  value={value.mapLink || ''}
                  tooltip='Abre Google Maps, busca tu negocio y comparte el enlace. Copia el enlace y pégalo aquí.'
                  onChange={e => onChange({ ...value, mapLink: e.target.value })}
                  placeholder="Ej: https://maps.app.goo.gl/..."
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex-1">
                <TextareaField
                  label="Mapa Visible en la Página"
                  value={value.mapEmbedUrl || ''}
                  tooltip='En Google Maps desde computadora, busca tu negocio, haz clic en "Compartir", elige "Insertar un mapa" y copia todo el código que aparece. Lo convertiremos automáticamente.'
                  onChange={e => {
                    const val = e.target.value
                    if (val.includes('<iframe') && val.includes('src="')) {
                      const match = val.match(/src="([^"]+)"/)
                      if (match) {
                        onChange({ ...value, mapEmbedUrl: match[1] })
                        return
                      }
                    }
                    onChange({ ...value, mapEmbedUrl: val })
                  }}
                  placeholder='Pega aquí el código que empieza con <iframe ...'
                  className="font-mono text-xs h-12 min-h-[48px] resize-none overflow-hidden scrollbar-none"
                />
              </div>
            </div>

            {value.mapEmbedUrl ? (
              <div className="rounded-xl overflow-hidden border border-border/50 h-[250px] w-full bg-muted/30 flex flex-col">
                <div className="bg-muted px-4 py-2 text-xs font-bold text-muted-foreground flex justify-between items-center border-b border-border/50">
                  <span>Previsualización del Mapa</span>
                </div>
                <iframe
                  src={value.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 h-[100px] flex items-center justify-center text-sm text-muted-foreground">
                Pega un enlace o código del mapa para ver la previsualización
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
