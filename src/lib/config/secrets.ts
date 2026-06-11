import { getEnv } from './env'

export function getSecret(key: 'SESSION_SECRET' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = getEnv(key)
  if (!value) {
    throw new Error(`Secret "${key}" is not configured. Set it as an environment variable or Cloudflare secret.`)
  }
  return value
}
