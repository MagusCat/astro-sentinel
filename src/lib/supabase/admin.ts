import { createClient } from '@supabase/supabase-js'
import { getServiceConfig, getSecret } from '@/lib/config'
import type { SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const { supabaseUrl, supabasePublishableKey } = getServiceConfig()
    
    let serviceKey: string
    try {
      serviceKey = getSecret('SUPABASE_SERVICE_ROLE_KEY')
    } catch {
      serviceKey = 'your_service_role_key'
    }

    const isPlaceholder = serviceKey === 'your_service_role_key'
    const keyToUse = isPlaceholder ? supabasePublishableKey : serviceKey

    if (isPlaceholder) {
      console.warn('[Supabase] Warning: SUPABASE_SERVICE_ROLE_KEY is not configured or is the default placeholder. Falling back to supabasePublishableKey.')
    }

    _adminClient = createClient(supabaseUrl, keyToUse, {
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    })
  }
  return _adminClient
}
