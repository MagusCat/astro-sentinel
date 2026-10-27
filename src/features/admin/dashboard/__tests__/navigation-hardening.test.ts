import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSidebarNav } from '../hooks/use-sidebar-nav'
import { VALID_TABS } from '../types'
import { Roles, APP_ROLE } from '@/lib/auth/roles'

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

describe('Navigation Hardening & Role Routing Policies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearchParams = new URLSearchParams()
    currentPathname = '/dashboard'
    mockNavStore.isNavigating = false
    mockNavStore.transitioningTabId = null
  })

  describe('useSidebarNav - navigateToAdmin routing isolation', () => {
    it('routes maintainer to developer tab and sets transition state', () => {
      const { navigateToAdmin } = useSidebarNav(APP_ROLE.MAINTAINER)

      navigateToAdmin(APP_ROLE.MAINTAINER)

      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=developer')
      expect(mockNavStore.setIsNavigating).toHaveBeenCalledWith(true, 'developer')
      expect(mockNavStore.isNavigating).toBe(true)
      expect(mockNavStore.transitioningTabId).toBe('developer')
    })

    it('routes admin to overview tab and NEVER to developer tab', () => {
      const { navigateToAdmin } = useSidebarNav(APP_ROLE.ADMIN)

      navigateToAdmin(APP_ROLE.ADMIN)

      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/dashboard?tab=overview')
      expect(mockPush).not.toHaveBeenCalledWith('/dashboard?tab=developer')
      expect(mockNavStore.setIsNavigating).toHaveBeenCalledWith(true, 'overview')
      expect(mockNavStore.isNavigating).toBe(true)
      expect(mockNavStore.transitioningTabId).toBe('overview')
    })

    it('denies reception from triggering admin/developer navigation', () => {
      const { navigateToAdmin } = useSidebarNav(APP_ROLE.RECEPTION)

      navigateToAdmin(APP_ROLE.RECEPTION)

      expect(mockPush).not.toHaveBeenCalled()
      expect(mockNavStore.setIsNavigating).not.toHaveBeenCalledWith(true, expect.anything())
      expect(mockNavStore.isNavigating).toBe(false)
      expect(mockNavStore.transitioningTabId).toBeNull()
    })

    it('denies unknown or arbitrary roles from navigating', () => {
      const { navigateToAdmin } = useSidebarNav('guest')

      navigateToAdmin('guest')
      navigateToAdmin('superadmin')
      navigateToAdmin('')

      expect(mockPush).not.toHaveBeenCalled()
      expect(mockNavStore.setIsNavigating).not.toHaveBeenCalledWith(true, expect.anything())
      expect(mockNavStore.isNavigating).toBe(false)
    })
  })

  describe('useSidebarNav - activeTab resolution and fallbacks', () => {
    it('defaults reception role to reception tab when no tab parameter is present', () => {
      currentSearchParams = new URLSearchParams()
      const { activeTab } = useSidebarNav(APP_ROLE.RECEPTION)
      expect(activeTab).toBe('reception')
    })

    it('defaults admin and maintainer to overview tab when no tab parameter is present', () => {
      currentSearchParams = new URLSearchParams()

      const adminNav = useSidebarNav(APP_ROLE.ADMIN)
      expect(adminNav.activeTab).toBe('overview')

      const maintainerNav = useSidebarNav(APP_ROLE.MAINTAINER)
      expect(maintainerNav.activeTab).toBe('overview')
    })

    it('defaults undefined role to overview tab when no tab parameter is present', () => {
      currentSearchParams = new URLSearchParams()
      const nav = useSidebarNav()
      expect(nav.activeTab).toBe('overview')
    })

    it.each(VALID_TABS)('honors valid tab parameter: %s regardless of role', (tab) => {
      currentSearchParams = new URLSearchParams({ tab })
      const nav = useSidebarNav(APP_ROLE.ADMIN)
      expect(nav.activeTab).toBe(tab)
    })

    it('rejects invalid or forged tab parameters and falls back safely', () => {
      currentSearchParams = new URLSearchParams({ tab: 'unauthorized_shell_injection' })

      const adminNav = useSidebarNav(APP_ROLE.ADMIN)
      expect(adminNav.activeTab).toBe('overview')

      const receptionNav = useSidebarNav(APP_ROLE.RECEPTION)
      expect(receptionNav.activeTab).toBe('reception')
    })
  })

  describe('useSidebarNav - transitioningTab state and role labels', () => {
    it('allows setting and clearing transitioning tab manually', () => {
      const { setTransitioningTab } = useSidebarNav(APP_ROLE.ADMIN)

      setTransitioningTab('payments')
      expect(mockNavStore.setIsNavigating).toHaveBeenCalledWith(true, 'payments')
      expect(mockNavStore.isNavigating).toBe(true)
      expect(mockNavStore.transitioningTabId).toBe('payments')

      setTransitioningTab(null)
      expect(mockNavStore.setIsNavigating).toHaveBeenCalledWith(false, null)
      expect(mockNavStore.isNavigating).toBe(false)
      expect(mockNavStore.transitioningTabId).toBeNull()
    })

    it('returns accurate localized role text via getRoleText', () => {
      const { getRoleText } = useSidebarNav()

      expect(getRoleText(APP_ROLE.MAINTAINER)).toBe('Mantenedor')
      expect(getRoleText(APP_ROLE.ADMIN)).toBe('Administrador')
      expect(getRoleText(APP_ROLE.RECEPTION)).toBe('Recepcionista')
      expect(getRoleText('custom')).toBe('Custom')
    })
  })

  describe('Roles Policy Contract Verification', () => {
    it('developer panel access is strictly reserved for maintainer', () => {
      expect(Roles.canAccessDeveloper(APP_ROLE.MAINTAINER)).toBe(true)
      expect(Roles.canAccessDeveloper(APP_ROLE.ADMIN)).toBe(false)
      expect(Roles.canAccessDeveloper(APP_ROLE.RECEPTION)).toBe(false)
      expect(Roles.canAccessDeveloper('root')).toBe(false)
      expect(Roles.canAccessDeveloper('')).toBe(false)
    })

    it('staff management allows maintainer and admin, disallows reception', () => {
      expect(Roles.canManageStaff(APP_ROLE.MAINTAINER)).toBe(true)
      expect(Roles.canManageStaff(APP_ROLE.ADMIN)).toBe(true)
      expect(Roles.canManageStaff(APP_ROLE.RECEPTION)).toBe(false)
      expect(Roles.canManageStaff('anonymous')).toBe(false)
    })

    it('CMS access allows maintainer and admin, disallows reception', () => {
      expect(Roles.canAccessCms(APP_ROLE.MAINTAINER)).toBe(true)
      expect(Roles.canAccessCms(APP_ROLE.ADMIN)).toBe(true)
      expect(Roles.canAccessCms(APP_ROLE.RECEPTION)).toBe(false)
    })

    it('dashboard access allows all 3 legitimate app roles and denies strangers', () => {
      expect(Roles.canAccessDashboard(APP_ROLE.MAINTAINER)).toBe(true)
      expect(Roles.canAccessDashboard(APP_ROLE.ADMIN)).toBe(true)
      expect(Roles.canAccessDashboard(APP_ROLE.RECEPTION)).toBe(true)
      expect(Roles.canAccessDashboard('intruder')).toBe(false)
    })

    it('reception predicate correctly isolates reception role', () => {
      expect(Roles.isReception(APP_ROLE.RECEPTION)).toBe(true)
      expect(Roles.isReception(APP_ROLE.ADMIN)).toBe(false)
      expect(Roles.isReception(APP_ROLE.MAINTAINER)).toBe(false)
      expect(Roles.isReception('guest')).toBe(false)
    })

    it('inventory, clients, and payment policies enforce proper authorizations', () => {
      expect(Roles.canManageInventory(APP_ROLE.MAINTAINER)).toBe(true)
      expect(Roles.canManageInventory(APP_ROLE.ADMIN)).toBe(true)
      expect(Roles.canManageInventory(APP_ROLE.RECEPTION)).toBe(false)

      expect(Roles.canManageClients(APP_ROLE.RECEPTION)).toBe(true)
      expect(Roles.canManageClients(APP_ROLE.ADMIN)).toBe(true)
      expect(Roles.canManageClients(APP_ROLE.MAINTAINER)).toBe(true)

      expect(Roles.canProcessPayments(APP_ROLE.RECEPTION)).toBe(true)
      expect(Roles.canProcessPayments(APP_ROLE.ADMIN)).toBe(true)
      expect(Roles.canProcessPayments(APP_ROLE.MAINTAINER)).toBe(true)
    })
  })
})
