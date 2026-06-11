export const MEMBERSHIP_FIELDS = 'id, payment_id, client_id, class_plan_id, amount_paid, start_date, end_date, status, remaining_days, frozen_days, created_at'
export const MS_PER_DAY = 1000 * 60 * 60 * 24

export function calcRemainingDays(endDateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(endDateStr)
  endDate.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / MS_PER_DAY))
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}
