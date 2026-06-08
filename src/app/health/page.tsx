'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import HealthCheck from '@/features/health/components/health-check'
import { Logo } from '@/components/shared'

function HealthCheckContent() {
  const searchParams = useSearchParams()
  const isDebug = searchParams.get('debug') === 'true'

  if (!isDebug) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
        <Logo size="lg" animate={true} />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-4">System Operational</h1>
        <p className="text-muted-foreground text-sm font-medium">All Sentinel core systems are running smoothly.</p>
      </div>
    )
  }

  return <HealthCheck />
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
