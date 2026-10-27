import { describe, expect, it } from 'vitest'
import { reminderMessage, whatsappLink } from './utils'

describe('reception reminders', () => {
  it('adds the Nicaragua country code to 8-digit numbers', () => {
    expect(whatsappLink('8888-1234', 'Hola')).toBe('https://wa.me/50588881234?text=Hola')
  })

  it('keeps numbers that already carry a country code and encodes the text', () => {
    expect(whatsappLink('+1 (555) 123-4567', 'a b')).toBe('https://wa.me/15551234567?text=a%20b')
  })

  it('words the message by days left', () => {
    const base = { clientName: 'Ana Pérez', className: 'Pole', endDate: '2026-10-30' }
    expect(reminderMessage({ ...base, daysLeft: 0 })).toContain('vence hoy')
    expect(reminderMessage({ ...base, daysLeft: 1 })).toContain('en 1 día (')
    expect(reminderMessage({ ...base, daysLeft: 3 })).toContain('en 3 días')
    expect(reminderMessage({ ...base, daysLeft: -2 })).toMatch(/^Hola Ana, tu plan de Pole venció/)
  })
})
