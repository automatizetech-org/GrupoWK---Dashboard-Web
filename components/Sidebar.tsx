'use client'

import { useState, useEffect } from 'react'
import { type Department } from '@/lib/data'
import { Building2, Menu, X } from 'lucide-react'

interface SidebarProps {
  departments: Department[]
  selectedDepartment: Department | null
  onSelectDepartment: (department: Department) => void
}

export default function Sidebar({ departments, selectedDepartment, onSelectDepartment }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Cache busting for images - force reload
  const [imageVersion, setImageVersion] = useState(() => Date.now())
  
  useEffect(() => {
    setImageVersion(Date.now())
  }, [])

  // Fecha o drawer quando um departamento é selecionado (mobile)
  useEffect(() => {
    if (selectedDepartment && window.innerWidth < 768) {
      setIsOpen(false)
    }
  }, [selectedDepartment])
  
  return (
    <>
      {/* Botão hambúrguer para mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-neutral-border dark:border-slate-700 hover:bg-primary-blue/10 dark:hover:bg-primary-blue/20 transition-all"
        aria-label="Abrir menu"
      >
        <Menu size={24} className="text-neutral-text-primary dark:text-slate-200" />
      </button>

      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 bg-gradient-to-b from-neutral-surface via-neutral-surface to-neutral-background 
        dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 
        border-r border-neutral-border dark:border-slate-700 
        flex flex-col shadow-3d relative overflow-hidden transition-all duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10 pointer-events-none transition-opacity duration-500"></div>
      <div className="p-4 md:p-6 border-b border-neutral-border dark:border-slate-700 bg-gradient-to-r from-primary-blue/10 via-primary-blue/5 to-transparent dark:from-primary-blue/20 dark:via-primary-blue/10 relative z-10 transition-colors duration-500">
        <div className="flex items-center justify-between md:justify-center md:flex-col gap-3">
          {/* Botão fechar para mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 hover:bg-white/20 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X size={20} className="text-neutral-text-primary dark:text-slate-200" />
          </button>
          
          <div className="flex flex-col items-center gap-3 flex-1">
            <div className="relative wk-sidebar-brand">
              <img 
                src={`/images/logo.png?t=${imageVersion}`}
                alt="GRUPO WK Logo" 
                className="h-12 md:h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback para logo 2 se logo.png não existir
                  const target = e.target as HTMLImageElement
                  if (target.src.includes('logo.png')) {
                    target.src = `/images/logo-2.png?t=${imageVersion}`
                  }
                }}
                key={`logo-sidebar-${imageVersion}`}
              />
            </div>
            <div className="text-center">
              <h2 className="wk-sidebar-title text-black dark:text-black font-bold tracking-tight text-base md:text-lg" style={{ marginLeft: '12px' }}>Departamentos</h2>
              <div className="wk-sidebar-subtitle dark:text-slate-400 text-xs md:text-sm">Selecione uma área para começar</div>
            </div>
          </div>
          
          {/* Espaçador para alinhar no mobile */}
          <div className="md:hidden w-10" />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 md:p-4 relative z-10">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelectDepartment(dept)}
            className={`w-full text-left p-3 md:p-4 rounded-xl mb-2 md:mb-3 transition-all duration-300 card-3d relative touch-manipulation ${
              selectedDepartment?.id === dept.id
                ? 'bg-gradient-to-r from-primary-blue via-primary-blue to-primary-blue-dark text-white shadow-3d transform scale-105 translateZ-10'
                : 'bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-neutral-text-primary dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-blue/20 hover:via-primary-blue/10 hover:to-transparent dark:hover:from-primary-blue/30 dark:hover:via-primary-blue/20 hover:shadow-3d-hover border border-neutral-border/50 dark:border-slate-600 active:scale-95'
            }`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} className="flex-shrink-0" />
              <span className="font-medium text-sm md:text-base">{dept.name}</span>
            </div>
            <p className={`text-xs md:text-sm mt-1 ${
              selectedDepartment?.id === dept.id ? 'text-white/80' : 'text-neutral-text-secondary dark:text-slate-400'
            }`}>
              {dept.description}
            </p>
          </button>
        ))}
      </nav>
    </aside>
    </>
  )
}
