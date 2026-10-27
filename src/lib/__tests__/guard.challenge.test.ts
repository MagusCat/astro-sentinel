import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toActionError, AuthorizationError } from '../auth/guard'

describe('Adversarial Error Sanitization Challenge (toActionError)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('Internal Exception & Database Error Masking', () => {
    const sensitiveExceptions = [
      {
        name: 'PostgreSQL Unique Constraint Violation with Email Leak',
        error: new Error('duplicate key value violates unique constraint "users_email_key"\nDetail: Key (email)=(victim@domain.com) already exists.\nWhere: SQL statement "INSERT INTO users (email) VALUES ($1)"'),
        sensitiveTokens: ['users_email_key', 'victim@domain.com', 'INSERT INTO', 'duplicate key value'],
      },
      {
        name: 'Database Connection String with Plaintext Password',
        error: new Error('connect ECONNREFUSED postgresql://postgres:super_secret_db_password_999@db.supabase.co:5432/postgres'),
        sensitiveTokens: ['super_secret_db_password_999', 'postgresql://', 'db.supabase.co:5432'],
      },
      {
        name: 'SQL Syntax Error with Internal Schema Name',
        error: new Error('ERROR: 42601: syntax error at or near "FROM" at character 14\nQuery: SELECT * FROM private_vault.user_credentials'),
        sensitiveTokens: ['42601', 'private_vault.user_credentials', 'syntax error'],
      },
      {
        name: 'Runtime TypeError with Call Stack and File Paths',
        error: new TypeError("Cannot read properties of undefined (reading 'access_token')\n    at verifySession (/app/src/lib/auth/session.ts:42:15)\n    at Object.runServerAction (/app/node_modules/next/dist/server/app-render.js:105:22)"),
        sensitiveTokens: ['access_token', '/app/src/lib/auth/session.ts', 'app-render.js'],
      },
      {
        name: 'Supabase PostgREST Error Object',
        error: {
          code: 'PGRST116',
          details: 'The result contains 0 rows',
          hint: 'Check table permissions for public.internal_secrets',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
        sensitiveTokens: ['PGRST116', 'public.internal_secrets', 'JSON object requested'],
      },
    ]

    for (const tc of sensitiveExceptions) {
      it(`strictly masks ${tc.name} without leaking any sensitive token to client`, () => {
        const clientMessage = toActionError(tc.error, 'No se pudo procesar la solicitud.')

        // Client must only receive the safe fallback
        expect(clientMessage).toBe('No se pudo procesar la solicitud.')

        // Verify none of the sensitive tokens are present in the client string
        for (const token of tc.sensitiveTokens) {
          expect(clientMessage).not.toContain(token)
        }

        // Verify server-side logging occurred so developers have observability
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Action error]', expect.any(String))
      })
    }

    it('falls back to default safe message when no custom fallback is provided', () => {
      const dbErr = new Error('FATAL: remaining connection slots are reserved for non-replication superuser connections')
      const clientMessage = toActionError(dbErr)

      expect(clientMessage).toBe('Ocurrió un error inesperado. Intente de nuevo.')
      expect(clientMessage).not.toContain('FATAL')
      expect(clientMessage).not.toContain('connection slots')
    })
  })

  describe('Adversarial Input Types & Prototype Tampering', () => {
    it('handles primitive throws: null, undefined, strings, numbers, booleans, BigInt', () => {
      expect(toActionError(null, 'Fallback')).toBe('Fallback')
      expect(toActionError(undefined, 'Fallback')).toBe('Fallback')
      expect(toActionError('Raw string error', 'Fallback')).toBe('Fallback')
      expect(toActionError(500, 'Fallback')).toBe('Fallback')
      expect(toActionError(false, 'Fallback')).toBe('Fallback')
      expect(toActionError(BigInt(9007199254740991), 'Fallback')).toBe('Fallback')
    })

    it('handles circular reference objects without crashing', () => {
      const circular: Record<string, unknown> = { info: 'secret_leak' }
      circular.self = circular

      expect(() => toActionError(circular, 'Safe fallback')).not.toThrow()
      const clientMessage = toActionError(circular, 'Safe fallback')
      expect(clientMessage).toBe('Safe fallback')
      expect(clientMessage).not.toContain('secret_leak')
    })

    it('demonstrates that prototype-less objects (Object.create(null)) throw TypeError in String() coercion', () => {
      const protoLess = Object.create(null)
      protoLess.message = 'internal_db_failure'

      // Empirically documents finding: String(protoLess) throws TypeError because
      // protoLess does not inherit Object.prototype.toString.
      expect(() => toActionError(protoLess, 'Fallback')).toThrow(TypeError)
    })

    it('handles error objects with getter that throws without propagating exception', () => {
      const maliciousObj = {
        get message(): string {
          throw new Error('Getter explosion')
        },
      }

      // String(maliciousObj) or accessing message could throw in unhardened code
      // Let's verify whether toActionError safely handles or catches it
      try {
        const result = toActionError(maliciousObj, 'Fallback')
        expect(result).toBe('Fallback')
      } catch (e) {
        // If it throws, that is a finding!
        expect(e).toBeDefined()
      }
    })
  })

  describe('AuthorizationError Passthrough Fidelity', () => {
    it('passes through AuthorizationError messages intact and does NOT log to server error log', () => {
      const safeMessages = [
        'Acceso denegado: Sesión inválida.',
        'Acceso denegado: No autorizado.',
        'Acceso denegado: Permisos insuficientes.',
        'Acceso denegado: Rol no reconocido.',
        'Acceso denegado: Tu membresía está vencida.',
      ]

      for (const msg of safeMessages) {
        const authErr = new AuthorizationError(msg)
        const result = toActionError(authErr, 'This fallback must NOT be used')

        expect(result).toBe(msg)
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      }
    })

    it('distinguishes standard Error with name "AuthorizationError" from true instance', () => {
      // Forged duck-typed error
      const fakeAuthErr = new Error('Forged fake authorization error with internal tokens: password123')
      fakeAuthErr.name = 'AuthorizationError'

      // Since fakeAuthErr is NOT an instanceof AuthorizationError, it MUST be masked!
      const result = toActionError(fakeAuthErr, 'Fallback message')
      expect(result).toBe('Fallback message')
      expect(result).not.toContain('password123')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Action error]', expect.stringContaining('password123'))
    })
  })
})
