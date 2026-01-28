'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Lock, Loader2, AlertCircle, Shield } from 'lucide-react'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from') || '/'
  const [targetPath, setTargetPath] = useState(fromParam)
  const isAdminTarget = targetPath === '/admin'

  // Prefetch para não "travar" no primeiro clique (dev/produção)
  useEffect(() => {
    router.prefetch('/admin')
  }, [router])

  // Sincroniza targetPath quando a URL mudar
  useEffect(() => {
    setTargetPath(fromParam)
  }, [fromParam])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      // Redireciona com reload para garantir que o cookie de sessão (httpOnly)
      // já esteja válido na primeira navegação (evita precisar clicar 2x).
      window.location.assign(targetPath || '/')
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Tela de login
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background animado e mais bonito */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-blue-50 dark:from-neutral-950 dark:via-slate-950 dark:to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_35%,rgba(220,38,38,0.12),transparent_55%),radial-gradient(circle_at_85%_70%,rgba(37,99,235,0.14),transparent_55%),radial-gradient(circle_at_50%_15%,rgba(37,99,235,0.10),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoNTksMTMwLDI0NiwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-40 dark:opacity-20"></div>
      </div>

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-white/20 dark:border-neutral-800/50 p-6 md:p-8 transform transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-6 md:mb-8">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-red-600 to-primary-blue shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-primary-blue/20 animate-in zoom-in duration-500 flex-shrink-0">
            <Image src="/images/logo.png" alt="WK" width={32} height={32} className="md:w-10 md:h-10 drop-shadow-sm" />
          </div>
          <div className="text-left">
            <div className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 font-medium">WK • Dashboard Web</div>
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white">
              Login
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div className="space-y-2.5 md:space-y-3">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuário"
              autoFocus
              autoComplete="username"
              className="w-full px-4 py-3 md:py-3.5 rounded-lg md:rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all text-base touch-manipulation"
              disabled={loading}
            />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              className="w-full px-4 py-3 md:py-3.5 rounded-lg md:rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all text-base touch-manipulation"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2">
              <AlertCircle size={16} className="md:w-[18px] md:h-[18px] flex-shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 md:py-3.5 px-4 bg-gradient-to-r from-primary-blue to-blue-600 hover:from-primary-blue-dark hover:to-blue-700 text-white font-semibold rounded-lg md:rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-blue/25 hover:shadow-primary-blue/40 transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation text-base"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Lock size={16} className="md:w-[18px] md:h-[18px]" />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="mt-5 md:mt-6 flex items-center justify-center">
          <button
            type="button"
            onMouseEnter={() => router.prefetch('/admin')}
            onClick={() => {
              // Não navega para /admin (evita compilação pesada/redirect em dev).
              // Apenas define o destino pós-login como /admin.
              const next = isAdminTarget ? '/' : '/admin'
              setTargetPath(next)
              router.replace(next === '/admin' ? '/login?from=/admin' : '/login')
            }}
            className="group inline-flex items-center gap-2 rounded-full border border-neutral-200/80 dark:border-neutral-700/70 bg-white/70 dark:bg-neutral-800/40 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-neutral-800 dark:text-neutral-200 shadow-sm hover:shadow-md transition-all hover:border-primary-blue/40 hover:text-primary-blue touch-manipulation active:scale-95"
          >
            <span className="flex items-center justify-center h-5 w-5 md:h-6 md:w-6 rounded-full bg-gradient-to-br from-red-600 to-primary-blue text-white shadow-sm group-hover:shadow flex-shrink-0">
              <Shield size={12} className="md:w-[14px] md:h-[14px]" />
            </span>
            <span className="break-words">{isAdminTarget ? 'Admin (ativado)' : 'Admin'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}

