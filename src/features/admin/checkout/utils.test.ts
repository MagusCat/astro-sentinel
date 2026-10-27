import { describe, it, expect } from 'vitest'
import { calculateMembershipDates } from './utils'

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

describe('calculateMembershipDates', () => {
  it('starts a fresh membership spanning exactly `duration` days', () => {
    const { finalStartDateString, finalEndDateString } = calculateMembershipDates(30)
    expect(dayDiff(finalStartDateString, finalEndDateString)).toBe(30)
  })

  it('chains onto an existing membership starting the day after it ends', () => {
    const { finalStartDateString, finalEndDateString } = calculateMembershipDates(30, '2026-01-10')
    expect(finalStartDateString).toBe('2026-01-11')
    expect(dayDiff(finalStartDateString, finalEndDateString)).toBe(30)
  })
})
