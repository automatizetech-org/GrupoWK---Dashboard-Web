'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

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
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Senha incorreta')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary-blue/10 rounded-full">
            <Lock className="w-10 h-10 text-primary-blue" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-2">
          Acesso ao Dashboard
        </h1>
        <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 mb-6">
          Digite a senha de acesso fornecida
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de acesso"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
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
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
