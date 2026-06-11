import { getEnv } from './env'
import type { ServicesConfig } from './types'

export function getServiceConfig(): ServicesConfig {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabasePublishableKey = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  const deployHookUrl = getEnv('DEPLOY_HOOK_URL')

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as environment variables.'
    )
  }

  return { supabaseUrl, supabasePublishableKey, deployHookUrl }
}
