import { cookies } from 'next/headers'
import { APP_CONFIG, getEnv } from '@/lib/config'
import { parseDuration } from '@/lib/utils'

const SESSION_NAME = APP_CONFIG.auth.sessionCookieName
const DEVICE_NAME = APP_CONFIG.auth.deviceCookieName

const SESSION_MAX_AGE = parseDuration(APP_CONFIG.auth.sessionMaxAge)
const DEVICE_MAX_AGE = parseDuration(APP_CONFIG.auth.deviceMaxAge)

function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production'
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function setDeviceCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(DEVICE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: DEVICE_MAX_AGE,
    path: '/',
  })
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(SESSION_NAME)?.value
}

export async function getDeviceToken(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(DEVICE_NAME)?.value
}

export async function deleteSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_NAME)
}

export async function deleteDeviceCookie(): Promise<void> {
  const store = await cookies()
  store.delete(DEVICE_NAME)
}

export async function deleteAllAuthCookies(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_NAME)
  store.delete(DEVICE_NAME)
}
