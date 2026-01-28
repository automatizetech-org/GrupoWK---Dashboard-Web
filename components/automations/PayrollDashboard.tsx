'use client'

import { useState, useMemo } from 'react'
import { type Automation, type Department, companies, generateMockPayrollData, type PayrollData } from '@/lib/data'
import Filters from '../Filters'
import PayrollCharts from '../charts/PayrollCharts'
import PayrollTable from '../tables/PayrollTable'
import { ArrowLeft, Users, DollarSign, TrendingUp } from 'lucide-react'

interface PayrollDashboardProps {
  automation: Automation
  department: Department
  onBack: () => void
}

export default function PayrollDashboard({ automation, department, onBack }: PayrollDashboardProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(companies.map(c => c.id))
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2024-01-01',
    end: '2024-06-30',
  })

  const allData = useMemo(() => generateMockPayrollData(selectedCompanies), [selectedCompanies])
  const filteredData = useMemo(() => {
    return allData.filter(item => {
      const itemDate = new Date(item.date)
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      return itemDate >= startDate && itemDate <= endDate
    })
  }, [allData, dateRange])

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      employeeCount: acc.employeeCount + item.employeeCount,
      totalSalary: acc.totalSalary + item.totalSalary,
      benefits: acc.benefits + item.benefits,
      taxes: acc.taxes + item.taxes,
      netAmount: acc.netAmount + item.netAmount,
    }), { employeeCount: 0, totalSalary: 0, benefits: 0, taxes: 0, netAmount: 0 })
  }, [filteredData])

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-3 text-neutral-text-secondary hover:text-primary-blue mb-6 transition-all duration-300 group card-3d inline-block px-4 py-2 rounded-xl hover:bg-white/50 backdrop-3d"
      >
        <div className="p-2 bg-gradient-to-br from-status-success/10 to-primary-blue/10 rounded-lg group-hover:from-status-success/20 group-hover:to-primary-blue/20 transition-all">
          <ArrowLeft size={18} className="group-hover:-translate-x-2 transition-transform duration-300" />
        </div>
        <span className="font-semibold">Voltar para automações</span>
      </button>

      <div className="mb-8 slide-in-up">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-status-success via-green-500 to-green-600 rounded-2xl shadow-3d neon-glow-hover relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <Users className="text-white relative z-10" size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-bold text-neutral-text-primary drop-shadow-sm">
              {automation.name}
            </h2>
            <p className="text-neutral-text-secondary mt-2 text-lg">{automation.description}</p>
          </div>
        </div>
      </div>

      <Filters
        companies={companies}
        selectedCompanies={selectedCompanies}
        onCompaniesChange={setSelectedCompanies}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Funcionários"
          value={totals.employeeCount.toLocaleString()}
          icon={Users}
          gradient="from-primary-blue to-primary-blue-dark"
        />
        <StatCard
          title="Salários"
          value={`R$ ${totals.totalSalary.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          gradient="from-secondary-purple to-secondary-purple-dark"
        />
        <StatCard
          title="Benefícios"
          value={`R$ ${totals.benefits.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          gradient="from-status-success to-green-600"
        />
        <StatCard
          title="Impostos"
          value={`R$ ${totals.taxes.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          gradient="from-status-warning to-orange-600"
        />
        <StatCard
          title="Líquido"
          value={`R$ ${totals.netAmount.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          gradient="from-status-info to-blue-600"
        />
      </div>

      <PayrollCharts data={filteredData} />

      <div className="mt-8">
        <PayrollTable data={filteredData} />
      </div>
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
    <div className="bg-gradient-to-br from-neutral-surface to-neutral-background border border-neutral-border rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${gradient} rounded-lg shadow-md group-hover:scale-110 transition-transform`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-neutral-text-secondary mb-2">{title}</h3>
      <p className="text-2xl font-bold text-neutral-text-primary">{value}</p>
    </div>
  )
}
