export function calculateMembershipDates(
  duration_days: number,
  existingEndDate?: string
): { finalStartDateString: string; finalEndDateString: string } {
  let finalStartDateString: string
  let finalEndDateString: string

  if (existingEndDate) {
    const nextDay = new Date(existingEndDate)
    nextDay.setDate(nextDay.getDate() + 1)
    finalStartDateString = nextDay.toISOString().split('T')[0]
    const endDate = new Date(finalStartDateString)
    endDate.setDate(endDate.getDate() + duration_days)
    finalEndDateString = endDate.toISOString().split('T')[0]
  } else {
    const today = new Date()
    finalStartDateString = today.toISOString().split('T')[0]
    today.setDate(today.getDate() + duration_days)
    finalEndDateString = today.toISOString().split('T')[0]
  }

  return { finalStartDateString, finalEndDateString }
}
