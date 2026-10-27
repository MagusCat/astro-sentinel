import type { AppConfig } from './types'

export const APP_CONFIG = {
  auth: {
    jwtIssuer: 'sentinel:auth',
    jwtAudience: 'sentinel:app',
    sessionCookieName: 'sentinel_session',
    deviceCookieName: 'sentinel_device_token',
    sessionMaxAge: '7d',
    deviceMaxAge: '30d',
    bcryptRounds: 12,
    enableLocalLogin: true,
  },
  currency: {
    base: 'USD',
    baseLocale: 'en-US',
    local: 'NIO',
    localLocale: 'es-NI',
  },
  locale: {
    timeZone: 'America/Managua',
  },
  buckets: {
    content: 'site-content',
    images: 'site-images',
  },
  keys: {
    contentJson: 'content.json',
  },
  dashboard: {
    listLimit: 15,
    inactiveStatuses: [
      'expired',
      'frozen',
      'cancelled',
    ] as const,
  },
  imageUpload: {
    maxSizeMb: 15,
    maxDimension: 1920,
    minDimension: 200,
  },
  modules: {
    admin: true,
    cms: true,
    anyEnabled: true,
  },
} satisfies AppConfig
