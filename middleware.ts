import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Check for Supabase auth tokens in URL (password reset, email confirmation, etc.)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // If we have auth tokens and we're NOT already on the auth callback route, redirect there
  if ((code || tokenHash) && !pathname.startsWith('/auth/callback')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    // Preserve all the auth parameters
    if (code) callbackUrl.searchParams.set('code', code)
    if (tokenHash) callbackUrl.searchParams.set('token_hash', tokenHash)
    if (type) callbackUrl.searchParams.set('type', type)

    return NextResponse.redirect(callbackUrl)
  }

  // Just update the session, don't do complex auth checks here
  // Auth checks will be done in page components
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
