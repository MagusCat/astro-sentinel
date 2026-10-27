'use client'

import React, { useEffect } from 'react'
import '../styles/globals.css'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Sentinel Global Error:', error)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 antialiased font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold font-mono">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Error crítico del sistema
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              La aplicación ha detectado un fallo crítico a nivel global. Puedes reintentar cargar la interfaz o recargar la página.
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-slate-500 pt-2">
                Código: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <button
              onClick={() => reset()}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Reintentar
            </button>
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700 text-center cursor-pointer"
            >
              Ir al Inicio
            </a>
          </div>
        </div>

        <p className="text-center mt-8 text-xs text-slate-500 font-mono">
          Sentinel • Recuperación Global
        </p>
      </body>
    </html>
  )
}
