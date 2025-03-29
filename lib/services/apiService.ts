import { CatType, FeedingLog, Household, User } from '@/lib/types';
import { formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { addHours, isBefore, differenceInHours } from 'date-fns';
import { getUserTimezone, calculateNextFeeding } from '../utils/dateUtils';
import { toDate } from 'date-fns-tz';
import { BaseUser, BaseCat, BaseFeedingLog, ID } from '../types/common';

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
      console.log(`localStorage não disponível, retornando dados mockados para ${key}`);
      return mockData;
    }

    const stored = localStorage.getItem(key);
    if (!stored) {
      // Primeira execução - salvar dados mockados
      console.log(`Nenhum dado encontrado para ${key}, inicializando com dados mockados`);
      localStorage.setItem(key, JSON.stringify(mockData));
      return mockData;
    }

    try {
      const parsed = JSON.parse(stored);
      
      // Validar se os dados são um array
      if (!Array.isArray(parsed)) {
        console.warn(`Dados inválidos para ${key}: não é um array, resetando para dados mockados`);
        localStorage.setItem(key, JSON.stringify(mockData));
        return mockData;
      }

      // Se não houver template para validar, retornar os dados parseados
      if (!mockData || mockData.length === 0) {
        return parsed as T[];
      }

      // Validar se os dados têm a estrutura esperada
      if (parsed.length > 0 && !isValidDataStructure(parsed[0], mockData[0])) {
        console.warn(`Estrutura de dados inválida para ${key}, resetando para dados mockados`);
        localStorage.setItem(key, JSON.stringify(mockData));
        return mockData;
      }

      return parsed as T[];
    } catch (parseError) {
      console.warn(`Erro ao analisar dados do ${key}, resetando para dados mockados:`, parseError);
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify(mockData));
      return mockData;
    }
  } catch (error) {
    console.warn(`Erro ao obter ${key}, retornando dados mockados:`, error);
    return mockData;
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
  console.log('\n[getFeedingLogs] Buscando logs:');
  console.log('- CatId:', catId);
  console.log('- Timezone recebido:', userTimezone);
  
  const mockData: FeedingLog[] = []; // Dados mockados vazios como fallback
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  console.log('- Total de logs encontrados (antes do filtro):', logs.length);
  
  const timezone = getUserTimezone(userTimezone);
  console.log('- Timezone resolvido:', timezone);
  
  const filteredLogs = logs.filter(log => log.catId === parseInt(catId));
  console.log('- Total de logs após filtro por catId:', filteredLogs.length);
  
  const sortedLogs = filteredLogs.sort((a, b) => {
    const dateA = toDate(new Date(a.timestamp), { timeZone: timezone });
    const dateB = toDate(new Date(b.timestamp), { timeZone: timezone });
    return dateB.getTime() - dateA.getTime();
  });

  console.log('- Logs ordenados:', sortedLogs.map(log => ({
    id: log.id,
    catId: log.catId,
    timestamp: formatDateTimeForDisplay(new Date(log.timestamp), timezone)
  })));

  return sortedLogs.map(log => ({
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
    id: Math.floor(Math.random() * 1000000), // Gerar um ID numérico aleatório
    timestamp: log.timestamp || new Date()
  };
  
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  const updatedLogs = [...logs, newLog];
  await setData<FeedingLog>('feedingLogs', updatedLogs);
  
  return newLog;
}

export async function updateFeedingLog(id: ID, logData: Partial<FeedingLog>, mockData: FeedingLog[]): Promise<FeedingLog> {
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

export async function deleteFeedingLog(id: ID, mockData: FeedingLog[]): Promise<void> {
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

export async function getUserById(id: ID, mockData: BaseUser[]): Promise<BaseUser | null> {
  await delay(200);
  const users = await getData<BaseUser>('users', mockData);
  return users.find(user => user.id === id) || null;
}

// HOUSEHOLD SERVICES
export async function getHouseholds(mockData: Household[]): Promise<Household[]> {
  await delay(300);
  return getData<Household>('households', mockData);
}

export async function getHouseholdById(id: ID, mockData: Household[]): Promise<Household | null> {
  await delay(200);
  const households = await getData<Household>('households', mockData);
  return households.find(household => household.id === id) || null;
}

export async function updateHousehold(id: ID, householdData: Partial<Household>, mockData: Household[]): Promise<Household> {
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
  console.log('\n[getNextFeedingTime] Iniciando busca:');
  console.log('- CatId:', catId);
  console.log('- Timezone recebido:', userTimezone);
  console.log('- Timezone resolvido:', timezone);
  
  const now = toDate(new Date(), { timeZone: timezone });
  console.log('- Data atual:', formatDateTimeForDisplay(now, timezone));
  
  // Obter logs ordenados por timestamp
  const logs = await getFeedingLogs(catId, timezone);
  console.log('- Total de logs encontrados:', logs.length);
  
  const lastFeeding = logs
    .sort((a, b) => {
      const dateA = toDate(new Date(a.timestamp), { timeZone: timezone });
      const dateB = toDate(new Date(b.timestamp), { timeZone: timezone });
      return dateB.getTime() - dateA.getTime();
    })[0];

  // Se não houver logs, retorna null
  if (!lastFeeding) {
    console.log('- Nenhum log de alimentação encontrado');
    return null;
  }

  console.log('- Última alimentação encontrada:', {
    id: lastFeeding.id,
    timestamp: formatDateTimeForDisplay(new Date(lastFeeding.timestamp), timezone)
  });

  // Obter gato e seu agendamento
  const cat = await getCatById(catId, timezone);
  if (!cat) {
    console.log('- Gato não encontrado');
    return null;
  }

  console.log('- Dados do gato:', {
    id: cat.id,
    name: cat.name,
    feeding_interval: cat.feeding_interval,
    schedules: cat.schedules?.map(s => ({
      enabled: s.enabled,
      type: s.type,
      interval: s.interval
    }))
  });

  // Se houver um agendamento ativo
  const activeSchedule = cat.schedules?.find(s => s.enabled);
  if (activeSchedule && activeSchedule.interval) {
    console.log('- Usando agendamento ativo:', {
      type: activeSchedule.type,
      interval: activeSchedule.interval
    });
    
    const nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), activeSchedule.interval, timezone);
    console.log('- Próxima alimentação calculada (agendamento):', formatDateTimeForDisplay(nextFeeding, timezone));
    return nextFeeding;
  }
  // Se não houver agendamento mas tiver intervalo padrão
  else if (cat.feeding_interval) {
    console.log('- Usando intervalo padrão:', cat.feeding_interval);
    const nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), cat.feeding_interval, timezone);
    console.log('- Próxima alimentação calculada (intervalo padrão):', formatDateTimeForDisplay(nextFeeding, timezone));
    return nextFeeding;
  }

  console.log('- Nenhum intervalo ou agendamento encontrado');
  return null;
}

