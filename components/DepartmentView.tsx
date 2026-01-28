'use client'

import { useState, useEffect } from 'react'
import { type Department, type Automation, companies, generateMockTaxData } from '@/lib/data'
import AutomationSelector from './AutomationSelector'
import AutomationDashboard from './AutomationDashboard'

export default function DepartmentView({ department }: { department: Department }) {
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)

  // Reset automation when department changes
  useEffect(() => {
    setSelectedAutomation(null)
  }, [department.id])

  return (
    <div className="p-4 md:p-6 slide-in-up">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4 mb-3">
          <div className="w-1.5 md:w-2 h-8 md:h-12 bg-gradient-to-b from-primary-blue via-secondary-purple to-primary-blue rounded-full shadow-lg flex-shrink-0"></div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-text-primary dark:text-slate-100 mb-1 md:mb-2 drop-shadow-sm transition-colors duration-500">
              {department.name}
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-neutral-text-secondary dark:text-slate-300 transition-colors duration-500">{department.description}</p>
          </div>
        </div>
      </div>

      {!selectedAutomation ? (
        <AutomationSelector
          automations={department.automations}
          onSelectAutomation={setSelectedAutomation}
        />
      ) : (
        <AutomationDashboard
          automation={selectedAutomation}
          department={department}
          onBack={() => setSelectedAutomation(null)}
        />
      )}
    </div>
  )
}
