'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { LocalUser } from './types'
import { LOGICAL_DELETE_MARKER } from './constants'
import { APP_ROLE } from '@/lib/auth/roles'

export async function getUsersList(): Promise<{ success: boolean; users?: LocalUser[]; error?: string }> {
  try {
    const { user: currentUser, supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    let query = supabase
      .from('users')
      .select('id, full_name, role, username, is_active, auth_user_id, created_at')
      .neq('password_hash', LOGICAL_DELETE_MARKER)
      .order('created_at', { ascending: false })

    // Admins never see maintainer accounts.
    if (currentUser.role === APP_ROLE.ADMIN) {
      query = query.neq('role', APP_ROLE.MAINTAINER)
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, users: data as LocalUser[] }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al obtener personal.') }
  }
}

export async function getUserMovements(userId: string) {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount,
        payment_method,
        transaction_date,
        category,
        clients (full_name)
      `)
      .eq('processed_by', userId)
      .order('transaction_date', { ascending: false })
      .limit(50)

    if (error) throw error

    interface UserPaymentRow {
      id: string
      total_amount: number
      payment_method: string
      transaction_date: string
      category: string
      clients: { full_name: string } | null
    }

    return {
      success: true,
      movements: (data as unknown as UserPaymentRow[] || []).map((p) => ({
        id: p.id,
        amount: Number(p.total_amount),
        method: p.payment_method,
        date: p.transaction_date,
        category: p.category,
        client_name: p.clients?.full_name || 'Anónimo'
      }))
    }
  } catch (err) {
    console.error(`Error fetching movements for user ${userId}:`, err instanceof Error ? err.message : String(err))
    return { success: false, movements: [] }
  }
}
