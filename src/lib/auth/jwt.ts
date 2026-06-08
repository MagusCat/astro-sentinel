/*
 * JWT Signing & Verification Module
 */

import { SignJWT, jwtVerify } from 'jose'
import type { AuthenticatedUser } from '@/features/auth/types'

const ISSUER = process.env.JWT_ISSUER || 'sentinel:auth'
const AUDIENCE = process.env.JWT_AUDIENCE || 'sentinel:app'
const SESSION_MAX_AGE = process.env.SESSION_MAX_AGE || '7d'
const DEVICE_MAX_AGE = process.env.DEVICE_MAX_AGE || '365d'
let cachedKey: Uint8Array | null = null

async function getSecretKey() {
  if (cachedKey) return cachedKey
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET env variable is missing or shorter than 32 characters.')
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  cachedKey = new Uint8Array(hash)
  return cachedKey
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
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(SESSION_MAX_AGE)
    .sign(key)
}

export async function verifySessionToken(
  token: string
): Promise<AuthenticatedUser | null> {
  try {
    const key = await getSecretKey()
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE
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
  } catch {
    return null
  }
}

// ── Device Authorization
export async function createDeviceToken(deviceId: string): Promise<string> {
  const key = await getSecretKey()
  return new SignJWT({ device_id: deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(DEVICE_MAX_AGE)
    .sign(key)
}

export async function verifyDeviceToken(
  token: string
): Promise<string | null> {
  try {
    const key = await getSecretKey()
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE
    })
    if (typeof payload.device_id !== 'string') return null
    return payload.device_id
  } catch {
    return null
  }
}

