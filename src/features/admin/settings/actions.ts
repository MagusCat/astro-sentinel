'use server'

import { revalidateTag } from 'next/cache'
import { requireRole, toActionError } from '@/lib/auth/guard'
import { APP_ROLE } from '@/lib/config/domain'
import { CURRENCY_CACHE_TAG } from '@/lib/currency'
import { CurrencyAdminData, CurrencyRow } from './types'
import {
  upsertCurrencySchema,
  setSecondaryCurrencySchema,
  setExchangeRateSchema,
  setBaseCurrencySchema,
} from './schemas'

export async function getCurrencyAdminData(): Promise<{
  success: boolean
  data?: CurrencyAdminData
  error?: string
}> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    // La vista ya resuelve la tasa vigente por moneda e incluye la base a 1 = 1.
    const { data: viewRows, error } = await supabase
      .from('vw_current_exchange_rates')
      .select('currency_code, name, symbol, locale, is_base, is_secondary, units_per_base, has_rate')
      .order('is_base', { ascending: false })
      .order('currency_code', { ascending: true })

    if (error) throw error

    const rows: CurrencyRow[] = (viewRows || []).map((r) => ({
      code: r.currency_code as string,
      name: r.name as string,
      symbol: (r.symbol as string) ?? null,
      locale: r.locale as string,
      is_base: Boolean(r.is_base),
      is_secondary: Boolean(r.is_secondary),
      is_active: true,
    }))

    const secondaryView = (viewRows || []).find((r) => r.is_secondary && r.has_rate)
    const unitsPerBase = Number(secondaryView?.units_per_base)
    const secondaryRate =
      Number.isFinite(unitsPerBase) && unitsPerBase > 0 ? unitsPerBase : null

    const [{ count: paymentsCount }, { count: membershipsCount }] = await Promise.all([
      supabase.from('payments').select('id', { count: 'exact', head: true }),
      supabase.from('memberships').select('id', { count: 'exact', head: true }),
    ])

    const hasHistory = (paymentsCount ?? 0) > 0 || (membershipsCount ?? 0) > 0

    return {
      success: true,
      data: {
        currencies: rows,
        secondaryRate,
        canChangeBase: !hasHistory,
        lockedReason: hasHistory
          ? `Hay ${paymentsCount ?? 0} pagos y ${membershipsCount ?? 0} membresías registrados. Cambiar la moneda base invalidaría el histórico.`
          : undefined,
      },
    }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al cargar la configuración de moneda.') }
  }
}

export async function upsertCurrency(input: {
  code: string
  name: string
  symbol?: string | null
  locale: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = upsertCurrencySchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message }
    }
    const { code, name, symbol, locale } = parsed.data

    const { error } = await supabase
      .from('currencies')
      .upsert({ code, name, symbol: symbol || null, locale }, { onConflict: 'code' })

    if (error) throw error

    revalidateTag(CURRENCY_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al guardar la moneda.') }
  }
}

export async function setSecondaryCurrency(
  code: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = setSecondaryCurrencySchema.safeParse({ code })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message }
    }

    const { error: clearError } = await supabase
      .from('currencies')
      .update({ is_secondary: false })
      .eq('is_secondary', true)
    if (clearError) throw clearError

    if (parsed.data.code) {
      const { error } = await supabase
        .from('currencies')
        .update({ is_secondary: true })
        .eq('code', parsed.data.code)
        .eq('is_base', false)
      if (error) throw error
    }

    revalidateTag(CURRENCY_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al definir la moneda secundaria.') }
  }
}

export async function setExchangeRate(input: {
  code: string
  unitsPerBase: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

    const parsed = setExchangeRateSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message }
    }
    const { code, unitsPerBase } = parsed.data

    // Se inserta una fila nueva (nunca UPDATE): el histórico de tasas importa.
    const { error } = await supabase.from('exchange_rates').insert({
      currency_code: code,
      rate_to_base: 1 / unitsPerBase,
      effective_from: new Date().toISOString(),
    })

    if (error) throw error

    revalidateTag(CURRENCY_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al actualizar la tasa de cambio.') }
  }
}

export async function setBaseCurrency(input: {
  code: string
  conversionRate: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireRole(APP_ROLE.MAINTAINER)

    const parsed = setBaseCurrencySchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message }
    }

    const { error } = await supabase.rpc('set_base_currency', {
      p_code: parsed.data.code,
      p_conversion_rate: parsed.data.conversionRate,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateTag(CURRENCY_CACHE_TAG)
    return { success: true }
  } catch (err) {
    return { success: false, error: toActionError(err, 'Error al cambiar la moneda base.') }
  }
}
