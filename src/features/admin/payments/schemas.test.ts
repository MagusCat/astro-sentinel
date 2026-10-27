import { describe, it, expect } from 'vitest'
import { createPaymentSchema } from './schemas'

describe('createPaymentSchema', () => {
  it('validates correct payment input successfully', () => {
    const valid = {
      client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      total_amount: 50.0,
      payment_method: 'efectivo',
    }
    const result = createPaymentSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects invalid client_id (not a uuid)', () => {
    const invalid = {
      client_id: 'non-uuid-client',
      total_amount: 50.0,
      payment_method: 'efectivo',
    }
    const result = createPaymentSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.client_id).toBeDefined()
    }
  })

  it('rejects zero or negative total_amount', () => {
    const zero = {
      client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      total_amount: 0,
      payment_method: 'tarjeta',
    }
    expect(createPaymentSchema.safeParse(zero).success).toBe(false)

    const negative = {
      client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      total_amount: -25,
      payment_method: 'tarjeta',
    }
    expect(createPaymentSchema.safeParse(negative).success).toBe(false)
  })

  it('rejects unsupported payment method', () => {
    const unsupported = {
      client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      total_amount: 100,
      payment_method: 'crypto',
    }
    const result = createPaymentSchema.safeParse(unsupported)
    expect(result.success).toBe(false)
  })
})
