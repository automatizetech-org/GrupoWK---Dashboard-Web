import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, verifyPassword } from '@/lib/auth'
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

    const body = await request.json()
    const { adminUsername, adminPassword, newUsername, newPassword } = body ?? {}

    if (
      !adminUsername || typeof adminUsername !== 'string' ||
      !adminPassword || typeof adminPassword !== 'string' ||
      !newUsername || typeof newUsername !== 'string' ||
      !newPassword || typeof newPassword !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: adminUsername, adminPassword, newUsername, newPassword' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const adminUser = adminUsername.trim().toLowerCase()
    const adminPass = adminPassword
    const user = newUsername.trim().toLowerCase()
    const pass = newPassword

    if (user.length < 3) {
      return NextResponse.json({ success: false, error: 'Usuário precisa ter pelo menos 3 caracteres' }, { status: 400 })
    }
    if (pass.length < 6) {
      return NextResponse.json({ success: false, error: 'Senha precisa ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // Validar admin
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('username, password_hash')
      .eq('username', adminUser)
      .maybeSingle()

    if (adminErr) return NextResponse.json({ success: false, error: adminErr.message }, { status: 500 })
    if (!adminRow?.password_hash) {
      await sleep(350)
      return NextResponse.json({ success: false, error: 'Credenciais de ADM inválidas' }, { status: 401 })
    }
    const ok = await verifyPassword(adminPass, adminRow.password_hash)
    if (!ok) {
      await sleep(350)
      return NextResponse.json({ success: false, error: 'Credenciais de ADM inválidas' }, { status: 401 })
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

