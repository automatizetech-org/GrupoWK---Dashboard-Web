/**
 * Utilitários para manipulação de datas e períodos pré-definidos
 */

export interface DateRange {
  start: string
  end: string
}

/**
 * Retorna o mês anterior completo
 * Ex: Se estamos em janeiro 2025, retorna dezembro 2024 completo
 */
export function getPreviousMonth(): DateRange {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // Mês anterior
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  
  // Primeiro dia do mês anterior
  const start = new Date(prevYear, prevMonth, 1)
  // Último dia do mês anterior
  const end = new Date(prevYear, prevMonth + 1, 0)
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

/**
 * Retorna os últimos N dias
 */
export function getLastNDays(days: number): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

/**
 * Retorna o mês atual completo (do dia 1 até o último dia do mês)
 */
export function getCurrentMonth(): DateRange {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // Primeiro dia do mês atual (dia 1)
    const start = new Date(year, month, 1)
    // Último dia do mês atual (dia 31, 30, 29 ou 28 dependendo do mês)
    const end = new Date(year, month + 1, 0)
    
    // Garante que as datas são válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Datas inválidas geradas em getCurrentMonth')
      // Fallback: usa o mês atual com datas seguras
      const fallbackStart = new Date(year, month, 1)
      const fallbackEnd = new Date(year, month + 1, 0)
      return {
        start: formatDate(fallbackStart),
        end: formatDate(fallbackEnd),
      }
    }
    
    return {
      start: formatDate(start),
      end: formatDate(end),
    }
  } catch (error) {
    console.error('Erro em getCurrentMonth:', error)
    // Fallback seguro: retorna o primeiro e último dia do mês atual
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return {
      start: formatDate(new Date(year, month, 1)),
      end: formatDate(new Date(year, month + 1, 0)),
    }
  }
}

/**
 * Retorna o ano anterior completo
 */
export function getPreviousYear(): DateRange {
  const now = new Date()
  const year = now.getFullYear() - 1
  
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

/**
 * Retorna o ano atual completo
 */
export function getCurrentYear(): DateRange {
  const now = new Date()
  const year = now.getFullYear()
  
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

/**
 * Retorna os últimos 3 meses
 */
export function getLast3Months(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 3)
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

/**
 * Retorna os últimos 6 meses
 */
export function getLast6Months(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 6)
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

/**
 * Formata uma data para YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
