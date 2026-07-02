import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/monitoring/logger';
import { v2Get, V2ApiError } from '@/lib/api/v2-client';

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

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;

export function useDataFetching<T>({ 
  url, 
  userId, 
  onSuccess, 
  errorMessage = "Erro ao carregar dados", 
  transformData = (data) => data,
  retryCount = DEFAULT_RETRY_COUNT,
  retryDelay = DEFAULT_RETRY_DELAY,
  cacheTime = DEFAULT_CACHE_TIME
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

  const fetchWithRetry = useCallback(async (retriesLeft: number): Promise<unknown> => {
    try {
      validateUserId(userId);
      return await v2Get<unknown>(url);
    } catch (error) {
      if (retriesLeft > 0 && !(error instanceof V2ApiError && (error.status === 401 || error.status === 403))) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchWithRetry(retriesLeft - 1);
      }
      throw error;
    }
  }, [url, userId, retryDelay, validateUserId]);

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
        if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
          logger.debug('[useDataFetching] Usando dados do cache', { url });
          if (isMounted) {
            setData(cachedData.data);
            onSuccess?.(cachedData.data);
          }
          return;
        }

        logger.debug('[useDataFetching] Iniciando fetch', { url });
        const rawData = await fetchWithRetry(retryCount);
        
        if (!isMounted) return;

        const processedData = Array.isArray(rawData) ? rawData : [rawData];
        const transformedData = transformData(processedData);
        
        cache.set(cacheKey, {
          data: transformedData,
          timestamp: Date.now()
        });

        logger.debug('[useDataFetching] Dados transformados', { url, count: transformedData.length });
        
        setData(transformedData);
        onSuccess?.(transformedData);
      } catch (err) {
        logger.error('[useDataFetching] Erro ao buscar dados', { url, error: err });
        if (isMounted) {
          const fallbackMessage = errorMessage || (err instanceof Error ? err.message : String(err));
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
  }, [url, userId, errorMessage, onSuccess, transformData, retryCount, cacheTime, fetchWithRetry]);

  return { data, isLoading, error };
}
