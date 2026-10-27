import { cookies } from 'next/headers'
import { APP_CONFIG } from '@/lib/config'
import { parseDuration } from '@/lib/utils'

const SESSION_NAME = APP_CONFIG.auth.sessionCookieName
const DEVICE_NAME = APP_CONFIG.auth.deviceCookieName

const SESSION_MAX_AGE = parseDuration(APP_CONFIG.auth.sessionMaxAge)
const DEVICE_MAX_AGE = parseDuration(APP_CONFIG.auth.deviceMaxAge)

// Cookies are always Secure. NODE_ENV is not a reliable production signal on
// Cloudflare Workers, and these cookies carry the session — they must never be
// sent over plaintext. Local development is served over HTTPS (or localhost,
// which browsers treat as a secure context).
const SECURE = true

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function setDeviceCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(DEVICE_NAME, token, {
    httpOnly: true,
    secure: SECURE,
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

/**
 * Removes any residual Supabase auth cookies (`sb-*`) left over from the
 * previous architecture, where the browser held a Supabase session. New logins
 * never create these, but deployed terminals may still carry a long-lived one.
 */
async function deleteSupabaseCookies(): Promise<void> {
  const store = await cookies()
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      store.delete(cookie.name)
    }
  }
}

/** Log out: clears the app session and any stray Supabase cookie. */
export async function clearSessionAndSupabase(): Promise<void> {
  await deleteSessionCookie()
  await deleteSupabaseCookies()
}

/** Full logout: clears app session, device authorization, and Supabase cookies. */
export async function clearAllAuthAndSupabase(): Promise<void> {
  await deleteSessionCookie()
  await deleteDeviceCookie()
  await deleteSupabaseCookies()
}
