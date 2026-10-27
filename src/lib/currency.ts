import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_CONFIG } from '@/lib/config'

export const CURRENCY_CACHE_TAG = 'currency-settings'

export interface CurrencyInfo {
  code: string
  locale: string
}

export interface SecondaryCurrency extends CurrencyInfo {
  unitsPerBase: number
}

export interface CurrencySettings {
  base: CurrencyInfo
  secondary: SecondaryCurrency | null
}

const FALLBACK: CurrencySettings = {
  base: { code: APP_CONFIG.currency.base, locale: APP_CONFIG.currency.baseLocale },
  secondary: null,
}

interface CurrentRateRow {
  currency_code: string
  locale: string | null
  is_base: boolean
  is_secondary: boolean
  units_per_base: number | string | null
  has_rate: boolean
}

const fetchCurrencySettings = unstable_cache(
  async (): Promise<CurrencySettings> => {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('vw_current_exchange_rates')
      .select('currency_code, locale, is_base, is_secondary, units_per_base, has_rate')

    if (error || !data) return FALLBACK

    const rows = data as CurrentRateRow[]
    const baseRow = rows.find((r) => r.is_base)
    if (!baseRow) return FALLBACK

    const base: CurrencyInfo = {
      code: baseRow.currency_code,
      locale: baseRow.locale || APP_CONFIG.currency.baseLocale,
    }

    const secondaryRow = rows.find((r) => r.is_secondary && r.has_rate)
    if (!secondaryRow) return { base, secondary: null }

    const unitsPerBase = Number(secondaryRow.units_per_base)
    if (!Number.isFinite(unitsPerBase) || unitsPerBase <= 0) {
      return { base, secondary: null }
    }

    return {
      base,
      secondary: {
        code: secondaryRow.currency_code,
        locale: secondaryRow.locale || APP_CONFIG.currency.localLocale,
        unitsPerBase,
      },
    }
  },
  ['currency-settings'],
  { revalidate: 300, tags: [CURRENCY_CACHE_TAG] }
)

export async function getCurrencySettings(): Promise<CurrencySettings> {
  try {
    return await fetchCurrencySettings()
  } catch {
    return FALLBACK
  }
}
