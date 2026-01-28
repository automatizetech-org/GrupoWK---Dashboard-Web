'use client'

import { useState, useEffect } from 'react'
import { type Department } from '@/lib/data'
import { Building2 } from 'lucide-react'

interface SidebarProps {
  departments: Department[]
  selectedDepartment: Department | null
  onSelectDepartment: (department: Department) => void
}

export default function Sidebar({ departments, selectedDepartment, onSelectDepartment }: SidebarProps) {
  // Cache busting for images - force reload
  const [imageVersion, setImageVersion] = useState(() => Date.now())
  
  useEffect(() => {
    setImageVersion(Date.now())
  }, [])
  
  return (
    <aside className="w-64 bg-gradient-to-b from-neutral-surface via-neutral-surface to-neutral-background dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border-r border-neutral-border dark:border-slate-700 flex flex-col shadow-3d relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10 pointer-events-none transition-opacity duration-500"></div>
      <div className="p-6 border-b border-neutral-border dark:border-slate-700 bg-gradient-to-r from-primary-blue/10 via-primary-blue/5 to-transparent dark:from-primary-blue/20 dark:via-primary-blue/10 relative z-10 transition-colors duration-500">
        <div className="flex flex-col items-center gap-3">
          <div className="relative wk-sidebar-brand">
            <img 
              src={`/images/logo.png?t=${imageVersion}`}
              alt="GRUPO WK Logo" 
              className="h-16 w-auto object-contain"
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
            <h2 className="wk-sidebar-title text-black dark:text-black font-bold tracking-tight" style={{ marginLeft: '12px' }}>Departamentos</h2>
            <div className="wk-sidebar-subtitle dark:text-slate-400">Selecione uma área para começar</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 relative z-10">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelectDepartment(dept)}
            className={`w-full text-left p-4 rounded-xl mb-3 transition-all duration-300 card-3d relative ${
              selectedDepartment?.id === dept.id
                ? 'bg-gradient-to-r from-primary-blue via-primary-blue to-primary-blue-dark text-white shadow-3d transform scale-105 translateZ-10'
                : 'bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-neutral-text-primary dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-blue/20 hover:via-primary-blue/10 hover:to-transparent dark:hover:from-primary-blue/30 dark:hover:via-primary-blue/20 hover:shadow-3d-hover border border-neutral-border/50 dark:border-slate-600'
            }`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} />
              <span className="font-medium">{dept.name}</span>
            </div>
            <p className={`text-sm mt-1 ${
              selectedDepartment?.id === dept.id ? 'text-white/80' : 'text-neutral-text-secondary dark:text-slate-400'
            }`}>
              {dept.description}
            </p>
          </button>
        ))}
      </nav>
    </aside>
  )
}
