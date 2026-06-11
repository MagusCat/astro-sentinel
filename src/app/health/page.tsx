'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import HealthCheck from '@/features/health/components/health-check'
import { Logo } from '@/components/shared'
import { getActiveModules } from '@/lib/modules'

const { adminEnabled, cmsEnabled } = getActiveModules()
const loadedModules = [adminEnabled && 'admin', cmsEnabled && 'cms'].filter(Boolean)
const loadedModulesLabel = loadedModules.length > 0 ? loadedModules.join(', ') : 'Ninguno'

function HealthCheckContent() {
  const searchParams = useSearchParams()
  const isDebug = searchParams.get('debug') === 'true'

  if (!isDebug) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
        <Logo size="lg" animate={true} />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-4">System Operational</h1>
        <p className="text-muted-foreground text-sm font-medium">All Sentinel core systems are running smoothly.</p>
        <p className="text-sm text-muted-foreground">Módulos cargados: {loadedModulesLabel}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Módulos cargados:</span> {loadedModulesLabel}
      </div>
      <HealthCheck />
    </div>
  )
}

export default function HealthCheckPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center antialiased font-sans">
      <main className="flex-1 w-full max-w-xl mx-auto px-6 py-16 flex flex-col justify-center gap-8">
        <Suspense fallback={<div className="h-40 w-full animate-pulse bg-muted rounded-xl" />}>
          <HealthCheckContent />
        </Suspense>
      </main>
    </div>
  )
}
