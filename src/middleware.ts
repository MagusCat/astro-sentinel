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

  //TODO: I think this can be abstracted to general module feature flags in future.
  if (!adminEnabled && pathname.startsWith('/dashboard')) {
    const destination = cmsEnabled ? '/editor' : '/login'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  if (!cmsEnabled && pathname.startsWith('/editor')) {
    const destination = adminEnabled ? '/dashboard' : '/login'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  //TODO: This can setup on higher abstraction layers, so this middleware can be minimal.
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/editor')

  if (isProtectedRoute) {
    const token = request.cookies.get(APP_CONFIG.auth.sessionCookieName)?.value
    const session = token ? await verifySessionToken(token) : null

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // RBAC: /editor requires admin or maintainer
    if (pathname.startsWith('/editor') && !Roles.canAccessCms(session.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (request.method === 'GET') {
    return await updateSession(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
