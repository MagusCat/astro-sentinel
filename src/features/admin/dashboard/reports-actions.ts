'use server'

import { requireRole, toActionError } from '@/lib/auth/guard'
import { toMinor, fromMinor } from '@/lib/format'
import { z } from 'zod'
import { dayRangeISO, toLocalDate } from '@/lib/dates'

export interface SalesReportData {
  daily: {
    date: string
    total: number
    membership_total: number
    product_total: number
    count: number
  }[]
  monthly: {
    month: string
    total: number
    membership_total: number
    product_total: number
    count: number
  }[]
  by_category: {
    category: string
    total: number
    count: number
  }[]
}

export async function getSalesReports(startDate: string, endDate: string): Promise<SalesReportData> {
  try {
    const { supabase } = await requireRole()

    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    if (!dateSchema.safeParse(startDate).success || !dateSchema.safeParse(endDate).success) {
      throw new Error('Invalid date parameters')
    }


    // 1. Get raw payments for the range. Whole local days: a bare 'YYYY-MM-DD' upper
    // bound would stop at midnight UTC and drop today's sales. Voided payments are not revenue.
    const { start, end } = dayRangeISO(startDate, endDate)
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount_base, category, transaction_date')
      .is('voided_at', null)
      .gte('transaction_date', start)
      .lt('transaction_date', end)

    if (error) throw error

    interface DailyStats {
      date: string
      total: number
      membership_total: number
      product_total: number
      count: number
    }

    interface MonthlyStats {
      month: string
      total: number
      membership_total: number
      product_total: number
      count: number
    }

    interface CategoryStats {
      total: number
      count: number
    }

    const dailyMap: Record<string, DailyStats> = {}
    const monthlyMap: Record<string, MonthlyStats> = {}
    const categoryMap: Record<string, CategoryStats> = {
      'MEMBERSHIP': { total: 0, count: 0 },
      'PRODUCT': { total: 0, count: 0 }
    }

    // Se acumula en unidades mínimas ENTERAS (escala 4) para evitar la deriva de
    // coma flotante al sumar muchos pagos; se convierte a mayores al final.
    payments?.forEach(p => {
      const date = toLocalDate(p.transaction_date)
      const month = date.substring(0, 7) // YYYY-MM
      const amount = toMinor(p.amount_base)
      const cat = p.category || 'MEMBERSHIP'

      // Daily
      if (!dailyMap[date]) dailyMap[date] = { date, total: 0, membership_total: 0, product_total: 0, count: 0 }
      dailyMap[date].total += amount
      if (cat === 'MEMBERSHIP') dailyMap[date].membership_total += amount
      else dailyMap[date].product_total += amount
      dailyMap[date].count += 1

      // Monthly
      if (!monthlyMap[month]) monthlyMap[month] = { month, total: 0, membership_total: 0, product_total: 0, count: 0 }
      monthlyMap[month].total += amount
      if (cat === 'MEMBERSHIP') monthlyMap[month].membership_total += amount
      else monthlyMap[month].product_total += amount
      monthlyMap[month].count += 1

      // Category
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 }
      categoryMap[cat].total += amount
      categoryMap[cat].count += 1
    })

    const toMajor = <T extends { total: number; membership_total?: number; product_total?: number }>(s: T): T => ({
      ...s,
      total: fromMinor(s.total),
      ...(s.membership_total !== undefined ? { membership_total: fromMinor(s.membership_total) } : {}),
      ...(s.product_total !== undefined ? { product_total: fromMinor(s.product_total) } : {}),
    })

    return {
      daily: Object.values(dailyMap).map(toMajor).sort((a, b) => b.date.localeCompare(a.date)),
      monthly: Object.values(monthlyMap).map(toMajor).sort((a, b) => b.month.localeCompare(a.month)),
      by_category: Object.entries(categoryMap).map(([category, stats]) => ({ category, ...toMajor(stats) }))
    }
  } catch (err) {
    console.error('Error generating sales report:', err)
    return { daily: [], monthly: [], by_category: [] }
  }
}

export interface CashBreakdown {
  label: string
  total: number
  count: number
}

export interface CashClosingData {
  net: number
  discounts: number
  count: number
  by_method: CashBreakdown[]
  by_staff: CashBreakdown[]
  by_category: CashBreakdown[]
  voided: { id: string; client_name: string; total: number; void_reason: string; voided_by: string; voided_at: string }[]
  discounted: { id: string; client_name: string; total: number; discount: number; user_name: string; transaction_date: string }[]
}

/** Cash register closing for a range of local days. All sums are computed in SQL (cash_closing RPC). */
export async function getCashClosing(from: string, to: string): Promise<{ success: boolean; data?: CashClosingData; error?: string }> {
  try {
    const { supabase } = await requireRole()
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.')
    if (!dateSchema.safeParse(from).success || !dateSchema.safeParse(to).success || from > to) {
      return { success: false, error: 'Rango de fechas inválido.' }
    }

    const { data, error } = await supabase.rpc('cash_closing', { p_from: from, p_to: to })
    if (error) throw error

    const raw = data as CashClosingData
    const num = (rows: CashBreakdown[]) => rows.map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) }))
    return {
      success: true,
      data: {
        ...raw,
        net: Number(raw.net),
        discounts: Number(raw.discounts),
        count: Number(raw.count),
        by_method: num(raw.by_method),
        by_staff: num(raw.by_staff),
        by_category: num(raw.by_category),
        voided: raw.voided.map((v) => ({ ...v, total: Number(v.total) })),
        discounted: raw.discounted.map((d) => ({ ...d, total: Number(d.total), discount: Number(d.discount) })),
      },
    }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al generar el cierre de caja.') }
  }
}
