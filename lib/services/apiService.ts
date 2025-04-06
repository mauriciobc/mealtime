import { CatType, FeedingLog, Household, User } from '@/lib/types';
import { formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { addHours, isBefore, differenceInHours } from 'date-fns';
import { getUserTimezone, calculateNextFeeding } from '../utils/dateUtils';
import { toDate } from 'date-fns-tz';
import { BaseUser, BaseCat, BaseFeedingLog, ID } from '../types/common';
import { Notification } from '../types/notification';
import { 
  createFeedingNotification, 
  generateFeedingNotifications,
  isDuplicateFeeding,
  isFeedingLate,
  isFeedingMissed,
  shouldSendReminder
} from './feeding-notification-service';

// Create a simple UUID function since we can't install the package
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to simulate async operations
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic get function with localStorage
export async function getData<T>(key: string): Promise<T[]> {
  try {
    // Verificar se localStorage está disponível
    if (typeof window === 'undefined') {
      console.log(`localStorage não disponível para ${key}`);
      return [];
    }

    const stored = localStorage.getItem(key);
    if (!stored || stored.trim() === '') {
      console.warn(`Dados vazios encontrados para ${key}`);
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      
      // Validar se os dados são um array
      if (!Array.isArray(parsed)) {
        console.warn(`Dados inválidos para ${key}: não é um array`);
        return [];
      }

      return parsed as T[];
    } catch (parseError) {
      console.warn(`Erro ao analisar dados do ${key}:`, parseError);
      localStorage.removeItem(key);
      return [];
    }
  } catch (error) {
    console.warn(`Erro ao obter ${key}:`, error);
    return [];
  }
}

// Função auxiliar para validar estrutura de dados
function isValidDataStructure(data: any, template: any): boolean {
  if (typeof data !== typeof template) return false;
  
  if (typeof data === 'object' && data !== null) {
    const dataKeys = Object.keys(data);
    const templateKeys = Object.keys(template);
    
    // Verificar se todas as chaves do template existem nos dados
    return templateKeys.every(key => dataKeys.includes(key));
  }
  
  return true;
}

// Generic set function to save to localStorage
export async function setData<T>(key: string, data: T[]): Promise<T[]> {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw new Error(`Failed to save ${key}`);
  }
}

// CAT SERVICES
export async function getCats(): Promise<CatType[]> {
  // Simulate API latency
  await delay(300);
  return getData<CatType>('cats');
}

export async function getCatsByHouseholdId(householdId: string, userTimezone?: string): Promise<CatType[]> {
  await delay(300);
  try {
    const response = await fetch(`/api/households/${householdId}/cats`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar gatos: ${response.status}`);
    }
    const cats = await response.json();
    return cats.map((cat: CatType) => ({
      ...cat,
      createdAt: cat.createdAt || toDate(new Date(), { timeZone: getUserTimezone(userTimezone) })
    }));
  } catch (error) {
    console.error("Erro ao buscar gatos por domicílio:", error);
    return [];
  }
}

export async function getCatById(catId: string, userTimezone?: string): Promise<CatType | null> {
  await delay(300);
  try {
    const response = await fetch(`/api/cats/${catId}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar gato: ${response.status}`);
    }
    const cat = await response.json();
    return {
      ...cat,
      createdAt: cat.createdAt || toDate(new Date(), { timeZone: getUserTimezone(userTimezone) })
    };
  } catch (error) {
    console.error("Erro ao buscar gato por ID:", error);
    return null;
  }
}

export async function createCat(cat: Omit<CatType, 'id'>): Promise<CatType> {
  await delay(500);
  const newCat: CatType = {
    ...cat,
    id: Math.floor(Math.random() * 1000000) // Gerar um ID numérico aleatório
  };
  
  const cats = await getData<CatType>('cats');
  const updatedCats = [...cats, newCat];
  await setData<CatType>('cats', updatedCats);
  
  // Update household cats array if this cat belongs to a household
  if (cat.householdId) {
    const households = await getData<Household>('households');
    const household = households.find(h => h.id === cat.householdId);
    
    if (household) {
      const updatedHousehold = {
        ...household,
        cats: [...household.cats, newCat.id]
      };
      
      const updatedHouseholds = households.map(h => 
        h.id === updatedHousehold.id ? updatedHousehold : h
      );
      
      await setData<Household>('households', updatedHouseholds);
    }
  }
  
  return newCat;
}

export async function updateCat(catId: string, catData: Partial<CatType>): Promise<CatType> {
  try {
    // Primeiro, tentar atualizar via API
    const response = await fetch(`/api/cats/${catId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(catData),
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar gato: ${response.status}`);
    }

    const updatedCat = await response.json();

    // Atualizar o localStorage
    const cats = await getData<CatType>('cats');
    const numericId = parseInt(catId);
    const catIndex = cats.findIndex(cat => cat.id === numericId);
    
    if (catIndex === -1) {
      // Se não encontrar no localStorage, adicionar
      cats.push(updatedCat);
    } else {
      // Se encontrar, atualizar
      cats[catIndex] = {
        ...cats[catIndex],
        ...updatedCat,
        id: numericId,
        schedules: updatedCat.schedules || cats[catIndex].schedules || [],
        feedingLogs: cats[catIndex].feedingLogs || [],
        createdAt: cats[catIndex].createdAt || toDate(new Date(), { timeZone: getUserTimezone() })
      };
    }
    
    await setData<CatType>('cats', cats);
    return updatedCat;
  } catch (error) {
    console.error('Erro ao atualizar gato:', error);
    throw error;
  }
}

export async function deleteCat(id: string): Promise<void> {
  await delay(500);
  const cats = await getData<CatType>('cats');
  const numericId = parseInt(id);
  const cat = cats.find(c => c.id === numericId);
  
  if (!cat) {
    throw new Error(`Cat with id ${id} not found`);
  }
  
  // Remove cat from array
  const updatedCats = cats.filter(cat => cat.id !== numericId);
  await setData<CatType>('cats', updatedCats);
  
  // Remove from household if exists
  if (cat.householdId) {
    const households = await getData<Household>('households');
    const household = households.find(h => h.id === cat.householdId);
    
    if (household) {
      const updatedHousehold = {
        ...household,
        cats: household.cats.filter(catId => catId !== numericId)
      };
      
      const updatedHouseholds = households.map(h => 
        h.id === updatedHousehold.id ? updatedHousehold : h
      );
      
      await setData<Household>('households', updatedHouseholds);
    }
  }
}

// Re-exportar as funções relacionadas à alimentação do api-feeding-service
export { registerFeeding, updateFeedingSchedule, getNextFeedingTime } from './api-feeding-service';

export async function createFeedingLog(log: Omit<BaseFeedingLog, 'id'>): Promise<BaseFeedingLog> {
  await delay(500);
  try {
    const response = await fetch('/api/feedings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      throw new Error('Failed to create feeding log');
    }

    const createdLog = await response.json();
    return {
      id: createdLog.id,
      catId: createdLog.catId,
      userId: createdLog.userId,
      timestamp: createdLog.timestamp,
      portionSize: createdLog.portionSize,
      notes: createdLog.notes,
      status: createdLog.status,
      createdAt: createdLog.createdAt
    };
  } catch (error) {
    console.error('Error creating feeding log:', error);
    throw error;
  }
}

