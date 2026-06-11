import { MembershipStatus } from '@/lib/config'

export interface ClientData {
  id: string
  full_name: string
  phone_number: string | null
  email: string | null
  registration_source: string | null
  is_active: boolean
  created_at: string
  has_active_membership?: boolean
  current_membership_status?: string
  current_plan_name?: string
  current_class_name?: string
}

export interface ClientMembershipView {
  id: string
  status: MembershipStatus
  start_date: string
  end_date: string
  remaining_days: number
  frozen_days?: number
  class_plan_id: string
  plan_name: string
  duration_days: number
  class_id: string
  class_name: string
  class_description: string | null
}

export interface GroupedClientMemberships {
  class_name: string
  current: ClientMembershipView | null
  future: ClientMembershipView[]
}

export interface ClientMembershipQueryRow {
  id: string
  status: MembershipStatus
  start_date: string
  end_date: string
  remaining_days: number
  class_plan_id: string
  class_plans: {
    plan_name: string
    duration_days: number
    class_id: string
    classes: {
      name: string
      description: string | null
    } | {
      name: string
      description: string | null
    }[] | null
  } | {
    plan_name: string
    duration_days: number
    class_id: string
    classes: {
      name: string
      description: string | null
    } | {
      name: string
      description: string | null
    }[] | null
  }[] | null
}

export interface ClientFilters {
  page: number
  limit: number
  search?: string
  sortBy?: 'created_at' | 'full_name'
  sortOrder?: 'asc' | 'desc'
}
