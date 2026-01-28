'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Lock, Loader2, AlertCircle, UserPlus, ShieldCheck } from 'lucide-react'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Usuário ou senha incorretos')
        return
      }
      router.push(from)
      router.refresh()
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername,
          adminPassword,
          newUsername,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRegisterError(data.error || 'Não foi possível cadastrar')
        return
      }
      setAdminUsername('')
      setAdminPassword('')
      setNewUsername('')
      setNewPassword('')
      setShowRegister(false)
    } catch {
      setRegisterError('Erro ao conectar. Tente novamente.')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.14),transparent_55%)] bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md bg-white/80 dark:bg-neutral-900/70 backdrop-blur rounded-2xl shadow-xl border border-neutral-200/60 dark:border-neutral-800 p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-center overflow-hidden">
            <Image src="/images/logo.png" alt="WK" width={40} height={40} />
          </div>
          <div className="text-left">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">WK • Dashboard Web</div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Entrar</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="username" className="sr-only">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuário"
              autoFocus
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/60 focus:border-primary-blue/60"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/60 focus:border-primary-blue/60"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-blue hover:bg-primary-blue-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Lock size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setRegisterError('')
              setShowRegister((s) => !s)
            }}
            className="text-sm text-primary-blue hover:underline inline-flex items-center gap-2"
          >
            <UserPlus size={16} />
            Cadastrar novo usuário
          </button>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Acesso controlado por Supabase</div>
        </div>

        {showRegister && (
          <div className="mt-5 border-t border-neutral-200/70 dark:border-neutral-800 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-emerald-600" />
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Cadastro (requer ADM)</div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Usuário ADM"
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
                  disabled={registerLoading}
                />
                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Senha ADM"
                  type="password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
                  disabled={registerLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Novo usuário"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue/40"
                  disabled={registerLoading}
                />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Senha do novo usuário"
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue/40"
                  disabled={registerLoading}
                />
              </div>

              {registerError && (
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <AlertCircle size={18} />
                  {registerError}
                </div>
              )}

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registerLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar usuário'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

