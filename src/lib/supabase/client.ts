import { createBrowserClient } from '@supabase/ssr'
import { getServiceConfig } from '@/lib/config'

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = getServiceConfig()
  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey
  )
}
