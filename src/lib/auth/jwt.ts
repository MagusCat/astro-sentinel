/*
 * JWT Signing & Verification Module
 *
 * Security Notes:
 * - Never caches the secret key in module-level state (avoids cross-request leakage)
 * - Uses Web Crypto (available in Edge/Workers runtime)
 * - Minimum 32-char SESSION_SECRET enforced
 */

import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'
import type { AuthenticatedUser } from '@/features/auth/types'
import { APP_CONFIG, getSecret } from '@/lib/config'

async function getSecretKey(): Promise<Uint8Array> {
  const secret = getSecret('SESSION_SECRET')
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long.')
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return new Uint8Array(hash)
}

// ── Session Token 

export async function createSessionToken(
  user: AuthenticatedUser
): Promise<string> {
  const key = await getSecretKey()
  return new SignJWT({
    sub: user.id,
    full_name: user.full_name,
    role: user.role,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
  .setIssuer(APP_CONFIG.auth.jwtIssuer)
  .setAudience(APP_CONFIG.auth.jwtAudience)
  .setExpirationTime(APP_CONFIG.auth.sessionMaxAge)
  .sign(key)
}

export async function verifySessionToken(
  token: string
): Promise<AuthenticatedUser | null> {
  try {
    const key = await getSecretKey()
    const { payload } = await jwtVerify(token, key, {
      issuer: APP_CONFIG.auth.jwtIssuer,
      audience: APP_CONFIG.auth.jwtAudience
    })

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.full_name !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.username !== 'string'
    ) {
      return null
    }

    return {
      id: payload.sub,
      full_name: payload.full_name,
      role: payload.role,
      username: payload.username,
    }
  } catch (err) {
    // JWT verification failed (expired, tampered, etc.) — log structured for observability
    console.warn('[JWT] Session verification failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ── Device Authorization
export async function createDeviceToken(deviceId: string): Promise<string> {
  const key = await getSecretKey()
  return new SignJWT({ device_id: deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
  .setIssuer(APP_CONFIG.auth.jwtIssuer)
  .setAudience(APP_CONFIG.auth.jwtAudience)
  .setExpirationTime(APP_CONFIG.auth.deviceMaxAge)
  .sign(key)
}

export async function verifyDeviceToken(
  token: string
): Promise<string | null> {
  try {
    const key = await getSecretKey()
    const { payload } = await jwtVerify(token, key, {
      issuer: APP_CONFIG.auth.jwtIssuer,
      audience: APP_CONFIG.auth.jwtAudience
    })
    if (typeof payload.device_id !== 'string') return null
    return payload.device_id
  } catch (err) {
    console.warn('[JWT] Device verification failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

