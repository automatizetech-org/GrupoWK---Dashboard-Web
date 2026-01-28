'use client'

import { type TaxData } from '@/lib/data'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'

interface DataTableProps {
  data: TaxData[]
}

export default function DataTable({ data }: DataTableProps) {
  // Agrupa dados por empresa (uma linha por empresa)
  const groupedData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      // Ignora dados de evolução (isEvolutionData) para a tabela detalhada
      if (item.isEvolutionData) {
        return acc
      }
      
      const key = item.companyId
      if (!acc[key]) {
        acc[key] = {
          id: item.id,
          companyId: item.companyId,
          companyName: item.companyName,
          xmlCount: 0,
          nfCount: 0,
          nfcCount: 0,
          faturamento: 0,
          despesa: 0,
          resultado: 0,
        }
      }
      
      acc[key].xmlCount += item.xmlCount
      acc[key].nfCount += item.nfCount
      acc[key].nfcCount += item.nfcCount
      acc[key].faturamento += (item.faturamento || 0)
      acc[key].despesa += (item.despesa || 0)
      acc[key].resultado = acc[key].faturamento - acc[key].despesa
      
      return acc
    }, {} as Record<string, {
      id: string
      companyId: string
      companyName: string
      xmlCount: number
      nfCount: number
      nfcCount: number
      faturamento: number
      despesa: number
      resultado: number
    }>)
    
    return Object.values(grouped)
  }, [data])

  if (groupedData.length === 0) {
    return null // Não mostra mensagem se não há dados - deixa vazio
  }

  return (
    <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-xl md:rounded-2xl overflow-hidden shadow-3d relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
      <div className="p-4 md:p-6 border-b border-neutral-border/50 bg-gradient-to-r from-neutral-background/80 to-transparent backdrop-3d relative z-10">
        <h3 className="text-lg md:text-xl font-bold text-neutral-text-primary flex items-center gap-2">
          <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg flex-shrink-0"></div>
          <span className="break-words">Dados Detalhados por Empresa</span>
        </h3>
      </div>
      <div className="overflow-x-auto relative z-10 -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle px-4 md:px-0">
          <table className="w-full min-w-[640px] md:min-w-0">
            <thead className="backdrop-3d bg-neutral-background/50">
              <tr>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider sticky left-0 bg-neutral-background/95 z-20">
                  Empresa
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                  XML
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                  NF
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                  NFC
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                  Faturamento
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                  Despesa
                </th>
                <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border/30">
            {groupedData.map((item) => {
              const faturamento = item.faturamento || 0
              const despesa = item.despesa || 0
              const resultado = item.resultado !== undefined ? item.resultado : (faturamento - despesa)
              const isPositive = resultado >= 0
              
              return (
                <tr key={item.id} className="hover:bg-neutral-background/50 transition-colors group">
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-semibold text-neutral-text-primary sticky left-0 bg-white/95 dark:bg-slate-800/95 group-hover:bg-white dark:group-hover:bg-slate-800 z-10">
                    <span className="break-words max-w-[120px] md:max-w-none block truncate">{item.companyName}</span>
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-neutral-text-primary text-center">
                    {item.xmlCount.toLocaleString()}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-neutral-text-primary text-center">
                    {item.nfCount.toLocaleString()}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-neutral-text-primary text-center">
                    {item.nfcCount.toLocaleString()}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-bold text-green-600 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3 flex-shrink-0" />
                      <span className="break-all">R$ {faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-bold text-red-600 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3 flex-shrink-0" />
                      <span className="break-all">R$ {despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                  <td className={`px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-bold text-right ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className={`flex items-center justify-end gap-1 p-1.5 md:p-2 rounded-lg ${
                      isPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                      )}
                      <span className="break-all">R$ {Math.abs(resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
