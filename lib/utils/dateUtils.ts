import { format, formatDistanceToNow } from "date-fns";
import { FeedingSchedule } from "../types";

/**
 * Get a user-friendly age string from a birthdate
 */
export function getAgeString(birthdate?: Date): string {
  if (!birthdate) return "Idade desconhecida";
  
  try {
    const today = new Date();
    const birth = new Date(birthdate);
    
    // Validar datas
    if (isNaN(today.getTime()) || isNaN(birth.getTime())) {
      console.error('Data inválida fornecida para cálculo de idade');
      return "Idade desconhecida";
    }
    
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age === 0) {
      // Calcular meses para filhotes
      const monthsOld = today.getMonth() - birth.getMonth() + 
        (today.getDate() < birth.getDate() ? -1 : 0) + 
        (today.getFullYear() !== birth.getFullYear() ? 12 : 0);
      
      if (monthsOld < 0) {
        console.error('Idade negativa calculada para filhote');
        return "Idade desconhecida";
      }
      
      return `${monthsOld} ${monthsOld !== 1 ? 'meses' : 'mês'}`;
    }
    
    if (age < 0) {
      console.error('Idade negativa calculada');
      return "Idade desconhecida";
    }
    
    return `${age} ${age !== 1 ? 'anos' : 'ano'}`;
  } catch (error) {
    console.error('Erro ao calcular idade:', error);
    return "Idade desconhecida";
  }
}

/**
 * Get a user-friendly description of a feeding schedule
 */
export function getScheduleText(schedule?: FeedingSchedule): string {
  if (!schedule) return "No active schedule";
  
  if (schedule.type === 'interval' && schedule.interval) {
    return `Every ${schedule.interval} hour${schedule.interval !== 1 ? 's' : ''}`;
  } else if (schedule.type === 'fixedTime' && schedule.times && schedule.times.length > 0) {
    return schedule.times.length === 1 
      ? `Daily at ${schedule.times[0]}`
      : `${schedule.times.length} times daily`;
  }
  
  return "Schedule set";
}

/**
 * Format a date for display
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return "";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "MMM d, h:mm a");
}

/**
 * Get a relative time (e.g., "3 hours ago", "in 5 minutes")
 */
export function getRelativeTime(date: Date | string): string {
  if (!date) return "";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Parse a time string into a Date object
 */
export function parseTimeString(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Get the next scheduled feed time from a time-based schedule
 */
export function getNextScheduledTime(times: string[]): Date | null {
  if (!times || times.length === 0) return null;
  
  try {
    const now = new Date();
    if (isNaN(now.getTime())) {
      console.error('Data atual inválida');
      return null;
    }
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Converter strings de horário para objetos Date
    const scheduledTimes = times.map(timeStr => {
      try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // Validar formato do horário
        if (isNaN(hours) || isNaN(minutes) || 
            hours < 0 || hours > 23 || 
            minutes < 0 || minutes > 59) {
          throw new Error(`Formato de horário inválido: ${timeStr}`);
        }
        
        const timeToday = new Date(today);
        timeToday.setHours(hours, minutes);
        
        if (isNaN(timeToday.getTime())) {
          throw new Error(`Data inválida criada para: ${timeStr}`);
        }
        
        // Se este horário já passou hoje, agendar para amanhã
        if (timeToday < now) {
          timeToday.setDate(timeToday.getDate() + 1);
        }
        
        return timeToday;
      } catch (error) {
        console.error(`Erro ao processar horário ${timeStr}:`, error);
        return null;
      }
    }).filter((date): date is Date => date !== null);
    
    if (scheduledTimes.length === 0) {
      console.warn('Nenhum horário válido encontrado');
      return null;
    }
    
    const nextTime = new Date(Math.min(...scheduledTimes.map(t => t.getTime())));
    if (isNaN(nextTime.getTime())) {
      console.error('Data inválida calculada para próximo horário');
      return null;
    }
    
    return nextTime;
  } catch (error) {
    console.error('Erro ao calcular próximo horário programado:', error);
    return null;
  }
}
