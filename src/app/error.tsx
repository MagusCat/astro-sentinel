'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button, Logo } from '@/components/shared'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Sentinel App Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 antialiased font-sans">
      <div className="mb-8">
        <Logo size="md" subtitle="Control de Errores" />
      </div>

      <div className="w-full max-w-lg bg-card border border-border/60 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Ha ocurrido un problema inesperado
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Se ha producido un error al procesar esta solicitud. Puedes reintentar la operación o volver a la pantalla principal.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground/60 pt-2">
              Código de referencia: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <Button
            variant="default"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reintentar
          </Button>

          <Button
            variant="outline"
            asChild
            className="flex items-center justify-center gap-2"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Ir al Panel Principal
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-center mt-8 text-xs text-muted-foreground font-mono">
        Sentinel • Sistema de Gestión
      </p>
    </div>
  )
}
