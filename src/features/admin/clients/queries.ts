'use server'

import { createClient } from '@/lib/supabase/server'
import { ClientData, ClientMembershipView, ClientMembershipQueryRow, GroupedClientMemberships, ClientFilters } from './types'
import { MEMBERSHIP_STATUS } from '@/lib/constants'

export async function getClients(filters?: ClientFilters): Promise<{ data: ClientData[], count: number }> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('vw_client_status')
      .select('*', { count: 'exact' })

    if (filters?.search) {
      const searchTerm = `%${filters.search.trim()}%`
      query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone_number.ilike.${searchTerm}`)
    }

    if (filters?.sortBy) {
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit
      const to = from + filters.limit - 1
      query = query.range(from, to)
    }

    const { data, count, error } = await query

    if (error) throw error
    return { data: (data || []) as ClientData[], count: count || 0 }
  } catch (err) {
    console.error('Error fetching clients:', err)
    return { data: [], count: 0 }
  }
}

export async function searchClients(query: string): Promise<ClientData[]> {
  try {
    if (!query || query.trim().length < 2) return []
    
    const searchTerm = `%${query.trim()}%`
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('vw_client_status')
      .select('*')
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone_number.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return (data || []) as ClientData[]
  } catch (err) {
    console.error('Error searching clients:', err)
    return []
  }
}

export async function getClientPayments(clientId: string): Promise<{ data: { id: string; total_amount: number; payment_method: string; transaction_date: string }[], count: number }> {
  try {
    const supabase = await createClient()
    const { data, error, count } = await supabase
      .from('payments')
      .select('id, total_amount, payment_method, transaction_date', { count: 'exact' })
      .eq('client_id', clientId)
      .order('transaction_date', { ascending: false })
      .limit(5)

    if (error) throw error
    return { data: data || [], count: count || 0 }
  } catch (err) {
    console.error('Error fetching client payments:', err)
    return { data: [], count: 0 }
  }
}

export async function getClientMemberships(clientId: string): Promise<GroupedClientMemberships[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('vw_memberships_extended')
      .select('*')
      .eq('client_id', clientId)
      .in('status', [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.FROZEN])
      .order('start_date', { ascending: true })

    if (error) throw error
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawMemberships: ClientMembershipView[] = (data || []).map((m: any) => ({
      id: m.id,
      status: m.status,
      start_date: m.start_date,
      end_date: m.end_date,
      remaining_days: m.remaining_days,
      class_plan_id: m.class_plan_id,
      plan_name: m.plan_name || 'Desconocido',
      duration_days: m.duration_days || 0,
      class_id: m.class_id || '',
      class_name: m.class_name || 'Clase Desconocida',
      class_description: null
    }))

    const todayStr = new Date().toISOString().split('T')[0]
    const relevantMemberships = rawMemberships.filter(m => m.status !== MEMBERSHIP_STATUS.CANCELLED || m.end_date >= todayStr)
    
    const membershipsByClass = relevantMemberships.reduce((acc, mem) => {
      if (!acc[mem.class_id]) {
        acc[mem.class_id] = { class_name: mem.class_name, current: null, future: [] }
      }
      
      if (!acc[mem.class_id].current) {
        acc[mem.class_id].current = mem
      } else {
        acc[mem.class_id].future.push(mem)
      }
      return acc
    }, {} as Record<string, GroupedClientMemberships>)

    return Object.values(membershipsByClass)
  } catch (err) {
    console.error('Error fetching client memberships:', err)
    return []
  }
}
