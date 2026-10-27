import { MembershipStatus } from '@/lib/config'

export interface ProcessCheckoutPayload {
  client_id: string
  class_plan_id: string
  payment_method: string
  /** Only managers; the RPC rejects it for other roles and caps it at the plan price. */
  discount?: number
}

export interface CheckMembershipResult {
  hasMembership: boolean
  membershipId?: string
  endDate?: string
  status?: MembershipStatus
  error?: string
}
