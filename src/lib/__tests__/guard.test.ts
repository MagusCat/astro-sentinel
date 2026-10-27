import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toActionError, AuthorizationError, requireRole } from '../auth/guard'
import { APP_ROLE } from '@/lib/config/domain'

const mockGetCurrentUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockAdminClient = { from: mockFrom }

vi.mock('@/features/auth/actions', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

describe('Error Sanitization (toActionError) & Security Guard (requireRole)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('toActionError - Error Masking & Server Logging', () => {
    it('passes through AuthorizationError message verbatim without logging to console.error', () => {
      const authErr = new AuthorizationError('Acceso denegado: Permisos insuficientes.')
      const result = toActionError(authErr)

      expect(result).toBe('Acceso denegado: Permisos insuficientes.')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('passes through operator messages raised by RPCs with SQLSTATE SN400', () => {
      const rpcErr = { code: 'SN400', message: 'Cupo lleno (20 alumnos).', details: null, hint: null }

      expect(toActionError(rpcErr, 'fallback')).toBe('Cupo lleno (20 alumnos).')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('still masks other database errors even if they carry a message', () => {
      const rpcErr = { code: '23505', message: 'duplicate key value violates unique constraint "products_sku_key"' }

      expect(toActionError(rpcErr, 'fallback')).toBe('fallback')
    })

    it('passes through default AuthorizationError message', () => {
      const authErr = new AuthorizationError()
      const result = toActionError(authErr)

      expect(result).toBe('Acceso denegado: No autorizado.')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('masks standard Error instances with default generic message and logs raw details server-side', () => {
      const rawError = new Error('FATAL: password authentication failed for user "postgres"')
      const result = toActionError(rawError)

      expect(result).toBe('Ocurrió un error inesperado. Intente de nuevo.')
      expect(result).not.toContain('FATAL')
      expect(result).not.toContain('postgres')
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Action error]',
        'FATAL: password authentication failed for user "postgres"'
      )
    })

    it('masks standard Error instances with custom fallback message when provided', () => {
      const rawError = new Error('Connection timeout on pool port 5432')
      const result = toActionError(rawError, 'Error al procesar el pago. Intente más tarde.')

      expect(result).toBe('Error al procesar el pago. Intente más tarde.')
      expect(result).not.toContain('5432')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Action error]',
        'Connection timeout on pool port 5432'
      )
    })

    it('masks non-Error thrown objects (strings, dicts, null) safely and logs String representation', () => {
      const stringResult = toActionError('Network socket destroyed', 'Fallback string')
      expect(stringResult).toBe('Fallback string')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Action error]', 'Network socket destroyed')

      const objectResult = toActionError({ code: 'PGRST301', hint: 'Foreign key violation' }, 'Fallback object')
      expect(objectResult).toBe('Fallback object')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Action error]', '[object Object]')

      const nullResult = toActionError(null)
      expect(nullResult).toBe('Ocurrió un error inesperado. Intente de nuevo.')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Action error]', 'null')

      const undefinedResult = toActionError(undefined)
      expect(undefinedResult).toBe('Ocurrió un error inesperado. Intente de nuevo.')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Action error]', 'undefined')
    })
  })

  describe('AuthorizationError Class Contract', () => {
    it('sets proper error name, message, and prototypes', () => {
      const err = new AuthorizationError('Custom test denial')
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(AuthorizationError)
      expect(err.name).toBe('AuthorizationError')
      expect(err.message).toBe('Custom test denial')
    })
  })

  describe('requireRole - Central Authorization & Account Re-validation', () => {
    it('throws when current user claim is missing / null (unauthenticated)', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      await expect(requireRole(APP_ROLE.ADMIN)).rejects.toThrow(
        new AuthorizationError('Acceso denegado: Sesión inválida.')
      )
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('throws when database verification fails with an error', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: 'admin' })
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database connection dropped' },
      })

      await expect(requireRole(APP_ROLE.ADMIN)).rejects.toThrow(
        new AuthorizationError('Acceso denegado: No se pudo verificar la sesión.')
      )
    })

    it('throws when user record is not found in database', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: 'admin' })
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      await expect(requireRole(APP_ROLE.ADMIN)).rejects.toThrow(
        new AuthorizationError('Acceso denegado: Sesión inválida.')
      )
    })

    it('throws when user account has been deactivated (is_active: false)', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: 'admin' })
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'u1', full_name: 'Former Staff', role: 'admin', is_active: false },
        error: null,
      })

      await expect(requireRole(APP_ROLE.ADMIN)).rejects.toThrow(
        new AuthorizationError('Acceso denegado: Sesión inválida.')
      )
    })

    it('throws when user role stored in database is unrecognized', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: 'intruder' })
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'u1', full_name: 'Intruder', role: 'intruder', is_active: true },
        error: null,
      })

      await expect(requireRole(APP_ROLE.ADMIN)).rejects.toThrow(
        new AuthorizationError('Acceso denegado: Rol no reconocido.')
      )
    })

    it('throws when active user lacks required role permissions', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: APP_ROLE.RECEPTION })
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'u1', full_name: 'Receptionist User', role: APP_ROLE.RECEPTION, is_active: true },
        error: null,
      })

      await expect(requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)).rejects.toThrow(
        new AuthorizationError('Acceso denegado: Permisos insuficientes.')
      )
    })

    it('resolves authenticated user and admin supabase client when role matches', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: APP_ROLE.ADMIN })
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'u1',
          full_name: 'Admin User',
          role: APP_ROLE.ADMIN,
          username: 'admin_test',
          is_active: true,
        },
        error: null,
      })

      const result = await requireRole(APP_ROLE.ADMIN, APP_ROLE.MAINTAINER)

      expect(result.user).toEqual({
        id: 'u1',
        full_name: 'Admin User',
        role: APP_ROLE.ADMIN,
        username: 'admin_test',
      })
      expect(result.supabase).toBe(mockAdminClient)
    })

    it('resolves for maintainer role when maintainer is required', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'm1', role: APP_ROLE.MAINTAINER })
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'm1',
          full_name: 'Maintainer User',
          role: APP_ROLE.MAINTAINER,
          username: 'maintainer_test',
          is_active: true,
        },
        error: null,
      })

      const result = await requireRole(APP_ROLE.MAINTAINER)
      expect(result.user.role).toBe(APP_ROLE.MAINTAINER)
    })

    it('allows any active recognized role when no specific allowed roles are passed', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'r1', role: APP_ROLE.RECEPTION })
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'r1',
          full_name: 'Reception User',
          role: APP_ROLE.RECEPTION,
          username: 'reception_test',
          is_active: true,
        },
        error: null,
      })

      const result = await requireRole() // Empty allowed list
      expect(result.user.role).toBe(APP_ROLE.RECEPTION)
    })
  })
})
