'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Lock, Loader2, AlertCircle, UserPlus, ShieldCheck, ArrowLeft } from 'lucide-react'

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
      // Sucesso: limpa campos e volta pro login
      setAdminUsername('')
      setAdminPassword('')
      setNewUsername('')
      setNewPassword('')
      setShowRegister(false)
      setError('')
    } catch {
      setRegisterError('Erro ao conectar. Tente novamente.')
    } finally {
      setRegisterLoading(false)
    }
  }

  // Tela de cadastro separada
  if (showRegister) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Background animado e mais bonito */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-neutral-950 dark:via-indigo-950 dark:to-purple-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(circle_at_40%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoNTksMTMwLDI0NiwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-40 dark:opacity-20"></div>
        </div>

        {/* Partículas flutuantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative w-full max-w-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-neutral-800/50 p-8 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={() => {
              setShowRegister(false)
              setRegisterError('')
              setAdminUsername('')
              setAdminPassword('')
              setNewUsername('')
              setNewPassword('')
            }}
            className="mb-6 flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-primary-blue dark:hover:text-primary-blue transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar para login</span>
          </button>

          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-emerald-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">WK • Dashboard Web</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                Cadastrar Usuário
              </h1>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 text-center">
            Preencha as credenciais de administrador e os dados do novo usuário
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                Credenciais de Administrador
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Usuário ADM"
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  disabled={registerLoading}
                />
                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Senha ADM"
                  type="password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  disabled={registerLoading}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                Novo Usuário
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Novo usuário"
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all"
                  disabled={registerLoading}
                />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Senha do novo usuário"
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all"
                  disabled={registerLoading}
                />
              </div>
            </div>

            {registerError && (
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2">
                <AlertCircle size={18} />
                {registerError}
              </div>
            )}

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {registerLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Cadastrar usuário
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Tela de login
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background animado e mais bonito */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-neutral-950 dark:via-indigo-950 dark:to-purple-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(circle_at_40%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoNTksMTMwLDI0NiwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-40 dark:opacity-20"></div>
      </div>

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-neutral-800/50 p-8 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-blue to-blue-600 shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-primary-blue/20 animate-in zoom-in duration-500">
            <Image src="/images/logo.png" alt="WK" width={40} height={40} className="drop-shadow-sm" />
          </div>
          <div className="text-left">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">WK • Dashboard Web</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-blue to-blue-600 bg-clip-text text-transparent">
              Entrar
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuário"
              autoFocus
              autoComplete="username"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all"
              disabled={loading}
            />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-blue to-blue-600 hover:from-primary-blue-dark hover:to-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-blue/25 hover:shadow-primary-blue/40 transform hover:scale-[1.02] active:scale-[0.98]"
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

        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setError('')
              setShowRegister(true)
            }}
            className="text-sm text-primary-blue hover:text-primary-blue-dark font-medium inline-flex items-center gap-2 transition-colors group"
          >
            <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
            Cadastrar novo usuário
          </button>
        </div>
      </div>
    </div>
  )
}

