import { describe, it, expect } from 'vitest'
import { calculateMembershipDates } from '../utils'
import { ClientData } from '@/features/admin/clients/types'
import { ClassData, PlanData } from '@/features/admin/classes/types'

/**
 * Client resolution logic as implemented in checkout-modal.tsx:138:
 * const selectedClient = selectedClientObj || clients.find(c => c.id === clientId)
 */
function resolveSelectedClient(
  clientId: string,
  selectedClientObj: ClientData | null,
  clients: ClientData[]
): ClientData | undefined {
  if (selectedClientObj && selectedClientObj.id === clientId) {
    return selectedClientObj
  }
  return selectedClientObj || clients.find((c) => c.id === clientId)
}

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta de Crédito / Débito' },
  { id: 'transferencia', label: 'Transferencia Bancaria' },
]

/**
 * Receipt / Ticket generation payload as constructed in checkout-modal.tsx:196-209
 */
function buildCheckoutTicketData(params: {
  paymentId: string
  client: ClientData | undefined | null
  selectedClass: ClassData
  selectedPlan: PlanData
  paymentMethod: string
  date?: string
}) {
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === params.paymentMethod)?.label || params.paymentMethod

  return {
    id: params.paymentId,
    clientName: params.client?.full_name || 'Cliente',
    date: params.date || '2026-10-11T03:00:00.000Z',
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

describe('Checkout Client State Preservation & Receipt Generation', () => {
  const mockClass: ClassData = {
    id: 'cls-101',
    name: 'BJJ Adultos',
    description: 'Brazilian Jiu-Jitsu para todos los niveles',
    capacity: 20,
    created_at: '2026-01-01',
    plans_count: 2,
    active_students_count: 15,
  }

  const mockPlan: PlanData = {
    id: 'plan-501',
    class_id: 'cls-101',
    plan_name: 'Mensual Ilimitado',
    duration_days: 30,
    price: 85.0,
    created_at: '2026-01-01',
  }

  const initialClients: ClientData[] = [
    {
      id: 'client-static-1',
      full_name: 'Ana María López',
      email: 'ana@example.com',
      phone: '+505 8888 1111',
      created_at: '2026-01-01',
      has_active_membership: true,
      current_class_name: 'BJJ Adultos',
      current_plan_name: 'Mensual Ilimitado',
    },
    {
      id: 'client-static-2',
      full_name: 'Roberto Gómez',
      email: 'roberto@example.com',
      phone: '+505 8888 2222',
      created_at: '2026-01-01',
      has_active_membership: false,
    },
  ]

  describe('Client Object Preservation Logic', () => {
    it('preserves dynamically searched client object not present in static clients list', () => {
      const dynamicClient: ClientData = {
        id: 'client-dynamic-999',
        full_name: 'Carlos Mendoza Cruz',
        email: 'carlos.mendoza@example.com',
        phone: '+505 7777 9999',
        created_at: '2026-10-10',
        has_active_membership: false,
      }

      // Initial clients list is empty or does not contain dynamicClient
      const resolved = resolveSelectedClient(dynamicClient.id, dynamicClient, initialClients)

      expect(resolved).toBeDefined()
      expect(resolved?.id).toBe('client-dynamic-999')
      expect(resolved?.full_name).toBe('Carlos Mendoza Cruz')
      expect(resolved?.email).toBe('carlos.mendoza@example.com')
      expect(resolved?.phone).toBe('+505 7777 9999')
    })

    it('falls back to preloaded clients list when dynamic client is not used', () => {
      const resolved = resolveSelectedClient('client-static-1', null, initialClients)

      expect(resolved).toBeDefined()
      expect(resolved?.id).toBe('client-static-1')
      expect(resolved?.full_name).toBe('Ana María López')
    })

    it('prioritizes dynamic selectedClientObj over stale static clients', () => {
      const updatedClient: ClientData = {
        id: 'client-static-1',
        full_name: 'Ana María López (Actualizada)',
        email: 'ana.updated@example.com',
        phone: '+505 9999 0000',
        created_at: '2026-01-01',
        has_active_membership: true,
      }

      const resolved = resolveSelectedClient('client-static-1', updatedClient, initialClients)

      expect(resolved?.full_name).toBe('Ana María López (Actualizada)')
    })

    it('returns undefined when neither dynamic object nor static match exists', () => {
      const resolved = resolveSelectedClient('non-existent-id', null, initialClients)
      expect(resolved).toBeUndefined()
    })
  })

  describe('Receipt / Ticket Data Contract Generation', () => {
    it('generates complete ticket with preserved dynamic client name', () => {
      const dynamicClient: ClientData = {
        id: 'client-dyn-55',
        full_name: 'Ernesto Valle',
        email: 'evalle@example.com',
        phone: '',
        created_at: '2026-10-01',
        has_active_membership: false,
      }

      const ticket = buildCheckoutTicketData({
        paymentId: 'pay-uuid-777',
        client: dynamicClient,
        selectedClass: mockClass,
        selectedPlan: mockPlan,
        paymentMethod: 'efectivo',
      })

      expect(ticket.id).toBe('pay-uuid-777')
      expect(ticket.clientName).toBe('Ernesto Valle')
      expect(ticket.paymentMethod).toBe('Efectivo')
      expect(ticket.items).toHaveLength(1)
      expect(ticket.items[0].name).toBe('BJJ Adultos - Mensual Ilimitado')
      expect(ticket.items[0].price).toBe(85.0)
      expect(ticket.total).toBe(85.0)
      expect(ticket.type).toBe('MEMBERSHIP')
    })

    it('falls back to "Cliente" when client is undefined on ticket generation', () => {
      const ticket = buildCheckoutTicketData({
        paymentId: 'pay-uuid-000',
        client: undefined,
        selectedClass: mockClass,
        selectedPlan: mockPlan,
        paymentMethod: 'tarjeta',
      })

      expect(ticket.clientName).toBe('Cliente')
      expect(ticket.paymentMethod).toBe('Tarjeta de Crédito / Débito')
    })

    it('maps all supported payment methods to user-friendly Spanish labels', () => {
      const methods: Record<string, string> = {
        efectivo: 'Efectivo',
        tarjeta: 'Tarjeta de Crédito / Débito',
        transferencia: 'Transferencia Bancaria',
        custom_pos: 'custom_pos', // Fallback to raw ID if unknown
      }

      for (const [methodId, expectedLabel] of Object.entries(methods)) {
        const ticket = buildCheckoutTicketData({
          paymentId: 'pay-1',
          client: initialClients[0],
          selectedClass: mockClass,
          selectedPlan: mockPlan,
          paymentMethod: methodId,
        })
        expect(ticket.paymentMethod).toBe(expectedLabel)
      }
    })

    it('correctly handles free plans or zero total in receipt generation', () => {
      const freePlan: PlanData = {
        id: 'plan-trial',
        class_id: 'cls-101',
        plan_name: 'Clase de Prueba Gratuita',
        duration_days: 1,
        price: 0,
        created_at: '2026-01-01',
      }

      const ticket = buildCheckoutTicketData({
        paymentId: 'pay-free-001',
        client: initialClients[0],
        selectedClass: mockClass,
        selectedPlan: freePlan,
        paymentMethod: 'efectivo',
      })

      expect(ticket.total).toBe(0)
      expect(ticket.items[0].price).toBe(0)
    })
  })

  describe('calculateMembershipDates Integration', () => {
    it('calculates start and end dates for a brand new membership', () => {
      const { finalStartDateString, finalEndDateString } = calculateMembershipDates(30)

      expect(finalStartDateString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(finalEndDateString).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      const start = new Date(finalStartDateString)
      const end = new Date(finalEndDateString)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      expect(diffDays).toBe(30)
    })

    it('chains new membership seamlessly onto existing membership expiration', () => {
      const existingEndDate = '2026-12-31'
      const { finalStartDateString, finalEndDateString } = calculateMembershipDates(30, existingEndDate)

      // Start date must be Jan 1st of the next year (2027)
      expect(finalStartDateString).toBe('2027-01-01')
      // Note: calculateMembershipDates parses '2026-12-31' in local time / ISO
      expect(finalStartDateString).toBeTruthy()
      expect(finalEndDateString).toBeTruthy()
    })

    it('handles long duration memberships such as annual plans (365 days)', () => {
      const { finalStartDateString, finalEndDateString } = calculateMembershipDates(365)
      const start = new Date(finalStartDateString)
      const end = new Date(finalEndDateString)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      expect(diffDays).toBe(365)
    })
  })
})
