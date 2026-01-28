'use client'

import { useEffect, useMemo, useState } from 'react'
import { type AccountsPayableData } from '@/lib/data'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AccountsPayableChartsProps {
  data: AccountsPayableData[]
}

export default function AccountsPayableCharts({ data }: AccountsPayableChartsProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-neutral-text-secondary dark:text-slate-400">
        Nenhum dado disponível para exibir
      </div>
    )
  }

  const statusData = useMemo(() => {
    // Conta contas pagas e vencidas baseado em paidValue e pendingValue
    // Usa clientCode + clientName como chave única para não duplicar clientes
    const clientKeys = new Set<string>()
    let paidCount = 0
    let overdueCount = 0
    
    data.forEach(item => {
      // Gera chave única do cliente
      let clientKey: string
      if (item.clientCode && item.clientName) {
        clientKey = `${item.clientCode}-${item.clientName}`
      } else if (item.supplier) {
        clientKey = item.supplier
      } else if (item.clientName) {
        clientKey = item.clientName
      } else {
        clientKey = `unknown-${item.id}`
      }
      
      // Se já processou este cliente, pula (evita duplicação)
      if (clientKeys.has(clientKey)) {
        return
      }
      clientKeys.add(clientKey)
      
      // Verifica se tem valores pagos ou pendentes
      const paidVal = Number(item.paidValue) || 0
      const pendingVal = Number(item.pendingValue) || 0
      
      if (paidVal > 0) {
        paidCount++
      }
      if (pendingVal > 0) {
        overdueCount++
      }
    })
    
    return [
      { name: 'Pagas', value: paidCount },
      { name: 'Vencidas', value: overdueCount },
    ]
  }, [data])

  // Gráfico de dias vencidos
  const daysOverdueData = useMemo(() => {
    // Agrupa por faixas de dias vencidos
    const ranges = [
      { name: '0-7 dias', min: 0, max: 7 },
      { name: '8-15 dias', min: 8, max: 15 },
      { name: '16-30 dias', min: 16, max: 30 },
      { name: '31-60 dias', min: 31, max: 60 },
      { name: '60+ dias', min: 61, max: Infinity },
    ]
    
    const grouped = ranges.map(range => {
      const count = data.filter(item => {
        const days = item.daysOverdue || 0
        return days >= range.min && days <= range.max
      }).length
      return { name: range.name, value: count }
    })
    
    return grouped.filter(item => item.value > 0) // Apenas faixas com dados
  }, [data])
  
  const categoryData = useMemo(() => {
    // Agrupa por tipo de cobrança (category agora é tipo de cobrança)
    const grouped = data.reduce((acc, item) => {
      const category = item.category || 'Sem tipo'
      if (!acc[category]) {
        acc[category] = { name: category, amount: 0, count: 0 }
      }
      acc[category].amount += (item.pendingValue || item.amount || 0)
      acc[category].count += 1
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
  }, [data])

  const clientData = useMemo(() => {
    // Agrupa por cliente usando clientCode + clientName como chave única
    // (clientes com mesmo nome mas códigos diferentes são tratados como clientes diferentes)
    const grouped = data.reduce((acc, item) => {
      // Usa clientCode + clientName como chave única, ou supplier se já tiver o formato
      let clientKey: string
      let displayName: string
      
      if (item.clientCode && item.clientName) {
        clientKey = `${item.clientCode}-${item.clientName}`
        displayName = `${item.clientCode} - ${item.clientName}`
      } else if (item.supplier) {
        // supplier já pode ter o formato "código - nome"
        clientKey = item.supplier
        displayName = item.supplier
      } else if (item.clientName) {
        clientKey = item.clientName
        displayName = item.clientName
      } else {
        clientKey = 'Cliente Desconhecido'
        displayName = 'Cliente Desconhecido'
      }
      
      if (!acc[clientKey]) {
        acc[clientKey] = {
          name: displayName,
          total: 0,
          paid: 0,
          overdue: 0,
        }
      }
      
      // Calcula valores baseado nos campos paidValue e pendingValue (não em status)
      const paidVal = Number(item.paidValue) || 0
      const pendingVal = Number(item.pendingValue) || 0
      const totalVal = Number(item.totalValue) || Number(item.amount) || 0
      
      // Se tem valor pago, adiciona em "paid"
      if (paidVal > 0) {
        acc[clientKey].paid += paidVal
      }
      
      // Se tem valor pendente, adiciona em "overdue"
      if (pendingVal > 0) {
        acc[clientKey].overdue += pendingVal
      }
      
      // Total é a soma de tudo
      acc[clientKey].total += totalVal
      
      return acc
    }, {} as Record<string, any>)
    
    // Ordena por total (maior primeiro) e retorna
    return Object.values(grouped).sort((a: any, b: any) => b.total - a.total)
  }, [data])

  const chartColors = ['#10B981', '#EF4444'] // Apenas Pagas e Vencidas
  const daysOverdueColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444']

  const mobileClientData = useMemo(() => {
    // No mobile, limita para manter legível (top clientes por total)
    const max = 12
    return clientData.slice(0, max)
  }, [clientData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
      <div className="card-3d-elevated rounded-xl md:rounded-2xl p-4 md:p-8 shadow-3d relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10"></div>
        <h3 className="text-base md:text-xl font-bold text-neutral-text-primary dark:text-slate-100 mb-3 md:mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          <span className="break-words">Status das Contas</span>
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 320 : 350}>
          <PieChart style={{ filter: 'drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.15))' }}>
            <defs>
              {statusData.map((entry, index) => (
                <linearGradient key={`ap-status-gradient-${index}`} id={`ap-status-gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={chartColors[index]} stopOpacity={1} />
                  <stop offset="50%" stopColor={chartColors[index]} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors[index]} stopOpacity={0.6} />
                </linearGradient>
              ))}
              <filter id="shadow-3d">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="2" dy="4" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              // No mobile, remove labels (evita cortar %) e usa tooltip/legend
              label={isMobile ? false : ({ name, percent, value }) => `${name}\n${(percent * 100).toFixed(1)}%\n(${value})`}
              outerRadius={isMobile ? 110 : 130}
              innerRadius={isMobile ? 52 : 60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={isMobile ? 2 : 4}
              animationDuration={1000}
              isAnimationActive={true}
            >
              {statusData.map((entry, index) => (
                <Cell 
                  key={`ap-status-cell-${index}`} 
                  fill={`url(#ap-status-gradient-${index})`}
                  stroke={chartColors[index]}
                  strokeWidth={3}
                  style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.2))' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--ap-tooltip-bg)',
                border: '1px solid var(--ap-tooltip-border)',
                color: 'var(--ap-tooltip-text)',
                borderRadius: 12,
              }}
              labelStyle={{ color: 'var(--ap-tooltip-text)' }}
              itemStyle={{ color: 'var(--ap-tooltip-text)' }}
            />
            {isMobile && (
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                iconType="circle"
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card-3d-elevated rounded-xl md:rounded-2xl p-4 md:p-8 shadow-3d relative overflow-hidden rotate-3d">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10"></div>
        <h3 className="text-base md:text-xl font-bold text-neutral-text-primary dark:text-slate-100 mb-3 md:mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          <span className="break-words">Dias Vencidos</span>
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 350}>
          <BarChart data={daysOverdueData}>
            <XAxis dataKey="name" stroke="var(--ap-chart-axis)" fontSize={12} />
            <YAxis stroke="var(--ap-chart-axis)" fontSize={12} />
            <Tooltip
              formatter={(value: number) => `${value} título(s)`}
              contentStyle={{
                backgroundColor: 'var(--ap-tooltip-bg)',
                border: '1px solid var(--ap-tooltip-border)',
                color: 'var(--ap-tooltip-text)',
                borderRadius: 12,
              }}
              labelStyle={{ color: 'var(--ap-tooltip-text)' }}
              itemStyle={{ color: 'var(--ap-tooltip-text)' }}
            />
            <Bar dataKey="value" fill="#7C3AED" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-3d-elevated rounded-xl md:rounded-2xl p-3 md:p-6 shadow-3d relative overflow-hidden lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10"></div>
        <div className="flex items-center justify-between gap-2 relative z-10 mb-2">
          <h3 className="text-base md:text-xl font-bold text-neutral-text-primary dark:text-slate-100 flex items-center gap-2">
            <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
            <span className="break-words">Contas por Cliente</span>
          </h3>
          {isMobile && clientData.length > mobileClientData.length && (
            <span className="text-[11px] text-neutral-text-secondary dark:text-slate-400 whitespace-nowrap">
              Top {mobileClientData.length}
            </span>
          )}
        </div>

        {isMobile ? (
          // Mobile: barras horizontais (nomes ficam legíveis, sem empilhar)
          <ResponsiveContainer width="100%" height={Math.max(420, mobileClientData.length * 46)}>
            <BarChart
              data={mobileClientData}
              layout="vertical"
              margin={{ top: 10, right: 16, left: 8, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" opacity={0.55} />
              <XAxis
                type="number"
                stroke="var(--ap-chart-axis)"
                fontSize={11}
                tickFormatter={(v) => {
                  const value = Number(v) || 0
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                  return value.toString()
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke="var(--ap-chart-axis)"
                fontSize={11}
                tick={{ fill: 'var(--ap-chart-axis)' }}
              />
              <Tooltip
                formatter={(value: number) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, undefined]}
                contentStyle={{
                  backgroundColor: 'var(--ap-tooltip-bg)',
                  border: '1px solid var(--ap-tooltip-border)',
                  color: 'var(--ap-tooltip-text)',
                  borderRadius: 12,
                }}
                labelStyle={{ color: 'var(--ap-tooltip-text)' }}
                itemStyle={{ color: 'var(--ap-tooltip-text)' }}
              />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
              <Bar dataKey="paid" fill="#10B981" name="Pagas" radius={[0, 8, 8, 0]} />
              <Bar dataKey="overdue" fill="#EF4444" name="Vencidas" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // Desktop: mantém o gráfico atual
          <ResponsiveContainer width="100%" height={780}>
            <BarChart data={clientData} margin={{ top: 10, right: 20, left: 10, bottom: 160 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" opacity={0.55} />
              <XAxis
                dataKey="name"
                stroke="var(--ap-chart-axis)"
                fontSize={14}
                angle={-45}
                textAnchor="end"
                height={160}
                dy={8}
                interval={0}
              />
              <YAxis stroke="var(--ap-chart-axis)" fontSize={12} />
              <Tooltip
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, undefined]}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div
                      className="rounded-xl border px-4 py-3 shadow-lg"
                      style={{
                        backgroundColor: 'var(--ap-tooltip-bg)',
                        borderColor: 'var(--ap-tooltip-border)',
                      }}
                    >
                      <p className="font-semibold mb-2" style={{ color: 'var(--ap-tooltip-text)' }}>
                        {label}
                      </p>
                      {payload.map((entry) => (
                        <p key={String(entry.dataKey)} className="text-sm font-medium" style={{ color: entry.name === 'Vencidas' ? '#EF4444' : '#10B981' }}>
                          {entry.name}: R$ {Number(entry.value).toLocaleString('pt-BR')}
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend verticalAlign="bottom" wrapperStyle={{ marginBottom: -120, paddingTop: 0 }} />
              <Bar dataKey="paid" fill="#10B981" name="Pagas" radius={[8, 8, 0, 0]} />
              <Bar dataKey="overdue" fill="#EF4444" name="Vencidas" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
