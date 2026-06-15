'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Smartphone, Trash2, Cpu, ServerCog, Zap } from 'lucide-react'
import { ConnectedDevice } from '../types'
import { getAuthorizedDevices, revokeDeviceById } from '../actions'
import { Button } from '@/components/shared/form/button'
import Toast from '@/components/shared/feedback/toast'
import type { ToastType } from '@/components/shared/feedback/toast'
import { ConfirmDialog } from '@/components/shared/feedback/confirm-dialog'
import { SectionCard } from '@/components/shared/data-display/section-card'
import { EmptyState } from '@/components/shared/feedback/empty-state'
import { MetricCard } from '@/components/shared/data-display/metric-card'
import { getActiveModules } from '@/lib/modules'

interface DeveloperPanelProps {
  refreshTrigger?: number
  setLoading?: (loading: boolean) => void
}

export default function DeveloperPanel({ refreshTrigger, setLoading: setLoadingProp }: DeveloperPanelProps) {
  const [appLatency, setAppLatency] = useState<number | null>(null)
  const [serverLatency, setServerLatency] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false)

  const [devices, setDevices] = useState<ConnectedDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)
  const modules = useMemo(() => getActiveModules(), [])

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true)
    const start = performance.now()
    const res = await getAuthorizedDevices()
    const elapsed = Math.round(performance.now() - start)
    setServerLatency(elapsed)

    if (res.success && res.data) {
      setDevices(res.data)
    } else {
      setToast({ message: res.error || 'Error al cargar los dispositivos autorizados.', type: 'error' })
    }
    setIsLoadingDevices(false)
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => setAppLatency(Math.round(performance.now())))
    loadDevices()
  }, [loadDevices, refreshTrigger])

  useEffect(() => {
    setLoadingProp?.(isLoadingDevices)
    return () => setLoadingProp?.(false)
  }, [isLoadingDevices, setLoadingProp])

  const confirmRevokeDevice = (deviceId: string) => {
    setConfirmRevokeId(deviceId)
  }

  const handleRevokeDevice = async () => {
    if (!confirmRevokeId) return
    const deviceId = confirmRevokeId
    setConfirmRevokeId(null)

    // OPTIMISTIC UI: Remove device immediately from local state
    const previousDevices = [...devices]
    setDevices(prev => prev.filter(d => d.device_id !== deviceId))
    setToast({ message: 'Procesando revocación...', type: 'success' })

    try {
      const res = await revokeDeviceById(deviceId)
      if (res.success) {
        setToast({ message: 'Sesión revocada correctamente.', type: 'success' })
        // Optionally refresh to ensure sync, but the list is already updated optimistically
        await loadDevices() 
      } else {
        // ROLLBACK: If it failed, restore the previous list
        setDevices(previousDevices)
        setToast({ message: res.error || 'Error al revocar sesión.', type: 'error' })
      }
    } catch {
      setDevices(previousDevices)
      setToast({ message: 'Error de conexión al servidor.', type: 'error' })
    }

  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-full h-full overflow-y-auto pb-12 pr-2 animate-in fade-in duration-700 ease-[var(--ease-haptic)]">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full min-w-0">
        <MetricCard
          title="Latencia Servidor"
          value={serverLatency !== null ? `${serverLatency}ms` : '---'}
          description="Tiempo de respuesta de la API"
          icon={Cpu}
          color="primary"
        />

        <MetricCard
          title="Latencia App"
          value={appLatency !== null ? `${appLatency}ms` : '---'}
          description="Tiempo desde carga del cliente"
          icon={Zap}
          color="emerald"
        />

        <MetricCard
          title="Módulos Activos"
          value={`${Object.values(modules).filter(Boolean).length}/${Object.keys(modules).length}`}
          description="Configuración de la aplicación"
          icon={ServerCog}
          color="sky"
        />
      </div>

      <SectionCard
        title="Sesiones Activas"
        titleAction={
          <Button
            variant="outline"
            size="sm"
            onClick={loadDevices}
            disabled={isLoadingDevices}
            className="rounded-full"
          >
            Actualizar
          </Button>
        }
        className="shrink-0"
        size="sm"
      >

        {isLoadingDevices && devices.length === 0 ? (
          <div className="flex justify-center p-12 text-sm text-muted-foreground animate-pulse">Iniciando diagnóstico de terminales...</div>
        ) : devices.length === 0 ? (
          <div className="p-12 bg-muted/10 rounded-[2rem] border border-border/30 border-dashed">
            <EmptyState
              icon={<Smartphone className="w-12 h-12 opacity-20" />}
              message="No hay sesiones activas en la red"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <div 
                key={device.device_id} 
                className="group/item flex flex-col gap-4 p-5 rounded-[1.5rem] border border-border/40 bg-card hover:bg-muted/30 transition-all duration-700 ease-[var(--ease-haptic)] animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-foreground truncate max-w-[120px]" title={device.device_id}>
                        {device.device_id.split('-')[0].toUpperCase()}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">En línea</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => confirmRevokeDevice(device.device_id)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition-all duration-300 group-hover/item:scale-110"
                    title="Revocar Terminal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-border/10">
                  <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
                    <span className="text-muted-foreground/60">Operador:</span>
                    <span className="text-foreground/80">{device.user_name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
                    <span className="text-muted-foreground/60">Autorizado:</span>
                    <span className="text-foreground/80">
                      {new Date(device.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>




      {confirmRevokeId && (
        <ConfirmDialog
          isOpen={!!confirmRevokeId}
          onClose={() => setConfirmRevokeId(null)}
          onConfirm={handleRevokeDevice}
          title="Revocar terminal"
          message="Esta acción cerrará la sesión de la terminal seleccionada. ¿Deseas continuar?"
          confirmText="Revocar"
          cancelText="Cancelar"
          variant="danger"
          loading={isLoadingDevices}
        />
      )}

      {showClearCacheConfirm && (
        <ConfirmDialog
          isOpen={showClearCacheConfirm}
          onClose={() => setShowClearCacheConfirm(false)}
          onConfirm={async () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          title="Limpiar caché"
          message="¿Limpiar almacenamiento local? Se cerrará la sesión si hay tokens guardados."
          confirmText="Limpiar"
          cancelText="Cancelar"
          variant="danger"
        />
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
