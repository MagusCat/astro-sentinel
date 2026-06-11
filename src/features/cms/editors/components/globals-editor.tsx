'use client'

import React from 'react'
import { WebGlobals, SocialLink } from '../../core/types'
import { isAutoInjectedItem } from '../../core/derive'
import { Plus, Trash2, Settings, Share2, MapPin } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { TextField, SelectField, PhoneField } from '@/components/shared'
import { CMS_SOCIAL_NETWORKS } from '../../core/config'

interface Props {
  value: WebGlobals
  onChange: (v: WebGlobals) => void
}


function extractUsername(url: string, template: string): string {
  if (!url) return ''
  if (!url.startsWith('http')) return url.replace(/^@/, '')
  
  const prefix = template.split('{username}')[0]
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length).replace(/\/$/, '')
  }
  
  const parts = url.split('/').filter(Boolean)
  let last = parts[parts.length - 1]
  if (last.startsWith('@')) last = last.slice(1)
  return last
}

function buildFullUrl(username: string, template: string): string {
  if (!username) return ''
  if (username.startsWith('http')) return username
  const cleanUsername = username.replace(/^@/, '')
  return template.replace('{username}', cleanUsername)
}

export default function GlobalsEditor({ value, onChange }: Props) {

  const update = <K extends keyof WebGlobals>(key: K, val: WebGlobals[K]) => {
    onChange({ ...value, [key]: val })
  }

  const editableLinks = value.socialLinks.filter(l => !isAutoInjectedItem(l))

  const updateSocial = (editableIndex: number, updates: Partial<SocialLink>) => {
    const actualIndex = value.socialLinks.indexOf(editableLinks[editableIndex])
    if (actualIndex === -1) return
    const links = [...value.socialLinks]
    links[actualIndex] = { ...links[actualIndex], ...updates }
    update('socialLinks', links)
  }

  const handleNetworkChange = (editableIndex: number, networkId: string) => {
    const network = CMS_SOCIAL_NETWORKS.find(n => n.id === networkId)
    if (network) {
      const currentLink = editableLinks[editableIndex]
      const oldNetwork = CMS_SOCIAL_NETWORKS.find(n => n.name === currentLink.alt || n.icon === currentLink.icon) || CMS_SOCIAL_NETWORKS[0]
      const username = currentLink.title !== undefined ? currentLink.title : extractUsername(currentLink.url, oldNetwork.urlTemplate)
      
      updateSocial(editableIndex, { 
        alt: network.name, 
        icon: network.icon,
        title: username,
        url: username ? buildFullUrl(username, network.urlTemplate) : currentLink.url
      })
    }
  }

  const removeSocial = (editableIndex: number) => {
    const actualIndex = value.socialLinks.indexOf(editableLinks[editableIndex])
    if (actualIndex === -1) return
    update('socialLinks', value.socialLinks.filter((_, j) => j !== actualIndex))
  }

  const addSocial = () => {
    update('socialLinks', [...value.socialLinks, { alt: 'Facebook', url: '', icon: 'mingcute:facebook-fill', title: '', id: crypto.randomUUID() }])
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Información del Sitio Web"
        titleAction={<Settings className="w-5 h-5 text-muted-foreground" />}
        description="Estos datos le ayudan a Google a entender de qué trata tu página y son lo primero que ven tus clientes al buscarte en internet."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Nombre del Sitio"
            value={value.siteTitle}
            onChange={(e) => update('siteTitle', e.target.value)}
          />
          <TextField
            label="Descripción Corta del Sitio"
            tooltip="Este texto aparece debajo del nombre de tu página cuando alguien la comparte o la busca en Google. Debe ser breve y describir tu negocio."
            value={value.siteDescription}
            onChange={(e) => update('siteDescription', e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Datos de Contacto"
        titleAction={<MapPin className="w-5 h-5 text-muted-foreground" />}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhoneField
              label="Teléfono"
              tooltip="Este teléfono se mostrará en tu web y también se usará para el botón de WhatsApp automáticamente."
              value={value.contactPhone}
              onChange={(val) => update('contactPhone', val)}
            />
            <TextField
              label="Correo Electrónico"
              type="email"
              value={value.contactEmail}
              onChange={(e) => update('contactEmail', e.target.value)}
              placeholder="Ej: info@studiopower.com"
            />
          </div>

          <TextField
            label="Dirección Física"
            tooltip="Esta dirección se mostrará en la sección de contacto. Para que abra el mapa en el teléfono del cliente, configura el enlace de Google Maps en la sección de Contacto."
            value={value.contactAddress}
            onChange={(e) => update('contactAddress', e.target.value)}
            placeholder="Ej: Av. Principal 123, Ciudad, País"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Redes Sociales"
        titleAction={<Share2 className="w-5 h-5 text-muted-foreground" />}
        description="Agrega los enlaces a tus perfiles de redes sociales. El teléfono, correo y dirección se agregan automáticamente al final de la lista en la web pública."
      >
        <div className="flex flex-col gap-4">
          {editableLinks.map((link, i) => {
            const currentNetwork = CMS_SOCIAL_NETWORKS.find(n => n.name === link.alt || n.icon === link.icon) || CMS_SOCIAL_NETWORKS[0]
            const username = link.title !== undefined ? link.title : extractUsername(link.url, currentNetwork.urlTemplate)

            return (
              <div key={link.id || `${link.alt}-${link.icon}-${i}`} className="flex flex-col md:flex-row gap-4 items-end border border-border/30 rounded-xl p-5 bg-muted/20 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
                <SelectField
                  label="Red Social"
                  containerClassName="w-full md:w-1/3 p-0"
                  options={CMS_SOCIAL_NETWORKS.map(n => ({ value: n.id, label: n.name }))}
                  value={currentNetwork.id}
                  onChange={(e) => handleNetworkChange(i, e.target.value)}
                />

                <TextField
                  label="Nombre de Usuario"
                  containerClassName="flex-1 w-full"
                  value={username}
                  onChange={(e) => updateSocial(i, { 
                    title: e.target.value,
                    url: buildFullUrl(e.target.value, currentNetwork.urlTemplate) 
                  })}
                  placeholder="ej. @tu_cuenta"
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
