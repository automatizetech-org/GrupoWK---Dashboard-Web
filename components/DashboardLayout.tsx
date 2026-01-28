'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { departments, type Department } from '@/lib/data'
import Sidebar from './Sidebar'
import DepartmentView from './DepartmentView'
import DarkModeToggle from './DarkModeToggle'

function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-neutral-500 hover:text-primary-blue dark:text-neutral-400 dark:hover:text-primary-blue transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-blue/10 disabled:opacity-50"
    >
      Sair
    </button>
  )
}

export default function DashboardLayout() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [key, setKey] = useState(0) // Key to force remount when department changes

  // Reset key when department changes to force remount of DepartmentView
  useEffect(() => {
    setKey(prev => prev + 1)
  }, [selectedDepartment?.id])

  // Generate floating particles positions once
  const particles = useState(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 5,
    }))
  )[0]

  // Cache busting for images - force reload
  const [imageVersion, setImageVersion] = useState(() => Date.now())
  
  // Force image reload on mount
  useEffect(() => {
    setImageVersion(Date.now())
  }, [])

  return (
    <div className="flex h-screen bg-neutral-background dark:bg-slate-900 transition-colors duration-500">
      <Sidebar
        departments={departments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
      />
      <main className="flex-1 overflow-y-auto relative">
        {/* Dark Mode Toggle e Sair - Canto superior direito */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          <DarkModeToggle />
          <LogoutButton />
        </div>
        {selectedDepartment ? (
          <DepartmentView key={key} department={selectedDepartment} />
        ) : (
          <div className="flex items-center justify-center h-full relative overflow-hidden">
            {/* Background animated gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-secondary-purple/5 to-primary-blue/5 dark:from-primary-blue/10 dark:via-secondary-purple/10 dark:to-primary-blue/10 transition-opacity duration-500">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.15),transparent_50%)] animate-pulse-slow"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(124,58,237,0.15),transparent_50%)] animate-pulse-slow-delayed"></div>
            </div>
            
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden">
              {particles.map((particle) => (
                <div
                  key={particle.id}
                  className="absolute w-2 h-2 bg-primary-blue/20 rounded-full animate-float"
                  style={{
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    animationDelay: `${particle.delay}s`,
                    animationDuration: `${particle.duration}s`,
                  }}
                />
              ))}
            </div>

            {/* Main content */}
            <div className="relative z-10 transform-3d max-w-4xl mx-auto px-6">
              <div className="flex flex-col items-center">
                {/* Logo Section */}
                <div className="mb-10 relative inline-flex items-center justify-center logo-container">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-blue via-amber-500/40 to-primary-blue rounded-full blur-3xl opacity-30 animate-pulse-glow"></div>
                  <div className="relative logo-wrapper">
                    <img 
                      src={`/images/logo.png?t=${imageVersion}`}
                      alt="GRUPO WK Logo" 
                      className="h-52 w-auto object-contain drop-shadow-2xl logo-image"
                      key={`logo-${imageVersion}`}
                    />
                    {/* Glow rings - WK inspired */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary-blue/30 animate-ring-1"></div>
                    <div className="absolute inset-0 rounded-full border border-amber-500/25 animate-ring-2"></div>
                    <div className="absolute inset-0 rounded-full border border-primary-blue/15 animate-ring-1" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </div>

                {/* Quote Section - Beautiful and well-worked */}
                <div className="mb-8 w-full max-w-2xl quote-container">
                  <div className="relative quote-wrapper">
                    {/* Decorative quote marks */}
                    <div className="absolute -left-8 -top-4 text-6xl font-serif text-primary-blue/20 select-none quote-mark-left">"</div>
                    <div className="absolute -right-8 -bottom-4 text-6xl font-serif text-amber-500/20 select-none quote-mark-right">"</div>
                    
                    {/* Quote text with gradient */}
                    <p className="quote-text text-2xl md:text-3xl font-bold leading-relaxed text-center px-8 py-6 relative z-10 dark:text-slate-200 transition-colors duration-500">
                      <span className="quote-gradient dark:from-blue-300 dark:via-amber-300 dark:to-blue-300">Confia no Senhor de todo o seu coração!</span>
                    </p>
                    
                    {/* Decorative border */}
                    <div className="absolute inset-0 quote-border rounded-2xl"></div>
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 quote-glow rounded-2xl"></div>
                  </div>
                </div>

                {/* Title Section */}
                <div className="text-center mb-6">
                  <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary-blue via-amber-500 to-primary-blue dark:from-blue-400 dark:via-amber-400 dark:to-blue-400 bg-clip-text text-transparent animate-gradient-shift drop-shadow-lg transition-all duration-500">
                    WK Analytics
                  </h1>
                  
                  {/* Subtitle with fade in */}
                  <p className="text-lg md:text-xl text-neutral-text-secondary dark:text-slate-300 animate-fade-in-up font-medium transition-colors duration-500">
                    Plataforma de Análise e Gestão Empresarial
                  </p>
                </div>
              </div>

              {/* Decorative elements - WK inspired */}
              <div className="flex justify-center gap-4 mt-12">
                <div className="w-2.5 h-2.5 bg-primary-blue rounded-full animate-bounce shadow-lg shadow-primary-blue/50" style={{ animationDelay: '0s' }}></div>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce shadow-lg shadow-amber-500/50" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2.5 h-2.5 bg-primary-blue rounded-full animate-bounce shadow-lg shadow-primary-blue/50" style={{ animationDelay: '0.4s' }}></div>
              </div>
              
              {/* Analytics badge */}
              <div className="mt-8 flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-blue/10 via-amber-500/10 to-primary-blue/10 backdrop-blur-sm rounded-full border border-primary-blue/20 animate-fade-in-up mx-auto w-fit" style={{ animationDelay: '0.3s' }}>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-neutral-text-primary">Insights em Tempo Real</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
