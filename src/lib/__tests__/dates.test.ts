import { describe, expect, it } from 'vitest'
import { addDays, dayRangeISO, daysBetween, formatCalendarDate, toLocalDate, todayStr, weekdayOf } from '../dates'

describe('dates (academy time zone)', () => {
  it('uses Managua for "today", not UTC', () => {
    // 2026-03-02 03:00 UTC is still the evening of March 1st in Managua (UTC-6).
    expect(todayStr(new Date('2026-03-02T03:00:00Z'))).toBe('2026-03-01')
    expect(todayStr(new Date('2026-03-02T07:00:00Z'))).toBe('2026-03-02')
  })

  it('maps an evening payment to its local day', () => {
    expect(toLocalDate('2026-10-27T01:30:00Z')).toBe('2026-10-26')
  })

  it('does calendar math across months, years and leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-10-25', '2026-11-01')).toBe(7)
    expect(daysBetween('2026-10-25', '2026-10-20')).toBe(-5)
  })

  it('numbers weekdays like Postgres (0 = domingo)', () => {
    expect(weekdayOf('2026-10-25')).toBe(0)
    expect(weekdayOf('2026-10-31')).toBe(6)
  })

  it('builds an inclusive day range that keeps the whole last day', () => {
    expect(dayRangeISO('2026-10-01', '2026-10-27')).toEqual({
      start: '2026-10-01T00:00:00-06:00',
      end: '2026-10-28T00:00:00-06:00',
    })
  })

  it('formats a calendar date on its own day', () => {
    expect(formatCalendarDate('2026-10-01', { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('01/10/2026')
  })
})
