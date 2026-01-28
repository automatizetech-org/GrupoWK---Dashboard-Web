import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionCookieName, verifySession } from '@/lib/auth'

const LOGIN_PATH = '/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sempre permitir a rota de login e APIs de auth/admin
  if (
    pathname === LOGIN_PATH ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/logout') ||
    pathname.startsWith('/api/admin/')
  ) {
    return NextResponse.next()
  }

  // Permitir assets estáticos
  if (pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const cookieName = getSessionCookieName()
  const token = request.cookies.get(cookieName)?.value
  if (token) {
    const session = await verifySession(token)
    if (session) return NextResponse.next()
  }

  // Sem sessão válida -> login
  const loginUrl = new URL(LOGIN_PATH, request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
