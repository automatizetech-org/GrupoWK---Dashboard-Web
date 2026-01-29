'use client'

import { useState, useMemo, useEffect } from 'react'
import { type TaxData } from '@/lib/data'
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface XmlChartsProps {
  data: TaxData[]
  dateRange?: { start: string; end: string }
}

export default function XmlCharts({ data, dateRange }: XmlChartsProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Valida dateRange antes de usar - DEVE estar antes de qualquer early return
  const safeDateRange = useMemo(() => {
    if (!dateRange) return undefined
    try {
      const start = dateRange.start?.split('T')[0]
      const end = dateRange.end?.split('T')[0]
      if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return undefined
      }
      return { start, end }
    } catch (error) {
      console.error('Erro ao validar dateRange:', error)
      return undefined
    }
  }, [dateRange])
  
  // TODOS os hooks devem ser chamados antes de qualquer early return
  const companyData = useMemo(() => {
    if (!data || data.length === 0) return []
    const grouped = data.reduce((acc, item) => {
      // Agrupa TODOS os dados por empresa (incluindo dados de evolução)
      if (!item.companyName) return acc
      
      if (!acc[item.companyName]) {
        acc[item.companyName] = {
          name: item.companyName,
          xmlCount: 0,
          nfCount: 0,
          nfcCount: 0,
          faturamento: 0,
          despesa: 0,
          resultado: 0,
        }
      }
      acc[item.companyName].xmlCount += (item.xmlCount || 0)
      acc[item.companyName].nfCount += (item.nfCount || 0)
      acc[item.companyName].nfcCount += (item.nfcCount || 0)
      acc[item.companyName].faturamento += (item.faturamento || 0)
      acc[item.companyName].despesa += (item.despesa || 0)
      // Resultado = Faturamento - Despesa
      acc[item.companyName].resultado = acc[item.companyName].faturamento - acc[item.companyName].despesa
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
  }, [data])

  const evolutionData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    if (!safeDateRange || !safeDateRange.start || !safeDateRange.end) {
      // Fallback para comportamento antigo se não houver dateRange
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.period]) {
          acc[item.period] = {
            period: item.period,
            xmlCount: 0,
            nfCount: 0,
            nfcCount: 0,
            faturamento: 0,
            despesa: 0,
            resultado: 0,
          }
        }
        acc[item.period].xmlCount += item.xmlCount
        acc[item.period].nfCount += item.nfCount
        acc[item.period].nfcCount += item.nfcCount
        acc[item.period].faturamento += (item.faturamento || 0)
        acc[item.period].despesa += (item.despesa || 0)
        // Resultado = Faturamento - Despesa (mesmo cálculo do dashboard.py)
        acc[item.period].resultado = acc[item.period].faturamento - acc[item.period].despesa
        return acc
      }, {} as Record<string, any>)
      return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period))
    }

    // Filtra dados pelo range de datas ANTES de processar
    if (!safeDateRange) {
      // Fallback: agrupa por período sem filtrar por data
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.period]) {
          acc[item.period] = {
            period: item.period,
            xmlCount: 0,
            nfCount: 0,
            nfcCount: 0,
            faturamento: 0,
            despesa: 0,
            resultado: 0,
          }
        }
        acc[item.period].xmlCount += item.xmlCount
        acc[item.period].nfCount += item.nfCount
        acc[item.period].nfcCount += item.nfcCount
        acc[item.period].faturamento += (item.faturamento || 0)
        acc[item.period].despesa += (item.despesa || 0)
        acc[item.period].resultado = acc[item.period].faturamento - acc[item.period].despesa
        return acc
      }, {} as Record<string, any>)
      return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period))
    }
    
    const startDateStr = safeDateRange.start.split('T')[0]
    const endDateStr = safeDateRange.end.split('T')[0]
    
    const filteredData = data.filter(item => {
      if (!item.date) return false
      const itemDateStr = item.date.split('T')[0]
      return itemDateStr >= startDateStr && itemDateStr <= endDateStr
    })

    // Diferença de dias INCLUSIVA (01 a 31 = 31 dias)
    const startDate = new Date(`${startDateStr}T00:00:00`)
    const endDate = new Date(`${endDateStr}T00:00:00`)
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

    // Verifica se há dados de evolução (isEvolutionData = true) - usa dados filtrados
    const evolutionDataItems = filteredData.filter(item => item.isEvolutionData === true)
    const hasEvolutionData = evolutionDataItems.length > 0
    
    // Agrupa dados existentes por período
    const dataByPeriod: Record<string, { 
      xmlCount: number; 
      nfCount: number; 
      nfcCount: number; 
      faturamento: number;
      despesa: number;
      resultado: number;
      valorAcumulado?: number;  // Para dados de evolução
      valorDiario?: number;     // Para dados de evolução
    }> = {}
    
    filteredData.forEach((item) => {
      let periodKey = ''
      if (diffDays <= 31) {
        // Por dias: SEMPRE usa a data real (dd/mm)
        if (item.date) {
          const dStr = item.date.split('T')[0]
          const d = new Date(`${dStr}T00:00:00`)
          const day = d.getDate()
          const month = d.getMonth() + 1
          periodKey = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
        } else if (item.period) {
          periodKey = item.period
        }
      } else {
        // Por meses: usar formato YYYY-MM
        periodKey = item.period || ''
      }

      if (periodKey) {
        if (!dataByPeriod[periodKey]) {
          dataByPeriod[periodKey] = { 
            xmlCount: 0, 
            nfCount: 0, 
            nfcCount: 0, 
            faturamento: 0,
            despesa: 0,
            resultado: 0,
            valorAcumulado: undefined,
            valorDiario: undefined,
          }
        }
        
        // Se é dado de evolução, SOMA os valores de todas as empresas para o mesmo período
        if (item.isEvolutionData && item.valorAcumulado !== undefined) {
          // SOMA o valor acumulado de todas as empresas
          dataByPeriod[periodKey].valorAcumulado = (dataByPeriod[periodKey].valorAcumulado || 0) + (item.valorAcumulado || 0)
          // SOMA o valor diário de todas as empresas
          dataByPeriod[periodKey].valorDiario = (dataByPeriod[periodKey].valorDiario || 0) + (item.valorDiario || 0)
          // SOMA documentos e valores financeiros de todas as empresas
          dataByPeriod[periodKey].xmlCount += (item.xmlCount || 0)
          dataByPeriod[periodKey].nfCount += (item.nfCount || 0)
          dataByPeriod[periodKey].nfcCount += (item.nfcCount || 0)
          dataByPeriod[periodKey].faturamento += (item.faturamento || 0)
          dataByPeriod[periodKey].despesa += (item.despesa || 0)
          // Resultado = Faturamento - Despesa (soma de todas as empresas)
          dataByPeriod[periodKey].resultado = dataByPeriod[periodKey].faturamento - dataByPeriod[periodKey].despesa
        } else {
          // Dados agregados normais
          dataByPeriod[periodKey].xmlCount += item.xmlCount
          dataByPeriod[periodKey].nfCount += item.nfCount
          dataByPeriod[periodKey].nfcCount += item.nfcCount
          // Valores financeiros: mesmo cálculo do dashboard.py
          // Faturamento = amount_1 (Saída), Despesa = amount_2 (Entrada)
          dataByPeriod[periodKey].faturamento += (item.faturamento || 0)
          dataByPeriod[periodKey].despesa += (item.despesa || 0)
          // Resultado = Faturamento - Despesa (mesmo cálculo do dashboard.py)
          dataByPeriod[periodKey].resultado = dataByPeriod[periodKey].faturamento - dataByPeriod[periodKey].despesa
        }
      }
    })

    // Gera todos os períodos do range, mesmo sem dados
    const allPeriods: Array<{ 
      period: string; 
      xmlCount: number; 
      nfCount: number; 
      nfcCount: number; 
      faturamento: number;
      despesa: number;
      resultado: number;
      valorAcumulado?: number;
      valorDiario?: number;
    }> = []
    
    if (diffDays <= 31) {
      // Sempre gera TODOS os dias do range (inclusive), mesmo se não houver dados (zera)
      const cursor = new Date(startDate.getTime())
      while (cursor.getTime() <= endDate.getTime()) {
        const key = `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`
        allPeriods.push({
          period: key,
          xmlCount: dataByPeriod[key]?.xmlCount || 0,
          nfCount: dataByPeriod[key]?.nfCount || 0,
          nfcCount: dataByPeriod[key]?.nfcCount || 0,
          faturamento: dataByPeriod[key]?.faturamento || 0,
          despesa: dataByPeriod[key]?.despesa || 0,
          resultado: dataByPeriod[key]?.resultado || 0,
          valorAcumulado: dataByPeriod[key]?.valorAcumulado,
          valorDiario: (dataByPeriod as any)[key]?.valorDiario,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      
      // Calcula valores acumulados de XML, NF e NFC ao longo dos dias
      let xmlAcumulado = 0
      let nfAcumulado = 0
      let nfcAcumulado = 0
      allPeriods.forEach((period) => {
        xmlAcumulado += period.xmlCount
        nfAcumulado += period.nfCount
        nfcAcumulado += period.nfcCount
        period.xmlCount = xmlAcumulado
        period.nfCount = nfAcumulado
        period.nfcCount = nfcAcumulado
      })
    } else {
      // Por meses: todos os meses do range
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const periodKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
        allPeriods.push({
          period: periodKey,
          xmlCount: dataByPeriod[periodKey]?.xmlCount || 0,
          nfCount: dataByPeriod[periodKey]?.nfCount || 0,
          nfcCount: dataByPeriod[periodKey]?.nfcCount || 0,
          faturamento: dataByPeriod[periodKey]?.faturamento || 0,
          despesa: dataByPeriod[periodKey]?.despesa || 0,
          resultado: dataByPeriod[periodKey]?.resultado || 0,
        })
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    return allPeriods
  }, [data, safeDateRange?.start, safeDateRange?.end])
  
  // Verifica se há dados de evolução com valorAcumulado (para o gráfico)
  const hasEvolutionDataForChart = useMemo(() => {
    if (!safeDateRange) return false
    const evolutionDataItems = data.filter(item => item.isEvolutionData === true)
    return evolutionDataItems.length > 0 && evolutionDataItems.some((item: any) => item.valorAcumulado !== undefined)
  }, [data, safeDateRange])

  // Calcula domínio do eixo Y único (acomoda documentos e valores monetários)
  const yAxisDomain = useMemo(() => {
    if (!evolutionData || evolutionData.length === 0) return ['auto', 'auto']
    
    // Coleta todos os valores (documentos e valores monetários)
    const allValues: number[] = []
    evolutionData.forEach((item: any) => {
      // Documentos
      allValues.push(item.xmlCount || 0)
      allValues.push(item.nfCount || 0)
      allValues.push(item.nfcCount || 0)
      // Valores monetários
      if (hasEvolutionDataForChart && item.valorAcumulado !== undefined) {
        allValues.push(item.valorAcumulado)
      } else {
        allValues.push(item.faturamento || 0)
        allValues.push(item.despesa || 0)
        allValues.push(item.resultado || 0)
      }
    })
    
    if (allValues.length === 0) return ['auto', 'auto']
    
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const range = maxValue - minValue
    
    let finalMin: number
    let finalMax: number
    
    if (minValue < 0) {
      // Para valores negativos: garantir espaço extra
      const absoluteMin = Math.abs(minValue)
      const spaceFromMin = absoluteMin * 2.0
      const spaceFromRange = range > 0 ? range * 1.5 : 0
      const totalSpace = Math.max(spaceFromMin, spaceFromRange, absoluteMin * 1.5, 100000)
      finalMin = minValue - totalSpace
      finalMax = maxValue + Math.max(range * 0.5, absoluteMin * 0.3, 10000)
    } else {
      // Para valores apenas positivos
      finalMin = Math.max(0, minValue - (range * 0.2))
      finalMax = maxValue + Math.max(range * 0.3, maxValue * 0.2, 1000)
    }
    
    return [finalMin, finalMax]
  }, [evolutionData, hasEvolutionDataForChart])

  // Processa dados para áreas positivas e negativas (para "montanhas de energia negativa")
  // Mantém todos os dados em um único array ordenado, mas com campos separados para positivo/negativo
  const evolutionDataProcessed = useMemo(() => {
    if (!evolutionData || evolutionData.length === 0) return []
    
    return evolutionData.map((item: any) => {
      const valor = hasEvolutionDataForChart ? item.valorAcumulado : item.resultado
      if (valor !== undefined) {
        if (valor >= 0) {
          return { ...item, valorPositivo: valor, valorNegativo: 0 }
        } else {
          return { ...item, valorPositivo: 0, valorNegativo: valor }
        }
      } else {
        return { ...item, valorPositivo: 0, valorNegativo: 0 }
      }
    })
  }, [evolutionData, hasEvolutionDataForChart])

  const documentTypeData = useMemo(() => {
    const totals = data.reduce((acc, item) => ({
      XML: acc.XML + item.xmlCount,
      NF: acc.NF + item.nfCount,
      NFC: acc.NFC + item.nfcCount,
    }), { XML: 0, NF: 0, NFC: 0 })
    
    return [
      { name: 'XML', value: totals.XML },
      { name: 'NF', value: totals.NF },
      { name: 'NFC', value: totals.NFC },
    ]
  }, [data])

  const chartColors = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6']

  // Early return APÓS todos os hooks serem chamados
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-neutral-text-secondary">
        Nenhum dado disponível para exibir
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataKeyMap: Record<string, string> = {
        'xmlCount': 'XML',
        'nfCount': 'NF',
        'nfcCount': 'NFC',
        'faturamento': 'Faturamento',
        'despesa': 'Despesa',
        'resultado': 'Resultado',
        'valorAcumulado': 'Acumulado',
        'totalAmount': 'Valor Total'
      }
      
      // Separa documentos (quantidades) de valores monetários
      const documentKeys = ['xmlCount', 'nfCount', 'nfcCount']
      const monetaryKeys = ['faturamento', 'despesa', 'resultado', 'valorAcumulado']
      
      const payloadData = payload[0]?.payload
      const hasEvolutionData = payloadData?.valorAcumulado !== undefined || payloadData?.valorDiario !== undefined
      
      // Separa payloads em documentos e valores
      const documentPayloads = payload.filter((p: any) => documentKeys.includes(p.dataKey))
      const monetaryPayloads = payload.filter((p: any) => monetaryKeys.includes(p.dataKey))
      
      // Calcula valor acumulado se não estiver disponível mas houver resultado
      let valorAcumulado = payloadData?.valorAcumulado
      let valorDiario = payloadData?.valorDiario
      
      // Se não tem dados de evolução mas tem resultado, usa o resultado como referência
      if (!hasEvolutionData && payloadData?.resultado !== undefined) {
        valorAcumulado = payloadData.resultado
      }
      
      return (
        <div className="backdrop-3d border border-neutral-border/50 rounded-xl shadow-3d p-4 neon-glow relative z-50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/10 via-transparent to-secondary-purple/10 rounded-xl"></div>
          <p className="font-bold text-neutral-text-primary mb-2 relative z-10">{payloadData?.period || payloadData?.name || ''}</p>
          
          {/* Documentos (quantidades) - sem formatação de moeda */}
          {documentPayloads.length > 0 && (
            <div className="mb-2 relative z-10">
              {documentPayloads.map((entry: any, index: number) => (
                <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                  {`${dataKeyMap[entry.dataKey] || entry.dataKey}: ${Math.round(entry.value || 0).toLocaleString('pt-BR')}`}
                </p>
              ))}
            </div>
          )}
          
          {/* Valores monetários - com formatação de moeda */}
          {monetaryPayloads.length > 0 && (
            <div className={documentPayloads.length > 0 ? 'mt-2 pt-2 border-t border-neutral-border/30' : ''}>
              {monetaryPayloads.map((entry: any, index: number) => {
                // Para acumulado, mostra sempre o valor acumulado do payloadData
                if (entry.dataKey === 'valorAcumulado' && payloadData?.valorAcumulado !== undefined) {
                  return (
                    <p key={index} className="text-sm font-bold text-primary-blue relative z-10">
                      Acumulado: R$ {payloadData.valorAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )
                }
                return (
                  <p key={index} className="text-sm font-medium relative z-10" style={{ color: entry.color }}>
                    {`${dataKeyMap[entry.dataKey] || entry.dataKey}: R$ ${(entry.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                )
              })}
            </div>
          )}
          
          {/* Mostra valor acumulado e valor do dia - sempre quando disponível */}
          {payloadData && (
            <div className="mt-2 pt-2 border-t border-neutral-border/30 relative z-10">
              {/* Para dados de evolução, mostra acumulado e diário */}
              {hasEvolutionData && (
                <>
                  {payloadData.valorAcumulado !== undefined && (
                    <p className="text-sm font-bold text-primary-blue">
                      Acumulado: R$ {payloadData.valorAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  {payloadData.valorDiario !== undefined && (
                    <p className="text-sm font-medium text-neutral-text-secondary">
                      No dia: R$ {payloadData.valorDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </>
              )}
              {/* Para dados normais, mostra resultado */}
              {!hasEvolutionData && payloadData.resultado !== undefined && (
                <p className="text-sm font-bold text-primary-blue">
                  Resultado: R$ {payloadData.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
      {/* Enhanced Pie Chart - Document Types */}
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 shadow-3d relative overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 rounded-xl md:rounded-2xl pointer-events-none"></div>
        <h3 className="text-base md:text-lg lg:text-xl font-bold text-neutral-text-primary mb-4 md:mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg flex-shrink-0"></div>
          <span className="break-words">Distribuição por Tipo de Documento</span>
        </h3>
        <div className="relative overflow-visible min-h-[300px] md:min-h-[380px]">
        <ResponsiveContainer width="100%" height={280} className="md:h-[350px] chart-3d-container overflow-visible">
          <PieChart margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
            <defs>
              {documentTypeData.map((entry, index) => (
                <linearGradient key={`xml-gradient-${index}`} id={`xml-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors[index]} stopOpacity={1} />
                  <stop offset="100%" stopColor={chartColors[index]} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={documentTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent, value }) => 
                `${name}\n${(percent * 100).toFixed(1)}%\n(${value.toLocaleString()})`
              }
              outerRadius={isMobile ? 70 : 100}
              innerRadius={isMobile ? 26 : 34}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
              animationBegin={0}
              animationDuration={800}
              isAnimationActive={true}
              activeIndex={activePieIndex ?? undefined}
              activeShape={(props: any) => {
                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
                // Extrai a cor do fill (pode ser uma URL de gradiente ou cor sólida)
                const fillColor = typeof fill === 'string' && fill.startsWith('#') ? fill : '#2563EB'
                
                return (
                  <g>
                    {/* Sombra 3D para profundidade - múltiplas camadas */}
                    <Sector
                      cx={cx + 4}
                      cy={cy + 4}
                      innerRadius={innerRadius}
                      outerRadius={outerRadius * 1.18}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill="rgba(0, 0, 0, 0.25)"
                      opacity={0.4}
                    />
                    <Sector
                      cx={cx + 2}
                      cy={cy + 2}
                      innerRadius={innerRadius}
                      outerRadius={outerRadius * 1.16}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill="rgba(0, 0, 0, 0.15)"
                      opacity={0.3}
                    />
                    {/* Fatia principal com efeito 3D elevado */}
                    <Sector
                      cx={cx}
                      cy={cy}
                      innerRadius={innerRadius}
                      outerRadius={outerRadius * 1.18}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill={fill}
                      stroke={fill}
                      strokeWidth={6}
                      opacity={1}
                      style={{
                        filter: 'drop-shadow(0 12px 24px rgba(37, 99, 235, 0.5)) drop-shadow(0 6px 12px rgba(37, 99, 235, 0.4)) drop-shadow(0 0 30px rgba(37, 99, 235, 0.3))',
                        transform: 'translateZ(30px) scale(1.05)',
                        transformStyle: 'preserve-3d',
                        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        animation: 'pulse-3d 2s ease-in-out infinite',
                      }}
                    />
                    {/* Brilho interno superior */}
                    <Sector
                      cx={cx}
                      cy={cy - 2}
                      innerRadius={innerRadius + 8}
                      outerRadius={outerRadius * 1.12}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill="rgba(255, 255, 255, 0.4)"
                      opacity={0.8}
                    />
                    {/* Brilho interno central */}
                    <Sector
                      cx={cx}
                      cy={cy}
                      innerRadius={innerRadius + 5}
                      outerRadius={outerRadius * 1.1}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill="rgba(255, 255, 255, 0.25)"
                      opacity={0.6}
                    />
                    {/* Highlight no topo */}
                    <Sector
                      cx={cx}
                      cy={cy - 3}
                      innerRadius={outerRadius * 0.85}
                      outerRadius={outerRadius * 1.05}
                      startAngle={startAngle + 2}
                      endAngle={endAngle - 2}
                      fill="rgba(255, 255, 255, 0.3)"
                      opacity={0.5}
                    />
                  </g>
                )
              }}
              onClick={(data: any, index: number) => {
                setActivePieIndex(activePieIndex === index ? null : index)
              }}
            >
              {documentTypeData.map((entry, index) => (
                <Cell 
                  key={`xml-cell-${index}`} 
                  fill={`url(#xml-gradient-${index})`}
                  stroke={chartColors[index]}
                  strokeWidth={activePieIndex === index ? 4 : 2}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    opacity: activePieIndex !== null && activePieIndex !== index ? 0.5 : 1,
                    transform: activePieIndex === index ? 'translateZ(10px)' : 'translateZ(0)',
                    filter: activePieIndex === index 
                      ? `drop-shadow(0 6px 12px ${chartColors[index]}60)` 
                      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0]
                  const name = data.name
                  const value = data.value as number
                  const total = documentTypeData.reduce((sum, item) => sum + item.value, 0)
                  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                  
                  return (
                    <div className="backdrop-3d border border-neutral-border/50 rounded-xl shadow-3d p-4 neon-glow relative z-50">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/10 via-transparent to-secondary-purple/10 rounded-xl"></div>
                      <div className="relative z-10">
                        <p className="font-bold text-neutral-text-primary mb-2">{name}</p>
                        <div className="space-y-1">
                          <p className="text-sm text-neutral-text-secondary">
                            <span className="font-semibold">Quantidade:</span> {value.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-sm text-neutral-text-secondary">
                            <span className="font-semibold">Porcentagem:</span> {percent}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - Companies */}
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 shadow-3d relative overflow-hidden rotate-3d">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
        <h3 className="text-base md:text-lg lg:text-xl font-bold text-neutral-text-primary mb-4 md:mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full flex-shrink-0"></div>
          <span className="break-words">Documentos por Empresa</span>
        </h3>
        {companyData.length === 0 ? (
          <div className="h-[280px] md:h-[350px] flex items-center justify-center">
            <p className="text-xs md:text-sm text-neutral-text-secondary text-center px-4">Nenhum dado disponível para exibir</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280} className="md:h-[350px] chart-3d-container">
            <BarChart data={companyData} margin={{ top: 10, right: 10, left: 0, bottom: isMobile ? 40 : 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280" 
                fontSize={isMobile ? 9 : 11}
                tickLine={false}
                axisLine={false}
                tick={false}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
              />
            <YAxis 
              stroke="#6B7280" 
              fontSize={isMobile ? 10 : 12}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              width={isMobile ? 40 : 60}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`
                }
                return value.toString()
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', fontSize: isMobile ? '11px' : '14px' }}
              iconType="circle"
            />
            <Bar 
              dataKey="xmlCount" 
              fill="#2563EB" 
              name="XML" 
              radius={[8, 8, 0, 0]}
              className="chart-bar-3d"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(37, 99, 235, 0.3))' }}
            />
            <Bar 
              dataKey="nfCount" 
              fill="#7C3AED" 
              name="NF" 
              radius={[8, 8, 0, 0]}
              className="chart-bar-3d"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(124, 58, 237, 0.3))' }}
            />
            <Bar 
              dataKey="nfcCount" 
              fill="#10B981" 
              name="NFC" 
              radius={[8, 8, 0, 0]}
              className="chart-bar-3d"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.3))' }}
            />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Evolution Chart - Compact and Efficient */}
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-3d relative overflow-hidden lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
        <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
          <h3 className="text-base md:text-lg font-bold text-neutral-text-primary flex items-center gap-2">
            <div className="w-1 h-4 md:h-5 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full flex-shrink-0"></div>
            <span className="break-words">Evolução por Período</span>
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={350} className="md:h-[450px] lg:h-[500px] chart-3d-container">
          <AreaChart 
            data={evolutionDataProcessed}
            margin={{ top: 10, right: 10, left: isMobile ? 40 : 60, bottom: isMobile ? 40 : 60 }}
            syncId="evolution-chart"
          >
            <defs>
              <linearGradient id="xml-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="nf-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="nfc-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="faturamento-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="despesa-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="resultado-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
              {/* Gradientes para áreas negativas - "Montanhas de energia negativa" */}
              <linearGradient id="negative-energy-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC2626" stopOpacity={0.9} />
                <stop offset="30%" stopColor="#991B1B" stopOpacity={0.85} />
                <stop offset="60%" stopColor="#7F1D1D" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#450A0A" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="negative-energy-acumulado-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95} />
                <stop offset="25%" stopColor="#DC2626" stopOpacity={0.9} />
                <stop offset="50%" stopColor="#B91C1C" stopOpacity={0.85} />
                <stop offset="75%" stopColor="#991B1B" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="negative-energy-stroke-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FCA5A5" />
                <stop offset="50%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#991B1B" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.2} />
            <XAxis 
              dataKey="period" 
              stroke="#6B7280" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              height={40}
              angle={-45}
              textAnchor="end"
              interval="preserveStartEnd"
            />
            {/* Eixo Y único - para documentos e valores monetários */}
            <YAxis 
              stroke="#6B7280" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={yAxisDomain}
              allowDataOverflow={false}
              allowDecimals={true}
              tickFormatter={(value) => {
                if (Math.abs(value) >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`
                }
                if (Math.abs(value) >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`
                }
                return value.toString()
              }}
              padding={{ top: 10, bottom: 10 }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
              verticalAlign="top"
              height={36}
            />
            {/* Documentos (quantidades) - sempre mostrados como áreas */}
            <Area
              type="monotone"
              dataKey="xmlCount"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#xml-evolution-gradient)"
              name="XML"
              animationDuration={800}
              connectNulls={true}
              className="chart-area-3d"
            />
            <Area
              type="monotone"
              dataKey="nfCount"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#nf-evolution-gradient)"
              name="NF"
              animationDuration={800}
              connectNulls={true}
              className="chart-area-3d"
            />
            <Area
              type="monotone"
              dataKey="nfcCount"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#nfc-evolution-gradient)"
              name="NFC"
              animationDuration={800}
              connectNulls={true}
              className="chart-area-3d"
            />
            {/* Linha de referência no zero */}
            <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="2 2" opacity={0.5} />
            
            {/* Valores monetários - sempre mostrados */}
            {/* Se há dados de evolução com valorAcumulado, mostra o acumulado; senão mostra faturamento/despesa/resultado */}
            {hasEvolutionDataForChart ? (
              <>
                {/* Linha do acumulado (sempre visível) - "onda" conectando positivo/negativo */}
                <Line
                  type="monotone"
                  dataKey="valorAcumulado"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Acumulado"
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                  className="chart-line-3d"
                />
                {/* Área positiva (acima de zero) */}
                <Area
                  type="monotone"
                  dataKey="valorPositivo"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#resultado-evolution-gradient)"
                  name=""
                  animationDuration={800}
                  connectNulls={true}
                  baseValue={0}
                  className="chart-area-3d"
                />
                {/* Área negativa (abaixo de zero) */}
                <Area
                  type="monotone"
                  dataKey="valorNegativo"
                  stroke="#DC2626"
                  strokeWidth={2.5}
                  fill="url(#negative-energy-acumulado-gradient)"
                  name=""
                  animationDuration={800}
                  connectNulls={true}
                  baseValue={0}
                  className="chart-area-3d"
                />
              </>
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#faturamento-evolution-gradient)"
                  name="Faturamento"
                  animationDuration={800}
                  connectNulls={true}
                  className="chart-area-3d"
                />
                <Area
                  type="monotone"
                  dataKey="despesa"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#despesa-evolution-gradient)"
                  name="Despesa"
                  animationDuration={800}
                  connectNulls={true}
                  className="chart-area-3d"
                />
                {/* Linha do resultado (sempre visível) - "onda" conectando positivo/negativo */}
                <Line
                  type="monotone"
                  dataKey="resultado"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Resultado"
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                  className="chart-line-3d"
                />
                {/* Área positiva do resultado (acima de zero) */}
                <Area
                  type="monotone"
                  dataKey="valorPositivo"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#resultado-evolution-gradient)"
                  name=""
                  animationDuration={800}
                  connectNulls={true}
                  baseValue={0}
                  className="chart-area-3d"
                />
                {/* Área negativa do resultado (abaixo de zero) */}
                <Area
                  type="monotone"
                  dataKey="valorNegativo"
                  stroke="#DC2626"
                  strokeWidth={2.5}
                  fill="url(#negative-energy-gradient)"
                  name=""
                  animationDuration={800}
                  connectNulls={true}
                  baseValue={0}
                  className="chart-area-3d"
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart - Amount by Company */}
      <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl p-8 shadow-3d relative overflow-hidden lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
        <h3 className="text-xl font-bold text-neutral-text-primary mb-6 flex items-center gap-2 relative z-10">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full"></div>
          Resultado por Empresa
        </h3>
        {companyData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-neutral-text-secondary">Nenhum dado disponível para exibir</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350} className="chart-3d-container">
            <BarChart data={companyData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="resultado-positive-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="resultado-negative-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={false}
              />
              <YAxis 
                stroke="#6B7280" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1000) {
                    return `${(value / 1000).toFixed(0)}k`
                  }
                  return value.toString()
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload
                    const resultado = data?.resultado || 0
                    const isPositive = resultado >= 0
                    return (
                      <div className="backdrop-3d border border-neutral-border/50 rounded-xl shadow-3d p-4 neon-glow relative z-50">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/10 via-transparent to-secondary-purple/10 rounded-xl"></div>
                        <p className="font-bold text-neutral-text-primary mb-2 relative z-10">{data?.name || ''}</p>
                        <p className={`text-sm font-medium relative z-10 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          Resultado: R$ {Math.abs(resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar 
                dataKey="resultado" 
                name="Resultado"
                radius={[8, 8, 0, 0]}
                className="chart-bar-3d"
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props
                  const resultado = payload.resultado || 0
                  const isPositive = resultado >= 0
                  const fill = isPositive ? 'url(#resultado-positive-gradient)' : 'url(#resultado-negative-gradient)'
                  const shadowColor = isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  
                  // Para valores negativos, a barra começa do zero e vai para baixo (invertido)
                  if (resultado < 0) {
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={Math.abs(height)}
                        fill={fill}
                        rx={8}
                        ry={8}
                        style={{ 
                          filter: `drop-shadow(0 4px 8px ${shadowColor})`,
                          transition: 'all 0.3s ease'
                        }}
                      />
                    )
                  }
                  
                  // Para valores positivos, comportamento normal (para cima)
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fill}
                      rx={8}
                      ry={8}
                      style={{ 
                        filter: `drop-shadow(0 4px 8px ${shadowColor})`,
                        transition: 'all 0.3s ease'
                      }}
                    />
                  )
                }}
              />
              {/* Linha de referência no zero */}
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
