'use client'

import { type Automation } from '@/lib/data'
import { Zap } from 'lucide-react'

interface AutomationSelectorProps {
  automations: Automation[]
  onSelectAutomation: (automation: Automation) => void
}

export default function AutomationSelector({ automations, onSelectAutomation }: AutomationSelectorProps) {
  return (
    <div>
      <h2 className="text-xl md:text-2xl font-semibold text-neutral-text-primary dark:text-slate-100 mb-4 transition-colors duration-500">
        Automações Disponíveis
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {automations.map((automation, index) => (
          <button
            key={automation.id}
            onClick={() => onSelectAutomation(automation)}
            className="card-3d shadow-3d-hover rounded-xl md:rounded-2xl p-4 md:p-6 text-left group relative overflow-hidden transition-colors duration-500 touch-manipulation active:scale-95"
            style={{
              animationDelay: `${index * 0.1}s`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/0 via-primary-blue/0 to-secondary-purple/0 group-hover:from-primary-blue/10 group-hover:via-primary-blue/5 group-hover:to-secondary-purple/10 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="p-3 md:p-4 bg-gradient-to-br from-primary-blue via-primary-blue to-primary-blue-dark rounded-lg md:rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg md:rounded-xl"></div>
                  <Zap className="text-white relative z-10" size={20} style={{ width: '20px', height: '20px' }} />
                </div>
                <h3 className="text-base md:text-lg font-bold text-neutral-text-primary dark:text-slate-100 drop-shadow-sm transition-colors duration-500 break-words">
                  {automation.name}
                </h3>
              </div>
              <p className="text-xs md:text-sm text-neutral-text-secondary dark:text-slate-300 leading-relaxed transition-colors duration-500 break-words">
                {automation.description}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-blue via-secondary-purple to-primary-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>
        ))}
      </div>
    </div>
  )
}
