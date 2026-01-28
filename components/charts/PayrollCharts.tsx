'use client'

import { useMemo } from 'react'
import { type PayrollData } from '@/lib/data'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PayrollChartsProps {
  data: PayrollData[]
}

export default function PayrollCharts({ data }: PayrollChartsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-neutral-text-secondary">
        Nenhum dado disponível para exibir
      </div>
    )
  }

  const companyData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.companyName]) {
        acc[item.companyName] = {
          name: item.companyName,
          totalSalary: 0,
          benefits: 0,
          taxes: 0,
          netAmount: 0,
          employeeCount: 0,
        }
      }
      acc[item.companyName].totalSalary += item.totalSalary
      acc[item.companyName].benefits += item.benefits
      acc[item.companyName].taxes += item.taxes
      acc[item.companyName].netAmount += item.netAmount
      acc[item.companyName].employeeCount += item.employeeCount
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
  }, [data])

  const evolutionData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.period]) {
        acc[item.period] = {
          period: item.period,
          totalSalary: 0,
          benefits: 0,
          taxes: 0,
          netAmount: 0,
        }
      }
      acc[item.period].totalSalary += item.totalSalary
      acc[item.period].benefits += item.benefits
      acc[item.period].taxes += item.taxes
      acc[item.period].netAmount += item.netAmount
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period))
  }, [data])

  const costBreakdown = useMemo(() => {
    const totals = data.reduce((acc, item) => ({
      salary: acc.salary + item.totalSalary,
      benefits: acc.benefits + item.benefits,
      taxes: acc.taxes + item.taxes,
    }), { salary: 0, benefits: 0, taxes: 0 })
    
    return [
      { name: 'Salários', value: totals.salary },
      { name: 'Benefícios', value: totals.benefits },
      { name: 'Impostos', value: totals.taxes },
    ]
  }, [data])

  const chartColors = ['#2563EB', '#10B981', '#F59E0B']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
        <h3 className="text-xl font-bold text-neutral-text-primary mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          Distribuição de Custos
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <defs>
              {costBreakdown.map((entry, index) => (
                <linearGradient key={`payroll-cost-gradient-${index}`} id={`payroll-cost-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors[index]} stopOpacity={1} />
                  <stop offset="100%" stopColor={chartColors[index]} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={costBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent, value }) => 
                `${name}\n${(percent * 100).toFixed(1)}%\n(R$ ${(value / 1000).toFixed(0)}k)`
              }
              outerRadius={120}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
              animationDuration={1000}
              isAnimationActive={true}
            >
              {costBreakdown.map((entry, index) => (
                <Cell 
                  key={`payroll-cost-cell-${index}`} 
                  fill={`url(#payroll-cost-gradient-${index})`}
                  stroke={chartColors[index]}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden rotate-3d">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
        <h3 className="text-xl font-bold text-neutral-text-primary mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          Folha por Empresa
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={companyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
            <Legend />
            <Bar dataKey="totalSalary" fill="#2563EB" name="Salários" radius={[8, 8, 0, 0]} />
            <Bar dataKey="benefits" fill="#10B981" name="Benefícios" radius={[8, 8, 0, 0]} />
            <Bar dataKey="taxes" fill="#F59E0B" name="Impostos" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
        <h3 className="text-xl font-bold text-neutral-text-primary mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          Evolução da Folha de Pagamento
        </h3>
        <ResponsiveContainer width="100%" height={450}>
          <AreaChart data={evolutionData}>
            <defs>
              <linearGradient id="payroll-salary-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="payroll-benefits-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="payroll-taxes-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="payroll-net-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
            <XAxis dataKey="period" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
            <Legend iconType="circle" />
            <Area
              type="monotone"
              dataKey="totalSalary"
              stroke="#2563EB"
              strokeWidth={3}
              fill="url(#payroll-salary-gradient)"
              name="Salários"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="benefits"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#payroll-benefits-gradient)"
              name="Benefícios"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="taxes"
              stroke="#F59E0B"
              strokeWidth={3}
              fill="url(#payroll-taxes-gradient)"
              name="Impostos"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="netAmount"
              stroke="#7C3AED"
              strokeWidth={3}
              fill="url(#payroll-net-gradient)"
              name="Valor Líquido"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
