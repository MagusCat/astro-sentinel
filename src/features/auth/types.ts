import type { AppRole } from '@/lib/config'

export interface AuthenticatedUser {
  id: string
  full_name: string
  role: AppRole
  username: string
}
