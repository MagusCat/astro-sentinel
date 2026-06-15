import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'
import { Roles } from '@/lib/auth/roles'
import { verifySessionToken } from '@/lib/auth/session'
import { APP_CONFIG } from '@/lib/config'

const { admin: adminEnabled, cms: cmsEnabled } = APP_CONFIG.modules

// ── 
// Middleware that handles module availability, JWT session verification, and RBAC
// ── 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip middleware for static assets early (redundant with matcher but safer)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
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

  if (isProtectedRoute || isLoginPage) {
    const hasSessionCookie = request.cookies.has(APP_CONFIG.auth.sessionCookieName)

    // If on /login but potentially authenticated, allow through to let Server Component decide
    // (This avoids loops if Middleware verification fails but Server Component succeeds)
    if (isLoginPage && hasSessionCookie) {
      return NextResponse.next()
    }

    // If on protected route but no cookie at all, send to login immediately
    if (isProtectedRoute && !hasSessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If we have a cookie, we still want to do basic RBAC and session sync if possible.
    // However, we'll be more graceful if full verification fails here.
    if (hasSessionCookie) {
      const token = request.cookies.get(APP_CONFIG.auth.sessionCookieName)?.value
      const session = token ? await verifySessionToken(token) : null

      if (session) {
        // RBAC: /editor requires admin or maintainer
        if (pathname.startsWith('/editor') && !Roles.canAccessCms(session.role)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // 4. Supabase Session Sync
        if (request.method === 'GET') {
          return await updateSession(request)
        }
      } else {
        // If the cookie is present but invalid, we don't redirect to /login HERE.
        // We let the Server Component handle it to avoid loops caused by secret key mismatches.
        return NextResponse.next()
      }
    }
  }



  return NextResponse.next()
}


export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
