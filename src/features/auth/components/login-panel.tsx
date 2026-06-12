'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, User, Lock, CheckCircle2 } from 'lucide-react'
import { Logo, Toast, ToastType, TextField, ToggleButtonGroup, LoadingState, Button } from '@/components/shared'
import { authenticateUser, isDeviceAuthorized, authorizeDevice, authenticateAdmin } from '../actions'
import { AuthenticatedUser } from '../types'

interface LoginPanelProps {
  onLoginSuccess: (user: AuthenticatedUser) => void
}

import { getActiveModules } from '@/lib/modules'

const { adminEnabled, localLoginEnabled } = getActiveModules()

export default function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  const [loginType, setLoginType] = useState<'local' | 'admin'>(localLoginEnabled ? 'local' : 'admin')
  const [deviceAuthorized, setDeviceAuthorized] = useState<boolean | null>(null)

  const [adminAuthForm, setAdminAuthForm] = useState({ email: '', password: '' })
  const [adminAuthLoading, setAdminAuthLoading] = useState(false)

  const [deviceForm, setDeviceForm] = useState({ email: '', password: '' })
  const [deviceLoading, setDeviceLoading] = useState(false)

  const [localLoginForm, setLocalLoginForm] = useState({ username: '', password: '' })
  const [localLoading, setLocalLoading] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  
  const [loginSuccessUser, setLoginSuccessUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const authorized = await isDeviceAuthorized()
        setDeviceAuthorized(authorized)
      } catch (err) {
        console.error('Failed to verify device terminal authorization status:', err)
        setDeviceAuthorized(false)
      }
    }
    checkDevice()
  }, [])

  const handleDeviceAuthorization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deviceForm.email.trim() === '' || deviceForm.password.trim() === '') {
      setToast({ message: 'Por favor ingrese las credenciales de administrador.', type: 'error' })
      return
    }

    setDeviceLoading(true)

    try {
      const res = await authorizeDevice(deviceForm.email, deviceForm.password)
      if (res.success) {
        setDeviceAuthorized(true)
      } else {
        setToast({ message: res.error || 'Autorización rechazada por el servidor de autenticación.', type: 'error' })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setToast({ message: `Fallo en el servidor de autorización: ${errorMsg}`, type: 'error' })
    } finally {
      setDeviceLoading(false)
    }
  }

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (localLoginForm.username.trim() === '' || localLoginForm.password.trim() === '') {
      setToast({ message: 'Por favor ingrese sus credenciales de usuario.', type: 'error' })
      return
    }

    setLocalLoading(true)

    try {
      // Send raw password over HTTPS — bcrypt.compare runs server-side
      const res = await authenticateUser(localLoginForm.username, localLoginForm.password)
      if (res.success && res.user) {
        setLoginSuccessUser(res.user)
        setTimeout(() => {
          onLoginSuccess(res.user!)
        }, 1500)
      } else {
        setToast({ message: res.error || 'Credenciales incorrectas.', type: 'error' })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setToast({ message: `Fallo de conexión con el servidor: ${errorMsg}`, type: 'error' })
    } finally {
      setLocalLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (adminAuthForm.email.trim() === '' || adminAuthForm.password.trim() === '') {
      setToast({ message: 'Por favor ingrese sus credenciales de administrador.', type: 'error' })
      return
    }

    setAdminAuthLoading(true)

    try {
      const res = await authenticateAdmin(adminAuthForm.email, adminAuthForm.password)
      if (res.success && res.user) {
        setLoginSuccessUser(res.user)
        setTimeout(() => {
          onLoginSuccess(res.user!)
        }, 1500)
      } else {
        setToast({ message: res.error || 'Credenciales incorrectas.', type: 'error' })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setToast({ message: `Fallo de conexión con el servidor: ${errorMsg}`, type: 'error' })
    } finally {
      setAdminAuthLoading(false)
    }
  }

  if (deviceAuthorized === null) {
    return (
      <LoadingState
        text="Verificando firma de autorización de la terminal..."
        className="max-w-md mx-auto my-12 p-12"
      />
    )
  }

  return (
    <div className="w-full h-full md:max-w-md md:w-full mx-auto md:my-12 flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mode-switch {
          0% { opacity: 0; transform: scale(0.97) translateY(4px); filter: blur(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        .mode-animate {
          animation: mode-switch 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="w-full h-full min-h-screen md:min-h-0 md:max-w-[420px] bg-card border-0 md:border md:border-border rounded-none md:rounded-2xl md:shadow-xl mx-auto relative md:overflow-hidden transition-all duration-300 md:hover:shadow-2xl flex flex-col">
        
        <div className="flex w-full bg-primary py-4 md:py-10 flex-col justify-center items-center shrink-0 sticky top-0 z-10 shadow-md">
          <div className="hidden md:block">
            <Logo size="lg" animate={false} centered={true} color="white" />
          </div>
        </div>

        <div className="p-8 sm:p-10 flex flex-col flex-1 justify-center">

        {loginSuccessUser ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 animate-in zoom-in-95 fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground text-center tracking-tight">¡Bienvenido!</h2>
            <p className="text-muted-foreground text-sm font-medium text-center">
              {loginSuccessUser.full_name || loginSuccessUser.username}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingresando al sistema...
            </div>
          </div>
        ) : (
          <>
            {adminEnabled && localLoginEnabled && (
              <ToggleButtonGroup
            value={loginType}
            onChange={(val) => setLoginType(val as 'local' | 'admin')}
            variant="simple"
            options={[
              ...(localLoginEnabled ? [{ value: 'local', label: 'Personal', icon: <User className="w-4 h-4" /> }] : []),
              { value: 'admin', label: 'Admin', icon: <Lock className="w-4 h-4" /> },
            ]}
            className="mb-8"
          />
        )}

        <div key={loginType} className="mode-animate">
              {loginType === 'local' ? (
                !deviceAuthorized ? (
                  <form onSubmit={handleDeviceAuthorization} className="flex flex-col gap-5 animate-in fade-in duration-300">
                    <TextField
                      label="Correo Admin"
                      type="email"
                      placeholder="Correo electrónico"
                      value={deviceForm.email}
                      disabled={deviceLoading}
                      onChange={(e) => setDeviceForm(prev => ({ ...prev, email: e.target.value }))}
                    />

                    <TextField
                      label="Contraseña Admin"
                      type="password"
                      placeholder="Contraseña"
                      value={deviceForm.password}
                      disabled={deviceLoading}
                      onChange={(e) => setDeviceForm(prev => ({ ...prev, password: e.target.value }))}
                    />

                    <Button
                      type="submit"
                      disabled={deviceLoading}
                      size="default"
                      className="w-full mt-2"
                      variant="destructive"
                    >
                      {deviceLoading ? (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Autorizando...
                        </span>
                      ) : 'Autorizar Terminal'}
                    </Button>
                  </form>
                ) : (
              <form onSubmit={handleLocalLogin} className="flex flex-col gap-5 animate-in fade-in duration-200">
                <TextField
                  label="Usuario"
                  type="text"
                  placeholder="Usuario"
                  value={localLoginForm.username}
                  disabled={localLoading}
                  onChange={(e) => setLocalLoginForm(prev => ({ ...prev, username: e.target.value }))}
                />

                <TextField
                  label="Contraseña"
                  type="password"
                  placeholder="Contraseña"
                  value={localLoginForm.password}
                  disabled={localLoading}
                  onChange={(e) => setLocalLoginForm(prev => ({ ...prev, password: e.target.value }))}
                />

                <Button
                  type="submit"
                  disabled={localLoading}
                  size="default"
                  className="w-full mt-2"
                >
                  {localLoading ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verificando...
                    </span>
                  ) : 'Iniciar Sesión'}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-5 animate-in fade-in duration-200">
              <TextField
                label="Correo Admin"
                type="email"
                placeholder="Correo electrónico"
                value={adminAuthForm.email}
                disabled={adminAuthLoading}
                onChange={(e) => setAdminAuthForm(prev => ({ ...prev, email: e.target.value }))}
              />

              <TextField
                label="Contraseña Admin"
                type="password"
                placeholder="Contraseña"
                value={adminAuthForm.password}
                disabled={adminAuthLoading}
                onChange={(e) => setAdminAuthForm(prev => ({ ...prev, password: e.target.value }))}
              />

              <Button
                type="submit"
                disabled={adminAuthLoading}
                size="default"
                className="w-full mt-2"
              >
                {adminAuthLoading ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Autenticando...
                  </span>
                ) : 'Iniciar Sesión Admin'}
              </Button>
            </form>
          )}
        </div>
        </>
        )}
        </div>

      </div>

      {!loginSuccessUser && !deviceAuthorized && loginType === 'local' && (
        <div className="w-full max-w-[420px] mx-auto bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-rose-500" />
            <h4 className="font-bold text-sm text-rose-600">Terminal Bloqueada</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta terminal requiere ser desbloqueada por un administrador antes de permitir el acceso al personal operativo. Por favor, ingresa tus credenciales de administrador en la tarjeta superior.
          </p>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
