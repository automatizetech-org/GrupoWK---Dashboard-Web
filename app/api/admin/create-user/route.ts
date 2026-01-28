import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionCookieName, hashPassword, verifySession } from '@/lib/auth'
import { assertSameOrigin, rateLimit, sleep } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production' && !assertSameOrigin(request)) {
      return NextResponse.json({ success: false, error: 'Requisição inválida' }, { status: 403 })
    }

    // Rate limit para proteger credenciais ADM (por IP)
    const rl = rateLimit(request, 'admin_create_user', 10, 60_000) // 10/min
    if (!rl.ok) {
      return NextResponse.json({ success: false, error: 'Muitas tentativas. Tente novamente em instantes.' }, { status: 429 })
    }

    // Exigir admin logado (cookie httpOnly)
    const token = request.cookies.get(getSessionCookieName())?.value
    const session = token ? await verifySession(token) : null
    if (!session || session.role !== 'admin') {
      await sleep(250)
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { newUsername, newPassword } = body ?? {}

    if (
      !newUsername || typeof newUsername !== 'string' ||
      !newPassword || typeof newPassword !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: newUsername, newPassword' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const user = newUsername.trim().toLowerCase()
    const pass = newPassword

    if (user.length < 3) {
      return NextResponse.json({ success: false, error: 'Usuário precisa ter pelo menos 3 caracteres' }, { status: 400 })
    }
    if (pass.length < 6) {
      return NextResponse.json({ success: false, error: 'Senha precisa ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // Criar usuário
    const password_hash = await hashPassword(pass)
    const { error: insertErr } = await supabaseAdmin.from('users').insert({
      username: user,
      password_hash,
    })

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'production' ? 'Erro ao criar usuário' : (e?.message || 'Erro ao criar usuário') },
      { status: 500 }
    )
  }
}

