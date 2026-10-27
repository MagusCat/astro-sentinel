import { NextResponse, type NextRequest } from 'next/server'

import { Roles } from '@/lib/auth/roles'
import { verifySessionToken } from '@/lib/auth/session'
import { APP_CONFIG } from '@/lib/config'

const { admin: adminEnabled, cms: cmsEnabled } = APP_CONFIG.modules

// ──
// Edge middleware: module availability, JWT session verification, and RBAC.
// The browser no longer holds a Supabase session, so there is nothing to
// refresh here — authorization is the app's own signed JWT, verified below.
// ──

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip middleware for static assets early (redundant with matcher but safer)
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // common for favicon.ico, images, etc.
  ) {
    return NextResponse.next()
  }

  // 2. Feature Flags
  if (!adminEnabled && pathname.startsWith('/dashboard')) {
    const destination = cmsEnabled ? '/editor' : '/login'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  if (!cmsEnabled && pathname.startsWith('/editor')) {
    const destination = adminEnabled ? '/dashboard' : '/login'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // 3. Authentication & Authorization
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/editor')

  const isLoginPage = pathname === '/login'

  if (!isProtectedRoute && !isLoginPage) {
    return NextResponse.next()
  }

  const hasSessionCookie = request.cookies.has(APP_CONFIG.auth.sessionCookieName)

  // On /login with a cookie present, let the Server Component decide (avoids
  // redirect loops if middleware verification and RSC verification disagree).
  if (isLoginPage) {
    return NextResponse.next()
  }

  // Protected route without any cookie → straight to login.
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Cookie present → it must verify. A forged/expired/invalid token is cleared.
  const token = request.cookies.get(APP_CONFIG.auth.sessionCookieName)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(APP_CONFIG.auth.sessionCookieName)
    return response
  }

  // RBAC: /editor requires admin or maintainer.
  if (pathname.startsWith('/editor') && !Roles.canAccessCms(session.role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // RBAC: /dashboard requires an authorized role.
  if (pathname.startsWith('/dashboard') && !Roles.canAccessDashboard(session.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(APP_CONFIG.auth.sessionCookieName)
    return response
  }

  return NextResponse.next()
}


export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
