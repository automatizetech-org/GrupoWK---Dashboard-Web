'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Loader2, UserPlus } from 'lucide-react'

export default function AdminUsersClient({ adminUsername }: { adminUsername: string }) {
  const router = useRouter()
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Não foi possível cadastrar')
        return
      }
      setSuccess(`Usuário "${newUsername.trim().toLowerCase()}" cadastrado com sucesso.`)
      setNewUsername('')
      setNewPassword('')
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-blue-50 dark:from-neutral-950 dark:via-slate-950 dark:to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_35%,rgba(220,38,38,0.10),transparent_55%),radial-gradient(circle_at_85%_70%,rgba(37,99,235,0.12),transparent_55%)]" />

      <div className="relative w-full max-w-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-white/20 dark:border-neutral-800/50 p-5 md:p-8">
        <div className="flex items-center justify-between mb-5 md:mb-6 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary-blue transition-colors touch-manipulation active:scale-95"
          >
            <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
            Voltar
          </button>

          <div className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 break-words">
            Admin: <span className="font-semibold">{adminUsername}</span>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">Admin</h1>
        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 mb-5 md:mb-6">
          Cadastre novos usuários para acessar o dashboard.
        </p>

        <form onSubmit={onSubmit} className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Novo usuário"
              className="w-full px-4 py-3 md:py-3.5 rounded-lg md:rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/45 focus:border-primary-blue transition-all text-base touch-manipulation"
              disabled={loading}
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Senha"
              type="password"
              className="w-full px-4 py-3 md:py-3.5 rounded-lg md:rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/45 focus:border-primary-blue transition-all text-base touch-manipulation"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 border border-red-200 dark:border-red-800">
              <AlertCircle size={16} className="md:w-[18px] md:h-[18px] flex-shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}
          {success && (
            <div className="text-xs md:text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 border border-emerald-200 dark:border-emerald-800 break-words">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 md:py-3.5 px-4 bg-gradient-to-r from-primary-blue to-blue-600 hover:from-primary-blue-dark hover:to-blue-700 text-white font-semibold rounded-lg md:rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-blue/25 hover:shadow-primary-blue/40 transform hover:scale-[1.01] active:scale-[0.99] touch-manipulation text-base"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <UserPlus size={16} className="md:w-[18px] md:h-[18px]" />
                Cadastrar usuário
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

