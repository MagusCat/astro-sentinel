'use client'

import React from 'react'
import Link from 'next/link'
import { Database, AlertTriangle, ArrowRight, ExternalLink, ArrowLeft } from 'lucide-react'
import { Button, Logo, SectionCard } from '@/components/shared';

/**
 * SetupRequired — CMS Initialization View
 * 
 * Rendered when the storage infrastructure (buckets) is missing.
 * Provides clear instructions to the administrator on how to resolve the issue.
 */
export default function SetupRequired() {
  let supabaseConsoleUrl = 'https://supabase.com/dashboard'
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (rawUrl) {
      const hostname = new URL(rawUrl).hostname
      const projectRef = hostname.split('.')[0]
      if (projectRef && projectRef !== 'localhost' && projectRef !== '127') {
        supabaseConsoleUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`
      }
    }
  } catch {
    // fallback to dashboard
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 ease-[var(--ease-haptic)]">
      <div className="mb-12">
        <Logo size="lg" subtitle="Sistema de Gestión" />
      </div>

      <div className="w-full max-w-2xl">
        <SectionCard 
          className="shadow-2xl"
          title="Infraestructura no Inicializada"
          titleAction={<Database className="w-5 h-5 text-rose-500 animate-pulse" />}
        >
          <div className="flex flex-col gap-8 py-4">
            <div className="flex gap-5 items-start p-6 bg-rose-500/5 border border-rose-500/20 rounded-[1.5rem]">
              <div className="p-3 bg-rose-500/10 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="font-extrabold text-rose-700 uppercase tracking-tighter text-sm">Error de Configuración Detectado</h4>
                <p className="text-sm text-rose-900/70 leading-relaxed font-medium">
                  El motor del CMS no ha podido localizar los contenedores de almacenamiento (Buckets) necesarios en Supabase. Esto sucede usualmente en instalaciones nuevas o migraciones incompletas.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="font-bold text-foreground text-sm uppercase tracking-widest border-l-4 border-primary pl-4">Pasos para la Solución</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col gap-3 group hover:bg-muted/50 transition-all duration-500">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md w-fit">Opción A (Recomendado)</span>
                  <p className="text-xs font-semibold text-foreground/80 leading-relaxed">
                    Aplica las migraciones de la base de datos ubicadas en:
                    <code className="block mt-2 p-2 bg-background border border-border/60 rounded-lg text-primary font-mono">supabase/migrations/</code>
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col gap-3 group hover:bg-muted/50 transition-all duration-500">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md w-fit">Opción B</span>
                  <p className="text-xs font-semibold text-foreground/80 leading-relaxed">
                    Crea manualmente los buckets <span className="text-primary font-bold">site-content</span> y <span className="text-primary font-bold">site-images</span> en tu panel de Supabase (lectura pública: alimentan el sitio web público). La escritura la hace la app con el service role.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/10">
              <Button 
                variant="default" 
                className="flex-1 rounded-full py-6 group"
                asChild
              >
                <a href={supabaseConsoleUrl} target="_blank" rel="noopener noreferrer">
                  Abrir Supabase SQL Editor
                  <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </Button>
              
              <Button 
                variant="neutral" 
                className="flex-1 rounded-full py-6"
                onClick={() => window.location.reload()}
              >
                Reintentar Conexión
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground text-sm font-semibold gap-2"
                asChild
              >
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4" />
                  Regresar al Panel Principal
                </Link>
              </Button>
            </div>
          </div>
        </SectionCard>

        <p className="text-center mt-8 text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em]">
          Protocolo de Resiliencia Sentinel • v0.1.0
        </p>
      </div>
    </div>
  )
}
