import React from 'react'
import Link from 'next/link'
import { FileQuestion, Home, LogIn } from 'lucide-react'
import { Button, Logo } from '@/components/shared'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 antialiased font-sans">
      <div className="mb-8">
        <Logo size="md" subtitle="Navegación del Sistema" />
      </div>

      <div className="w-full max-w-lg bg-card border border-border/60 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
            Error 404
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Página no encontrada
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La ruta o el recurso al que intentas acceder no existe, ha sido movido o no está disponible en este momento.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <Button
            variant="default"
            asChild
            className="flex items-center justify-center gap-2"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Ir al Panel Principal
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            className="flex items-center justify-center gap-2"
          >
            <Link href="/login">
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
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
