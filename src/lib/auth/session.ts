/**
 * Auth Session — Facade/Barrel
 *
 * Re-exports from single-responsibility sub-modules.
 * All consumers import from '@/lib/auth/session' — no import paths change.
 *
 *   password.ts  — bcrypt hash & compare
 *   jwt.ts       — jose JWT sign & verify (session + device tokens)
 */

export { hashPassword, verifyPassword } from './password'
export {
  createSessionToken,
  verifySessionToken,
  createDeviceToken,
  verifyDeviceToken,
} from './jwt'
