import type { ReminderRow } from './types'

// Nicaraguan mobile numbers have 8 digits; prefix the country code when it is missing.
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 8 ? `505${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}

export function reminderMessage(r: Pick<ReminderRow, 'clientName' | 'className' | 'endDate' | 'daysLeft'>): string {
  const first = r.clientName.trim().split(/\s+/)[0]
  if (r.daysLeft < 0) {
    return `Hola ${first}, tu plan de ${r.className} venció el ${r.endDate}. ¡Te extrañamos! Renueva cuando gustes para seguir entrenando.`
  }
  const when = r.daysLeft === 0 ? 'hoy' : `en ${r.daysLeft} día${r.daysLeft === 1 ? '' : 's'}`
  return `Hola ${first}, te recordamos que tu plan de ${r.className} vence ${when} (${r.endDate}). ¡Te esperamos para renovarlo!`
}
