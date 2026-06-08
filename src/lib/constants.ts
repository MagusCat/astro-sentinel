export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  FROZEN: 'frozen',
  CANCELLED: 'cancelled',
  TRANSFERRED: 'transferred'
} as const

export type MembershipStatus = typeof MEMBERSHIP_STATUS[keyof typeof MEMBERSHIP_STATUS]

export const APP_CONFIG = {
  BUCKETS: {
    CONTENT: 'site-content',
    IMAGES: 'site-images',
  },
  KEYS: {
    CONTENT_JSON: 'content.json',
  },
  DASHBOARD: {
    LIST_LIMIT: 15,
    INACTIVE_STATUSES: [
      MEMBERSHIP_STATUS.EXPIRED, 
      MEMBERSHIP_STATUS.FROZEN, 
      MEMBERSHIP_STATUS.CANCELLED
    ]
  },
  IMAGE_UPLOAD: {
    MAX_SIZE_MB: 15,
    MAX_DIMENSION: 1920,
    MIN_DIMENSION: 200
  }
}
