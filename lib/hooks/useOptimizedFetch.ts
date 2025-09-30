import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseOptimizedFetchOptions<T> {
  url: string;
  userId?: string;
  cacheTime?: number; // em milissegundos
  staleTime?: number; // em milissegundos
  retryCount?: number;
  retryDelay?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

// Cache global para evitar múltiplas chamadas simultâneas
const globalCache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();

export function useOptimizedFetch<T>({
  url,
  userId,
  cacheTime = 5 * 60 * 1000, // 5 minutos
  staleTime = 1 * 60 * 1000, // 1 minuto
  retryCount = 3,
  retryDelay = 1000,
  enabled = true,
  onSuccess,
  onError
}: UseOptimizedFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const mountedRef = useRef(true);

  const cacheKey = `${url}-${userId || 'anonymous'}`;

  const fetchData = useCallback(async (forceRefresh = false): Promise<T> => {
    // Verifica se já existe uma requisição pendente para a mesma URL
    if (pendingRequests.has(cacheKey) && !forceRefresh) {
      logger.info(`[useOptimizedFetch] Aguardando requisição pendente para ${url}`);
      return pendingRequests.get(cacheKey)!;
    }

    // Verifica cache se não for refresh forçado
    if (!forceRefresh) {
      const cached = globalCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        logger.info(`[useOptimizedFetch] Usando dados do cache para ${url}`);
        return cached.data;
      }
    }

    const fetchPromise = (async () => {
      try {
        logger.info(`[useOptimizedFetch] Iniciando fetch para ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Atualiza cache
        globalCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + cacheTime
        });

        logger.info(`[useOptimizedFetch] Dados salvos no cache para ${url}`);
        return result;
      } catch (err) {
        logger.error(`[useOptimizedFetch] Erro ao buscar ${url}:`, err);
        throw err;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }, [url, userId, cacheTime, cacheKey]);

  const refetch = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchData(true);
      
      if (mountedRef.current) {
        setData(result);
        setIsStale(false);
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, fetchData, onSuccess, onError]);

  useEffect(() => {
    if (!enabled || !mountedRef.current) return;

    const loadData = async () => {
      // Verifica cache primeiro
      const cached = globalCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        logger.info(`[useOptimizedFetch] Usando dados do cache para ${url}`);
        setData(cached.data);
        setIsStale(Date.now() - cached.timestamp > staleTime);
        onSuccess?.(cached.data);
        return;
      }

      // Se os dados estão stale, mostra dados antigos enquanto busca novos
      if (cached && Date.now() - cached.timestamp > staleTime) {
        logger.info(`[useOptimizedFetch] Dados stale, mostrando dados antigos para ${url}`);
        setData(cached.data);
        setIsStale(true);
        onSuccess?.(cached.data);
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchData();
        
        if (mountedRef.current) {
          setData(result);
          setIsStale(false);
          onSuccess?.(result);
        }
      } catch (err) {
        if (mountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [url, userId, enabled, fetchData, onSuccess, onError, cacheKey, staleTime]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    isStale,
    refetch
  };
}