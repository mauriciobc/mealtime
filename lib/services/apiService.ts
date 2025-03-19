import { Cat, FeedingLog, Household, User } from '@/lib/types';

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
export async function getCats(mockData: Cat[]): Promise<Cat[]> {
  // Simulate API latency
  await delay(300);
  return getData<Cat>('cats', mockData);
}

export async function getCatById(id: string, mockData: Cat[]): Promise<Cat | null> {
  await delay(200);
  const cats = await getData<Cat>('cats', mockData);
  return cats.find(cat => cat.id === id) || null;
}

export async function createCat(cat: Omit<Cat, 'id'>, mockData: Cat[]): Promise<Cat> {
  await delay(500);
  const newCat: Cat = {
    ...cat,
    id: uuidv4()
  };
  
  const cats = await getData<Cat>('cats', mockData);
  const updatedCats = [...cats, newCat];
  await setData<Cat>('cats', updatedCats);
  
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

export async function updateCat(id: string, catData: Partial<Cat>, mockData: Cat[]): Promise<Cat> {
  await delay(500);
  const cats = await getData<Cat>('cats', mockData);
  const catIndex = cats.findIndex(cat => cat.id === id);
  
  if (catIndex === -1) {
    throw new Error(`Cat with id ${id} not found`);
  }
  
  const updatedCat = {
    ...cats[catIndex],
    ...catData
  };
  
  const updatedCats = [
    ...cats.slice(0, catIndex),
    updatedCat,
    ...cats.slice(catIndex + 1)
  ];
  
  await setData<Cat>('cats', updatedCats);
  return updatedCat;
}

export async function deleteCat(id: string, mockData: Cat[]): Promise<void> {
  await delay(500);
  const cats = await getData<Cat>('cats', mockData);
  const cat = cats.find(c => c.id === id);
  
  if (!cat) {
    throw new Error(`Cat with id ${id} not found`);
  }
  
  // Remove cat from array
  const updatedCats = cats.filter(cat => cat.id !== id);
  await setData<Cat>('cats', updatedCats);
  
  // Remove from household if exists
  if (cat.householdId) {
    const households = await getData<Household>('households', []);
    const household = households.find(h => h.id === cat.householdId);
    
    if (household) {
      const updatedHousehold = {
        ...household,
        cats: household.cats.filter(catId => catId !== id)
      };
      
      const updatedHouseholds = households.map(h => 
        h.id === updatedHousehold.id ? updatedHousehold : h
      );
      
      await setData<Household>('households', updatedHouseholds);
    }
  }
  
  // Delete associated feeding logs
  const feedingLogs = await getData<FeedingLog>('feedingLogs', []);
  const updatedLogs = feedingLogs.filter(log => log.catId !== id);
  await setData<FeedingLog>('feedingLogs', updatedLogs);
}

// FEEDING LOG SERVICES
export async function getFeedingLogs(mockData: FeedingLog[]): Promise<FeedingLog[]> {
  await delay(300);
  return getData<FeedingLog>('feedingLogs', mockData);
}

export async function getFeedingLogsByCatId(catId: string, mockData: FeedingLog[]): Promise<FeedingLog[]> {
  await delay(200);
  const logs = await getData<FeedingLog>('feedingLogs', mockData);
  return logs.filter(log => log.catId === catId)
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
export function getNextFeedingTime(catId: string, cats: Cat[], feedingLogs: FeedingLog[]): Date | null {
  try {
    const cat = cats.find(c => c.id === catId);
    if (!cat) {
      console.warn(`Gato não encontrado: ${catId}`);
      return null;
    }
    
    const latestFeeding = feedingLogs
      .filter(log => log.catId === catId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestFeeding) {
      return new Date();
    }
    
    const schedule = cat.feedingSchedules.find(s => s.isActive);
    if (!schedule) {
      return null;
    }
    
    if (schedule.type === 'interval' && schedule.interval) {
      const nextTime = new Date(new Date(latestFeeding.timestamp).getTime() + schedule.interval * 60 * 60 * 1000);
      if (isNaN(nextTime.getTime())) {
        console.error('Data inválida calculada para intervalo de alimentação');
        return null;
      }
      return nextTime;
    } else if (schedule.type === 'fixedTime' && schedule.times && schedule.times.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const nextTimes = schedule.times.map(timeStr => {
        try {
          const [hours, minutes] = timeStr.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) {
            throw new Error(`Formato de hora inválido: ${timeStr}`);
          }
          
          const timeToday = new Date(today);
          timeToday.setHours(hours, minutes);
          
          if (isNaN(timeToday.getTime())) {
            throw new Error(`Data inválida criada para: ${timeStr}`);
          }
          
          if (timeToday.getTime() < now.getTime()) {
            timeToday.setDate(timeToday.getDate() + 1);
          }
          
          return timeToday;
        } catch (error) {
          console.error(`Erro ao processar horário ${timeStr}:`, error);
          return null;
        }
      }).filter((date): date is Date => date !== null);
      
      if (nextTimes.length === 0) {
        return null;
      }
      
      return new Date(Math.min(...nextTimes.map(t => t.getTime())));
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao calcular próximo horário de alimentação:', error);
    return null;
  }
}

