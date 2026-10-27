import { getEnv } from './env'

export function getSecret(key: 'SESSION_SECRET' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = getEnv(key)
  if (!value) {
    throw new Error(`Missing required secret: ${key}. Authentication cannot proceed securely.`)
  }
  return value.trim()
}


