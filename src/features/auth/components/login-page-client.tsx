'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Moon } from 'lucide-react'
import LoginPanel from '@/features/auth/components/login-panel'

interface LoginPageClientProps {
  adminEnabled: boolean
  cmsEnabled: boolean
  anyEnabled: boolean
}

export default function LoginPageClient({ adminEnabled, cmsEnabled, anyEnabled }: LoginPageClientProps) {
  const router = useRouter()

  const handleLoginSuccess = () => {
    if (adminEnabled) {
      router.replace('/dashboard')
    } else if (cmsEnabled) {
      router.replace('/editor')
    }
  }

  if (!anyEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/40 via-background to-primary/40 text-foreground flex flex-col justify-center antialiased transition-colors duration-300 relative overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/30 dark:bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/40 dark:bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

        <main className="w-full max-w-2xl mx-auto px-6 py-8 flex flex-col justify-center relative z-10">
          <div className="w-full max-w-md mx-auto bg-card border border-border rounded-3xl p-10 shadow-xl text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/70 text-muted-foreground">
              <Moon className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Sistema en Mantenimiento</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Sentinel se encuentra temporalmente fuera de servicio. Por favor, intente más tarde.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] sm:min-h-screen bg-gradient-to-br from-primary/40 via-background to-primary/40 text-foreground flex flex-col justify-center antialiased transition-colors duration-300 relative overflow-hidden">
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/30 dark:bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/40 dark:bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-5xl mx-auto px-0 sm:px-6 py-0 sm:py-8 flex flex-col justify-center relative z-10 h-[100dvh] sm:h-auto overflow-hidden sm:overflow-visible">
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      </main>
    </div>
  )
}
