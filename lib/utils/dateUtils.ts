import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Schedule } from "../types";

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
export function getScheduleText(schedule?: Schedule): string {
  if (!schedule) return "Sem agendamento ativo";
  
  try {
    if (schedule.type === 'interval' && typeof schedule.interval === 'number' && schedule.interval > 0) {
      return `A cada ${schedule.interval} ${schedule.interval !== 1 ? 'horas' : 'hora'}`;
    } else if (schedule.type === 'fixedTime' && typeof schedule.times === 'string' && schedule.times.trim()) {
      return `Diariamente às ${schedule.times}`;
    }
    
    return "Agendamento configurado";
  } catch (error) {
    console.error('Erro ao gerar texto do agendamento:', error);
    return "Agendamento inválido";
  }
}

/**
 * Format a date for display
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.error('Data inválida fornecida para formatação');
      return "";
    }
    return format(dateObj, "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return "";
  }
}

/**
 * Get a relative time (e.g., "3 hours ago", "in 5 minutes")
 */
export function getRelativeTime(date: Date | string): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.error('Data inválida fornecida para tempo relativo');
      return "";
    }
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
  } catch (error) {
    console.error('Erro ao calcular tempo relativo:', error);
    return "";
  }
}

/**
 * Parse a time string into a Date object
 */
export function parseTimeString(timeString: string): Date {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Validar formato do horário
    if (isNaN(hours) || isNaN(minutes) || 
        hours < 0 || hours > 23 || 
        minutes < 0 || minutes > 59) {
      throw new Error(`Formato de horário inválido: ${timeString}`);
    }
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    if (isNaN(date.getTime())) {
      throw new Error(`Data inválida criada para: ${timeString}`);
    }
    
    return date;
  } catch (error) {
    console.error(`Erro ao processar horário ${timeString}:`, error);
    return new Date(); // Retorna hora atual em caso de erro
  }
}

/**
 * Get the next scheduled feed time from a time-based schedule
 */
export function getNextScheduledTime(schedule: Schedule): Date | null {
  if (!schedule || !schedule.enabled) return null;
  
  try {
    const now = new Date();
    if (isNaN(now.getTime())) {
      console.error('Data atual inválida');
      return null;
    }
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (schedule.type === 'interval' && typeof schedule.interval === 'number' && schedule.interval > 0) {
      // Para agendamentos baseados em intervalo
      const lastFeeding = schedule.status === 'completed' ? now : today;
      const nextTime = new Date(lastFeeding.getTime() + schedule.interval * 60 * 60 * 1000);
      
      if (isNaN(nextTime.getTime())) {
        console.error('Data inválida calculada para próximo horário');
        return null;
      }
      
      return nextTime;
    } else if (schedule.type === 'fixedTime' && typeof schedule.times === 'string' && schedule.times.trim()) {
      // Para agendamentos em horários fixos
      try {
        const [hours, minutes] = schedule.times.split(':').map(Number);
        
        // Validar formato do horário
        if (isNaN(hours) || isNaN(minutes) || 
            hours < 0 || hours > 23 || 
            minutes < 0 || minutes > 59) {
          throw new Error(`Formato de horário inválido: ${schedule.times}`);
        }
        
        const timeToday = new Date(today);
        timeToday.setHours(hours, minutes);
        
        if (isNaN(timeToday.getTime())) {
          throw new Error(`Data inválida criada para: ${schedule.times}`);
        }
        
        // Se este horário já passou hoje, agendar para amanhã
        if (timeToday < now) {
          timeToday.setDate(timeToday.getDate() + 1);
        }
        
        return timeToday;
      } catch (error) {
        console.error(`Erro ao processar horário ${schedule.times}:`, error);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao calcular próximo horário programado:', error);
    return null;
  }
}
