import { APP_CONFIG } from '@/lib/config/app'

/**
 * Calendar dates are 'YYYY-MM-DD' strings in the academy's time zone.
 * The server (Workers) runs in UTC, so `toISOString().split('T')[0]` flips to
 * "tomorrow" every evening — never use it for "today".
 */
export function todayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_CONFIG.locale.timeZone }).format(now)
}

/** Local calendar date of an instant (e.g. a payment's transaction_date). */
export function toLocalDate(iso: string): string {
  return todayStr(new Date(iso))
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000)
}

/** 0 = domingo … 6 = sábado (same as Postgres extract(dow) and class_sessions.weekday). */
export function weekdayOf(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay()
}

/**
 * Half-open instant range [start, end) covering whole local days `from`..`to`,
 * for filtering timestamptz columns.
 * shortcut: fixed -06:00 offset (Nicaragua has no DST); derive from the zone if the academy moves.
 */
export function dayRangeISO(from: string, to: string): { start: string; end: string } {
  return { start: `${from}T00:00:00-06:00`, end: `${addDays(to, 1)}T00:00:00-06:00` }
}

/** Shows a 'YYYY-MM-DD' calendar date without the UTC-midnight off-by-one of `new Date(str)`. */
export function formatCalendarDate(dateStr: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('es-ES', { timeZone: 'UTC', ...options })
}
