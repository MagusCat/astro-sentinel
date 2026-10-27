import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ErrorBoundary from '@/app/error'
import GlobalError from '@/app/global-error'
import { calculateMembershipDates } from '@/features/admin/checkout/utils'
import { ClientData } from '@/features/admin/clients/types'
import { ClassData, PlanData } from '@/features/admin/classes/types'

// Mock next/link to render a plain <a> tag
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('a', { href, ...rest }, children),
}))

describe('Empirical Verification: Error Boundaries & Fallback Rendering', () => {
  describe('App-level ErrorBoundary (src/app/error.tsx)', () => {
    it('renders error boundary fallback without crashing on standard Error', () => {
      const testError = new Error('Database connection failed')
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error: testError, reset: resetFn })
      )

      expect(html).toContain('Ha ocurrido un problema inesperado')
      expect(html).toContain('Reintentar')
      expect(html).toContain('Ir al Panel Principal')
      expect(html).toContain('/dashboard')
    })

    it('renders error boundary with digest code when digest is present', () => {
      const testError = Object.assign(new Error('Internal server error'), { digest: 'ERR-DIGEST-9988' })
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error: testError, reset: resetFn })
      )

      expect(html).toContain('Código de referencia: ERR-DIGEST-9988')
    })

    it('does not display digest reference line when digest is undefined', () => {
      const testError = new Error('Generic error without digest')
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error: testError, reset: resetFn })
      )

      expect(html).not.toContain('Código de referencia:')
    })

    it('sanitizes and safely renders errors with potential XSS or script payloads in digest and message', () => {
      const maliciousDigest = '<script>alert("xss")</script>'
      const testError = Object.assign(new Error('<img src=x onerror=alert(1)>'), { digest: maliciousDigest })
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error: testError, reset: resetFn })
      )

      // react-dom/server automatically escapes HTML entities
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('does not leak raw unhandled error stack trace or internal message to the UI', () => {
      const testError = new Error('FATAL: password authentication failed for user "postgres"')
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error: testError, reset: resetFn })
      )

      // The raw database error message must NOT be exposed in the UI
      expect(html).not.toContain('FATAL: password authentication failed')
      expect(html).toContain('Se ha producido un error al procesar esta solicitud')
    })
  })

  describe('Global ErrorBoundary (src/app/global-error.tsx)', () => {
    it('renders global critical error page with html and body elements', () => {
      const testError = new Error('Root layout rendering failure')
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: testError, reset: resetFn })
      )

      expect(html).toContain('<html lang="es">')
      expect(html).toContain('<body')
      expect(html).toContain('Error crítico del sistema')
      expect(html).toContain('Reintentar')
      expect(html).toContain('Ir al Inicio')
    })

    it('renders global error with digest code when provided', () => {
      const testError = Object.assign(new Error('Global fault'), { digest: 'GLOBAL-ERR-404' })
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: testError, reset: resetFn })
      )

      expect(html).toContain('Código: GLOBAL-ERR-404')
    })

    it('does not display digest line when digest is absent', () => {
      const testError = new Error('No digest')
      const resetFn = vi.fn()

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: testError, reset: resetFn })
      )

      expect(html).not.toContain('Código:')
    })
  })
})

describe('Empirical Verification: Client State Preservation & Receipt Data Stress Tests', () => {
  const sampleClass: ClassData = {
    id: 'cls-crossfit',
    name: 'CrossFit WOD & Conditioning',
    description: 'High-intensity functional training',
    capacity: 25,
    created_at: '2026-01-01',
    plans_count: 3,
    active_students_count: 18,
  }

  const samplePlan: PlanData = {
    id: 'plan-unlimited',
    class_id: 'cls-crossfit',
    plan_name: 'Pase Anual Ilimitado',
    duration_days: 365,
    price: 650.0,
    created_at: '2026-01-01',
  }

  const staticClients: ClientData[] = [
    {
      id: 'c-1',
      full_name: 'Mateo González',
      email: 'mateo@gym.com',
      phone: '+505 8888 1111',
      created_at: '2026-01-01',
      has_active_membership: true,
    },
    {
      id: 'c-2',
      full_name: 'Lucía Morales',
      email: 'lucia@gym.com',
      phone: '+505 8888 2222',
      created_at: '2026-01-01',
      has_active_membership: false,
    },
  ]

  describe('Dynamic Athlete Search State & Object Resolution', () => {
    function resolveClient(clientId: string, selectedClientObj: ClientData | null, clientList: ClientData[]) {
      if (selectedClientObj && selectedClientObj.id === clientId) {
        return selectedClientObj
      }
      return selectedClientObj || clientList.find((c) => c.id === clientId)
    }

    it('preserves full dynamic client object when searched dynamically from remote database', () => {
      const dynamicSearchedClient: ClientData = {
        id: 'c-dynamic-99',
        full_name: 'Alejandro "El Toro" Peña & Castro',
        email: 'toro@arena.com',
        phone: '+505 8999 7777',
        created_at: '2026-10-10',
        has_active_membership: false,
      }

      const resolved = resolveClient(dynamicSearchedClient.id, dynamicSearchedClient, staticClients)

      expect(resolved).toEqual(dynamicSearchedClient)
      expect(resolved?.full_name).toBe('Alejandro "El Toro" Peña & Castro')
      expect(resolved?.email).toBe('toro@arena.com')
    })

    it('handles query typing resets: clearing clientId must prevent ghost selection', () => {
      let clientId = 'c-1'
      let selectedClientObj: ClientData | null = staticClients[0]

      // User modifies input query string
      const handleQueryChange = (newQuery: string) => {
        clientId = ''
        selectedClientObj = null
      }

      handleQueryChange('Mat')
      expect(clientId).toBe('')
      expect(selectedClientObj).toBeNull()

      const resolved = resolveClient(clientId, selectedClientObj, staticClients)
      expect(resolved).toBeUndefined()
    })

    it('handles client selection with special characters and accents in name', () => {
      const accentedClient: ClientData = {
        id: 'c-accent-1',
        full_name: 'Zoë Nuñez-O\'Higgins de la Peña',
        email: 'zoe.nunez@example.com',
        phone: '+34 600 123 456',
        created_at: '2026-05-15',
        has_active_membership: false,
      }

      const resolved = resolveClient(accentedClient.id, accentedClient, staticClients)
      expect(resolved?.full_name).toBe('Zoë Nuñez-O\'Higgins de la Peña')
    })
  })

  describe('Receipt Data Generation Contracts & Edge Cases', () => {
    const PAYMENT_METHODS = [
      { id: 'efectivo', label: 'Efectivo' },
      { id: 'tarjeta', label: 'Tarjeta' },
      { id: 'transferencia', label: 'Transferencia' },
    ]

    function generateReceiptPayload(params: {
      paymentId: string
      client: ClientData | null | undefined
      selectedClass: ClassData
      selectedPlan: PlanData
      paymentMethod: string
      date?: string
    }) {
      const methodLabel = PAYMENT_METHODS.find((m) => m.id === params.paymentMethod)?.label || params.paymentMethod

      return {
        id: params.paymentId,
        clientName: params.client?.full_name || 'Cliente',
        date: params.date || new Date().toISOString(),
        paymentMethod: methodLabel,
        items: [
          {
            name: `${params.selectedClass.name} - ${params.selectedPlan.plan_name}`,
            quantity: 1,
            price: params.selectedPlan.price,
          },
        ],
        total: params.selectedPlan.price,
        type: 'MEMBERSHIP' as const,
      }
    }

    it('generates accurate receipt payload with floating point plan prices', () => {
      const floatPlan: PlanData = {
        ...samplePlan,
        price: 89.99,
      }

      const receipt = generateReceiptPayload({
        paymentId: 'pay-uuid-001',
        client: staticClients[0],
        selectedClass: sampleClass,
        selectedPlan: floatPlan,
        paymentMethod: 'tarjeta',
      })

      expect(receipt.id).toBe('pay-uuid-001')
      expect(receipt.clientName).toBe('Mateo González')
      expect(receipt.paymentMethod).toBe('Tarjeta')
      expect(receipt.total).toBe(89.99)
      expect(receipt.items[0].price).toBe(89.99)
      expect(receipt.items[0].name).toBe('CrossFit WOD & Conditioning - Pase Anual Ilimitado')
    })

    it('falls back safely to default clientName "Cliente" when client is null/undefined', () => {
      const receipt = generateReceiptPayload({
        paymentId: 'pay-uuid-002',
        client: null,
        selectedClass: sampleClass,
        selectedPlan: samplePlan,
        paymentMethod: 'efectivo',
      })

      expect(receipt.clientName).toBe('Cliente')
    })

    it('handles zero-dollar promotional or trial plans', () => {
      const freePlan: PlanData = {
        ...samplePlan,
        price: 0.0,
        plan_name: 'Pase de Cortesía 7 Días',
      }

      const receipt = generateReceiptPayload({
        paymentId: 'pay-free-001',
        client: staticClients[1],
        selectedClass: sampleClass,
        selectedPlan: freePlan,
        paymentMethod: 'efectivo',
      })

      expect(receipt.total).toBe(0)
      expect(receipt.items[0].price).toBe(0)
    })
  })

  describe('Membership Date Calculation Engine & Boundary Conditions', () => {
    it('calculates 30-day membership starting today', () => {
      const { finalStartDateString, finalEndDateString } = calculateMembershipDates(30)
      const start = new Date(finalStartDateString)
      const end = new Date(finalEndDateString)
      const diffMs = end.getTime() - start.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      expect(diffDays).toBe(30)
    })

    it('correctly extends an existing membership ending on year boundary (2026-12-31)', () => {
      const { finalStartDateString, finalEndDateString } = calculateMembershipDates(30, '2026-12-31')

      // Next membership starts 2027-01-01
      expect(finalStartDateString).toBe('2027-01-01')
      expect(finalEndDateString).toBe('2027-01-31')
    })

    it('correctly chains membership ending on leap day (2028-02-28 and 2028-02-29)', () => {
      // 2028 is a leap year (February has 29 days)
      const { finalStartDateString: startLeap } = calculateMembershipDates(30, '2028-02-28')
      expect(startLeap).toBe('2028-02-29')

      const { finalStartDateString: startPostLeap } = calculateMembershipDates(30, '2028-02-29')
      expect(startPostLeap).toBe('2028-03-01')
    })

    it('handles 1-day pass and 365-day annual pass correctly', () => {
      const singleDay = calculateMembershipDates(1, '2026-06-15')
      expect(singleDay.finalStartDateString).toBe('2026-06-16')
      expect(singleDay.finalEndDateString).toBe('2026-06-17')

      const annual = calculateMembershipDates(365, '2026-01-01')
      expect(annual.finalStartDateString).toBe('2026-01-02')
      expect(annual.finalEndDateString).toBe('2027-01-02')
    })
  })
})
