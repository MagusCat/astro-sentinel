export type MembershipStatus = 'active' | 'expired' | 'frozen' | 'cancelled' | 'transferred'

export interface AuthConfig {
  jwtIssuer: string
  jwtAudience: string
  sessionCookieName: string
  deviceCookieName: string
  sessionMaxAge: string
  deviceMaxAge: string
  bcryptRounds: number
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

export interface AppConfig {
  auth: AuthConfig
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
}
