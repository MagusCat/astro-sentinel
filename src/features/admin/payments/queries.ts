'use server'

import { requireRole } from '@/lib/auth/guard'
import { PaymentFilters, PaymentsResponse } from './types'
import { dayRangeISO } from '@/lib/dates'

/** Strips PostgREST filter metacharacters from a user-supplied search term. */
function sanitizeSearchTerm(raw: string): string {
  return raw.trim().replace(/[,"()*]/g, '')
}

export async function getPayments(filters?: PaymentFilters): Promise<PaymentsResponse> {
  try {
    const { supabase } = await requireRole()

    let query = supabase
      .from('payments')
      .select('*, clients(full_name, email), users!payments_processed_by_fkey(full_name, role)', { count: 'exact' })

    if (filters) {
      if (filters.searchTerm) {
        const term = sanitizeSearchTerm(filters.searchTerm)
        query = query.or(`clients.full_name.ilike."%${term}%",clients.email.ilike."%${term}%"`)
      }
      if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
      // Local (academy) days, not UTC: an evening payment belongs to the day it was made.
      if (filters.startDate) query = query.gte('transaction_date', dayRangeISO(filters.startDate, filters.startDate).start)
      if (filters.endDate) query = query.lt('transaction_date', dayRangeISO(filters.endDate, filters.endDate).end)

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

    const formattedData = (data || []).map((p: {
      id: string
      total_amount: number
      payment_method: string
      transaction_date: string
      category: string | null
      metadata: unknown
      discount_amount: number | string | null
      voided_at: string | null
      void_reason: string | null
      clients?: { full_name: string | null, email: string | null } | null
      users?: { full_name: string | null, role: string | null } | null
    }) => ({
      id: p.id,
      total_amount: Number(p.total_amount),
      payment_method: p.payment_method,
      transaction_date: p.transaction_date,
      client_name: p.clients?.full_name || 'Anónimo',
      user_name: p.users?.full_name || 'Sistema',
      user_role: p.users?.role || 'operator',
      category: p.category || undefined,
      metadata: p.metadata as Record<string, unknown> | unknown[] | null | undefined,
      discount_amount: Number(p.discount_amount ?? 0),
      voided_at: p.voided_at,
      void_reason: p.void_reason,
    }))

    return { data: formattedData, count: count || 0 }
  } catch (err) {
    console.error('Error fetching payments:', err instanceof Error ? err.message : String(err))
    return { data: [], count: 0 }
  }
}
