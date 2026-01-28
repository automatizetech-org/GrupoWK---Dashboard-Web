'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Verifica se há preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 md:w-16 md:h-8 rounded-full overflow-hidden shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 dark:focus:ring-amber-400 group transition-all duration-300 touch-manipulation active:scale-95"
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {/* Background com gradiente suave - transição entre modos */}
      <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${
        isDark 
          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700' 
          : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
      }`}>
        {/* Efeito de brilho animado */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${
          isDark 
            ? 'opacity-30 bg-gradient-to-r from-blue-400/50 via-transparent to-indigo-400/50' 
            : 'opacity-40 bg-gradient-to-r from-yellow-200/50 via-transparent to-amber-200/50'
        }`} />
      </div>
      
      {/* Ícone do sol (light mode) - aparece à esquerda */}
      <div className={`absolute left-1 md:left-1.5 top-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out z-10 ${
        isDark 
          ? 'opacity-0 scale-0 rotate-90 translate-x-0' 
          : 'opacity-100 scale-100 rotate-0 translate-x-0'
      }`}>
        <Sun 
          size={16} 
          className="md:w-[18px] md:h-[18px] text-amber-700 drop-shadow-lg" 
          fill="currentColor"
          strokeWidth={2}
        />
      </div>
      
      {/* Ícone da lua (dark mode) - aparece à direita */}
      <div className={`absolute right-1 md:right-1.5 top-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out z-10 ${
        isDark 
          ? 'opacity-100 scale-100 rotate-0 translate-x-0' 
          : 'opacity-0 scale-0 -rotate-90 translate-x-0'
      }`}>
        <Moon 
          size={16} 
          className="md:w-[18px] md:h-[18px] text-slate-400 drop-shadow-lg" 
          fill="currentColor"
          strokeWidth={2}
        />
      </div>
      
      {/* Círculo deslizante - rola suavemente */}
      <div 
        className={`absolute top-0.5 md:top-0.5 w-6 h-6 md:w-7 md:h-7 bg-white rounded-full shadow-xl transition-all duration-500 ease-in-out ${
          isDark ? 'left-[calc(100%-1.5rem-0.125rem)] md:left-[calc(100%-1.75rem-0.125rem)]' : 'left-0.5'
        }`}
        style={{
          boxShadow: isDark 
            ? '0 4px 12px rgba(59, 130, 246, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2)' 
            : '0 4px 12px rgba(245, 158, 11, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.9), 0 0 0 1px rgba(245, 158, 11, 0.2)'
        }}
      >
        {/* Brilho interno no círculo */}
        <div className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
          isDark 
            ? 'opacity-20 bg-gradient-to-br from-blue-200/30 via-transparent to-transparent' 
            : 'opacity-100 bg-gradient-to-br from-white via-amber-50/80 to-yellow-100/60'
        }`} />
        
        {/* Reflexo no círculo */}
        <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-white/60 rounded-full blur-sm" />
      </div>
      
      {/* Efeito de brilho ao redor do toggle */}
      <div className={`absolute -inset-1 rounded-full transition-opacity duration-500 blur-md ${
        isDark 
          ? 'opacity-30 bg-blue-400/40' 
          : 'opacity-40 bg-amber-300/50'
      }`} />
    </button>
  )
}
