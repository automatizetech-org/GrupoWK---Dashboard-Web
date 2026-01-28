// Data structure and types
// Use Supabase queries from lib/supabase-queries.ts for production
// This file contains mock data for development/testing

export interface Company {
  id: string
  name: string
  cnpj?: string
}

export interface Automation {
  id: string
  departmentId: string
  name: string
  description: string
  type: string
}

export interface Department {
  id: string
  name: string
  description: string
  automations: Automation[]
}

export interface TaxData {
  id: string
  companyId: string
  companyName: string
  xmlCount: number
  nfCount: number
  nfcCount: number
  totalAmount: number
  faturamento?: number  // Faturamento (Saída)
  despesa?: number      // Despesa (Entrada)
  resultado?: number    // Resultado (Saída - Entrada)
  period: string
  date: string
  // Dados de evolução (quando isEvolutionData = true)
  isEvolutionData?: boolean
  valorDiario?: number  // Valor diário conforme operação
  valorAcumulado?: number  // Valor acumulado até este dia
}

// Mock departments data
export const departments: Department[] = [
  {
    id: 'fiscal',
    name: 'Fiscal',
    description: 'Departamento Fiscal - Gestão de documentos fiscais',
    automations: [
      {
        id: 'xml-sefaz',
        departmentId: 'fiscal',
        name: 'Sefaz XML',
        description: 'Automação para processamento de XML do Sefaz',
        type: 'xml_processing',
      },
    ],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Departamento Financeiro',
    automations: [
      {
        id: 'contas-pagar',
        departmentId: 'financeiro',
        name: 'Contas a Pagar',
        description: 'Automação de contas a pagar',
        type: 'accounts_payable',
      },
    ],
  },
  {
    id: 'rh',
    name: 'Recursos Humanos',
    description: 'Departamento de Recursos Humanos',
    automations: [
      {
        id: 'folha-pagamento',
        departmentId: 'rh',
        name: 'Folha de Pagamento',
        description: 'Automação de folha de pagamento',
        type: 'payroll',
      },
    ],
  },
]

// Mock companies data with locations
export const companies: Company[] = [
  { id: '1', name: 'Empresa A', cnpj: '12.345.678/0001-90' },
  { id: '2', name: 'Empresa B', cnpj: '98.765.432/0001-10' },
  { id: '3', name: 'Empresa C', cnpj: '11.222.333/0001-44' },
  { id: '4', name: 'Empresa D', cnpj: '55.666.777/0001-88' },
]

// Company locations interface (should come from Supabase)
export interface CompanyLocation {
  companyId: string
  companyName: string
  cnpj?: string
  lat: number
  lng: number
  city: string
  state: string
  region: string
  totalProcessed?: number
}

// Mock company locations - these should come from Supabase
export const getCompanyLocations = (companyIds: string[]): CompanyLocation[] => {
  const locations: Record<string, CompanyLocation> = {
    '1': {
      companyId: '1',
      companyName: 'Empresa A',
      cnpj: '12.345.678/0001-90',
      lat: -23.5505,
      lng: -46.6333,
      city: 'São Paulo',
      state: 'SP',
      region: 'Sudeste',
      totalProcessed: 1500,
    },
    '2': {
      companyId: '2',
      companyName: 'Empresa B',
      cnpj: '98.765.432/0001-10',
      lat: -22.9068,
      lng: -43.1729,
      city: 'Rio de Janeiro',
      state: 'RJ',
      region: 'Sudeste',
      totalProcessed: 1200,
    },
    '3': {
      companyId: '3',
      companyName: 'Empresa C',
      cnpj: '11.222.333/0001-44',
      lat: -25.4284,
      lng: -49.2733,
      city: 'Curitiba',
      state: 'PR',
      region: 'Sul',
      totalProcessed: 950,
    },
    '4': {
      companyId: '4',
      companyName: 'Empresa D',
      cnpj: '55.666.777/0001-88',
      lat: -12.9714,
      lng: -38.5014,
      city: 'Salvador',
      state: 'BA',
      region: 'Nordeste',
      totalProcessed: 850,
    },
  }
  
  return companyIds.map(id => locations[id]).filter(Boolean) as CompanyLocation[]
}

// Mock tax data for XML automation
export const generateMockTaxData = (companyIds: string[]): TaxData[] => {
  const data: TaxData[] = []
  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
  
  companyIds.forEach((companyId) => {
    const company = companies.find(c => c.id === companyId)
    months.forEach((period, index) => {
      data.push({
        id: `${companyId}-${period}`,
        companyId,
        companyName: company?.name || 'Unknown',
        xmlCount: Math.floor(Math.random() * 500) + 100,
        nfCount: Math.floor(Math.random() * 300) + 50,
        nfcCount: Math.floor(Math.random() * 200) + 30,
        totalAmount: Math.floor(Math.random() * 1000000) + 100000,
        period,
        date: `${period}-01`,
      })
    })
  })
  
  return data
}

// Financeiro - Contas a Pagar data
export interface AccountsPayableData {
  id: string
  companyId: string
  companyName: string
  invoiceNumber: string
  supplier: string
  clientCode?: string  // Código do cliente (para identificação única)
  clientName?: string  // Nome do cliente (sem código)
  dueDate: string
  amount: number
  paidValue?: number  // Valor pago
  totalValue?: number  // Valor total
  pendingValue?: number  // Valor pendente (vencidos)
  daysOverdue?: number  // Dias vencidos
  status: 'pending' | 'paid' | 'overdue'
  category: string
  paymentCondition?: string  // Condição de pagamento
  period: string
}

export const generateMockAccountsPayableData = (companyIds: string[]): AccountsPayableData[] => {
  const data: AccountsPayableData[] = []
  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
  const suppliers = ['Fornecedor Alpha', 'Fornecedor Beta', 'Fornecedor Gamma', 'Fornecedor Delta']
  const categories = ['Serviços', 'Materiais', 'Equipamentos', 'Consultoria']
  const statuses: ('pending' | 'paid' | 'overdue')[] = ['pending', 'paid', 'overdue']
  
  companyIds.forEach((companyId) => {
    const company = companies.find(c => c.id === companyId)
    months.forEach((period) => {
      for (let i = 0; i < 5; i++) {
        data.push({
          id: `${companyId}-${period}-${i}`,
          companyId,
          companyName: company?.name || 'Unknown',
          invoiceNumber: `INV-${period}-${Math.floor(Math.random() * 10000)}`,
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          dueDate: `${period}-${Math.floor(Math.random() * 28) + 1}`,
          amount: Math.floor(Math.random() * 50000) + 5000,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          period,
        })
      }
    })
  })
  
  return data
}

// RH - Folha de Pagamento data
export interface PayrollData {
  id: string
  companyId: string
  companyName: string
  employeeCount: number
  totalSalary: number
  benefits: number
  taxes: number
  netAmount: number
  period: string
  date: string
}

export const generateMockPayrollData = (companyIds: string[]): PayrollData[] => {
  const data: PayrollData[] = []
  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
  
  companyIds.forEach((companyId) => {
    const company = companies.find(c => c.id === companyId)
    months.forEach((period) => {
      const employeeCount = Math.floor(Math.random() * 200) + 50
      const avgSalary = Math.floor(Math.random() * 5000) + 3000
      const totalSalary = employeeCount * avgSalary
      const benefits = totalSalary * 0.3
      const taxes = totalSalary * 0.2
      const netAmount = totalSalary + benefits - taxes
      
      data.push({
        id: `${companyId}-${period}`,
        companyId,
        companyName: company?.name || 'Unknown',
        employeeCount,
        totalSalary,
        benefits,
        taxes,
        netAmount,
        period,
        date: `${period}-01`,
      })
    })
  })
  
  return data
}
