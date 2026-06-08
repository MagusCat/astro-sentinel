'use server'

import { createClient } from '@/lib/supabase/server'
import { HealthStatus } from './types'

export async function runHealthCheck(): Promise<HealthStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const serviceConfigured = !!(url && key && url !== 'https://your-project-id.supabase.co' && key !== 'your-anon-key-here')

  if (!serviceConfigured) {
    return {
      serviceConfigured: false,
      handshakeOk: false,
      connectionOk: false,
      message: 'Service keys are not configured in environment variables.',
      timestamp: new Date().toISOString()
    }
  }

  try {
    const supabase = await createClient()

    // 1. Heartbeat check verifying session connectivity
    const { error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      return {
        serviceConfigured,
        handshakeOk: false,
        connectionOk: false,
        message: `API Handshake failed: ${sessionError.message}`,
        timestamp: new Date().toISOString()
      }
    }

    // 2. Query the '_status' test table to count the number of rows
    const { count, error: statusError } = await supabase
      .from('_status')
      .select('*', { count: 'exact', head: true })

    const connectionOk = !statusError

    return {
      serviceConfigured,
      handshakeOk: true,
      connectionOk,
      message: connectionOk 
        ? `Database status verified. Found ${count ?? 0} active health status records.` 
        : `Database status check failed: ${statusError?.message || 'Unknown database catalog error'}`,
      timestamp: new Date().toISOString()
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      serviceConfigured,
      handshakeOk: false,
      connectionOk: false,
      message: `Database Service Exception: ${errorMsg}`,
      timestamp: new Date().toISOString()
    }
  }
}
