'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Smartphone, Trash2, Cpu, ServerCog, Zap, RefreshCcw, Terminal } from 'lucide-react'
import { ConnectedDevice } from '../types'
import { getAuthorizedDevices, revokeDeviceById } from '../actions'
import { Button, Toast, ToastType, ConfirmDialog, SectionCard, EmptyState, MetricCard } from '@/components/shared'
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
    setConfirmRevokeId(null)

    const res = await revokeDeviceById(confirmRevokeId)
    if (res.success) {
      setToast({ message: 'Sesión revocada.', type: 'success' })
      await loadDevices()
    } else {
      setToast({ message: res.error || 'Error al revocar sesión.', type: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-full h-full overflow-y-auto pb-12 pr-2">
      
      <div className="flex flex-row gap-4 pb-2 w-full max-w-full min-w-0">
        <MetricCard
          title="Latencia Servidor"
          value={serverLatency !== null ? `${serverLatency}ms` : '---'}
          description="Tiempo de respuesta de la API"
          icon={Cpu}
          color="primary"
          className="shadow-none hover:shadow-none border-border/40"
        />

        <MetricCard
          title="Latencia App"
          value={appLatency !== null ? `${appLatency}ms` : '---'}
          description="Tiempo desde carga del cliente"
          icon={Zap}
          color="emerald"
          className="shadow-none hover:shadow-none border-border/40"
        />

        <MetricCard
          title="Módulos Activos"
          value={`${Object.values(modules).filter(Boolean).length}/${Object.keys(modules).length}`}
          description="Configuración de la aplicación"
          icon={ServerCog}
          color="sky"
          className="shadow-none hover:shadow-none border-border/40"
        />
      </div>



      <SectionCard
        title="Sesiones Activas"
        titleAction={
          <Button
            variant="default"
            size="sm"
            onClick={loadDevices}
            disabled={isLoadingDevices}
          >
            Actualizar
          </Button>
        }
        className="shrink-0"
        size="sm"
      >

        {isLoadingDevices ? (
          <div className="flex justify-center p-6 text-sm text-muted-foreground animate-pulse">Cargando sesiones...</div>
        ) : devices.length === 0 ? (
          <div className="p-8 bg-muted/10 rounded-xl border border-border/30 border-dashed">
            <EmptyState
              icon={<Smartphone className="w-8 h-8" />}
              message="No hay sesiones activas"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div key={device.device_id} className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-muted/10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-sm text-foreground truncate max-w-[120px]" title={device.device_id}>
                      {device.device_id.split('-')[0]}...
                    </span>
                  </div>
                  <button 
                    onClick={() => confirmRevokeDevice(device.device_id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                    title="Revocar Terminal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Autorizado por:</span>
                    <span className="text-foreground font-medium">{device.user_name}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Fecha:</span>
                    <span className="text-foreground font-medium">
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
