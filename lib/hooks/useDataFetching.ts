import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface FetchOptions<T> {
  url: string;
  userId: string;
  onSuccess?: (data: T[]) => void;
  errorMessage?: string;
  transformData?: (data: any) => T[];
  retryCount?: number;
  retryDelay?: number;
  cacheTime?: number;
}

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function useDataFetching<T>({ 
  url, 
  userId, 
  onSuccess, 
  errorMessage = "Erro ao carregar dados", 
  transformData = (data) => data,
  retryCount = 3,
  retryDelay = 1000,
  cacheTime = 5 * 60 * 1000 // 5 minutos
}: FetchOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const validateUserId = useCallback((id: string) => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID de usuário inválido');
    }
    return id.trim();
  }, []);

  const fetchWithRetry = useCallback(async (retriesLeft: number): Promise<Response> => {
    try {
      const validatedUserId = validateUserId(userId);
      const response = await fetch(url, {
        headers: { 
          'X-User-ID': validatedUserId,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      return response;
    } catch (error) {
      if (retriesLeft > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchWithRetry(retriesLeft - 1);
      }
      throw new Error(String(error));
    }
  }, [url, userId, retryDelay, validateUserId]);

  const processResponse = useCallback(async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type');
    console.log('[useDataFetching] Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('[useDataFetching] Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[useDataFetching] Invalid Content-Type:', contentType);
      throw new Error(`Resposta inválida do servidor: Content-Type deve ser application/json`);
    }

    if (!response.ok) {
      let errorMessage = `Falha ao buscar dados (${response.status}): ${response.statusText}`;
      try {
        const errorText = await response.text();
        console.log('[useDataFetching] Error response text:', errorText);
        if (errorText) {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        }
      } catch (parseError) {
        console.warn('[useDataFetching] Erro ao parsear mensagem de erro:', parseError);
      }
      throw new Error(errorMessage);
    }

    const text = await response.text();
    console.log('[useDataFetching] Response text:', text);
    
    if (!text.trim()) {
      return [];
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('[useDataFetching] Erro ao parsear JSON:', parseError);
      throw new Error(`Erro ao processar resposta do servidor: ${parseError instanceof Error ? parseError.message : 'Erro desconhecido'}`);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cacheKey = `${url}-${userId}`;
    const cachedData = cache.get(cacheKey);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Verifica cache
        if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
          console.log(`[useDataFetching] Usando dados do cache para ${url}`);
          if (isMounted) {
            setData(cachedData.data);
            onSuccess?.(cachedData.data);
          }
          return;
        }

        console.log(`[useDataFetching] Iniciando fetch para ${url}`);
        const response = await fetchWithRetry(retryCount);
        
        if (!isMounted) return;

        const rawData = await processResponse(response);
        
        if (!isMounted) return;

        // Valida e transforma os dados
        const processedData = Array.isArray(rawData) ? rawData : [rawData];
        const transformedData = transformData(processedData);
        
        // Atualiza cache
        cache.set(cacheKey, {
          data: transformedData,
          timestamp: Date.now()
        });

        console.log(`[useDataFetching] Dados transformados:`, transformedData);
        
        setData(transformedData);
        onSuccess?.(transformedData);
      } catch (error) {
        console.error(`[useDataFetching] Erro ao buscar dados de ${url}:`, error);
        if (isMounted) {
          const fallbackMessage = errorMessage || (error instanceof Error ? error.message : String(error));
          setError(new Error(fallbackMessage));
          toast.error(fallbackMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [url, userId, errorMessage, onSuccess, transformData, retryCount, retryDelay, cacheTime, fetchWithRetry, processResponse]);

  return { data, isLoading, error };
} 