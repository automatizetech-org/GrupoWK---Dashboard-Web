import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'dashboard_access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    const secret = process.env.DASHBOARD_ACCESS_PASSWORD
    if (!secret) {
      // Se não configurou senha, aceita qualquer acesso (dev) ou bloqueia
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Acesso não configurado. Defina DASHBOARD_ACCESS_PASSWORD.' },
          { status: 500 }
        )
      }
      // Em desenvolvimento sem senha: permite acesso com qualquer senha ou "dev"
      const token = password ? await hashPassword(password) : await hashPassword('dev')
      const res = NextResponse.json({ success: true })
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })
      return res
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Senha obrigatória' },
        { status: 400 }
      )
    }

    const expectedHash = await hashPassword(secret)
    const receivedHash = await hashPassword(password.trim())

    if (receivedHash !== expectedHash) {
      return NextResponse.json(
        { success: false, error: 'Senha incorreta' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, expectedHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login' },
      { status: 500 }
    )
  }
}
