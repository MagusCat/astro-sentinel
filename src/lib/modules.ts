import { APP_CONFIG } from '@/lib/config'

export const getActiveModules = () => {
  const adminEnabled = APP_CONFIG.modules.admin
  const cmsEnabled = APP_CONFIG.modules.cms
  return {
    adminEnabled,
    cmsEnabled,
    anyEnabled: adminEnabled || cmsEnabled,
    localLoginEnabled: APP_CONFIG.auth.enableLocalLogin,
  }
}
