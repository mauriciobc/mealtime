import { CatType, FeedingLog, Household, User } from '@/lib/types';
import { formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { addHours, isBefore, differenceInHours } from 'date-fns';
import { getUserTimezone, calculateNextFeeding } from '../utils/dateUtils';
import { toDate } from 'date-fns-tz';
import { BaseUser, BaseCat, BaseFeedingLog, ID, parseGender } from '../types/common';
import { Notification } from '../types/notification';
import { generateUUID } from '../utils/uuid';
import { 
  createFeedingNotification, 
  generateFeedingNotifications,
  isDuplicateFeeding,
  isFeedingLate,
  isFeedingMissed,
  shouldSendReminder
} from './feeding-notification-service';

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
  } catch (_error) {
    console.warn(`Erro ao obter ${key}:`, _error);
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
  } catch (_error) {
    console.error(`Error setting ${key}:`, _error);
    throw new Error(`Failed to save ${key}`);
  }
}

// CAT SERVICES
export async function getCats(): Promise<CatType[]> {
  // Simulate API latency
  await delay(300);
  return getData<CatType>('cats');
}

export async function fetchCatsForHousehold(householdId: string, userId: string | undefined, userTimezone?: string, signal?: AbortSignal): Promise<CatType[]> {
  await delay(300);
  try {
    // Prepare headers
    const headers: HeadersInit = {};
    if (userId) {
      headers['X-User-ID'] = userId;
    } else {
      console.warn("[getCatsByHouseholdId] User ID not provided. API call might fail authorization.");
      // Proceed without header - API should handle unauthorized request
    }

    // Add headers to fetch call
    const fetchOptions: RequestInit = { 
      headers
    };
    
    // Only add signal if it's defined (not undefined)
    if (signal) {
      fetchOptions.signal = signal;
    }
    
    const response = await fetch(`/api/households/${householdId}/cats`, fetchOptions);
    if (!response.ok) {
      const errorText = await response.text(); // Get error body
      console.error("[getCatsByHouseholdId] Error response:", { status: response.status, text: errorText });
      throw new Error(`Error fetching cats: ${response.status} ${errorText || response.statusText}`);
    }
    const { data: cats } = await response.json();
    // Log the raw response from the API
    console.log("[getCatsByHouseholdId] Raw cats data from API:", JSON.stringify(cats, null, 2));
    
    if (!Array.isArray(cats)) {
      console.error("[getCatsByHouseholdId] Expected cats to be an array but got:", typeof cats);
      return [];
    }

    // Map the response correctly, ensuring all CatType fields are handled
    return cats.map((cat: any) => {
      // Log the raw cat object being mapped
      console.log("[getCatsByHouseholdId] Mapping raw cat:", JSON.stringify(cat, null, 2));

      const mappedCat: Partial<CatType> = {
        id: cat.id,
        name: cat.name,
        birthdate: cat.birth_date ? new Date(cat.birth_date) : null,
        weight: cat.weight ? parseFloat(cat.weight) : null,
        householdId: cat.household_id,
        createdAt: cat.created_at ? new Date(cat.created_at) : new Date(), // Provide default if null
        // Map photo_url from the API response
        photo_url: cat.photo_url || null, // Use cat.photo_url from API, fallback to null
        // Default other potentially missing fields according to CatType
        restrictions: cat.restrictions || null,
        notes: cat.notes || null,
        feeding_interval: cat.feeding_interval || null, // Map to feeding_interval (required field)
        portion_size: cat.portion_size || null, // Map snake_case if available
        gender: parseGender(cat.gender),
        schedules: [], // Assuming schedules are loaded separately
      };
      
      // Only add updatedAt if it exists
      if (cat.updated_at) {
        mappedCat.updatedAt = new Date(cat.updated_at);
      }

      // Log the mapped cat object
      console.log("[getCatsByHouseholdId] Mapped cat object:", JSON.stringify(mappedCat, null, 2));

      return mappedCat as CatType;
    });
  } catch (_error) {
    console.error("Error fetching cats for household:", householdId, _error);
    throw _error;
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
  } catch (_error) {
    console.error("Erro ao buscar gato por ID:", _error);
    return null;
  }
}

export async function createCat(cat: Omit<CatType, 'id'>): Promise<CatType> {
  await delay(500);
  const newCat: CatType = {
    ...cat,
    id: generateUUID() // Generate UUID string
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
    const catIndex = cats.findIndex(cat => cat.id === catId);
    
    if (catIndex === -1) {
      // Se não encontrar no localStorage, adicionar
      cats.push(updatedCat);
    } else {
      // Se encontrar, atualizar
      const existingCat = cats[catIndex];
      if (existingCat) {
        cats[catIndex] = {
          ...existingCat,
          ...updatedCat,
          id: catId,
          schedules: updatedCat.schedules || existingCat.schedules || [],
          createdAt: existingCat.createdAt || toDate(new Date(), { timeZone: getUserTimezone(undefined) })
        };
      }
    }
    
    await setData<CatType>('cats', cats);
    return updatedCat;
  } catch (_error) {
    console.error('Erro ao atualizar gato:', _error);
    throw _error;
  }
}

export async function deleteCat(id: string): Promise<void> {
  await delay(500);
  const cats = await getData<CatType>('cats');
  const cat = cats.find(c => c.id === id);
  
  if (!cat) {
    throw new Error(`Cat with id ${id} not found`);
  }
  
  // Remove cat from array
  const updatedCats = cats.filter(cat => cat.id !== id);
  await setData<CatType>('cats', updatedCats);
  
  // Remove from household if exists
  if (cat.householdId) {
    const households = await getData<Household>('households');
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
}

// Re-exportar as funções relacionadas à alimentação do api-feeding-service
export { registerFeeding, updateFeedingSchedule, getNextFeedingTime } from './api-feeding-service';

// Modify signature to accept userId
export async function addFeedingLog(log: Omit<BaseFeedingLog, 'id'>, userId?: string): Promise<FeedingLog> {
  await delay(500); // Keep simulated delay for now
  try {
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['X-User-ID'] = userId;
    } else {
        console.warn("[createFeedingLog] User ID not provided. API call will likely fail authorization.");
        // Proceed without header, API should handle unauthorized request (return 401)
    }

    const response = await fetch('/api/feedings', {
      method: 'POST',
      headers: headers, // Use headers object
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[createFeedingLog] API Error (${response.status}): ${errorText}`);
      throw new Error(`Failed to create feeding log: ${response.status} ${errorText}`);
    }

    const createdLog = await response.json(); // API now returns the full log with feeder

    // Map the API response (which should match GET /api/feedings structure)
    const mappedLog: Partial<FeedingLog> = {
      id: createdLog.id,
      catId: createdLog.cat_id,
      userId: createdLog.fed_by, // Use fed_by from API response
      timestamp: new Date(createdLog.fed_at),
      amount: createdLog.amount ?? null,
      portionSize: createdLog.amount ?? null,
      notes: createdLog.notes ?? null,
      householdId: createdLog.household_id ?? undefined,
      // User details are now nested in the feeder object from the API response
      user: createdLog.feeder ? { 
          id: createdLog.feeder.id, 
          name: createdLog.feeder.full_name ?? null, 
          avatar: createdLog.feeder.avatar_url ?? null
      } : { id: createdLog.fed_by, name: null, avatar: null }, // Fallback if feeder somehow not included
      createdAt: createdLog.created_at ? new Date(createdLog.created_at) : new Date(createdLog.fed_at) // Fallback to fed_at if created_at missing
    };
    
    // Only add mealType if it exists
    if (createdLog.meal_type) {
      mappedLog.mealType = createdLog.meal_type;
    }
    
    // cat is not included in this API response, so we don't set it
    
    return mappedLog as FeedingLog;
  } catch (_error) {
    console.error('[createFeedingLog] Error creating feeding log:', _error);
    throw _error;
  }
}

