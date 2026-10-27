import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSidebarNav } from '../hooks/use-sidebar-nav'
import { Roles, APP_ROLE } from '@/lib/config/domain'
import { getAuthorizedDevices, revokeDeviceById } from '@/features/admin/developer/actions'
import { AuthorizationError } from '@/lib/auth/guard'

const mockPush = vi.fn()
let currentSearchParams = new URLSearchParams()
let currentPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => currentPathname,
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useEffect: (fn: () => void) => {
      fn()
    },
  }
})

const mockNavStore = {
  isNavigating: false,
  transitioningTabId: null as string | null,
  setIsNavigating: vi.fn((isNavigating: boolean, tabId: string | null = null) => {
    mockNavStore.isNavigating = isNavigating
    mockNavStore.transitioningTabId = isNavigating ? tabId : null
  }),
}

vi.mock('@/store/navigation-store', () => ({
  useNavigationStore: () => mockNavStore,
}))

const mockRequireRole = vi.fn()
vi.mock('@/lib/auth/guard', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/guard')>('@/lib/auth/guard')
  return {
    ...actual,
    requireRole: (...roles: string[]) => mockRequireRole(...roles),
  }
})

describe('Adversarial Role Navigation & Developer Access Isolation Challenge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearchParams = new URLSearchParams()
    currentPathname = '/dashboard'
    mockNavStore.isNavigating = false
    mockNavStore.transitioningTabId = null
  })

  describe('Role-based Admin Navigation Policy (navigateToAdmin)', () => {
    it('strictly routes ADMIN role to overview and NEVER to developer tab', () => {
      const { navigateToAdmin } = useSidebarNav(APP_ROLE.ADMIN)

      navigateToAdmin(APP_ROLE.ADMIN)

      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=overview')
      expect(mockPush).not.toHaveBeenCalledWith('/dashboard?tab=developer')
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('developer'))
      expect(mockNavStore.transitioningTabId).toBe('overview')
    })

    it('strictly routes MAINTAINER role to developer tab', () => {
      const { navigateToAdmin } = useSidebarNav(APP_ROLE.MAINTAINER)

      navigateToAdmin(APP_ROLE.MAINTAINER)

      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=developer')
      expect(mockNavStore.transitioningTabId).toBe('developer')
    })

    it('blocks RECEPTION role from initiating any admin navigation', () => {
      const { navigateToAdmin } = useSidebarNav(APP_ROLE.RECEPTION)

      navigateToAdmin(APP_ROLE.RECEPTION)

      expect(mockPush).not.toHaveBeenCalled()
      expect(mockNavStore.isNavigating).toBe(false)
      expect(mockNavStore.transitioningTabId).toBeNull()
    })

    it.each([
      'developer',
      'root',
      'ADMIN',
      'admin ',
      'MAINTAINER',
      'superadmin',
      'system',
      'null',
      '',
      '__proto__',
      'constructor',
    ])('rejects hostile or forged role %s from navigating to developer or admin tabs', (role) => {
      vi.clearAllMocks()
      const { navigateToAdmin } = useSidebarNav(role)
      navigateToAdmin(role)

      expect(mockPush).not.toHaveBeenCalledWith('/dashboard?tab=developer')
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('developer'))
    })
  })

  describe('Domain Role Matrix Access Verification (Roles.canAccessDeveloper)', () => {
    it('guarantees ONLY maintainer can access developer features across all known & unknown roles', () => {
      expect(Roles.canAccessDeveloper(APP_ROLE.MAINTAINER)).toBe(true)

      const nonMaintainers = [
        APP_ROLE.ADMIN,
        APP_ROLE.RECEPTION,
        'developer',
        'admin',
        'superadmin',
        'root',
        'system',
        '',
        ' ',
        'null',
        'undefined',
      ]

      for (const role of nonMaintainers) {
        expect(Roles.canAccessDeveloper(role)).toBe(false)
      }
    })
  })

  describe('Developer Server Actions Authorization Guardrails', () => {
    it('rejects getAuthorizedDevices when user is ADMIN with AuthorizationError', async () => {
      mockRequireRole.mockRejectedValue(new AuthorizationError('Acceso denegado: Permisos insuficientes.'))

      const result = await getAuthorizedDevices()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Acceso denegado: Permisos insuficientes.')
      expect(result.data).toBeUndefined()
    })

    it('rejects revokeDeviceById when user is ADMIN with AuthorizationError', async () => {
      mockRequireRole.mockRejectedValue(new AuthorizationError('Acceso denegado: Permisos insuficientes.'))

      const result = await revokeDeviceById('dev-device-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Acceso denegado: Permisos insuficientes.')
    })
  })
})
