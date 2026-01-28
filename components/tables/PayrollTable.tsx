'use client'

import { type PayrollData } from '@/lib/data'

interface PayrollTableProps {
  data: PayrollData[]
}

export default function PayrollTable({ data }: PayrollTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-neutral-surface to-neutral-background border border-neutral-border rounded-xl p-8 text-center shadow-lg">
        <p className="text-neutral-text-secondary">Nenhum dado encontrado com os filtros selecionados.</p>
      </div>
    )
  }

  return (
    <div className="card-3d-elevated bg-gradient-to-br from-white via-white to-neutral-background border border-neutral-border/50 rounded-2xl overflow-hidden shadow-3d relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>
      <div className="p-6 border-b border-neutral-border/50 bg-gradient-to-r from-neutral-background/80 to-transparent backdrop-3d relative z-10">
        <h3 className="text-xl font-bold text-neutral-text-primary flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          Dados Detalhados - Folha de Pagamento
        </h3>
      </div>
      <div className="overflow-x-auto relative z-10">
        <table className="w-full">
          <thead className="backdrop-3d">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Período
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Funcionários
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Salários
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Benefícios
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Impostos
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary uppercase tracking-wider">
                Valor Líquido
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-border/50">
            {data.map((item, index) => (
              <tr key={item.id} className="hover:bg-white/60 backdrop-3d transition-all duration-200 card-3d group" style={{ animationDelay: `${index * 0.05}s` }}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-text-primary group-hover:text-primary-blue transition-colors">
                  {item.companyName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-text-secondary">
                  {item.period}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text-primary group-hover:scale-105 transition-transform inline-block">
                  {item.employeeCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text-primary group-hover:scale-105 transition-transform inline-block">
                  R$ {item.totalSalary.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text-primary group-hover:scale-105 transition-transform inline-block">
                  R$ {item.benefits.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text-primary group-hover:scale-105 transition-transform inline-block">
                  R$ {item.taxes.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-blue group-hover:scale-110 transition-transform inline-block">
                  R$ {item.netAmount.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
