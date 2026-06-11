'use client'

import React, { useRef } from 'react'
import { Upload, Code, AlertTriangle } from 'lucide-react'
import { SectionCard } from '@/components/shared'
import { SiteContent } from '../../core/types'

interface Props {
  onImport: (data: SiteContent) => void
}

export default function DeveloperEditor({ onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        let json = JSON.parse(event.target?.result as string)
        
        // Si el JSON viene envuelto en un objeto (ej. exportaciones)
        if (json && json.content && json.content.globals) {
          json = json.content
        }

        if (json && typeof json === 'object' && json.globals) {
          onImport(json as SiteContent)
        } else {
          alert('El archivo JSON no tiene el formato de contenido esperado (falta la clave principal "globals"). Verifica el formato.')
        }
      } catch (err) {
        alert('Error crítico: El archivo subido no es un JSON válido.')
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard 
        title="Opciones de Desarrollador" 
        titleAction={<Code className="w-5 h-5 text-muted-foreground" />}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold">
                Zona de Riesgo
              </p>
              <p className="text-sm">
                Esta opción permite sobrescribir todo el contenido actual cargando un archivo JSON completo. Asegúrate de que el archivo coincida con la estructura esperada del CMS.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 items-start">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-bold flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              <Upload className="w-5 h-5" />
              <span>Cargar JSON al CMS</span>
            </button>
            <p className="text-xs text-muted-foreground">
              Al cargar el archivo, los datos reemplazarán el borrador actual en el editor. Recuerda guardar y publicar para que los cambios sean públicos.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
