export type MembershipStatus = 'active' | 'expired' | 'frozen' | 'cancelled' | 'transferred'

export interface AuthConfig {
  jwtIssuer: string
  jwtAudience: string
  sessionCookieName: string
  deviceCookieName: string
  sessionMaxAge: string
  deviceMaxAge: string
  bcryptRounds: number
  enableLocalLogin: boolean
}

export interface CurrencyConfig {
  base: string
  baseLocale: string
  local: string
  localLocale: string
}

export interface BucketsConfig {
  content: string
  images: string
}

export interface KeysConfig {
  contentJson: string
}

export interface DashboardConfig {
  listLimit: number
  inactiveStatuses: MembershipStatus[]
}

export interface ImageUploadConfig {
  maxSizeMb: number
  maxDimension: number
  minDimension: number
}

export interface ModulesConfig {
  admin: boolean
  cms: boolean
  anyEnabled: boolean
}

export interface LocaleConfig {
  /** IANA zone of the academy. Must match the DB timezone (migration 20261027090000). */
  timeZone: string
}

export interface AppConfig {
  auth: AuthConfig
  currency: CurrencyConfig
  locale: LocaleConfig
  buckets: BucketsConfig
  keys: KeysConfig
  dashboard: DashboardConfig
  imageUpload: ImageUploadConfig
  modules: ModulesConfig
}

export interface SecretsConfig {
  sessionSecret: string
  supabaseServiceRoleKey: string
}

export interface ServicesConfig {
  supabaseUrl: string
  supabasePublishableKey: string
  deployHookUrl?: string
}
