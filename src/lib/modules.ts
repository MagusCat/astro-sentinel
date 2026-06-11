import { APP_CONFIG } from '@/lib/config'

export const getActiveModules = () => ({
  adminEnabled: APP_CONFIG.modules.admin,
  cmsEnabled: APP_CONFIG.modules.cms,
  anyEnabled: APP_CONFIG.modules.anyEnabled,
  localLoginEnabled: APP_CONFIG.auth.enableLocalLogin,
})
