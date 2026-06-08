'use client'

export const runtime = 'edge';

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/actions'
import LoginPanel from '@/features/auth/components/login-panel'
import { SessionLoading } from '@/components/shared'

import { getActiveModules } from '@/lib/modules'

const { adminEnabled, cmsEnabled } = getActiveModules()

export default function LoginPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          if (adminEnabled) {
            router.replace('/dashboard')
          } else if (cmsEnabled) {
            router.replace('/editor')
          } else {
            // No modules enabled, stop checking to prevent loop
            setCheckingSession(false)
          }
        } else {
          setCheckingSession(false)
        }
      } catch {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [router])

  const handleLoginSuccess = () => {
    if (adminEnabled) {
      router.replace('/dashboard')
    } else if (cmsEnabled) {
      router.replace('/editor')
    }
  }

  if (checkingSession) {
    return <SessionLoading />
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center antialiased transition-colors duration-300 relative overflow-hidden">
      {/* Background graphic accents */}
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-secondary/15 dark:bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-5xl mx-auto px-6 py-8 flex flex-col justify-center relative z-10">
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      </main>
    </div>
  )
}
