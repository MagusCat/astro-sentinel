'use server'

import { createClient } from '@/lib/supabase/server'
import { HealthStatus } from './types'
import { getServiceConfig } from '@/lib/config'

export async function runHealthCheck(): Promise<HealthStatus> {
  let serviceConfigured = false
  try {
    const { supabaseUrl, supabasePublishableKey } = getServiceConfig()
    serviceConfigured = !!(
      supabaseUrl &&
      supabasePublishableKey &&
      supabaseUrl !== 'https://your-project-id.supabase.co' &&
      supabasePublishableKey !== 'your-anon-key-here'
    )
  } catch {
    serviceConfigured = false
  }

  if (!serviceConfigured) {
    return {
      serviceConfigured: false,
      handshakeOk: false,
      connectionOk: false,
      message: 'Las claves de servicio no están configuradas en las variables de entorno.',
      timestamp: new Date().toISOString()
    }
  }

  try {
    const supabase = await createClient()

    const { error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      return {
        serviceConfigured,
        handshakeOk: false,
        connectionOk: false,
        message: `Error de enlace API: ${sessionError.message}`,
        timestamp: new Date().toISOString()
      }
    }

    const { count, error: statusError } = await supabase
      .from('_status')
      .select('*', { count: 'exact', head: true })

    const connectionOk = !statusError

    return {
      serviceConfigured,
      handshakeOk: true,
      connectionOk,
      message: connectionOk
        ? `Estado de base de datos verificado. Se encontraron ${count ?? 0} registros de estado activos.`
        : `Error en verificación de base de datos: ${statusError?.message || 'Error desconocido del catálogo de base de datos'}`,
      timestamp: new Date().toISOString()
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      serviceConfigured,
      handshakeOk: false,
      connectionOk: false,
      message: `Excepción del servicio de base de datos: ${errorMsg}`,
      timestamp: new Date().toISOString()
    }
  }
}
