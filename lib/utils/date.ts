import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subMonths, 
  getHours,
  parseISO,
  isValid,
  Locale
} from "date-fns"
import { ptBR } from "date-fns/locale"

export type DateRange = {
  start: Date
  end: Date
}

export type PeriodType = 'hoje' | '7dias' | '30dias' | 'mesAtual' | 'mesPassado'

/**
 * Converte uma string ISO ou Date para um objeto Date
 * @param timestamp - String ISO ou objeto Date
 * @returns Date ou null se inválido
 */
export function safeParseISO(timestamp: string | Date | unknown): Date | null {
  try {
    const timestampStr = typeof timestamp === 'string'
      ? timestamp
      : timestamp instanceof Date
        ? timestamp.toISOString()
        : String(timestamp)

    if (!timestampStr) return null
    const date = parseISO(timestampStr)
    if (!isValid(date)) return null
    return date
  } catch (e) {
    console.error(`[safeParseISO] Erro ao processar timestamp:`, timestamp, e)
    return null
  }
}

/**
 * Obtém o intervalo de datas baseado no período selecionado
 * @param period - Tipo de período
 * @returns Objeto com data inicial e final
 */
export function getDateRange(period: PeriodType): DateRange {
  const now = new Date()
  
  switch (period) {
    case 'hoje':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      }
    case '7dias':
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now)
      }
    case '30dias':
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now)
      }
    case 'mesAtual':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      }
    case 'mesPassado':
      const lastMonth = subMonths(now, 1)
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      }
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      }
  }
}

/**
 * Formata uma data para exibição
 * @param date - Data a ser formatada
 * @param formatStr - String de formato (padrão: 'dd/MM')
 * @param locale - Localização para formatação (padrão: ptBR)
 * @returns String formatada
 */
export function formatDate(
  date: Date | string | null, 
  formatStr: string = 'dd/MM',
  locale: Locale = ptBR
): string {
  if (!date) return ''
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsedDate)) return ''
  return format(parsedDate, formatStr, { locale })
}

/**
 * Verifica se uma data está dentro de um intervalo
 * @param date - Data a ser verificada
 * @param range - Intervalo de datas
 * @returns boolean indicando se a data está no intervalo
 */
export function isDateInRange(date: Date | string | null, range: DateRange): boolean {
  if (!date) return false
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsedDate)) return false
  
  const startDay = startOfDay(range.start)
  const endDay = endOfDay(range.end)
  
  return parsedDate >= startDay && parsedDate <= endDay
}

/**
 * Obtém a hora de uma data
 * @param date - Data a ser processada
 * @returns Número da hora (0-23) ou null se inválido
 */
export function getHourFromDate(date: Date | string | null): number | null {
  if (!date) return null
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsedDate)) return null
  return getHours(parsedDate)
}

/**
 * Formata uma hora para exibição
 * @param hour - Hora a ser formatada (0-23)
 * @returns String formatada (ex: "08:00")
 */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

/**
 * Gera um array de datas dentro de um intervalo
 * @param range - Intervalo de datas
 * @returns Array de objetos com data e valor
 */
export function generateDateArray(range: DateRange): Array<{ date: Date; value: number }> {
  const dates: Array<{ date: Date; value: number }> = []
  let currentDate = new Date(range.start)
  
  while (currentDate <= range.end) {
    dates.push({
      date: new Date(currentDate),
      value: 0
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}

/**
 * Resolve a localização do date-fns baseado no idioma do usuário
 * @param language - Código do idioma
 * @returns Objeto Locale do date-fns
 */
export function resolveDateFnsLocale(language?: string): Locale {
  switch (language?.toLowerCase()) {
    case 'pt-br':
    case 'pt':
      return ptBR
    default:
      return ptBR // Fallback para português
  }
} 