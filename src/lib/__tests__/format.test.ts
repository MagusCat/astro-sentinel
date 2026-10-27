import { describe, it, expect } from 'vitest'
import {
  sumMoney,
  lineTotal,
  toMinor,
  fromMinor,
  baseToLocal,
  localToBase,
  formatMoney,
} from '../format'

describe('money', () => {
  it('suma sin la deriva de coma flotante de JS', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
  })

  it('suma miles de importes de forma exacta', () => {
    const cents = Array.from({ length: 1000 }, () => 0.01)
    expect(sumMoney(cents)).toBe(10)
  })

  it('calcula precio x cantidad sin error', () => {
    expect(lineTotal(19.99, 3)).toBe(59.97)
    expect(lineTotal(0.1, 3)).toBe(0.3)
  })

  it('acepta strings', () => {
    expect(sumMoney(['19.99', '0.01'])).toBe(20)
  })

  it('round-trip a 4 decimales', () => {
    expect(fromMinor(toMinor(1234.5678))).toBe(1234.5678)
  })
})

describe('conversion', () => {
  it('convierte de base (USD) a moneda local', () => {
    expect(baseToLocal(10, 36.8)).toBe(368)
  })

  it('convierte de moneda local a base (USD)', () => {
    expect(localToBase(368, 36.8)).toBe(10)
  })

  it('es reversible en importes corrientes', () => {
    expect(localToBase(baseToLocal(25.5, 36.8), 36.8)).toBe(25.5)
  })

  it('no revienta con tasa 0', () => {
    expect(localToBase(100, 0)).toBe(0)
  })
})

describe('formatMoney', () => {
  it('formatea la moneda base', () => {
    expect(formatMoney(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
  })

  it('redondea a los decimales de la moneda', () => {
    expect(formatMoney(0.999, 'USD', 'en-US')).toBe('$1.00')
  })

  it('tolera valores invalidos', () => {
    expect(formatMoney(Number.NaN, 'USD', 'en-US')).toBe('$0.00')
  })
})
