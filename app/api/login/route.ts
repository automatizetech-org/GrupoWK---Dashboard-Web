import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionCookieName, signSession, verifyPassword } from '@/lib/auth'
import { assertSameOrigin, rateLimit, sleep } from '@/lib/security'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

export async function POST(request: NextRequest) {
  try {
    // Bloqueia chamadas cross-site (defesa simples contra abuso)
    if (process.env.NODE_ENV === 'production' && !assertSameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'Requisição inválida' }, { status: 403 })
    }

    // Rate limit anti brute-force (por IP)
    const rl = rateLimit(request, 'login', 20, 60_000) // 20/min
    if (!rl.ok) {
      return NextResponse.json({ success: false, error: 'Muitas tentativas. Tente novamente em instantes.' }, { status: 429 })
    }

    const body = await request.json()
    const { username, password } = body ?? {}

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const user = username.trim().toLowerCase()
    const pass = password

    // 1) tenta admin
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('username, password_hash')
      .eq('username', user)
      .maybeSingle()

    if (adminErr) {
      return NextResponse.json({ success: false, error: adminErr.message }, { status: 500 })
    }

    if (adminRow?.password_hash) {
      const ok = await verifyPassword(pass, adminRow.password_hash)
      if (!ok) {
        await sleep(350)
        return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos' }, { status: 401 })
      }

      const token = await signSession({ sub: user, role: 'admin' }, COOKIE_MAX_AGE)
      const res = NextResponse.json({ success: true, role: 'admin' })
      res.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })
      return res
    }

    // 2) tenta usuário comum
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('username, password_hash')
      .eq('username', user)
      .maybeSingle()

    if (userErr) {
      return NextResponse.json({ success: false, error: userErr.message }, { status: 500 })
    }

    if (!userRow?.password_hash) {
      await sleep(250)
      return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    const ok = await verifyPassword(pass, userRow.password_hash)
    if (!ok) {
      await sleep(350)
      return NextResponse.json({ success: false, error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    const token = await signSession({ sub: user, role: 'user' }, COOKIE_MAX_AGE)
    const response = NextResponse.json({ success: true, role: 'user' })
    response.cookies.set(getSessionCookieName(), token, {
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
      { success: false, error: process.env.NODE_ENV === 'production' ? 'Erro ao processar login' : ((error as any)?.message || 'Erro ao processar login') },
      { status: 500 }
    )
  }
}
