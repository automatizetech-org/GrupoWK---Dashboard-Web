'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { type Automation, type Department, type TaxData, type Company } from '@/lib/data'
import { getTaxData, getCompanies } from '@/lib/supabase-queries'
import { getPreviousMonth } from '@/lib/dateUtils'
import Filters from '../Filters'
import XmlCharts from '../charts/XmlCharts'
import SafeCompanyMap from '../SafeCompanyMap'
import ErrorBoundary from '../ErrorBoundary'
import { ArrowLeft, FileText, Receipt, CreditCard, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

interface XmlAutomationDashboardProps {
  automation: Automation
  department: Department
  onBack: () => void
}

export default function XmlAutomationDashboard({ automation, department, onBack }: XmlAutomationDashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  // Inicializa com o mês anterior completo
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    try {
      return getPreviousMonth()
    } catch (error) {
      console.error('Erro ao inicializar dateRange:', error)
      // Fallback seguro
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() - 1
      const prevMonth = month < 0 ? 11 : month
      const prevYear = month < 0 ? year - 1 : year
      return {
        start: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`,
        end: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${new Date(prevYear, prevMonth + 1, 0).getDate()}`,
      }
    }
  })
  const [allData, setAllData] = useState<TaxData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  // Cache busting for images - force reload
  const [imageVersion, setImageVersion] = useState(() => Date.now())
  
  // Wrapper seguro para setDateRange
  const handleDateRangeChange = (range: { start: string; end: string }) => {
    try {
      // Valida antes de aplicar
      if (!range.start || !range.end) {
        console.error('Range inválido:', range)
        return
      }
      const startDate = range.start.split('T')[0]
      const endDate = range.end.split('T')[0]
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        console.error('Formato de data inválido:', { startDate, endDate })
        return
      }
      setDateRange({ start: startDate, end: endDate })
    } catch (error) {
      console.error('Erro ao atualizar dateRange:', error)
    }
  }
  
  useEffect(() => {
    setImageVersion(Date.now())
  }, [])

  // Busca empresas do Supabase (sem dados mock)
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true)
      try {
        const data = await getCompanies()
        setCompanies(data)
        if (data.length > 0) {
          setSelectedCompanies(data.map(c => c.id))
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error)
        setCompanies([])
      } finally {
        setLoadingCompanies(false)
      }
    }
    fetchCompanies()
  }, [])

  // Busca dados do Supabase (sem dados mock/default)
  useEffect(() => {
    const fetchData = async () => {
      if (selectedCompanies.length === 0) {
        setAllData([])
        setLoading(false)
        return
      }
      
      // Valida se as datas são válidas
      if (!dateRange.start || !dateRange.end) {
        console.warn('Datas inválidas no filtro')
        setAllData([])
        setLoading(false)
        return
      }
      
      // Garante formato correto YYYY-MM-DD
      const startDate = dateRange.start.split('T')[0]
      const endDate = dateRange.end.split('T')[0]
      
      // Valida formato
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        console.error('Formato de data inválido:', { startDate, endDate })
        setAllData([])
        setLoading(false)
        return
      }
      
      // Valida que start <= end
      if (startDate > endDate) {
        console.error('Data inicial maior que data final:', { startDate, endDate })
        setAllData([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        const data = await getTaxData(selectedCompanies, startDate, endDate)
        setAllData(data || [])
      } catch (error) {
        console.error('Erro ao buscar dados do Supabase:', error)
        setAllData([])
        // Não deixa a tela branca - mantém estado anterior se possível
      } finally {
        setLoading(false)
      }
    }
    
    // Adiciona um pequeno delay para evitar múltiplas chamadas rápidas
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [selectedCompanies, dateRange.start, dateRange.end])

  const filteredData = useMemo(() => {
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return allData
    }
    
    // Filtra por string de data (YYYY-MM-DD) para evitar problemas de timezone
    const startDateStr = dateRange.start.split('T')[0]
    const endDateStr = dateRange.end.split('T')[0]
    
    return allData.filter(item => {
      if (!item.date) return false
      const itemDateStr = item.date.split('T')[0]
      return itemDateStr >= startDateStr && itemDateStr <= endDateStr
    })
  }, [allData, dateRange])

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      xmlCount: acc.xmlCount + item.xmlCount,
      nfCount: acc.nfCount + item.nfCount,
      nfcCount: acc.nfcCount + item.nfcCount,
      faturamento: acc.faturamento + (item.faturamento || 0),
      despesa: acc.despesa + (item.despesa || 0),
      resultado: acc.resultado + (item.resultado || 0),
    }), { 
      xmlCount: 0, 
      nfCount: 0, 
      nfcCount: 0, 
      faturamento: 0,
      despesa: 0,
      resultado: 0
    })
  }, [filteredData])

  return (
    <div className="xml-mouse-fix">
      <button
        onClick={onBack}
        className="flex items-center gap-2 md:gap-3 text-neutral-text-secondary hover:text-primary-blue mb-4 md:mb-6 transition-all duration-300 group card-3d inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl hover:bg-white/50 backdrop-3d touch-manipulation active:scale-95"
      >
        <div className="p-1.5 md:p-2 bg-gradient-to-br from-primary-blue/10 to-secondary-purple/10 rounded-lg group-hover:from-primary-blue/20 group-hover:to-secondary-purple/20 transition-all">
          <ArrowLeft size={16} className="md:w-[18px] md:h-[18px] group-hover:-translate-x-2 transition-transform duration-300" />
        </div>
        <span className="font-semibold text-sm md:text-base">Voltar para automações</span>
      </button>

      <div className="mb-6 md:mb-8 slide-in-up">
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <img 
              src={`/images/logo-2.png?t=${imageVersion}`}
              alt="REDE DE POSTOS WK Logo" 
              className="h-12 md:h-16 lg:h-20 w-auto object-contain"
              onError={(e) => {
                // Fallback para logo.png se logo-2.png não existir
                const target = e.target as HTMLImageElement
                if (target.src.includes('logo-2.png')) {
                  target.src = `/images/logo.png?t=${imageVersion}`
                }
              }}
              key={`logo-2-dash-${imageVersion}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-text-primary dark:text-slate-100 drop-shadow-sm transition-colors duration-500 break-words">
              {automation.name}
            </h2>
            <p className="text-neutral-text-secondary dark:text-slate-300 mt-1 md:mt-2 text-sm md:text-base lg:text-lg transition-colors duration-500 break-words">{automation.description}</p>
          </div>
        </div>
      </div>

      {loadingCompanies ? (
        <div className="text-center py-6 md:py-8 text-neutral-text-secondary text-sm md:text-base">Carregando empresas...</div>
      ) : (
        <Filters
          companies={companies}
          selectedCompanies={selectedCompanies}
          onCompaniesChange={setSelectedCompanies}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      )}

      {loading ? (
        <div className="text-center py-6 md:py-8 text-neutral-text-secondary text-sm md:text-base">Carregando dados...</div>
      ) : selectedCompanies.length === 0 ? (
        <div className="text-center py-8 md:py-12 text-neutral-text-secondary px-4">
          <p className="text-base md:text-lg mb-2">Selecione pelo menos uma empresa para visualizar os dados.</p>
          <p className="text-xs md:text-sm">Use os filtros acima para selecionar as empresas desejadas.</p>
        </div>
      ) : (
        <>
          {/* Cards de contagens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            <StatCard
              title="XML"
              value={totals.xmlCount.toLocaleString()}
              icon={FileText}
              gradient="from-primary-blue to-primary-blue-dark"
            />
            <StatCard
              title="NF"
              value={totals.nfCount.toLocaleString()}
              icon={Receipt}
              gradient="from-secondary-purple to-secondary-purple-dark"
            />
            <StatCard
              title="NFC"
              value={totals.nfcCount.toLocaleString()}
              icon={CreditCard}
              gradient="from-status-success to-green-600"
            />
          </div>

          {/* Cards financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <FinancialCard
              title="Faturamento"
              subtitle="Saída"
              value={totals.faturamento}
              icon={DollarSign}
              gradient="from-green-500 to-green-600"
              isPositive={true}
            />
            <FinancialCard
              title="Despesa"
              subtitle="Entrada"
              value={totals.despesa}
              icon={DollarSign}
              gradient="from-red-500 to-red-600"
              isPositive={false}
            />
            <FinancialCard
              title="Resultado"
              subtitle="Saída - Entrada"
              value={totals.resultado}
              icon={totals.resultado >= 0 ? TrendingUp : TrendingDown}
              gradient={totals.resultado >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"}
              isPositive={totals.resultado >= 0}
            />
          </div>

          <ErrorBoundary>
            <XmlCharts data={filteredData} dateRange={dateRange} />
          </ErrorBoundary>

          <div className="mt-6 md:mt-8 mb-6 md:mb-8">
            <ErrorBoundary>
              <SafeCompanyMap selectedCompanyIds={selectedCompanies || []} dateRange={dateRange} />
            </ErrorBoundary>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient 
}: { 
  title: string
  value: string
  icon: any
  gradient: string
}) {
  return (
    <div className="card-3d shadow-3d-hover bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className={`p-3 md:p-4 bg-gradient-to-br ${gradient} rounded-lg md:rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg md:rounded-xl"></div>
            <Icon className="text-white relative z-10" size={20} style={{ width: '20px', height: '20px' }} />
          </div>
        </div>
        <h3 className="text-xs md:text-sm font-medium text-neutral-text-secondary mb-2 md:mb-3">{title}</h3>
        <p className="text-2xl md:text-3xl font-bold text-neutral-text-primary drop-shadow-sm break-words">{value}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-blue via-secondary-purple to-primary-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
    </div>
  )
}

function FinancialCard({ 
  title, 
  subtitle,
  value, 
  icon: Icon, 
  gradient,
  isPositive
}: { 
  title: string
  subtitle: string
  value: number
  icon: any
  gradient: string
  isPositive: boolean
}) {
  const formattedValue = `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const sign = value >= 0 ? '+' : '-'
  
  return (
    <div className={`card-3d shadow-3d-hover bg-gradient-to-br from-white via-white to-neutral-background border-2 ${isPositive ? 'border-green-200' : 'border-red-200'} rounded-xl md:rounded-2xl p-4 md:p-6 group relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isPositive ? 'from-green-500/10 via-transparent to-green-600/10' : 'from-red-500/10 via-transparent to-red-600/10'}`}></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className={`p-3 md:p-4 bg-gradient-to-br ${gradient} rounded-lg md:rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg md:rounded-xl"></div>
            <Icon className="text-white relative z-10" size={20} style={{ width: '20px', height: '20px' }} />
          </div>
        </div>
        <h3 className="text-xs md:text-sm font-medium text-neutral-text-secondary mb-1">{title}</h3>
        <p className="text-xs text-neutral-text-secondary mb-2 md:mb-3">{subtitle}</p>
        <p className={`text-xl md:text-2xl lg:text-3xl font-bold drop-shadow-sm break-words ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {formattedValue}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${isPositive ? 'from-green-500 via-green-400 to-green-500' : 'from-red-500 via-red-400 to-red-500'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
    </div>
  )
}
