'use client'

import { useState, useMemo } from 'react'
import { type Company } from '@/lib/data'
import { Filter, Search } from 'lucide-react'
import {
  getPreviousMonth,
  getLastNDays,
  getCurrentMonth,
  getPreviousYear,
  getCurrentYear,
  getLast3Months,
  getLast6Months,
  type DateRange,
} from '@/lib/dateUtils'

interface FiltersProps {
  companies: Company[]
  selectedCompanies: string[]
  onCompaniesChange: (companies: string[]) => void
  dateRange: { start: string; end: string }
  onDateRangeChange: (range: { start: string; end: string }) => void
}

export default function Filters({
  companies,
  selectedCompanies,
  onCompaniesChange,
  dateRange,
  onDateRangeChange,
}: FiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filtra empresas baseado no termo de pesquisa
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies
    const term = searchTerm.toLowerCase()
    return companies.filter(company => 
      company.name.toLowerCase().includes(term) ||
      (company.cnpj && company.cnpj.toLowerCase().includes(term))
    )
  }, [companies, searchTerm])
  const handlePresetClick = (preset: DateRange) => {
    try {
      // Valida o range antes de aplicar
      if (!preset || !preset.start || !preset.end) {
        console.error('Range de datas inválido:', preset)
        return
      }
      
      // Garante formato correto YYYY-MM-DD
      const startDate = preset.start.includes('T') ? preset.start.split('T')[0] : preset.start
      const endDate = preset.end.includes('T') ? preset.end.split('T')[0] : preset.end
      
      // Valida formato
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        console.error('Formato de data inválido:', { startDate, endDate, original: preset })
        return
      }
      
      // Valida que as datas são válidas
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        console.error('Datas inválidas:', { startDate, endDate })
        return
      }
      
      // Garante que start <= end
      if (startDate > endDate) {
        console.error('Data inicial maior que data final:', { startDate, endDate })
        return
      }
      
      // Aplica o range com datas formatadas corretamente
      onDateRangeChange({
        start: startDate,
        end: endDate
      })
    } catch (error) {
      console.error('Erro ao aplicar filtro de data:', error)
      // Em caso de erro, não faz nada para evitar tela branca
    }
  }

  const presetButtons = [
    { label: 'Últimos 30 dias', range: getLastNDays(30) },
    { label: 'Mês passado', range: getPreviousMonth() },
    { label: 'Este mês', range: getCurrentMonth() },
    { label: 'Últimos 3 meses', range: getLast3Months() },
    { label: 'Últimos 6 meses', range: getLast6Months() },
    { label: 'Ano passado', range: getPreviousYear() },
    { label: 'Este ano', range: getCurrentYear() },
  ]
  const handleCompanyToggle = (companyId: string) => {
    if (selectedCompanies.includes(companyId)) {
      onCompaniesChange(selectedCompanies.filter(id => id !== companyId))
    } else {
      onCompaniesChange([...selectedCompanies, companyId])
    }
  }

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      onCompaniesChange([])
    } else {
      onCompaniesChange(companies.map(c => c.id))
    }
  }

  return (
    <div className="card-3d-elevated rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-3d relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10 transition-opacity duration-500"></div>
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 relative z-10">
        <div className="p-2 md:p-3 bg-gradient-to-br from-primary-blue to-primary-blue-dark rounded-lg md:rounded-xl shadow-md">
          <Filter size={18} className="md:w-5 md:h-5 text-white" />
        </div>
        <h3 className="text-lg md:text-xl font-bold text-neutral-text-primary dark:text-slate-100 drop-shadow-sm transition-colors duration-500">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-text-primary dark:text-slate-200 mb-2">
            Empresas
          </label>
          <div className="backdrop-3d border border-neutral-border/50 dark:border-slate-600 rounded-lg md:rounded-xl p-3 md:p-4 max-h-48 md:max-h-48 overflow-y-auto shadow-inner relative overflow-hidden bg-white dark:bg-slate-800/95">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10"></div>
            
            {/* Barra de pesquisa */}
            <div className="relative z-10 mb-3">
              <div className="relative">
                <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-neutral-text-secondary" size={16} />
                <input
                  type="text"
                  placeholder="Pesquisar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-2 text-sm border-2 border-neutral-border/50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue/50 backdrop-3d transition-all duration-200 hover:border-primary-blue/30 dark:placeholder:text-slate-400 touch-manipulation"
                />
              </div>
            </div>
            
            <button
              onClick={handleSelectAll}
              className="text-xs md:text-sm text-primary-blue hover:text-primary-blue-dark font-semibold mb-3 relative z-10 transition-all duration-200 hover:scale-105 inline-block touch-manipulation active:scale-95"
            >
              {selectedCompanies.length === companies.length ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
            <div className="space-y-1.5 md:space-y-2 relative z-10">
              {filteredCompanies.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-white/60 dark:hover:bg-slate-700/40 p-2.5 md:p-3 rounded-lg transition-all duration-200 group card-3d touch-manipulation active:scale-95"
                >
                  <div className="relative w-5 h-5 flex-shrink-0">
                    {/* Checkbox customizado como bandeira */}
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => handleCompanyToggle(company.id)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                    {/* Bandeira azul quando selecionado */}
                    {selectedCompanies.includes(company.id) ? (
                      <div className="relative" style={{ width: '20px', height: '14px' }}>
                        {/* Mastro da bandeira */}
                        <div 
                          className="absolute left-0 top-0 bottom-0"
                          style={{
                            width: '2px',
                            background: 'linear-gradient(180deg, #1E40AF 0%, #2563EB 100%)',
                            borderRadius: '1px 0 0 1px'
                          }}
                        />
                        {/* Bandeira azul (formato retangular) */}
                        <div 
                          className="absolute top-0 right-0 bottom-0"
                          style={{
                            left: '2px',
                            background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                            borderRadius: '0 2px 2px 0',
                            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                            clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 0 100%)'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-neutral-border rounded-sm"></div>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-neutral-text-primary dark:text-slate-200 group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors break-words">
                    {company.name}
                    {company.cnpj && (
                      <span className="text-neutral-text-secondary dark:text-slate-400 ml-1 md:ml-2 text-xs">({company.cnpj})</span>
                    )}
                  </span>
                </label>
              ))}
              {filteredCompanies.length === 0 && (
                <p className="text-sm text-neutral-text-secondary dark:text-slate-400 text-center py-2 transition-colors duration-500">
                  Nenhuma empresa encontrada
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <label className="block text-sm font-medium text-neutral-text-primary dark:text-slate-200 mb-2 transition-colors duration-500">
            Período
          </label>
          
          {/* Filtros pré-definidos */}
          <div className="mb-3 md:mb-4 relative z-10">
            <label className="block text-xs text-neutral-text-secondary dark:text-slate-400 mb-2 transition-colors duration-500">
              Períodos rápidos
            </label>
            <div className="flex flex-wrap gap-1.5 md:gap-2 relative z-10">
              {presetButtons.map((preset, index) => {
                const isActive =
                  dateRange.start === preset.range.start && dateRange.end === preset.range.end
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePresetClick(preset.range)}
                    className={`px-2.5 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer relative z-20 touch-manipulation active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-blue to-primary-blue-dark text-white shadow-md scale-105'
                        : 'bg-white/60 dark:bg-slate-700/60 text-neutral-text-primary dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80 hover:scale-105 border border-neutral-border/50 dark:border-slate-600 hover:border-primary-blue/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Seletores de data manual */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 relative z-10">
            <div>
              <label htmlFor="date-start" className="block text-xs text-neutral-text-secondary dark:text-slate-400 mb-1 transition-colors duration-500">
                Data Inicial
              </label>
              <input
                id="date-start"
                type="date"
                value={dateRange.start ? dateRange.start.split('T')[0] : ''}
                onChange={(e) => {
                  const newStart = e.target.value
                  if (newStart && dateRange.end && newStart > dateRange.end.split('T')[0]) {
                    // Se a data inicial for maior que a final, ajusta a final também
                    onDateRangeChange({ start: newStart, end: newStart })
                  } else {
                    onDateRangeChange({ ...dateRange, start: newStart })
                  }
                }}
                aria-label="Data inicial do período"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm border-2 border-neutral-border/50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue/50 backdrop-3d transition-all duration-200 hover:border-primary-blue/30 shadow-sm hover:shadow-md touch-manipulation"
              />
            </div>
            <div>
              <label htmlFor="date-end" className="block text-xs text-neutral-text-secondary dark:text-slate-400 mb-1 transition-colors duration-500">
                Data Final
              </label>
              <input
                id="date-end"
                type="date"
                value={dateRange.end ? dateRange.end.split('T')[0] : ''}
                onChange={(e) => {
                  const newEnd = e.target.value
                  if (newEnd && dateRange.start && newEnd < dateRange.start.split('T')[0]) {
                    // Se a data final for menor que a inicial, ajusta a inicial também
                    onDateRangeChange({ start: newEnd, end: newEnd })
                  } else {
                    onDateRangeChange({ ...dateRange, end: newEnd })
                  }
                }}
                aria-label="Data final do período"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm border-2 border-neutral-border/50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue/50 backdrop-3d transition-all duration-200 hover:border-primary-blue/30 shadow-sm hover:shadow-md touch-manipulation"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
