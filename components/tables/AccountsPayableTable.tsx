'use client'

import { type AccountsPayableData } from '@/lib/data'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface AccountsPayableTableProps {
  data: AccountsPayableData[]
}

export default function AccountsPayableTable({ data }: AccountsPayableTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-neutral-surface to-neutral-background dark:from-slate-800 dark:to-slate-900 border border-neutral-border dark:border-slate-700 rounded-xl p-8 text-center shadow-lg">
        <p className="text-neutral-text-secondary dark:text-slate-400">Nenhum dado encontrado com os filtros selecionados.</p>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-status-warning" size={18} />
      case 'paid':
        return <CheckCircle className="text-status-success" size={18} />
      case 'overdue':
        return <AlertCircle className="text-status-error" size={18} />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
      paid: 'bg-status-success/10 text-status-success border-status-success/20',
      overdue: 'bg-status-error/10 text-status-error border-status-error/20',
    }
    const labels = {
      pending: 'Pendente',
      paid: 'Paga',
      overdue: 'Vencida',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="card-3d-elevated rounded-2xl overflow-hidden shadow-3d relative bg-white dark:bg-slate-800">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10"></div>
      <div className="p-6 border-b border-neutral-border/50 dark:border-slate-700 bg-white/80 dark:bg-slate-800/95 backdrop-3d relative z-10">
        <h3 className="text-xl font-bold text-neutral-text-primary dark:text-slate-100 flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary-blue to-secondary-purple rounded-full shadow-lg"></div>
          Dados Detalhados - Contas a Pagar
        </h3>
      </div>
      <div className="overflow-x-auto relative z-10 bg-white dark:bg-slate-800/80">
        <table className="w-full">
          <thead className="backdrop-3d bg-white/70 dark:bg-slate-800/90">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Nota Fiscal
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Tipo de Cobrança
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Condição de Pagamento
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-text-secondary dark:text-slate-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-border/50 dark:divide-slate-700">
            {data.map((item, index) => (
              <tr
                key={item.id}
                className="hover:bg-white/60 dark:hover:bg-slate-700/40 backdrop-3d transition-all duration-200 card-3d group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-text-primary dark:text-slate-100 group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors">
                  {item.clientName || item.companyName || 'Cliente Desconhecido'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text-primary dark:text-slate-100 group-hover:scale-105 transition-transform inline-block">
                  {item.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-text-secondary dark:text-slate-300">
                  {item.category || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-text-secondary dark:text-slate-300">
                  {item.paymentCondition || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-text-secondary dark:text-slate-300">
                  {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-blue dark:text-blue-400 group-hover:scale-110 transition-transform inline-block">
                  R$ {(item.totalValue || item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {getStatusBadge(item.status)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
