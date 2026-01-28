'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { type Automation, type Department, type AccountsPayableData } from '@/lib/data'
import Filters from '../Filters'
import AccountsPayableCharts from '../charts/AccountsPayableCharts'
import AccountsPayableTable from '../tables/AccountsPayableTable'
import { ArrowLeft, DollarSign, Clock, CheckCircle, AlertCircle, Upload, FileText, X, Loader2, Filter, Search } from 'lucide-react'
import { type ClientDelinquency } from '@/lib/pdfParser'
import { getAccountsPayableDataFromPDF } from '@/lib/supabase-queries'
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { formatPaymentType } from '@/lib/paymentTypeMapping'

interface AccountsPayableDashboardProps {
  automation: Automation
  department: Department
  onBack: () => void
}

export default function AccountsPayableDashboard({ automation, department, onBack }: AccountsPayableDashboardProps) {
  // Inicializar com range muito amplo para garantir que todos os dados apareçam
  // Usar datas extremas para não filtrar nada inicialmente
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2000-01-01', // Data muito antiga
    end: '2100-12-31', // Data muito futura
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [parsedClients, setParsedClients] = useState<ClientDelinquency[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [allData, setAllData] = useState<AccountsPayableData[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [hasInitializedClients, setHasInitializedClients] = useState(false)
  const [showOnlyNewDelinquencies, setShowOnlyNewDelinquencies] = useState(true) // Ligado por padrão
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const prevSelectedClientsRef = useRef<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasInitializedDateRange = useRef(false)

  // Get unique clients from data (using clientCode + name for uniqueness)
  const availableClients = useMemo(() => {
    const clientsMap = new Map<string, { code: string; name: string }>()
    allData.forEach(item => {
      if (item.clientCode && item.supplier) {
        // supplier já contém "código - nome", mas vamos garantir que temos o código
        const code = item.clientCode
        const name = item.supplier.includes(' - ') 
          ? item.supplier.split(' - ').slice(1).join(' - ') 
          : item.supplier
        const key = `${code}-${name}`
        if (!clientsMap.has(key)) {
          clientsMap.set(key, { code, name })
        }
      } else if (item.supplier) {
        // Fallback: se não tiver código, usa apenas o nome
        const key = `-${item.supplier}`
        if (!clientsMap.has(key)) {
          clientsMap.set(key, { code: '', name: item.supplier })
        }
      }
    })
    // Retorna array de objetos com code e name
    return Array.from(clientsMap.values())
      .map(c => ({
        id: c.code ? `${c.code} - ${c.name}` : c.name,
        code: c.code,
        name: c.name,
        displayName: c.code ? `${c.code} - ${c.name}` : c.name
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [allData])

  // Filtra clientes baseado no termo de pesquisa (igual ao XML)
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return availableClients
    const term = clientSearchTerm.toLowerCase()
    return availableClients.filter(c => {
      const name = (c.name || '').toLowerCase()
      const code = (c.code || '').toLowerCase()
      return name.includes(term) || code.includes(term) || c.displayName.toLowerCase().includes(term)
    })
  }, [availableClients, clientSearchTerm])
  
  // Get date range for selected clients
  const getDateRangeForClients = useMemo(() => {
    if (selectedClients.length === 0) {
      return { min: null, max: null }
    }
    
    const relevantData = allData.filter(item => selectedClients.includes(item.supplier))
    if (relevantData.length === 0) {
      return { min: null, max: null }
    }
    
    const dates = relevantData.map(item => new Date(item.dueDate)).filter(d => !isNaN(d.getTime()))
    if (dates.length === 0) {
      return { min: null, max: null }
    }
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    
    return {
      min: format(minDate, 'yyyy-MM-dd'),
      max: format(maxDate, 'yyyy-MM-dd')
    }
  }, [selectedClients, allData])
  
  const [todayData, setTodayData] = useState<AccountsPayableData[]>([])
  const [yesterdayData, setYesterdayData] = useState<AccountsPayableData[]>([])
  
  // Load data from Supabase (today and yesterday PDFs)
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
        hasInitializedDateRange.current = false
      try {
        console.log('Carregando dados do Supabase para automation:', automation.id)
        
        // Tentar primeiro via função direta (usa anon key)
        let today: AccountsPayableData[] = []
        let yesterday: AccountsPayableData[] = []
        
        try {
          const result = await getAccountsPayableDataFromPDF(
            automation.id,
            undefined, // No start date filter
            undefined  // No end date filter
          )
          today = result.todayData || []
          yesterday = result.yesterdayData || []
        } catch (directError) {
          console.warn('Erro ao carregar via função direta, tentando via API:', directError)
          // Se falhar, tentar via API route (usa service role)
          try {
            const response = await fetch(`/api/accounts-payable-pdf?automationId=${automation.id}`)
            if (response.ok) {
              const result = await response.json()
              today = result.todayData || []
              yesterday = result.yesterdayData || []
            }
          } catch (apiError) {
            console.error('Erro ao carregar via API:', apiError)
            throw apiError
          }
        }
        
        console.log('Dados carregados:', {
          todayCount: today.length,
          yesterdayCount: yesterday.length,
          automationId: automation.id
        })
        setTodayData(today)
        setYesterdayData(yesterday)
        
        // Combine both for client list population
        const combined = [...today, ...yesterday]
        setAllData(combined)
        console.log('Total de dados combinados:', combined.length)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setTodayData([])
        setYesterdayData([])
        setAllData([])
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [automation.id]) // Only reload when automation changes

  // Período padrão: da data mais antiga (dos dados) até hoje
  useEffect(() => {
    if (allData.length === 0 || hasInitializedDateRange.current) return
    const dates = allData.map(item => new Date(item.dueDate)).filter(d => !isNaN(d.getTime()))
    if (dates.length === 0) return
    const minDate = format(new Date(Math.min(...dates.map(d => d.getTime()))), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')
    setDateRange({ start: minDate, end: today })
    hasInitializedDateRange.current = true
  }, [allData])
  
  // Initialize selected clients when data loads (only once, on first load)
  useEffect(() => {
    if (availableClients.length > 0 && !hasInitializedClients) {
      const clientNames = availableClients.map(c => c.displayName)
      setSelectedClients(clientNames)
      setHasInitializedClients(true)
    } else if (availableClients.length === 0 && hasInitializedClients) {
      // Reset initialization if data is cleared
      setHasInitializedClients(false)
    }
  }, [availableClients, hasInitializedClients])
  
  // Auto-adjust date range when clients are selected
  useEffect(() => {
    const currentSelection = selectedClients.sort().join(',')
    // Only adjust if selection actually changed
    if (currentSelection !== prevSelectedClientsRef.current && selectedClients.length > 0) {
      prevSelectedClientsRef.current = currentSelection
      
      if (getDateRangeForClients.min) {
        setDateRange({
          start: getDateRangeForClients.min,
          end: format(new Date(), 'yyyy-MM-dd') // sempre até hoje
        })
      }
    }
  }, [selectedClients.join(','), getDateRangeForClients.min, getDateRangeForClients.max])

  // Filter data based on toggle and other filters
  const filteredData = useMemo(() => {
    let dataToFilter: AccountsPayableData[] = []
    
    // LÓGICA DE COMPARAÇÃO:
    // - Primeiro PDF (mais antigo) = ONTEM
    // - Segundo PDF (mais recente) = HOJE
    // - Quando toggle está ligado: tentar mostrar apenas itens que estão em HOJE mas NÃO estão em ONTEM
    // - SE não houver nenhuma "nova inadimplência", fazemos fallback para mostrar tudo (HOJE + ONTEM)
    // - Quando toggle está desligado: mostrar sempre tudo (HOJE + ONTEM)
    
    if (showOnlyNewDelinquencies && yesterdayData.length > 0) {
      console.log('🔍 Comparando PDFs para encontrar novas inadimplências:')
      console.log('  - PDF de ONTEM (primeiro):', yesterdayData.length, 'itens')
      console.log('  - PDF de HOJE (segundo):', todayData.length, 'itens')
      
      // Criar um conjunto de identificadores únicos de ONTEM (primeiro PDF)
      // Identificador = cliente + nota fiscal (garante unicidade)
      const yesterdayIdentifiers = new Set<string>()
      yesterdayData.forEach(item => {
        const key = `${item.clientCode || ''}-${item.invoiceNumber}`
        yesterdayIdentifiers.add(key)
      })
      
      console.log('  - Identificadores únicos de ONTEM:', yesterdayIdentifiers.size)
      
      // Filtrar apenas os itens de HOJE (segundo PDF) que NÃO estão em ONTEM (primeiro PDF)
      // Esses são as NOVAS inadimplências
      const newDelinquencies: AccountsPayableData[] = []
      
      todayData.forEach(item => {
        const key = `${item.clientCode || ''}-${item.invoiceNumber}`
        const isNew = !yesterdayIdentifiers.has(key)
        
        if (isNew) {
          // Garantir que o item tem valores antes de adicionar
          if (newDelinquencies.length < 5) {
            console.log('  ✨ Nova inadimplência encontrada:', {
              key,
              clientCode: item.clientCode,
              invoiceNumber: item.invoiceNumber,
              totalValue: item.totalValue,
              paidValue: item.paidValue,
              pendingValue: item.pendingValue,
              item_completo: item
            })
          }
          
          // Adicionar o item completo (com todos os valores)
          newDelinquencies.push(item)
        }
      })
            
      console.log('  - Novas inadimplências encontradas:', newDelinquencies.length, 'itens')
      
      // Se encontramos novas inadimplências, usamos apenas esse conjunto.
      // Se NÃO encontramos nenhuma diferença entre hoje e ontem,
      // fazemos fallback para todos os lançamentos (hoje + ontem),
      // para evitar o comportamento de "sumir tudo" quando o usuário filtra por vencimento.
      if (newDelinquencies.length > 0) {
        dataToFilter = newDelinquencies
      } else {
        console.warn('  ⚠️ Nenhuma nova inadimplência encontrada. Usando todos os dados (hoje + ontem) como fallback.')
        dataToFilter = [...todayData, ...yesterdayData]
      }
      
      // Verificar se os valores estão presentes nas novas inadimplências
      if (dataToFilter.length > 0 && newDelinquencies.length > 0) {
        const sampleValues = newDelinquencies.slice(0, 5).map(item => ({
          clientCode: item.clientCode,
          invoiceNumber: item.invoiceNumber,
          totalValue: item.totalValue,
          paidValue: item.paidValue,
          pendingValue: item.pendingValue,
          amount: item.amount
        }))
        console.log('  - Valores das primeiras novas inadimplências:', sampleValues)
        
        // Calcular soma dos valores para verificar
        const sumTotal = newDelinquencies.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0)
        const sumPaid = newDelinquencies.reduce((sum, item) => sum + (Number(item.paidValue) || 0), 0)
        const sumPending = newDelinquencies.reduce((sum, item) => sum + (Number(item.pendingValue) || 0), 0)
        console.log('  - Soma dos valores das novas inadimplências:', {
          total: sumTotal,
          paid: sumPaid,
          pending: sumPending
        })
      } else {
        console.warn('  ⚠️ Nenhuma nova inadimplência encontrada!')
        console.warn('  - Verificando se há itens em todayData que não estão em yesterdayData...')
        console.warn('  - todayData sample:', todayData.slice(0, 3).map(item => ({
          key: `${item.clientCode || ''}-${item.invoiceNumber}`,
          clientCode: item.clientCode,
          invoiceNumber: item.invoiceNumber
        })))
        console.warn('  - yesterdayData sample:', yesterdayData.slice(0, 3).map(item => ({
          key: `${item.clientCode || ''}-${item.invoiceNumber}`,
          clientCode: item.clientCode,
          invoiceNumber: item.invoiceNumber
        })))
      }
    } else {
      // Se toggle está desligado OU não há dados de ontem, mostrar tudo (hoje + ontem)
      dataToFilter = [...todayData, ...yesterdayData]
      console.log('📋 Mostrando todos os dados (toggle desligado ou sem dados de ontem):', dataToFilter.length, 'itens')
    }
    
    console.log('📋 Dados antes do filtro:', {
      todayCount: todayData.length,
      yesterdayCount: yesterdayData.length,
      dataToFilterCount: dataToFilter.length,
      showOnlyNew: showOnlyNewDelinquencies,
      sampleItem: dataToFilter[0] ? {
        dueDate: dataToFilter[0].dueDate,
        supplier: dataToFilter[0].supplier,
        totalValue: dataToFilter[0].totalValue,
        paidValue: dataToFilter[0].paidValue,
        pendingValue: dataToFilter[0].pendingValue
      } : null
    })
    
    // Aplicar filtros:
    // - Cliente (checkboxes)
    // - Período (vencimento)
    //
    // IMPORTANTE: comparamos por YYYY-MM-DD (string) pra evitar bugs de timezone.
    // Garantir que a comparação seja exata (sem diferença de 1 dia por timezone)
    const normalizeDate = (d?: string) => {
      if (!d) return null
      const s = String(d).trim()
      // DD/MM/YYYY -> YYYY-MM-DD
      if (s.includes('/')) {
        const parts = s.split('/')
        if (parts.length === 3) {
          const year = parts[2].padStart(4, '0')
          const month = parts[1].padStart(2, '0')
          const day = parts[0].padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      }
      // Se já está ISO (com ou sem hora/timezone), pegar só a parte da data
      if (s.includes('T')) {
        const datePart = s.split('T')[0]
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
      }
      // Se já está em formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      return null
    }

    // Normalizar datas do filtro (garantir formato YYYY-MM-DD sem timezone)
    const startStr = normalizeDate(dateRange.start) || '0000-01-01'
    const endStr = normalizeDate(dateRange.end) || '9999-12-31'

    // Filtro de período: SEMPRE por data de vencimento (dueDate), nunca por data de upload do PDF
    const filtered = dataToFilter.filter(item => {
      // Se nenhum cliente está selecionado, não mostrar nenhum dado
      if (selectedClients.length === 0) return false
      const inClientFilter = selectedClients.includes(item.supplier)
      if (!inClientFilter) return false

      const due = normalizeDate(item.dueDate)
      if (!due) return false
      
      // Comparação exata de strings YYYY-MM-DD (sem timezone)
      // Se startStr = "2025-01-25" e due = "2025-01-25", deve incluir
      // Se startStr = "2025-01-25" e due = "2025-01-24", não inclui
      // Se startStr = "2025-01-25" e due = "2025-01-26", inclui (se endStr >= 26)
      return due >= startStr && due <= endStr
    })

    return filtered
  }, [todayData, yesterdayData, dateRange, selectedClients, showOnlyNewDelinquencies])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || parsedClients.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Por favor, selecione e analise um arquivo primeiro.',
      })
      return
    }

    setIsProcessing(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const uploadDate = format(new Date(), 'yyyy-MM-dd')
      
      // Call API route instead of direct function (needs service role key)
      let response: Response
      let result: any

      try {
        response = await fetch('/api/accounts-payable-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clients: parsedClients.map(client => ({
              clientCode: client.clientCode,
              clientName: client.clientName,
              amount: client.amount,
              paidAmount: client.paidAmount,
              pendingAmount: client.pendingAmount,
              status: client.status,
              titles: client.titles?.map(t => ({
                dueDate: t.dueDate,
                issueDate: t.issueDate,
                invoiceNumber: t.invoiceNumber,
                paymentType: t.paymentType,
                paymentCondition: t.paymentCondition,
                daysOverdue: t.daysOverdue,
                totalValue: t.totalValue,
                paidValue: t.paidValue,
                pendingValue: t.pendingValue,
              })),
            })),
            automationId: automation.id,
            uploadDate,
          }),
        })

        // Try to parse JSON response
        try {
          result = await response.json()
        } catch (parseError) {
          // If response is not JSON, read as text
          const textResponse = await response.text()
          throw new Error(`Erro na resposta do servidor: ${textResponse || 'Resposta vazia'}`)
        }

        if (!response.ok) {
          throw new Error(result.error || `Erro HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (fetchError: any) {
        // Network error or fetch failed
        if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
        }
        throw fetchError
      }

      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: `Arquivo importado com sucesso! ${result.totalCount} cliente(s) inserido(s) em estrutura única, ${result.newCount} novo(s) cliente(s).`,
        })
        
        // Clear file
        setSelectedFile(null)
        setParsedClients([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Refresh data from Supabase (NO company IDs needed)
        // Carregar SEM filtros de data para garantir que todos os dados apareçam
        const { todayData, yesterdayData } = await getAccountsPayableDataFromPDF(
          automation.id,
          undefined, // No start date filter - carregar tudo
          undefined  // No end date filter - carregar tudo
        )
        const refreshedData = [...(todayData || []), ...(yesterdayData || [])]
        setTodayData(todayData || [])
        setYesterdayData(yesterdayData || [])
        setAllData(refreshedData)
        
        console.log('Dados recarregados após upload:', {
          todayCount: todayData?.length || 0,
          yesterdayCount: yesterdayData?.length || 0,
          totalCount: refreshedData.length,
          automationId: automation.id
        })
        
        // Update available clients
        const clientsSet = new Set<string>()
        refreshedData.forEach(item => {
          if (item.supplier) {
            clientsSet.add(item.supplier)
          }
        })
        if (clientsSet.size > 0) {
          setSelectedClients(Array.from(clientsSet))
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Erro ao importar arquivo.',
        })
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      setUploadStatus({
        type: 'error',
        message: error?.message || 'Erro ao importar arquivo. Verifique o console para mais detalhes.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setParsedClients([])
    setUploadStatus({ type: null, message: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processFile = async (file: File) => {
      if (file.type !== 'application/pdf') {
        setUploadStatus({
          type: 'error',
          message: 'Por favor, selecione um arquivo válido.',
        })
        return
      }

    setSelectedFile(file)
    setUploadStatus({ type: null, message: '' })
    setParsedClients([])

    // Parse PDF
    try {
      setIsProcessing(true)
      
      // Upload file to API route
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/parse-titulos', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ao processar arquivo: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error('Resposta inválida do servidor')
      }
      
      // Convert JSON format to ClientDelinquency format
      const data = result.data
      const clients: ClientDelinquency[] = []
      
      // Data structure: [{ pdf: "...", clients: [...] }]
      for (const document of data) {
        for (const client of document.clients || []) {
          // Parse totals
          const totals = client.totals || {}
          const totalValue = parseFloat(
            (totals.valor || '0')
              .replace(/\./g, '')
              .replace(',', '.')
          ) || 0
          const paidValue = parseFloat(
            (totals.valor_pago || '0')
              .replace(/\./g, '')
              .replace(',', '.')
          ) || 0
          const pendingValue = parseFloat(
            (totals.valor_pendente || '0')
              .replace(/\./g, '')
              .replace(',', '.')
          ) || 0
          
          // Convert entries (titles)
          // Python já retorna valor_decimal, valor_pago_decimal, valor_pendente_decimal como números
          // Mas o JSON pode ter apenas os valores formatados (ex: "19.100,00")
          const titles = (client.entries || []).map((entry: any) => {
            // Prefer decimal values if available (already parsed by Python)
            let totalValue = 0
            if (entry.valor_decimal !== undefined) {
              totalValue = parseFloat(entry.valor_decimal) || 0
            } else if (entry.valor) {
              totalValue = parseFloat(
                String(entry.valor).replace(/\./g, '').replace(',', '.')
              ) || 0
            }
            
            let paidValue = 0
            if (entry.valor_pago_decimal !== undefined) {
              paidValue = parseFloat(entry.valor_pago_decimal) || 0
            } else if (entry.valor_pago) {
              paidValue = parseFloat(
                String(entry.valor_pago).replace(/\./g, '').replace(',', '.')
              ) || 0
            }
            
            let pendingValue = 0
            if (entry.valor_pendente_decimal !== undefined) {
              pendingValue = parseFloat(entry.valor_pendente_decimal) || 0
            } else if (entry.valor_pendente) {
              pendingValue = parseFloat(
                String(entry.valor_pendente).replace(/\./g, '').replace(',', '.')
              ) || 0
            }
            
            // Garantir que o tipo de cobrança está completo usando o mapeamento
            const tipoCobranca = entry.tipo_cobranca || ''
            const tipoCobrancaFormatado = formatPaymentType(tipoCobranca)
            
            return {
              dueDate: entry.data_vencimento || '',
              issueDate: entry.data_emissao || '',
              invoiceNumber: entry.numero_nf || '',
              paymentType: tipoCobrancaFormatado, // Tipo de cobrança completo (ex: "BD - BANCO BRADESCO")
              paymentCondition: entry.condicao_pagamento || '', // Condição de pagamento (pode estar vazio)
              daysOverdue: parseInt(entry.dias_vencidos || 0),
              totalValue,
              paidValue,
              pendingValue,
            }
          })
          
          // Calculate totals from titles if totals not available
          const calculatedTotal = titles.reduce(
            (sum: number, t: { totalValue?: number }) => sum + (t.totalValue || 0),
            0
          )
          const calculatedPaid = titles.reduce(
            (sum: number, t: { paidValue?: number }) => sum + (t.paidValue || 0),
            0
          )
          const calculatedPending = titles.reduce(
            (sum: number, t: { pendingValue?: number }) => sum + (t.pendingValue || 0),
            0
          )
          
          clients.push({
            clientCode: client.client_code || '',
            clientName: client.client_name || '',
            amount: totalValue || calculatedTotal,
            paidAmount: paidValue || calculatedPaid,
            pendingAmount: pendingValue || calculatedPending,
            status: (pendingValue || calculatedPending) > 0 ? 'overdue' : ((paidValue || calculatedPaid) > 0 ? 'paid' : 'pending'),
            titles: titles,
          })
        }
      }
      
      setParsedClients(clients)
      setUploadStatus({
        type: clients.length > 0 ? 'success' : 'error',
        message: clients.length > 0
          ? `Arquivo processado: ${clients.length} cliente(s) encontrado(s).`
          : 'Nenhum cliente encontrado. Verifique o formato do arquivo.',
      })
    } catch (error: any) {
      console.error('File processing error:', error)
      
      // Log error details
      console.error('Erro ao processar arquivo:', error)
      
      // Show more specific error messages
      let errorMessage = 'Erro ao processar arquivo.'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.toString) {
        errorMessage = error.toString()
      }
      
      setUploadStatus({
        type: 'error',
        message: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isProcessing) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isProcessing) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      processFile(file)
    }
  }

  const totals = useMemo(() => {
    console.log('💰 Calculando totais de', filteredData.length, 'itens')
    console.log('💰 Toggle "mostrar apenas novas":', showOnlyNewDelinquencies)
    
    // Verificar valores dos primeiros itens
    if (filteredData.length > 0) {
      console.log('🔍 Primeiros 5 itens para debug:', filteredData.slice(0, 5).map(item => ({
        id: item.id,
        invoiceNumber: item.invoiceNumber,
        clientCode: item.clientCode,
        totalValue: item.totalValue,
        paidValue: item.paidValue,
        pendingValue: item.pendingValue,
        amount: item.amount,
        totalValueType: typeof item.totalValue,
        paidValueType: typeof item.paidValue,
        pendingValueType: typeof item.pendingValue
      })))
    } else {
      console.warn('⚠️ filteredData está vazio! Verificando todayData e yesterdayData...')
      console.log('  - todayData.length:', todayData.length)
      console.log('  - yesterdayData.length:', yesterdayData.length)
      console.log('  - showOnlyNewDelinquencies:', showOnlyNewDelinquencies)
    }
    
    // Data structure:
    // - totalValue = valor total da nota = Total a Pagar
    // - paidValue = valor pago = Pagas
    // - pendingValue = valor pendente (vencidos) = Vencidas
    
    // Total a Pagar = soma dos valores totais (totalValue)
    let totalPending = 0
    let totalPaid = 0
    let totalOverdue = 0
    
    filteredData.forEach((item, index) => {
      // Total Value
      let value = 0
      if (item.totalValue !== undefined && item.totalValue !== null) {
        if (typeof item.totalValue === 'number') {
          value = item.totalValue
        } else {
          const str = String(item.totalValue).trim()
          value = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
        }
      } else if (item.amount !== undefined && item.amount !== null) {
        if (typeof item.amount === 'number') {
          value = item.amount
        } else {
          const str = String(item.amount).trim()
          value = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
        }
      }
      totalPending += value
      
      // Paid Value
      value = 0
      if (item.paidValue !== undefined && item.paidValue !== null) {
        if (typeof item.paidValue === 'number') {
          value = item.paidValue
        } else {
          const str = String(item.paidValue).trim()
          value = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
        }
      }
      totalPaid += value
      
      // Pending Value
      value = 0
      if (item.pendingValue !== undefined && item.pendingValue !== null) {
        if (typeof item.pendingValue === 'number') {
          value = item.pendingValue
        } else {
          const str = String(item.pendingValue).trim()
          value = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
        }
      }
      totalOverdue += value
      
      // Log dos primeiros itens
      if (index < 3) {
        console.log(`💰 Item ${index}:`, {
          id: item.id,
          totalValue: item.totalValue,
          totalValueType: typeof item.totalValue,
          totalValueCalculated: totalPending,
          paidValue: item.paidValue,
          paidValueType: typeof item.paidValue,
          pendingValue: item.pendingValue,
          pendingValueType: typeof item.pendingValue
        })
      }
    })
    
    console.log('💰 Totais calculados FINAIS:', {
      total: totalPending,
      paid: totalPaid,
      overdue: totalOverdue,
      filteredDataLength: filteredData.length,
      sampleItem: filteredData[0] ? {
        totalValue: filteredData[0].totalValue,
        paidValue: filteredData[0].paidValue,
        pendingValue: filteredData[0].pendingValue,
        amount: filteredData[0].amount
      } : null,
      allValues: filteredData.slice(0, 10).map(item => ({
        total: item.totalValue,
        paid: item.paidValue,
        pending: item.pendingValue
      }))
    })
    
    // Garantir que os valores não são NaN ou Infinity
    const finalTotal = isNaN(totalPending) || !isFinite(totalPending) ? 0 : totalPending
    const finalPaid = isNaN(totalPaid) || !isFinite(totalPaid) ? 0 : totalPaid
    const finalOverdue = isNaN(totalOverdue) || !isFinite(totalOverdue) ? 0 : totalOverdue
    
    console.log('💰 Totais FINAIS após validação:', {
      total: finalTotal,
      paid: finalPaid,
      overdue: finalOverdue
    })
    
    return {
      total: finalTotal, // Total a Pagar = totalValue
      paid: finalPaid, // Pagas = paidValue
      overdue: finalOverdue, // Vencidas = pendingValue
    }
  }, [filteredData])

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 md:gap-3 text-neutral-text-secondary hover:text-primary-blue mb-4 md:mb-6 transition-all duration-300 group card-3d inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl hover:bg-white/50 backdrop-3d touch-manipulation active:scale-95"
      >
        <div className="p-1.5 md:p-2 bg-gradient-to-br from-secondary-purple/10 to-primary-blue/10 rounded-lg group-hover:from-secondary-purple/20 group-hover:to-primary-blue/20 transition-all">
          <ArrowLeft size={16} className="md:w-[18px] md:h-[18px] group-hover:-translate-x-2 transition-transform duration-300" />
        </div>
        <span className="font-semibold text-sm md:text-base">Voltar para automações</span>
      </button>

      <div className="mb-6 md:mb-8 slide-in-up">
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className="p-3 md:p-4 bg-gradient-to-br from-secondary-purple via-secondary-purple to-secondary-purple-dark rounded-xl md:rounded-2xl shadow-3d neon-glow-hover relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <DollarSign className="text-white relative z-10" size={24} style={{ width: '24px', height: '24px' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-text-primary dark:text-slate-100 drop-shadow-sm transition-colors duration-500 break-words">
              {automation.name}
            </h2>
            <p className="text-neutral-text-secondary dark:text-slate-300 mt-1 md:mt-2 text-sm md:text-base lg:text-lg transition-colors duration-500 break-words">{automation.description}</p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="mb-6 md:mb-8 bg-gradient-to-br from-neutral-surface to-neutral-background border border-neutral-border rounded-lg md:rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-neutral-text-primary flex items-center gap-2">
            <Upload size={20} className="md:w-6 md:h-6 text-primary-blue flex-shrink-0" />
            <span className="break-words">Importar Contas a Pagar</span>
          </h3>
          
        </div>

        <div className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg md:rounded-xl p-4 md:p-6 lg:p-8 text-center transition-all ${
              isDragging
                ? 'border-primary-blue bg-primary-blue/10 scale-105'
                : selectedFile
                ? 'border-neutral-border bg-white/30 dark:bg-slate-800/30'
                : 'border-neutral-border hover:border-primary-blue/50 hover:bg-white/50 dark:hover:bg-slate-800/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-ap"
              disabled={isProcessing}
            />
            
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2 md:gap-3 w-full max-w-md">
                  <FileText size={24} className="md:w-8 md:h-8 text-primary-blue flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm md:text-base text-neutral-text-primary font-semibold break-words">{selectedFile.name}</p>
                    <p className="text-xs md:text-sm text-neutral-text-secondary">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="ml-2 md:ml-4 p-1.5 md:p-2 text-neutral-text-secondary hover:text-status-error hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors touch-manipulation active:scale-95 flex-shrink-0"
                    disabled={isProcessing}
                    aria-label="Remover arquivo"
                    title="Remover arquivo"
                  >
                    <X size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>
                <label
                  htmlFor="file-upload-ap"
                  className={`inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold transition-all text-sm md:text-base touch-manipulation active:scale-95 ${
                    isProcessing
                      ? 'bg-neutral-border text-neutral-text-secondary cursor-not-allowed'
                      : 'bg-gradient-to-br from-primary-blue to-primary-blue-dark text-white hover:shadow-lg hover:scale-105 cursor-pointer'
                  }`}
                >
                  <Upload size={18} className="md:w-5 md:h-5" />
                  Trocar arquivo
                </label>
              </div>
            ) : (
              <label htmlFor="file-upload-ap" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3 md:gap-4">
                  <div className={`p-3 md:p-4 rounded-full ${isDragging ? 'bg-primary-blue/20' : 'bg-primary-blue/10'}`}>
                    <Upload size={24} className="md:w-8 md:h-8 text-primary-blue" />
                  </div>
                  <div>
                    <p className="text-base md:text-lg text-neutral-text-primary font-semibold mb-1 break-words">
                      {isDragging ? 'Solte o arquivo aqui' : 'Arraste e solte o arquivo aqui'}
                    </p>
                    <p className="text-xs md:text-sm text-neutral-text-secondary">
                      ou clique para selecionar
                    </p>
                  </div>
                </div>
              </label>
            )}
          </div>

          {parsedClients.length > 0 && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs md:text-sm text-neutral-text-secondary mb-2">
                Clientes encontrados: {parsedClients.length}
              </p>
              <div className="max-h-32 md:max-h-40 overflow-y-auto space-y-1">
                {parsedClients.slice(0, 10).map((client, index) => (
                  <div key={index} className="text-xs md:text-sm text-neutral-text-primary break-words">
                    <span className="font-semibold">{client.clientCode}</span> - {client.clientName}
                    {client.amount && <span className="ml-1 md:ml-2 text-neutral-text-secondary">(R$ {client.amount.toLocaleString('pt-BR')})</span>}
                  </div>
                ))}
                {parsedClients.length > 10 && (
                  <div className="text-xs md:text-sm text-neutral-text-secondary italic">
                    ... e mais {parsedClients.length - 10} cliente(s)
                  </div>
                )}
              </div>
            </div>
          )}

          {parsedClients.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition-all text-sm md:text-base touch-manipulation active:scale-95 ${
                isProcessing
                  ? 'bg-neutral-border text-neutral-text-secondary cursor-not-allowed'
                  : 'bg-gradient-to-br from-status-success to-green-600 text-white hover:shadow-lg hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} className="md:w-5 md:h-5" />
                  Enviar
                </>
              )}
            </button>
          )}

          {uploadStatus.type && (
            <div
              className={`p-3 md:p-4 rounded-lg flex items-center gap-2 text-xs md:text-sm ${
                uploadStatus.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle size={18} className="md:w-5 md:h-5 flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="md:w-5 md:h-5 flex-shrink-0" />
              )}
              <span className="break-words">{uploadStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle de Novas Inadimplências */}
      <div className="mb-4 md:mb-6 bg-gradient-to-br from-neutral-surface to-neutral-background border border-neutral-border rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <AlertCircle size={18} className="md:w-5 md:h-5 text-primary-blue flex-shrink-0" />
          <div>
            <h3 className="text-xs md:text-sm font-semibold text-neutral-text-primary break-words">Mostrar apenas novas inadimplências</h3>
            <p className="text-xs text-neutral-text-secondary">Compara o PDF de hoje com o de ontem</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto" aria-label="Mostrar apenas novas inadimplências">
          <input
            type="checkbox"
            checked={showOnlyNewDelinquencies}
            onChange={(e) => setShowOnlyNewDelinquencies(e.target.checked)}
            className="sr-only peer"
            aria-label="Toggle para mostrar apenas novas inadimplências"
          />
          <div className="w-12 h-6 md:w-14 md:h-7 bg-neutral-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-neutral-border after:border after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-primary-blue touch-manipulation"></div>
        </label>
      </div>

      {/* Client and Date Filters - Reestruturado */}
      <div className="card-3d-elevated rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-3d relative overflow-hidden transition-colors duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5 dark:from-primary-blue/10 dark:to-secondary-purple/10 transition-opacity duration-500"></div>
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 relative z-10">
          <div className="p-2 md:p-3 bg-gradient-to-br from-primary-blue to-primary-blue-dark rounded-lg md:rounded-xl shadow-md flex-shrink-0">
            <Filter size={18} className="md:w-5 md:h-5 text-white" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-neutral-text-primary dark:text-slate-100 drop-shadow-sm transition-colors duration-500">
            Filtros
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Clientes (mesmo design do XML, só que clientes) */}
          <div>
            <label className="block text-sm font-medium text-neutral-text-primary mb-2">
              Clientes
            </label>
            <div className="backdrop-3d border border-neutral-border/50 rounded-lg md:rounded-xl p-3 md:p-4 max-h-48 overflow-y-auto shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 via-transparent to-secondary-purple/5"></div>

              {/* Barra de pesquisa */}
              <div className="relative z-10 mb-3">
                <div className="relative">
                  <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-neutral-text-secondary" size={16} />
                  <input
                    type="text"
                    placeholder="Pesquisar cliente..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-2 text-sm border-2 border-neutral-border/50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue/50 backdrop-3d transition-all duration-200 hover:border-primary-blue/30 dark:placeholder:text-slate-400 touch-manipulation"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setHasInitializedClients(true)
                  if (selectedClients.length === availableClients.length) {
                    setSelectedClients([])
                  } else {
                    setSelectedClients(availableClients.map(c => c.displayName))
                  }
                }}
                className="text-xs md:text-sm text-primary-blue hover:text-primary-blue-dark font-semibold mb-3 relative z-10 transition-all duration-200 hover:scale-105 inline-block touch-manipulation active:scale-95"
              >
                {selectedClients.length === availableClients.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>

              <div className="space-y-1.5 md:space-y-2 relative z-10">
                {filteredClients.map((client) => {
                  const isSelected = selectedClients.includes(client.displayName)
                  return (
                    <label
                      key={client.id}
                      className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-white/60 p-2.5 md:p-3 rounded-lg transition-all duration-200 group card-3d touch-manipulation active:scale-95"
                    >
                      <div className="relative w-5 h-5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setHasInitializedClients(true)
                            if (isSelected) {
                              setSelectedClients(selectedClients.filter(c => c !== client.displayName))
                            } else {
                              setSelectedClients([...selectedClients, client.displayName])
                            }
                          }}
                          className="absolute opacity-0 w-0 h-0"
                        />
                        {isSelected ? (
                          <div className="relative" style={{ width: '20px', height: '14px' }}>
                            <div
                              className="absolute left-0 top-0 bottom-0"
                              style={{
                                width: '2px',
                                background: 'linear-gradient(180deg, #1E40AF 0%, #2563EB 100%)',
                                borderRadius: '1px 0 0 1px',
                              }}
                            />
                            <div
                              className="absolute top-0 right-0 bottom-0"
                              style={{
                                left: '2px',
                                background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                                borderRadius: '0 2px 2px 0',
                                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                                clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 0 100%)',
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-neutral-border rounded-sm"></div>
                        )}
                      </div>
                      <span className="text-xs md:text-sm font-medium text-neutral-text-primary dark:text-slate-200 group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors break-words">
                        {client.name}
                        {client.code && (
                          <span className="text-neutral-text-secondary dark:text-slate-400 ml-1 md:ml-2 text-xs">({client.code})</span>
                        )}
                      </span>
                    </label>
                  )
                })}
                {filteredClients.length === 0 && (
                  <p className="text-sm text-neutral-text-secondary dark:text-slate-400 text-center py-2 transition-colors duration-500">
                    Nenhum cliente encontrado
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Período: filtro por data de vencimento dos lançamentos */}
          <div className="relative z-10">
            <label className="block text-sm font-medium text-neutral-text-primary dark:text-slate-200 mb-2 transition-colors duration-500">
              Período
            </label>

            <div className="mb-3 md:mb-4 relative z-10">
              <label className="block text-xs text-neutral-text-secondary dark:text-slate-400 mb-2 transition-colors duration-500">
                Períodos rápidos
              </label>
              <div className="flex flex-wrap gap-1.5 md:gap-2 relative z-10">
                {[
                  {
                    label: 'Últimos 30 dias',
                    range: (() => {
                      const end = new Date()
                      const start = subDays(end, 30)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                  {
                    label: 'Mês passado',
                    range: (() => {
                      const lastMonth = subMonths(new Date(), 1)
                      const start = startOfMonth(lastMonth)
                      const end = endOfMonth(lastMonth)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                  {
                    label: 'Este mês',
                    range: (() => {
                      const now = new Date()
                      const start = startOfMonth(now)
                      const end = endOfMonth(now)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                  {
                    label: 'Últimos 3 meses',
                    range: (() => {
                      const end = new Date()
                      const start = subMonths(end, 3)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                  {
                    label: 'Últimos 6 meses',
                    range: (() => {
                      const end = new Date()
                      const start = subMonths(end, 6)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                  {
                    label: 'Ano passado',
                    range: (() => {
                      const lastYear = subYears(new Date(), 1)
                      const start = startOfYear(lastYear)
                      const end = endOfYear(lastYear)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                  {
                    label: 'Este ano',
                    range: (() => {
                      const now = new Date()
                      const start = startOfYear(now)
                      const end = endOfYear(now)
                      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
                    })(),
                  },
                ].map((preset, index) => {
                  const isActive = dateRange.start === preset.range.start && dateRange.end === preset.range.end
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setDateRange({ start: preset.range.start, end: preset.range.end })}
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

            <div className="grid grid-cols-2 gap-2 md:gap-3 relative z-10 min-w-0">
              <div className="min-w-0">
                <label htmlFor="date-start-ap" className="block text-xs text-neutral-text-secondary dark:text-slate-400 mb-1 transition-colors duration-500">
                  Data Inicial
                </label>
                <input
                  id="date-start-ap"
                  type="date"
                  value={dateRange.start ? dateRange.start.split('T')[0] : ''}
                  onClick={(e) => {
                    // Melhora UX: clicar em qualquer parte abre o calendário (quando suportado)
                    const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
                    el.showPicker?.()
                  }}
                  onChange={(e) => {
                    const newStart = e.target.value
                    if (newStart && dateRange.end && newStart > dateRange.end.split('T')[0]) {
                      setDateRange({ start: newStart, end: newStart })
                    } else {
                      setDateRange({ ...dateRange, start: newStart })
                    }
                  }}
                  aria-label="Data inicial do período"
                  className="w-full min-w-0 px-2.5 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm border-2 border-neutral-border/50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue/50 backdrop-3d transition-all duration-200 hover:border-primary-blue/30 shadow-sm hover:shadow-md touch-manipulation"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="date-end-ap" className="block text-xs text-neutral-text-secondary dark:text-slate-400 mb-1 transition-colors duration-500">
                  Data Final
                </label>
                <input
                  id="date-end-ap"
                  type="date"
                  value={dateRange.end ? dateRange.end.split('T')[0] : ''}
                  onClick={(e) => {
                    // Melhora UX: clicar em qualquer parte abre o calendário (quando suportado)
                    const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
                    el.showPicker?.()
                  }}
                  onChange={(e) => {
                    const newEnd = e.target.value
                    if (newEnd && dateRange.start && newEnd < dateRange.start.split('T')[0]) {
                      setDateRange({ start: newEnd, end: newEnd })
                    } else {
                      setDateRange({ ...dateRange, end: newEnd })
                    }
                  }}
                  aria-label="Data final do período"
                  className="w-full min-w-0 px-2.5 md:px-4 py-2.5 md:py-3 text-[13px] md:text-sm border-2 border-neutral-border/50 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue/50 backdrop-3d transition-all duration-200 hover:border-primary-blue/30 shadow-sm hover:shadow-md touch-manipulation"
                />
              </div>
            </div>

            {selectedClients.length > 0 && getDateRangeForClients.min && getDateRangeForClients.max && (
              <div className="pt-3 mt-4 border-t border-neutral-border/50 relative z-10">
                <p className="text-xs text-neutral-text-secondary dark:text-slate-400 mb-2 transition-colors duration-500">
                  Período dos clientes selecionados:
                </p>
                <button
                  onClick={() => {
                    if (getDateRangeForClients.min && getDateRangeForClients.max) {
                      setDateRange({ start: getDateRangeForClients.min, end: getDateRangeForClients.max })
                    }
                  }}
                  className="w-full text-xs font-semibold px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-200 cursor-pointer relative z-20 bg-white/60 dark:bg-slate-700/60 text-primary-blue hover:text-primary-blue-dark hover:bg-white/80 dark:hover:bg-slate-700/80 hover:scale-[1.01] border border-neutral-border/50 dark:border-slate-600 hover:border-primary-blue/50 touch-manipulation active:scale-95"
                >
                  Ajustar para período completo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <StatCard
          title="Total a Pagar"
          value={totals.total}
          icon={DollarSign}
          gradient="from-primary-blue to-primary-blue-dark"
        />
        <StatCard
          title="Pagas"
          value={totals.paid}
          icon={CheckCircle}
          gradient="from-status-success to-green-600"
        />
        <StatCard
          title="Vencidas"
          value={totals.overdue}
          icon={AlertCircle}
          gradient="from-status-error to-red-600"
        />
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-8 md:py-12">
          <Loader2 size={24} className="md:w-8 md:h-8 animate-spin text-primary-blue" />
          <span className="ml-2 md:ml-3 text-sm md:text-base text-neutral-text-secondary">Carregando dados do Supabase...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-gradient-to-br from-neutral-surface to-neutral-background border border-neutral-border rounded-lg md:rounded-xl p-6 md:p-8 text-center">
          <FileText size={36} className="md:w-12 md:h-12 mx-auto text-neutral-text-secondary mb-3 md:mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-neutral-text-primary mb-2 break-words">
            Nenhum dado encontrado
          </h3>
          <p className="text-sm md:text-base text-neutral-text-secondary break-words px-4">
            {allData.length === 0
              ? 'Importe um arquivo para começar a ver os dados de contas a pagar.'
              : 'Nenhum dado encontrado no período selecionado. Ajuste os filtros de data ou cliente.'}
          </p>
        </div>
      ) : (
        <>
          <AccountsPayableCharts data={filteredData} />

          <div className="mt-6 md:mt-8">
            <AccountsPayableTable data={filteredData} />
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
  value: number
  icon: any
  gradient: string
}) {
  const [displayValue, setDisplayValue] = useState<number>(0)
  const prevValueRef = useRef<number>(0)

  useEffect(() => {
    const from = prevValueRef.current
    const to = Number.isFinite(value) ? value : 0
    prevValueRef.current = to

    const durationMs = 650
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayValue(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

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
        <h3 className="text-xs md:text-sm font-medium text-neutral-text-secondary mb-2 md:mb-3 break-words">{title}</h3>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold text-neutral-text-primary drop-shadow-sm break-words">
          {`R$ ${displayValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-blue via-secondary-purple to-primary-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
    </div>
  )
}
