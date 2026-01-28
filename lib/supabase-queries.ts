import { supabase, supabaseAdmin, isSupabaseConfigured } from './supabase'

// Verificar se supabaseAdmin está disponível
const getSupabaseClient = () => {
  if (supabase) return supabase
  if (supabaseAdmin) return supabaseAdmin
  return null
}
import type { TaxData, AccountsPayableData, PayrollData, Company } from './data'
import { formatPaymentType } from './paymentTypeMapping'

/**
 * Busca dados fiscais do Supabase (usando estrutura flexível automation_data)
 */
export async function getTaxData(
  companyIds: string[],
  startDate: string,
  endDate: string
): Promise<TaxData[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase não configurado. Retornando array vazio.')
    return []
  }

  try {
    // Valida as datas antes de fazer a query
    if (!startDate || !endDate) {
      console.error('Datas inválidas para busca:', { startDate, endDate })
      return []
    }
    
    if (startDate > endDate) {
      console.error('Data inicial maior que data final:', { startDate, endDate })
      return []
    }
    
    // IMPORTANT:
    // Agora o Supabase pode ter (a) registros antigos diários e (b) um registro consolidado por empresa.
    // Para NÃO duplicar, buscamos tudo por empresa + automation_id e deduplicamos pegando o MAIS RECENTE por empresa.
    const { data, error } = await supabase
      .from('automation_data')
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .eq('automation_id', 'xml-sefaz') // Filtra apenas dados do Sefaz XML
      .in('company_id', companyIds)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar dados fiscais:', error)
      return []
    }

    // Dedup: 1 registro por empresa (o mais recente).
    const latestByCompany: Record<string, any> = {}
    for (const row of data || []) {
      const cid = row?.company_id
      if (!cid) continue
      if (!latestByCompany[cid]) latestByCompany[cid] = row
    }
    const rows = Object.values(latestByCompany)

    // Expande dados consolidados do JSON no metadata
    const expandedData: any[] = []
    
    const startDateStr = startDate.split('T')[0] // YYYY-MM-DD
    const endDateStr = endDate.split('T')[0] // YYYY-MM-DD

    for (const item of rows) {
      const metadata = item.metadata || {}
      
      // Se há dados de evolução diária no JSON, expande cada dia
      // FILTRA apenas datas dentro do range solicitado
      if (metadata.evolucao_diaria && Array.isArray(metadata.evolucao_diaria)) {
        for (const dia of metadata.evolucao_diaria) {
          if (!dia.date) continue
          
          // Filtra por data (compara strings YYYY-MM-DD para evitar problemas de timezone)
          const diaDateStr = dia.date.split('T')[0]
          if (diaDateStr < startDateStr || diaDateStr > endDateStr) {
            continue // Pula datas fora do range
          }
          
          expandedData.push({
            id: `${item.id}_${dia.date}`,
            companyId: item.company_id,
            companyName: item.companies?.name || 'Unknown',
            xmlCount: dia.xml_count || 0,
            nfCount: dia.nf_count || 0,
            nfcCount: dia.nfc_count || 0,
            faturamento: parseFloat(dia.faturamento || 0),
            despesa: parseFloat(dia.despesa || 0),
            resultado: parseFloat(dia.resultado || 0),
            period: dia.date ? dia.date.substring(0, 7) : '',
            date: dia.date,
            isEvolutionData: true,
            valorDiario: dia.valor_diario !== undefined ? parseFloat(dia.valor_diario) : undefined,
            valorAcumulado: dia.valor_acumulado !== undefined ? parseFloat(dia.valor_acumulado) : undefined,
            totalAmount: parseFloat(dia.faturamento || 0) + parseFloat(dia.despesa || 0),
          })
        }

        // Se existe evolucao_diaria, NÃO adiciona o periodo_agregado como item separado,
        // senão duplica os totais (cards, tabela, etc.).
        continue
      }
      
      // Se há dados de período agregado no JSON, adiciona também
      if (metadata.periodo_agregado) {
        const periodo = metadata.periodo_agregado
        expandedData.push({
          id: `${item.id}_periodo`,
          companyId: item.company_id,
          companyName: item.companies?.name || 'Unknown',
          xmlCount: periodo.xml_count || 0,
          nfCount: periodo.nf_count || 0,
          nfcCount: periodo.nfc_count || 0,
          faturamento: parseFloat(periodo.faturamento || 0),
          despesa: parseFloat(periodo.despesa || 0),
          resultado: parseFloat(periodo.resultado || 0),
          period: periodo.data_inicial ? periodo.data_inicial.substring(0, 7) : '',
          date: periodo.data_final || item.date,
          isEvolutionData: false,
          totalAmount: parseFloat(periodo.faturamento || 0) + parseFloat(periodo.despesa || 0),
        })
      }
      
      // Fallback: se não há dados consolidados, usa campos diretos (compatibilidade)
      if (!metadata.evolucao_diaria && !metadata.periodo_agregado) {
        const faturamento = parseFloat(item.amount_1 || 0)
        const despesa = parseFloat(item.amount_2 || 0)
        const resultado = metadata.resultado !== undefined ? parseFloat(metadata.resultado) : (faturamento - despesa)
        
        expandedData.push({
          id: item.id,
          companyId: item.company_id,
          companyName: item.companies?.name || 'Unknown',
          xmlCount: item.count_1 || 0,
          nfCount: item.count_2 || 0,
          nfcCount: item.count_3 || 0,
          faturamento: faturamento,
          despesa: despesa,
          resultado: resultado,
          period: item.date ? item.date.substring(0, 7) : '',
          date: item.date,
          isEvolutionData: metadata.is_evolution_data === true,
          valorDiario: metadata.valor_diario !== undefined ? parseFloat(metadata.valor_diario) : undefined,
          valorAcumulado: metadata.valor_acumulado !== undefined ? parseFloat(metadata.valor_acumulado) : undefined,
          totalAmount: faturamento + despesa,
        })
      }
    }
    
    return expandedData
  } catch (error) {
    console.error('Erro ao buscar dados fiscais:', error)
    return []
  }
}

/**
 * Busca contas a pagar do Supabase
 */
export async function getAccountsPayableData(
  companyIds: string[],
  startDate: string,
  endDate: string
): Promise<AccountsPayableData[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase não configurado. Retornando array vazio.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('accounts_payable')
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .in('company_id', companyIds)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Erro ao buscar contas a pagar:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      companyId: item.company_id,
      companyName: item.companies?.name || 'Unknown',
      invoiceNumber: item.invoice_number,
      supplier: item.supplier,
      dueDate: item.due_date,
      amount: parseFloat(item.amount || 0),
      status: item.status || 'pending',
      category: item.category || '',
      period: item.period || '',
    }))
  } catch (error) {
    console.error('Erro ao buscar contas a pagar:', error)
    return []
  }
}

/**
 * Busca dados de folha de pagamento do Supabase
 */
export async function getPayrollData(
  companyIds: string[],
  startDate: string,
  endDate: string
): Promise<PayrollData[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase não configurado. Retornando array vazio.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('payroll_data')
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .in('company_id', companyIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Erro ao buscar dados de folha:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      companyId: item.company_id,
      companyName: item.companies?.name || 'Unknown',
      employeeCount: item.employee_count || 0,
      totalSalary: parseFloat(item.total_salary || 0),
      benefits: parseFloat(item.benefits || 0),
      taxes: parseFloat(item.taxes || 0),
      netAmount: parseFloat(item.net_amount || 0),
      period: item.period,
      date: item.date,
    }))
  } catch (error) {
    console.error('Erro ao buscar dados de folha:', error)
    return []
  }
}

/**
 * Busca empresas do Supabase
 */
export async function getCompanies(): Promise<Company[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase não configurado. Retornando array vazio.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, cnpj')
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar empresas:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      cnpj: item.cnpj,
    }))
  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return []
  }
}

/**
 * Busca localizações das empresas do Supabase
 * O estado vem do campo 'state' da tabela companies (obtido via API CNPJ)
 */
export async function getCompanyLocations(companyIds: string[]): Promise<any[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase não configurado. Retornando array vazio.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, cnpj, state')
      .in('id', companyIds)

    if (error) {
      console.error('Erro ao buscar localizações:', error)
      return []
    }

    // Mapeia estado para região (para destacar no mapa)
    const stateToRegion: Record<string, string> = {
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste',
      'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul',
    }

    return (data || []).map((item: any) => ({
      companyId: item.id,
      companyName: item.name,
      cnpj: item.cnpj,
      state: item.state || '',
      region: stateToRegion[item.state] || '',
      // Campos removidos - não precisamos mais de lat/lng/city
      lat: 0,
      lng: 0,
      city: '',
    }))
  } catch (error) {
    console.error('Erro ao buscar localizações:', error)
    return []
  }
}

// Accounts Payable PDF Data Types
export interface AccountsPayablePDFData {
  id: string
  company_id: string
  automation_id: string
  pdf_upload_date: string
  clients_data: Array<{
    client_code: string
    client_name: string
    amount?: number
    paid_amount?: number
    pending_amount?: number
    status?: string
    titles?: Array<{
      due_date: string
      issue_date: string
      invoice_number: string
      payment_type: string
      payment_condition: string
      days_overdue: number
      total_value: number
      paid_value: number
      pending_value: number
    }>
  }>
  total_clients: number
  total_amount: number
  is_new: boolean
  created_at: string
  updated_at: string
}

/**
 * Insert accounts payable PDF data into database (structured in JSONB)
 */
export async function insertAccountsPayablePDFData(
  clients: Array<{
    clientCode: string
    clientName: string
    amount?: number
    paidAmount?: number
    pendingAmount?: number
    status?: string
    titles?: Array<{
      dueDate: string
      issueDate: string
      invoiceNumber: string
      paymentType: string
      paymentCondition: string
      daysOverdue: number
      totalValue: number
      paidValue: number
      pendingValue: number
    }>
  }>,
  automationId: string,
  uploadDate: string
): Promise<{ success: boolean; newCount: number; totalCount: number; error?: string }> {
  // Usar supabaseAdmin (service role) para INSERT, pois precisa de permissões de escrita
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return {
      success: false,
      newCount: 0,
      totalCount: 0,
      error: 'Supabase não configurado ou service role key não disponível',
    }
  }

  try {
    // Manter apenas os 2 PDFs mais recentes (ontem e hoje)
    // Primeiro, buscar todos os registros para este automation_id
    const { data: allRecords, error: fetchError } = await supabaseAdmin
      .from('accounts_payable_pdf_data')
      .select('id, pdf_upload_date')
      .eq('automation_id', automationId)
      // pdf_upload_date é DATE (sem hora) -> pode empatar. Use created_at para definir ordem real de upload.
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('Erro ao buscar registros existentes:', fetchError)
    }
    
    console.log('📊 Registros existentes antes da limpeza:', allRecords?.length || 0)
    
    // Se já existem 2 ou mais registros, deletar TODOS antes de inserir o novo
    // Isso garante que nunca terá mais de 2 linhas (1 depois do delete + 1 depois do insert = 2)
    if (allRecords && allRecords.length >= 2) {
      const idsToDelete = allRecords.map(r => r.id)
      console.log('🗑️ Deletando TODOS os', idsToDelete.length, 'registros existentes (máximo de 2 linhas):', idsToDelete)
      const { error: deleteError } = await supabaseAdmin
        .from('accounts_payable_pdf_data')
        .delete()
        .in('id', idsToDelete)
      
      if (deleteError) {
        console.error('Erro ao deletar registros existentes:', deleteError)
      } else {
        console.log('✅ Todos os registros existentes deletados com sucesso')
      }
    }
    
    // Get previous PDF data to compare (o mais recente antes do upload de hoje)
    const { data: previousData, error: prevError } = await supabaseAdmin
      .from('accounts_payable_pdf_data')
      .select('clients_data, pdf_upload_date')
      .eq('automation_id', automationId)
      .lt('pdf_upload_date', uploadDate)
      .order('pdf_upload_date', { ascending: false })
      .limit(1)

    const previousClientCodes = new Set<string>()
    if (previousData && previousData.length > 0) {
      const prevClients = previousData[0].clients_data as Array<{ client_code: string }>
      prevClients.forEach((c: any) => {
        if (c.client_code) previousClientCodes.add(c.client_code)
      })
    }

    // Check which clients are new
    const newClients = clients.filter(c => !previousClientCodes.has(c.clientCode))
    const isNew = newClients.length > 0

    // Calculate totals
    const totalAmount = clients.reduce((sum, c) => sum + (c.amount || 0), 0)

    // Structure clients data with titles
    const clientsData = clients.map(c => ({
      client_code: c.clientCode,
      client_name: c.clientName,
      amount: c.amount || 0,
      paid_amount: c.paidAmount || 0,
      pending_amount: c.pendingAmount || (c.amount && !c.paidAmount ? c.amount : 0),
      status: c.status || 'pending',
      titles: c.titles?.map(t => ({
        due_date: t.dueDate,
        issue_date: t.issueDate,
        invoice_number: t.invoiceNumber,
        payment_type: t.paymentType,
        payment_condition: t.paymentCondition,
        days_overdue: t.daysOverdue,
        total_value: t.totalValue,
        paid_value: t.paidValue,
        pending_value: t.pendingValue,
      })) || [],
    }))

    // Insert the structured data (NO company_id - works directly with clients)
    // Usar supabaseAdmin para INSERT (precisa de service role)
    const { data, error } = await supabaseAdmin
      .from('accounts_payable_pdf_data')
      .insert({
        automation_id: automationId,
        pdf_upload_date: uploadDate,
        clients_data: clientsData,
        total_clients: clients.length,
        total_amount: totalAmount,
        is_new: isNew,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir dados do PDF:', error)
      return {
        success: false,
        newCount: 0,
        totalCount: 0,
        error: error.message,
      }
    }

    return {
      success: true,
      newCount: newClients.length,
      totalCount: clients.length,
    }
  } catch (error: any) {
    console.error('Erro ao inserir dados do PDF:', error)
    return {
      success: false,
      newCount: 0,
      totalCount: 0,
      error: error?.message || 'Erro desconhecido',
    }
  }
}

/**
 * Get accounts payable PDF data with filters
 */
export async function getAccountsPayablePDFData(
  companyId?: string,
  startDate?: string,
  endDate?: string,
  showOnlyNew?: boolean
): Promise<AccountsPayablePDFData[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase não configurado.')
    return []
  }

  try {
    let query = supabase
      .from('accounts_payable_pdf_data')
      .select('*')
      .order('pdf_upload_date', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (startDate) {
      query = query.gte('pdf_upload_date', startDate)
    }

    if (endDate) {
      query = query.lte('pdf_upload_date', endDate)
    }

    if (showOnlyNew) {
      query = query.eq('is_new', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar dados do PDF:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro ao buscar dados do PDF:', error)
    return []
  }
}

/**
 * Get accounts payable data from PDF imports (expanded from JSONB structure)
 * This converts the JSONB structure into individual AccountsPayableData items
 * NO company_id needed - works directly with clients
 * Returns data from the 2 most recent PDFs (today and yesterday)
 */
export async function getAccountsPayableDataFromPDF(
  automationId: string = 'contas-pagar',
  startDate?: string,
  endDate?: string,
  showOnlyNew?: boolean
): Promise<{ todayData: AccountsPayableData[], yesterdayData: AccountsPayableData[] }> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase não configurado.')
    return { todayData: [], yesterdayData: [] }
  }

  // Tentar usar supabaseAdmin (service role) se supabase (anon) falhar
  // Isso garante que mesmo com RLS restritivo, ainda conseguimos ler
  const client = getSupabaseClient()
  if (!client) {
    console.warn('Nenhum cliente Supabase disponível.')
    return { todayData: [], yesterdayData: [] }
  }

  try {
    console.log('🔍 Buscando dados do Supabase com automationId:', automationId)
    console.log('🔑 Usando cliente:', supabase ? 'anon key' : 'service role key')
    
    // Buscar TODOS os registros primeiro para debug, depois limitar
    let query = client
      .from('accounts_payable_pdf_data')
      .select('*')
      // pdf_upload_date é DATE (sem hora) -> pode empatar. Use created_at para definir HOJE/ONTEM.
      .order('created_at', { ascending: false })

    // Se automationId foi fornecido, filtrar por ele
    if (automationId) {
      query = query.eq('automation_id', automationId)
    }

    const { data, error } = await query
    
    console.log('📊 Resultado da query Supabase:', {
      dataCount: data?.length || 0,
      error: error?.message,
      automationId,
      allRecords: data?.map(r => ({ id: r.id, automation_id: r.automation_id, upload_date: r.pdf_upload_date }))
    })

    if (error) {
      console.error('Erro ao buscar dados do PDF:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // If table doesn't exist or relation issue, return empty arrays gracefully
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST301' || 
          error.message?.includes('404') || error.message?.includes('not found') || 
          error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Tabela accounts_payable_pdf_data não encontrada ou relação com companies não configurada. Retornando arrays vazios.')
        return { todayData: [], yesterdayData: [] }
      }
      
      return { todayData: [], yesterdayData: [] }
    }

    // If no data, return empty arrays
    if (!data || data.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado no Supabase para automationId:', automationId)
      return { todayData: [], yesterdayData: [] }
    }

    // Filtrar apenas os 2 mais recentes
    // IMPORTANTE: Ordenado por created_at DESC, então:
    // - data[0] = PDF mais recente (HOJE)
    // - data[1] = PDF anterior (ONTEM)
    const filteredData = data.slice(0, 2)
    
    // Separar dados:
    // - todayPDF = PDF mais recente (segundo PDF inserido) = HOJE
    // - yesterdayPDF = PDF anterior (primeiro PDF inserido) = ONTEM
    const todayPDF = filteredData[0] // Mais recente = HOJE
    const yesterdayPDF = filteredData.length > 1 ? filteredData[1] : null // Segundo mais recente = ONTEM
    
    console.log('📄 PDFs encontrados (máximo 2):', {
      hoje: todayPDF ? { 
        id: todayPDF.id, 
        date: todayPDF.pdf_upload_date, 
        automation_id: todayPDF.automation_id,
        posicao: 'Mais recente (segundo PDF inserido)'
      } : null,
      ontem: yesterdayPDF ? { 
        id: yesterdayPDF.id, 
        date: yesterdayPDF.pdf_upload_date, 
        automation_id: yesterdayPDF.automation_id,
        posicao: 'Anterior (primeiro PDF inserido)'
      } : null,
      total: filteredData.length,
      nota: 'Sempre mantemos apenas 2 registros: o mais recente (hoje) e o anterior (ontem)'
    })

    // Expand JSONB clients_data into individual AccountsPayableData items
    const todayExpandedData: AccountsPayableData[] = []
    const yesterdayExpandedData: AccountsPayableData[] = []
    
    // Process HOJE's PDF (most recent = segundo PDF inserido)
    // IMPORTANTE: Não aplicar filtros de data aqui - expandir TODOS os dados
    if (todayPDF) {
      console.log('🔄 Processando PDF de HOJE (mais recente):', todayPDF.id, todayPDF.pdf_upload_date)
      console.log('📦 Dados brutos do PDF (primeiros 100 chars):', JSON.stringify(todayPDF.clients_data).substring(0, 100))
      
      // Passar undefined para startDate/endDate para não filtrar por data
      const expanded = expandPDFRecord(todayPDF, undefined, undefined)
      todayExpandedData.push(...expanded)
      console.log('✅ Dados expandidos de HOJE:', expanded.length, 'itens')
      
      // Log dos valores dos primeiros itens expandidos
      if (expanded.length > 0) {
        console.log('💰 Primeiros 3 itens expandidos com valores:', expanded.slice(0, 3).map(item => ({
          invoiceNumber: item.invoiceNumber,
          totalValue: item.totalValue,
          paidValue: item.paidValue,
          pendingValue: item.pendingValue
        })))
      }
    }
    
    // Process ONTEM's PDF (second most recent = primeiro PDF inserido)
    if (yesterdayPDF) {
      console.log('🔄 Processando PDF de ONTEM (anterior):', yesterdayPDF.id, yesterdayPDF.pdf_upload_date)
      // Passar undefined para startDate/endDate para não filtrar por data
      const expanded = expandPDFRecord(yesterdayPDF, undefined, undefined)
      yesterdayExpandedData.push(...expanded)
      console.log('✅ Dados expandidos de ONTEM:', expanded.length, 'itens')
    }

    console.log('📈 Total final:', {
      today: todayExpandedData.length,
      yesterday: yesterdayExpandedData.length,
      total: todayExpandedData.length + yesterdayExpandedData.length
    })

    return {
      todayData: todayExpandedData,
      yesterdayData: yesterdayExpandedData
    }
  } catch (error) {
    console.error('Erro ao buscar dados do PDF:', error)
    return { todayData: [], yesterdayData: [] }
  }
}

/**
 * Helper function to expand a PDF record into AccountsPayableData items
 */
function expandPDFRecord(
  pdfRecord: any,
  startDate?: string,
  endDate?: string
): AccountsPayableData[] {
  const expandedData: AccountsPayableData[] = []
  
  console.log('🔧 expandPDFRecord chamado para PDF:', pdfRecord.id, 'com', pdfRecord.clients_data ? 'dados' : 'sem dados')
  
  // Handle JSONB data - it might be stored as JSON string or object
  let clientsData: Array<{
    client_code: string
    client_name: string
    amount?: number
    paid_amount?: number
    pending_amount?: number
    status?: string
    titles?: Array<{
      due_date: string
      issue_date: string
      invoice_number: string
      payment_type: string
      payment_condition: string
      days_overdue: number
      total_value: number
      paid_value: number
      pending_value: number
    }>
  }> = []

  if (pdfRecord.clients_data) {
    if (typeof pdfRecord.clients_data === 'string') {
      try {
        clientsData = JSON.parse(pdfRecord.clients_data)
      } catch (e) {
        console.error('Error parsing clients_data JSON:', e)
        clientsData = []
      }
    } else if (Array.isArray(pdfRecord.clients_data)) {
      clientsData = pdfRecord.clients_data
    }
    
    // Log do primeiro cliente para verificar estrutura
    if (clientsData.length > 0 && clientsData[0]) {
      console.log('🔍 Primeiro cliente do JSONB:', {
        client_code: clientsData[0].client_code,
        client_name: clientsData[0].client_name,
        hasTitles: !!clientsData[0].titles,
        titlesCount: clientsData[0].titles?.length || 0,
        firstTitle: clientsData[0].titles?.[0] ? {
          invoice_number: clientsData[0].titles[0].invoice_number,
          total_value: clientsData[0].titles[0].total_value,
          paid_value: clientsData[0].titles[0].paid_value,
          pending_value: clientsData[0].titles[0].pending_value
        } : null
      })
    }
  }

  console.log('📋 Total de clientes no PDF:', clientsData.length)
  
  for (const client of clientsData) {
    // If client has titles, create one entry per title (line by line like PDF)
    if (client.titles && client.titles.length > 0) {
      console.log(`  Cliente ${client.client_code} tem ${client.titles.length} títulos`)
      for (const title of client.titles) {
        // Log dos valores brutos do título para debug
        if (expandedData.length < 3) {
          console.log('🔍 Título bruto do Supabase:', {
            invoice_number: title.invoice_number,
            total_value: title.total_value,
            total_value_type: typeof title.total_value,
            paid_value: title.paid_value,
            paid_value_type: typeof title.paid_value,
            pending_value: title.pending_value,
            pending_value_type: typeof title.pending_value,
            raw_title: JSON.stringify(title)
          })
        }
        // Determine status based on paid/pending values
        // - Se tem valor pendente > 0: overdue (vencido)
        // - Se tem valor pago > 0 e pendente = 0: paid (pago)
        // - Caso contrário: pending (pendente)
        // Parse valores ANTES de determinar status para garantir que são números
        let pendingValueTemp = 0
        if (title.pending_value !== undefined && title.pending_value !== null) {
          if (typeof title.pending_value === 'number') {
            pendingValueTemp = title.pending_value
          } else {
            const str = String(title.pending_value).trim()
            pendingValueTemp = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
          }
        }
        
        let paidValueTemp = 0
        if (title.paid_value !== undefined && title.paid_value !== null) {
          if (typeof title.paid_value === 'number') {
            paidValueTemp = title.paid_value
          } else {
            const str = String(title.paid_value).trim()
            paidValueTemp = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
          }
        }
        
        let status: 'pending' | 'paid' | 'overdue' = 'pending'
        if (pendingValueTemp > 0) {
          status = 'overdue' // Vencido (tem valor pendente)
        } else if (paidValueTemp > 0) {
          status = 'paid' // Pago (tem valor pago e não tem pendente)
        } else {
          status = 'pending' // Pendente (sem pagamento ainda)
        }

        // Data de vencimento: SEMPRE do título (due_date ou data_vencimento). NUNCA pdf_upload_date.
        const rawDue = (title.due_date ?? (title as any).data_vencimento ?? '').toString().trim()
        let dueDateISO = ''
        if (rawDue.includes('/')) {
          const dueDateParts = rawDue.split('/')
          if (dueDateParts.length === 3) {
            // Garantir padding de zeros para comparação correta (ex: "5" -> "05")
            const year = dueDateParts[2].padStart(4, '0')
            const month = dueDateParts[1].padStart(2, '0')
            const day = dueDateParts[0].padStart(2, '0')
            dueDateISO = `${year}-${month}-${day}`
          }
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDue)) {
          // Já está em formato YYYY-MM-DD, usar como está
          dueDateISO = rawDue
        } else if (rawDue.includes('T')) {
          // Se tem timezone (ex: "2025-01-25T00:00:00.000Z"), pegar só a parte da data
          const datePart = rawDue.split('T')[0]
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            dueDateISO = datePart
          }
        }
        // Se não conseguiu parsear, deixa vazio (item será excluído pelo filtro de período)

        // Extract client name without code from supplier format
        const clientNameOnly = client.client_name || client.client_code || 'Cliente Desconhecido'
        
        // Garantir que tipo de cobrança está completo e condição de pagamento está correta
        let paymentType = title.payment_type || ''
        let paymentCondition = title.payment_condition || ''
        
        // CORRIGIR: Se payment_type tem formato "SF - 02 DIAS" ou "BD - 02 DIAS" (dados antigos incorretos)
        // Deveria ser "SF - BANCO SAFRA" no tipo e "02 DIAS" na condição
        // Mas como o nome do banco não foi salvo, vamos pelo menos separar corretamente
        const wrongFormatMatch = paymentType.match(/^([A-Z]{2})\s*-\s*(\d+\s+DIAS)$/i)
        if (wrongFormatMatch && (!paymentCondition || paymentCondition === '-' || paymentCondition === '')) {
          // Formato incorreto detectado: "SF - 02 DIAS"
          const code = wrongFormatMatch[1] // "SF"
          const condition = wrongFormatMatch[2] // "02 DIAS"
          paymentType = code // Apenas o código (não temos o nome do banco salvo)
          paymentCondition = condition // "02 DIAS"
        }
        
        // CORRIGIR: Se payment_type tem formato "SF - 7 DIAS" (sem espaço antes do número)
        const wrongFormatMatch2 = paymentType.match(/^([A-Z]{2})\s*-\s*(\d+)\s+DIAS$/i)
        if (wrongFormatMatch2 && (!paymentCondition || paymentCondition === '-' || paymentCondition === '')) {
          const code = wrongFormatMatch2[1]
          const condition = `${wrongFormatMatch2[2]} DIAS`
          paymentType = code
          paymentCondition = condition
        }
        
        // Se payment_type está incompleto (só tem código curto) e payment_condition tem descrição longa
        const shortCodes = ['DB', 'PX', 'SF', 'BD', 'CH', 'TR'] // Códigos comuns
        const isShortCode = shortCodes.some(code => paymentType.trim() === code)
        const hasLongDescription = paymentCondition && paymentCondition.length > 5 && !paymentCondition.match(/^\d+\s+DIAS$/i) && !paymentCondition.match(/^A\s+VISTA$/i)
        
        if (isShortCode && hasLongDescription && !paymentType.includes(' - ')) {
          // Dados antigos: combinar payment_type + payment_condition (descrição do banco)
          paymentType = `${paymentType} - ${paymentCondition}`
          paymentCondition = '' // Limpar condição pois já está no tipo
        }
        
        // Se payment_type já está completo (contém " - "), garantir que payment_condition não duplique
        if (paymentType.includes(' - ') && paymentCondition) {
          const [code, ...descParts] = paymentType.split(' - ')
          const description = descParts.join(' - ')
          // Se payment_condition é igual à descrição, limpar para evitar duplicação
          if (paymentCondition === description || paymentCondition === descParts[0]) {
            paymentCondition = ''
          }
        }
        
        // Garantir que o tipo de cobrança está completo usando o mapeamento
        const finalPaymentType = formatPaymentType(paymentType)
        
            // Garantir que os valores são números, não strings
            // Usar os valores já parseados acima se disponíveis
            let totalValue = 0
            if (title.total_value !== undefined && title.total_value !== null) {
              if (typeof title.total_value === 'number') {
                totalValue = title.total_value
              } else {
                const str = String(title.total_value).trim()
                totalValue = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
              }
            }
            
            // Usar valores já parseados acima
            const paidValue = paidValueTemp
            const pendingValue = pendingValueTemp
            
            // Log dos primeiros itens para debug
            if (expandedData.length < 3) {
              console.log('📊 Valores do título:', {
                invoiceNumber: title.invoice_number,
                total_value_raw: title.total_value,
                totalValue_parsed: totalValue,
                paid_value_raw: title.paid_value,
                paidValue_parsed: paidValue,
                pending_value_raw: title.pending_value,
                pendingValue_parsed: pendingValue
              })
            }
            
            expandedData.push({
              id: `${pdfRecord.id}-${client.client_code}-${title.invoice_number}`,
              companyId: '', // No company_id needed - works with clients
              companyName: clientNameOnly, // Nome do cliente (não "PDF Import")
              invoiceNumber: title.invoice_number,
              supplier: `${client.client_code} - ${client.client_name}`, // Código + Nome para identificação única
              clientCode: client.client_code, // Código do cliente
              clientName: clientNameOnly, // Nome do cliente (sem código)
              dueDate: dueDateISO,
              amount: totalValue, // Valor total (usado para exibição na tabela)
              paidValue: paidValue, // Valor pago
              totalValue: totalValue, // Valor total (usado para "Total a Pagar")
              pendingValue: pendingValue, // Valor pendente (usado para "Vencidas")
              daysOverdue: title.days_overdue || 0, // Dias vencidos
              status: status,
              category: finalPaymentType, // Tipo de cobrança completo (ex: "BD - BANCO BRADESCO")
              paymentCondition: paymentCondition, // Condição de pagamento (pode ficar em branco)
              period: dueDateISO ? dueDateISO.substring(0, 7) : '', // YYYY-MM (só se tiver data de vencimento)
            })
      }
    } else {
      // Fallback: if no titles, create one entry per client (old format)
      let status: 'pending' | 'paid' | 'overdue' = 'pending'
      if (client.status === 'paid' || (client.paid_amount && client.paid_amount > 0)) {
        status = 'paid'
      } else if (client.status === 'overdue' || (client.pending_amount && client.pending_amount > 0)) {
        status = 'overdue'
      } else {
        status = 'pending'
      }

      const amount = client.pending_amount || (client.amount && !client.paid_amount ? client.amount : 0)

      const clientNameOnly = client.client_name || client.client_code || 'Cliente Desconhecido'
      
      // Fallback sem títulos: não temos data de vencimento real; usar string vazia
      // para que o filtro por período (data de vencimento) trate conforme a regra do front
      expandedData.push({
        id: `${pdfRecord.id}-${client.client_code}`,
        companyId: '', // No company_id needed
        companyName: clientNameOnly, // Nome do cliente
        invoiceNumber: `PDF-${client.client_code}-${pdfRecord.pdf_upload_date}`,
        supplier: `${client.client_code} - ${client.client_name}`, // Código + Nome
        clientCode: client.client_code, // Código do cliente
        clientName: clientNameOnly, // Nome do cliente (sem código)
        dueDate: '', // Sem títulos: sem data de vencimento (filtro é sempre por vencimento)
        amount: amount,
        paidValue: client.paid_amount || 0,
        totalValue: client.amount || 0,
        pendingValue: client.pending_amount || amount,
        daysOverdue: 0, // Fallback: sem títulos, não tem dias vencidos
        status: status,
        category: '', // Sem tipo de cobrança no fallback
        paymentCondition: '', // Sem condição de pagamento no fallback
        period: pdfRecord.pdf_upload_date.substring(0, 7),
      })
    }
  }

  console.log('✅ expandPDFRecord retornando', expandedData.length, 'itens expandidos')
  return expandedData
}
