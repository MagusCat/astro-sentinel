export interface CurrencyRow {
  code: string
  name: string
  symbol: string | null
  locale: string
  is_base: boolean
  is_secondary: boolean
  is_active: boolean
}

export interface CurrencyAdminData {
  currencies: CurrencyRow[]
  secondaryRate: number | null
  canChangeBase: boolean
  lockedReason?: string
}
