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

  if (isProtectedRoute) {
    const token = request.cookies.get(APP_CONFIG.auth.sessionCookieName)?.value
    // Local JWT Verification (Stateless - No network hop)
    const session = token ? await verifySessionToken(token) : null

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // RBAC: /editor requires admin or maintainer
    if (pathname.startsWith('/editor') && !Roles.canAccessCms(session.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 4. Supabase Session Sync (Only for protected routes where data access is imminent)
    // We only call this on GET requests to keep the Supabase Auth cookies in sync 
    // without penalizing public page performance.
    if (request.method === 'GET') {
      return await updateSession(request)
    }
  }

  return NextResponse.next()
}


export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
