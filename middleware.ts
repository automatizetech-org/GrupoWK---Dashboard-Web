import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'dashboard_access'
const LOGIN_PATH = '/login'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sempre permitir a rota de login e a API de login
  if (pathname === LOGIN_PATH || pathname.startsWith('/api/login')) {
    return NextResponse.next()
  }

  // Permitir assets estáticos
  if (pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const secret = process.env.DASHBOARD_ACCESS_PASSWORD

  // Se não configurou senha, libera acesso (útil em desenvolvimento local)
  if (!secret) {
    return NextResponse.next()
  }

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value
  const expectedHash = await hashPassword(secret)

  if (cookieValue === expectedHash) {
    return NextResponse.next()
  }

  // Redirecionar para login
  const loginUrl = new URL(LOGIN_PATH, request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
