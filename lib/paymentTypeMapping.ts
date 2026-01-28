/**
 * Mapeamento de siglas de tipos de cobrança para seus nomes completos
 * Baseado na análise dos PDFs de títulos vencidos
 */
export const PAYMENT_TYPE_MAPPING: Record<string, string> = {
  // Bancos
  'BD': 'BANCO BRADESCO',
  'SF': 'BANCO SAFRA',
  'DV': 'BANCO DAYCOVAL',
  'BB': 'BANCO DO BRASIL',
  'IT': 'BANCO ITAU',
  'CE': 'BANCO CEF',
  'CX': 'BANCO CAIXA',
  'NU': 'BANCO NUBANK',
  'IN': 'BANCO INTER',
  'OR': 'BANCO ORIGINAL',
  'PA': 'BANCO PAN',
  'BT': 'BANCO BTG',
  'XP': 'BANCO XP',
  
  // Tipos de pagamento
  'DB': 'DEPOSITO BANCARIO',
  'PX': 'PIX',
  'CH': 'CHEQUE',
  'TR': 'TRANSFERENCIA',
  'BO': 'BOLETO',
  'CC': 'CARTAO DE CREDITO',
  'CD': 'CARTAO DE DEBITO',
  'TE': 'TED',
  'DOC': 'DOC',
}

/**
 * Expande uma sigla de tipo de cobrança para seu nome completo
 * @param code - Sigla do tipo de cobrança (ex: "BD", "SF", "DB")
 * @returns Nome completo (ex: "BANCO BRADESCO", "BANCO SAFRA", "DEPOSITO BANCARIO")
 */
export function expandPaymentType(code: string): string {
  if (!code) return ''
  
  const upperCode = code.trim().toUpperCase()
  return PAYMENT_TYPE_MAPPING[upperCode] || code
}

/**
 * Formata tipo de cobrança completo: "SIGLA - NOME COMPLETO"
 * @param tipoCobranca - Tipo de cobrança do JSON (pode ser só sigla ou já completo)
 * @returns Tipo formatado (ex: "BD - BANCO BRADESCO")
 */
export function formatPaymentType(tipoCobranca: string): string {
  if (!tipoCobranca) return ''
  
  // Se já está no formato "SIGLA - NOME", retorna como está
  if (tipoCobranca.includes(' - ')) {
    return tipoCobranca
  }
  
  // Se é só a sigla, expande
  const expanded = expandPaymentType(tipoCobranca)
  if (expanded !== tipoCobranca) {
    return `${tipoCobranca} - ${expanded}`
  }
  
  // Se não encontrou no mapeamento, retorna como está
  return tipoCobranca
}
