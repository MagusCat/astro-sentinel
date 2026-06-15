import { getEnv } from './env'

export function getSecret(key: 'SESSION_SECRET' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = getEnv(key)
  if (!value) {
    // During local development or certain build steps, secrets might be missing.
    // We return an empty string instead of throwing to prevent application-wide crashes,
    // especially in Middleware where environment variables can be finicky.
    return ''
  }
  return value.trim()
}


