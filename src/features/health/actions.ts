'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { HealthStatus } from './types'
import { getServiceConfig } from '@/lib/config'

/**
 * Liveness probe. Intentionally callable without a session (the PWA shell and
 * the login screen poll it), so it must never leak internal detail: it reports
 * only booleans and generic messages, never raw errors or row counts.
 */
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
    const supabase = createAdminClient()

    const { error: statusError } = await supabase
      .from('_status')
      .select('*', { count: 'exact', head: true })

    const connectionOk = !statusError
    if (statusError) {
      console.error('[Health] DB check failed:', statusError.message)
    }

    return {
      serviceConfigured,
      handshakeOk: true,
      connectionOk,
      message: connectionOk
        ? 'Estado de base de datos verificado.'
        : 'No se pudo verificar la base de datos.',
      timestamp: new Date().toISOString()
    }
  } catch (err) {
    console.error('[Health] Exception:', err instanceof Error ? err.message : String(err))
    return {
      serviceConfigured,
      handshakeOk: false,
      connectionOk: false,
      message: 'No se pudo contactar con el servicio de base de datos.',
      timestamp: new Date().toISOString()
    }
  }
}
