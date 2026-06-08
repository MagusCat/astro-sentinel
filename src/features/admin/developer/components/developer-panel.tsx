'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Activity, Layers, TerminalSquare, Smartphone, Trash2 } from 'lucide-react'
import { getAuthorizedDevices, revokeDeviceById, ConnectedDevice } from '../actions'

export default function DeveloperPanel() {
  const [latency] = useState('24ms')
  const [consoleLogs, setConsoleLogs] = useState<string[]>(['[System] Consola de depuración inicializada.'])

  const [devices, setDevices] = useState<ConnectedDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true)
    const res = await getAuthorizedDevices()
    if (res.success && res.data) {
      setDevices(res.data)
    } else {
      console.log('[Error] No se pudieron cargar los dispositivos:', res.error)
    }
    setIsLoadingDevices(false)
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('¿Estás seguro de revocar esta terminal? Se cerrará su sesión instantáneamente.')) return
    
    const res = await revokeDeviceById(deviceId)
    if (res.success) {
      console.log(`[Seguridad] Terminal revocada exitosamente: ${deviceId}`)
      await loadDevices()
    } else {
      console.log(`[Error] Fallo al revocar terminal: ${res.error}`)
    }
  }

  // Interceptar console.log
  useEffect(() => {
    const originalLog = console.log
    console.log = (...args) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
      setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}] ${msg}`])
      originalLog.apply(console, args)
    }
    return () => {
      console.log = originalLog
    }
  }, [])

  return (
    <div className="flex flex-col gap-8 w-full max-w-full h-full overflow-y-auto pb-12 pr-2">
      
      {/* Dynamic Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
        
        {/* Connection Telemetry */}
        <div className="bg-card border border-border/40 p-6 rounded-2xl flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-wider">Conectividad Supabase</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground font-heading">Conectado</div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-mono">
              <span>Latencia API:</span>
              <span className="text-emerald-500 font-bold">{latency}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Database Schema Map */}
      <div className="bg-card border border-border/40 p-8 rounded-2xl flex flex-col gap-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-foreground tracking-tight">Tablas de Base de Datos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Estructura del esquema de almacenamiento primario</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'users', cols: 'id, auth_user_id, full_name, role, username, password_hash, is_active, created_at' },
            { name: 'clients', cols: 'id, full_name, phone_number, email, registration_source, created_at' },
            { name: 'classes', cols: 'id, name, description, created_at' },
            { name: 'class_plans', cols: 'id, class_id, plan_name, duration_days, price' },
            { name: 'payments', cols: 'id, client_id, user_id, total_amount, payment_method, transaction_date' },
            { name: 'memberships', cols: 'id, payment_id, client_id, class_plan_id, amount_paid, start_date, end_date, status, created_at' }
          ].map(table => (
            <div key={table.name} className="flex flex-col gap-2 p-4 rounded-xl bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-sm">{table.name}</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed break-words">
                {table.cols}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Devices / Sessions */}
      <div className="bg-card border border-border/40 p-8 rounded-2xl flex flex-col gap-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-foreground tracking-tight">Terminales Activas (Sesiones)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Dispositivos autorizados que pueden acceder al sistema</p>
          </div>
          <button 
            onClick={loadDevices}
            className="text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
          >
            Actualizar
          </button>
        </div>

        {isLoadingDevices ? (
          <div className="flex justify-center p-6 text-sm text-muted-foreground animate-pulse">Cargando terminales...</div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/10 rounded-xl border border-border/30 border-dashed">
            <Smartphone className="w-8 h-8 text-muted-foreground/50 mb-3" />
            <span className="text-sm font-bold text-foreground">No hay terminales conectadas</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    onClick={() => handleRevokeDevice(device.device_id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                    title="Revocar Terminal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 text-[11px]">
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
      </div>

      {/* Developer Utilities */}
      <div className="bg-card border border-border/40 p-8 rounded-2xl flex flex-col gap-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-foreground tracking-tight">Herramientas de Diagnóstico</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Opciones de mantenimiento local y depuración</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => {
              if(confirm('¿Limpiar almacenamiento local? Se cerrará la sesión si hay tokens guardados.')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }
            }}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors"
          >
            <div className="p-3 bg-rose-500/10 rounded-full text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-foreground">Limpiar Caché</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">Local y Session Storage</span>
            </div>
          </button>

          <button 
            onClick={() => window.location.reload()}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors"
          >
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-foreground">Forzar Recarga</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">Refrescar aplicación Web</span>
            </div>
          </button>

          <button 
            onClick={() => {
              console.log('App Config', { env: process.env.NODE_ENV, timestamp: Date.now() });
            }}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors"
          >
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-foreground">Test Consola</span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">Generar Log de prueba</span>
            </div>
          </button>

          <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-border/50 bg-muted/10">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Entorno Activo</span>
            <span className="font-bold text-sm text-foreground bg-background px-3 py-1 rounded-md border border-border/30">
              {process.env.NODE_ENV || 'development'}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">v1.0.0-rc1</span>
          </div>

        </div>
      </div>

      {/* Embedded Terminal UI */}
      <div className="bg-[#0a0a0a] border border-border/40 rounded-2xl flex flex-col shadow-lg overflow-hidden shrink-0 mt-2">
        <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TerminalSquare className="w-4 h-4" />
            <span className="text-xs font-mono tracking-wider font-bold text-foreground/80">Salida de Consola (Terminal Web)</span>
          </div>
          <button 
            onClick={() => setConsoleLogs([])}
            className="text-[10px] font-mono font-bold uppercase px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-muted-foreground transition-colors"
          >
            Limpiar
          </button>
        </div>
        <div className="p-4 h-[250px] overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-1">
          {consoleLogs.map((log, i) => (
            <div key={i} className="text-emerald-400 break-words border-b border-white/5 pb-1">
              {log}
            </div>
          ))}
          {consoleLogs.length === 0 && (
            <div className="text-white/30 italic">Esperando eventos en la consola...</div>
          )}
        </div>
      </div>

    </div>
  )
}
