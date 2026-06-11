import { MembershipStatus } from '@/lib/config'

export interface MembershipRecord {
  id: string
  payment_id: string | null
  client_id: string
  class_plan_id: string
  amount_paid: number
  start_date: string
  end_date: string
  status: MembershipStatus
  remaining_days: number
  frozen_days?: number
  created_at: string
}

export interface CheckMembershipResult {
  hasMembership: boolean
  membershipId?: string
  endDate?: string
  status?: MembershipRecord['status']
  error?: string
}

export interface MembershipsTableRow {
  id: string
  clientId: string
  clientName: string
  className: string
  planName: string
  startDate: string
  endDate: string
  status: MembershipRecord['status']
}

export interface MembershipsPanelData {
  metrics: {
    totalActive: number
    expiringSoon: number
    frozen: number
  }
  classOccupancy: { className: string; activeStudents: number }[]
  membershipsList: MembershipsTableRow[]
}

export interface MembershipQueryRow {
  id: string
  client_id: string
  status: MembershipRecord['status']
  start_date: string
  end_date: string
  clients: { full_name: string } | { full_name: string }[] | null
  class_plans: {
    plan_name: string
    classes: { name: string } | { name: string }[] | null
  } | {
    plan_name: string
    classes: { name: string } | { name: string }[] | null
  }[] | null
}

export interface OccupancyQueryRow {
  class_name: string
  active_students: number
}

