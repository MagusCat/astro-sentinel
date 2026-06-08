'use client'

import React from 'react'
import { WebGlobals, SocialLink, Contact } from '../../core/types'
import { Plus, Trash2, Settings, Share2, MapPin } from 'lucide-react'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { TextField, SelectField, TextareaField, Tooltip } from '@/components/shared'

interface Props {
  value: WebGlobals
  onChange: (v: WebGlobals) => void
  contact?: Contact
  onContactChange?: (v: Contact) => void
}

const SOCIAL_NETWORKS = [
  { id: 'facebook', name: 'Facebook', icon: 'mingcute:facebook-fill' },
  { id: 'instagram', name: 'Instagram', icon: 'mingcute:ins-fill' },
  { id: 'tiktok', name: 'TikTok', icon: 'mingcute:tiktok-fill' },
  { id: 'twitter', name: 'X (Twitter)', icon: 'mingcute:social-x-line' },
  { id: 'youtube', name: 'YouTube', icon: 'mingcute:youtube-fill' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'mingcute:linkedin-fill' },
]

export default function GlobalsEditor({ value, onChange, contact, onContactChange }: Props) {

  const update = <K extends keyof WebGlobals>(key: K, val: WebGlobals[K]) => {
    onChange({ ...value, [key]: val })
  }

  const socialLinks = value.socialLinks.filter(link => {
    const name = link.alt?.toLowerCase() || ''
    const icon = link.icon?.toLowerCase() || ''
    const isPhoneOrEmail = name.includes('tel') || name.includes('mail') || name.includes('phone') || name.includes('correo') || icon.includes('phone') || icon.includes('mail')
    const isLocation = name.includes('map') || name.includes('ubicacion') || name.includes('ubicación') || name.includes('address') || name.includes('direccion') || name.includes('dirección') || icon.includes('map') || icon.includes('pin')
    return !isPhoneOrEmail && !isLocation
  })

  const updateSocial = (i: number, field: keyof SocialLink, val: string) => {
    const links = [...socialLinks]
    links[i] = { ...links[i], [field]: val }
    update('socialLinks', links)
  }

  const handleNetworkChange = (i: number, networkId: string) => {
    const network = SOCIAL_NETWORKS.find(n => n.id === networkId)
    if (network) {
      updateSocial(i, 'alt', network.name)
      updateSocial(i, 'icon', network.icon)
    }
  }

  const removeSocial = (i: number) => {
    update('socialLinks', socialLinks.filter((_, j) => j !== i))
  }

  const addSocial = () => {
    update('socialLinks', [...socialLinks, { alt: 'Facebook', url: '', icon: 'mingcute:facebook-fill' }])
  }

  const mapPreviewUrl = contact?.mapEmbedUrl || ''

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Información General del Sitio Web" 
        titleAction={<Settings className="w-5 h-5 text-muted-foreground" />}
        description="Estos textos ayudan a Google a entender de qué trata tu página y es lo primero que verán tus clientes al buscarte o al ver el enlace compartido."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Título del Sitio (SEO)"
            value={value.siteTitle}
            onChange={(e) => update('siteTitle', e.target.value)}
          />
          <TextField
            label="Descripción del Sitio (SEO)"
            value={value.siteDescription}
            onChange={(e) => update('siteDescription', e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard 
        title="Datos de Contacto Unificados" 
        titleAction={<MapPin className="w-5 h-5 text-muted-foreground" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Teléfono Comercial (Opcional)"
            type="tel"
            value={value.contactPhone}
            onChange={(e) => update('contactPhone', e.target.value)}
          />
          <TextField
            label="Email Comercial (Opcional)"
            type="email"
            value={value.contactEmail}
            onChange={(e) => update('contactEmail', e.target.value)}
          />
        </div>

        {contact && onContactChange && (
          <div className="pt-6 mt-4 border-t border-border/30 flex flex-col gap-4">
            <h4 className="text-sm font-bold text-foreground">Ubicación Física</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Dirección Física Completa (Opcional)"
                value={value.contactAddress}
                onChange={(e) => update('contactAddress', e.target.value)}
                placeholder="Ej: Av. Principal 123, Ciudad, País"
              />

              <div className="flex items-start gap-2">
                <div className="pt-7">
                  <Tooltip content="Pega el link corto (Compartir > Copiar enlace) que abrirá la app de mapas del usuario en su teléfono." />
                </div>
                <div className="flex-1">
                  <TextField
                    label="Link Corto de Ubicación"
                    value={contact.contact?.find(item => item.title === 'Ubicación')?.url || ''}
                    onChange={e => {
                      const newContactItems = contact.contact ? [...contact.contact] : [];
                      const idx = newContactItems.findIndex(i => i.title === 'Ubicación');
                      if (idx !== -1) {
                        newContactItems[idx].url = e.target.value;
                      } else {
                        newContactItems.push({ title: 'Ubicación', content: '', icon: 'mingcute:map-pin-line', url: e.target.value });
                      }
                      onContactChange({ ...contact, contact: newContactItems });
                    }}
                    placeholder="Ej: https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-start gap-2">
                <div className="pt-7">
                  <Tooltip content='Abre Google Maps, busca tu negocio, haz clic en "Compartir", elige "Insertar un mapa", copia todo el código y pégalo aquí.' />
                </div>
                <div className="flex-1">
                  <TextareaField
                    label="Código de Google Maps"
                    value={contact.mapEmbedUrl}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.includes('<iframe') && val.includes('src="')) {
                        const match = val.match(/src="([^"]+)"/);
                        if (match) {
                          onContactChange({ ...contact, mapEmbedUrl: match[1] });
                          return;
                        }
                      }
                      onContactChange({ ...contact, mapEmbedUrl: val });
                    }}
                    placeholder='Pega aquí el código HTML que empieza con <iframe ...'
                    className="font-mono text-xs h-12 min-h-[48px] resize-none overflow-hidden scrollbar-none"
                  />
                </div>
              </div>
            </div>

            {mapPreviewUrl ? (
              <div className="mt-4 rounded-xl overflow-hidden border border-border/50 h-[250px] w-full bg-muted/30 flex flex-col">
                <div className="bg-muted px-4 py-2 text-xs font-bold text-muted-foreground flex justify-between items-center border-b border-border/50">
                  <span>Previsualización del Mapa</span>
                </div>
                <iframe 
                  src={mapPreviewUrl} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border/50 h-[100px] flex items-center justify-center text-sm text-muted-foreground">
                Ingresa un link o dirección para ver la previsualización del mapa
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard 
        title="Redes Sociales Globales" 
        titleAction={<Share2 className="w-5 h-5 text-muted-foreground" />}
        description="Configura los enlaces a tus perfiles oficiales de redes sociales. Estos se mostrarán en la web pública."
      >
        <div className="flex flex-col gap-4">
          {socialLinks.map((link, i) => {
            const currentNetworkId = SOCIAL_NETWORKS.find(n => n.name === link.alt || n.icon === link.icon)?.id || 'facebook'
            return (
              <div key={i} className="flex flex-col md:flex-row gap-4 items-end border border-border/30 rounded-xl p-5 bg-muted/20">
                <SelectField
                  label="Red Social"
                  containerClassName="w-full md:w-1/3 p-0"
                  options={SOCIAL_NETWORKS.map(n => ({ value: n.id, label: n.name }))}
                  value={currentNetworkId}
                  onChange={(e) => handleNetworkChange(i, e.target.value)}
                />
                
                <TextField
                  label="Enlace al Perfil (URL)"
                  containerClassName="flex-1 w-full"
                  value={link.url}
                  onChange={(e) => updateSocial(i, 'url', e.target.value)}
                  placeholder="https://"
                />

                <button
                  type="button"
                  onClick={() => removeSocial(i)}
                  className="h-10 px-4 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border border-transparent shrink-0 w-full md:w-auto flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium md:hidden">Eliminar</span>
                </button>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addSocial}
          className="text-sm font-bold text-primary flex items-center gap-2 px-4 py-2.5 mt-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Red Social</span>
        </button>
      </SectionCard>
    </div>
  )
}
