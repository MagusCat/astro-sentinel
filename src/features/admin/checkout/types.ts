import { MembershipStatus } from '@/lib/config'

export interface ProcessCheckoutPayload {
  client_id: string
  class_plan_id: string
  class_id: string
  payment_method: string
  total_amount: number
  duration_days: number
}

export interface CheckMembershipResult {
  hasMembership: boolean
  membershipId?: string
  endDate?: string
  status?: MembershipStatus
  error?: string
}
