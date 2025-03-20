import { CatType, FeedingLog, Household, User } from '@/lib/types';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { getUserTimezone } from '../utils/dateUtils';

// Create a simple UUID function since we can't install the package
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to simulate async operations
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic get function with localStorage fallback to mock data
export async function getData<T>(key: string, mockData: T[]): Promise<T[]> {
  try {
    // Verificar se localStorage está disponível
    if (typeof window === 'undefined') {
      throw new Error("localStorage não está disponível");
    }

    const stored = localStorage.getItem(key);
    if (!stored) {
      // Primeira execução - salvar dados mockados
      localStorage.setItem(key, JSON.stringify(mockData));
      return mockData;
    }

    try {
      const parsed = JSON.parse(stored);
      
      // Validar se os dados são um array
      if (!Array.isArray(parsed)) {
        throw new Error(`Dados inválidos para ${key}: não é um array`);
      }

      // Validar se os dados têm a estrutura esperada
      if (parsed.length > 0 && !isValidDataStructure(parsed[0], mockData[0])) {
        throw new Error(`Estrutura de dados inválida para ${key}`);
      }

      return parsed as T[];
    } catch (parseError) {
      console.error(`Erro ao analisar dados do ${key}:`, parseError);
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify(mockData));
      return mockData;
    }
  } catch (error) {
    console.error(`Erro ao obter ${key}:`, error);
    throw new Error(`Falha ao obter ${key}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
export async function getCats(mockData: CatType[]): Promise<CatType[]> {
  // Simulate API latency
  await delay(300);
  return getData<CatType>('cats', mockData);
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

export async function createCat(cat: Omit<CatType, 'id'>, mockData: CatType[]): Promise<CatType> {
  await delay(500);
  const newCat: CatType = {
    ...cat,
    id: Math.floor(Math.random() * 1000000) // Gerar um ID numérico aleatório
  };
  
  const cats = await getData<CatType>('cats', mockData);
  const updatedCats = [...cats, newCat];
  await setData<CatType>('cats', updatedCats);
  
  // Update household cats array if this cat belongs to a household
  if (cat.householdId) {
    const households = await getData<Household>('households', []);
    const household = households.find(h => h.id === cat.householdId?.toString());
    
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

export async function updateCat(id: string, catData: Partial<CatType>, mockData: CatType[]): Promise<CatType> {
  try {
    // Primeiro, tentar atualizar via API
    const response = await fetch(`/api/cats/${id}`, {
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
    const cats = await getData<CatType>('cats', mockData);
    const numericId = parseInt(id);
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

export async function deleteCat(id: string, mockData: CatType[]): Promise<void> {
  await delay(500);
  const cats = await getData<CatType>('cats', mockData);
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
    const households = await getData<Household>('households', []);
    const household = households.find(h => h.id === cat.householdId?.toString());
    
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
  
  // Delete associated feeding logs
  const feedingLogs = await getData<FeedingLog>('feedingLogs', []);
  const updatedLogs = feedingLogs.filter(log => log.catId !== numericId);
  await setData<FeedingLog>('feedingLogs', updatedLogs);
}

// FEEDING LOG SERVICES
export async function getFeedingLogs(catId: string, userTimezone?: string): Promise<FeedingLog[]> {
  await delay(300);
  const logs = await getData<FeedingLog>('feedingLogs', []);
  const timezone = getUserTimezone(userTimezone);
  return logs
    .sort((a, b) => {
      const dateA = toDate(new Date(a.timestamp), { timeZone: timezone });
      const dateB = toDate(new Date(b.timestamp), { timeZone: timezone });
      return dateB.getTime() - dateA.getTime();
    })
    .map(log => ({
      ...log,
      timestamp: log.timestamp || toDate(new Date(), { timeZone: timezone })
    }));
}

export async function getFeedingLogsByCatId(catId: string, mockData: FeedingLog[]): Promise<FeedingLog[]> {
  await delay(200);
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  const numericId = parseInt(catId);
  return logs.filter(log => log.catId === numericId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createFeedingLog(log: Omit<FeedingLog, 'id'>, mockData: FeedingLog[]): Promise<FeedingLog> {
  await delay(500);
  const newLog: FeedingLog = {
    ...log,
    id: uuidv4(),
    timestamp: log.timestamp || new Date()
  };
  
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  const updatedLogs = [...logs, newLog];
  await setData<FeedingLog>('feedingLogs', updatedLogs);
  
  return newLog;
}

export async function updateFeedingLog(id: string, logData: Partial<FeedingLog>, mockData: FeedingLog[]): Promise<FeedingLog> {
  await delay(500);
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  const logIndex = logs.findIndex(log => log.id === id);
  
  if (logIndex === -1) {
    throw new Error(`Feeding log with id ${id} not found`);
  }
  
  const updatedLog = {
    ...logs[logIndex],
    ...logData
  };
  
  const updatedLogs = [
    ...logs.slice(0, logIndex),
    updatedLog,
    ...logs.slice(logIndex + 1)
  ];
  
  await setData<FeedingLog>('feedingLogs', updatedLogs);
  return updatedLog;
}

export async function deleteFeedingLog(id: string, mockData: FeedingLog[]): Promise<void> {
  await delay(500);
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  const updatedLogs = logs.filter(log => log.id !== id);
  await setData<FeedingLog>('feedingLogs', updatedLogs);
}

// USER SERVICES
export async function getUsers(mockData: User[]): Promise<User[]> {
  await delay(300);
  return getData<User>('users', mockData);
}

export async function getUserById(id: string, mockData: User[]): Promise<User | null> {
  await delay(200);
  const users = await getData<User>('users', mockData);
  return users.find(user => user.id === id) || null;
}

// HOUSEHOLD SERVICES
export async function getHouseholds(mockData: Household[]): Promise<Household[]> {
  await delay(300);
  return getData<Household>('households', mockData);
}

export async function getHouseholdById(id: string, mockData: Household[]): Promise<Household | null> {
  await delay(200);
  const households = await getData<Household>('households', mockData);
  return households.find(household => household.id === id) || null;
}

export async function updateHousehold(id: string, householdData: Partial<Household>, mockData: Household[]): Promise<Household> {
  await delay(500);
  const households = await getData<Household>('households', mockData);
  const householdIndex = households.findIndex(household => household.id === id);
  
  if (householdIndex === -1) {
    throw new Error(`Household with id ${id} not found`);
  }
  
  const updatedHousehold = {
    ...households[householdIndex],
    ...householdData
  };
  
  const updatedHouseholds = [
    ...households.slice(0, householdIndex),
    updatedHousehold,
    ...households.slice(householdIndex + 1)
  ];
  
  await setData<Household>('households', updatedHouseholds);
  return updatedHousehold;
}

// UTILITY FUNCTIONS
export async function getNextFeedingTime(catId: string, userTimezone?: string): Promise<Date | null> {
  const timezone = getUserTimezone(userTimezone);
  const now = toDate(new Date(), { timeZone: timezone });
  
  // Obter logs ordenados por timestamp
  const logs = await getFeedingLogs(catId, timezone);
  const lastFeeding = logs
    .sort((a, b) => {
      const dateA = toDate(new Date(a.timestamp), { timeZone: timezone });
      const dateB = toDate(new Date(b.timestamp), { timeZone: timezone });
      return dateB.getTime() - dateA.getTime();
    })[0];

  // Se não houver logs, retorna null
  if (!lastFeeding) {
    return null;
  }

  // Obter gato e seu agendamento
  const cat = await getCatById(catId, timezone);
  if (!cat) {
    return null;
  }

  let nextFeeding: Date | null = null;

  // Se houver um agendamento ativo
  const activeSchedule = cat.schedules?.find(s => s.enabled);
  if (activeSchedule && activeSchedule.interval) {
    const lastFeedingTime = toDate(new Date(lastFeeding.timestamp), { timeZone: timezone });
    const nextTime = toDate(new Date(lastFeedingTime.getTime() + activeSchedule.interval * 60 * 60 * 1000), { timeZone: timezone });

    // Se o próximo horário já passou, calcular o próximo intervalo a partir de agora
    if (nextTime < now) {
      nextFeeding = toDate(new Date(now.getTime() + activeSchedule.interval * 60 * 60 * 1000), { timeZone: timezone });
    } else {
      nextFeeding = nextTime;
    }
  }
  // Se não houver agendamento mas tiver intervalo padrão
  else if (cat.feeding_interval) {
    const lastFeedingTime = toDate(new Date(lastFeeding.timestamp), { timeZone: timezone });
    nextFeeding = toDate(new Date(lastFeedingTime.getTime() + cat.feeding_interval * 60 * 60 * 1000), { timeZone: timezone });

    // Se o próximo horário já passou, calcular o próximo intervalo a partir de agora
    if (nextFeeding < now) {
      nextFeeding = toDate(new Date(now.getTime() + cat.feeding_interval * 60 * 60 * 1000), { timeZone: timezone });
    }
  }

  return nextFeeding;
}

