export interface ReminderRow {
  membershipId: string
  clientName: string
  phone: string | null
  className: string
  endDate: string
  /** Negative = already expired that many days ago. */
  daysLeft: number
}
