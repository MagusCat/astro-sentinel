'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyDeviceToken } from '@/lib/auth/session'
import { getDeviceToken } from '@/lib/cookies'
import { ConnectedDevice } from './types'
import { revokeDeviceSchema } from './schemas'

export async function getAuthorizedDevices(): Promise<{ success: boolean; data?: ConnectedDevice[]; currentDeviceId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    let currentDeviceId: string | undefined = undefined
    try {
      const token = await getDeviceToken()
      if (token) {
        const id = await verifyDeviceToken(token)
        if (id) currentDeviceId = id
      }
    } catch {
    }

    const { data, error } = await supabase
      .from('authorized_devices')
      .select('device_id, authorized_by, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: 'Error al obtener dispositivos autorizados.' }
    }

    const { data: usersData } = await supabase
      .from('users')
      .select('auth_user_id, full_name, username')

    const usersMap = new Map((usersData || []).map(u => [u.auth_user_id, u.full_name || u.username]))

    const devices = (data || []).map(d => ({
      device_id: d.device_id,
      created_at: d.created_at || new Date().toISOString(),
      authorized_by: d.authorized_by,
      user_name: usersMap.get(d.authorized_by) || 'Desconocido'
    }))

    return { success: true, data: devices, currentDeviceId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al consultar dispositivos: ${errorMsg}` }
  }
}

export async function revokeDeviceById(deviceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = revokeDeviceSchema.safeParse({ deviceId })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('authorized_devices')
      .delete()
      .eq('device_id', parsed.data.deviceId)

    if (error) {
      return { success: false, error: 'Error al revocar el dispositivo en la base de datos.' }
    }

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Error al revocar dispositivo: ${errorMsg}` }
  }
}
