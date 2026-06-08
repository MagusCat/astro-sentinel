'use server'

import { createClient } from '@/lib/supabase/server'
import { PaymentFilters, PaymentsResponse, PaymentWithJoins } from './types'

export async function getPayments(filters?: PaymentFilters): Promise<PaymentsResponse> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('vw_payments_extended')
      .select('*', { count: 'exact' })

    if (filters) {
      if (filters.searchTerm) {
        query = query.or(`client_name.ilike.%${filters.searchTerm}%,client_email.ilike.%${filters.searchTerm}%`)
      }
      if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
      if (filters.startDate) query = query.gte('transaction_date', `${filters.startDate}T00:00:00`)
      if (filters.endDate) query = query.lte('transaction_date', `${filters.endDate}T23:59:59`)

      const sortColumn = filters.sortBy || 'transaction_date'
      const ascending = filters.sortOrder === 'asc'
      query = query.order(sortColumn, { ascending })

      const { page, limit } = filters
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    } else {
      query = query.order('transaction_date', { ascending: false }).range(0, 9)
    }

    const { data, error, count } = await query

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedData = (data || []).map((p: any) => ({
      id: p.id,
      total_amount: Number(p.total_amount),
      payment_method: p.payment_method,
      transaction_date: p.transaction_date,
      client_name: p.client_name || 'Anónimo',
      user_name: p.user_name || 'Sistema',
      user_role: p.user_role || 'operator'
    }))

    return { data: formattedData, count: count || 0 }
  } catch (err) {
    console.error('Error fetching payments:', err)
    return { data: [], count: 0 }
  }
}
