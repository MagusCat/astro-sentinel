'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { verifyDeviceToken } from '@/lib/auth/session'

const DEVICE_COOKIE = process.env.DEVICE_COOKIE_NAME || 'sentinel_device_token'

export interface ConnectedDevice {
  device_id: string
  created_at: string
  authorized_by: string
  user_name?: string
}

export async function getAuthorizedDevices(): Promise<{ success: boolean; data?: ConnectedDevice[]; currentDeviceId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    let currentDeviceId: string | undefined = undefined
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get(DEVICE_COOKIE)
      if (token?.value) {
        const id = await verifyDeviceToken(token.value)
        if (id) currentDeviceId = id
      }
    } catch {
      // ignore
    }

    // Bring device data
    const { data, error } = await supabase
      .from('authorized_devices')
      .select('device_id, authorized_by, created_at')
      .order('created_at', { ascending: false })
      
    if (error) {
      return { success: false, error: error.message }
    }
    
    const { data: usersData } = await supabase
      .from('users')
      .select('auth_user_id, full_name, username')

    const usersMap = new Map((usersData || []).map(u => [u.auth_user_id, u.full_name || u.username]))

    const devices = (data || []).map(d => ({
      device_id: d.device_id,
      created_at: d.created_at || new Date().toISOString(), // Fallback if no created_at
      authorized_by: d.authorized_by,
      user_name: usersMap.get(d.authorized_by) || 'Desconocido'
    }))

    return { success: true, data: devices, currentDeviceId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}

export async function revokeDeviceById(deviceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('authorized_devices')
      .delete()
      .eq('device_id', deviceId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: errorMsg }
  }
}
