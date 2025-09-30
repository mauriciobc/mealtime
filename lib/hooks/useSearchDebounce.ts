import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { logger } from '@/lib/logger';

interface UseSearchDebounceOptions<T> {
  searchTerm: string;
  searchFunction: (term: string) => Promise<T[]>;
  debounceDelay?: number;
  minSearchLength?: number;
  enabled?: boolean;
  onResults?: (results: T[]) => void;
  onError?: (error: Error) => void;
}

interface SearchState<T> {
  results: T[];
  isLoading: boolean;
  error: Error | null;
  hasSearched: boolean;
  searchTerm: string;
}

/**
 * Hook para busca com debounce e cache de resultados
 */
export function useSearchDebounce<T>({
  searchTerm,
  searchFunction,
  debounceDelay = 300,
  minSearchLength = 2,
  enabled = true,
  onResults,
  onError
}: UseSearchDebounceOptions<T>) {
  const [state, setState] = useState<SearchState<T>>({
    results: [],
    isLoading: false,
    error: null,
    hasSearched: false,
    searchTerm: ''
  });

  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);
  const searchCache = useMemo(() => new Map<string, T[]>(), []);

  const performSearch = useCallback(async (term: string) => {
    if (!enabled || term.length < minSearchLength) {
      setState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        error: null,
        hasSearched: false,
        searchTerm: term
      }));
      return;
    }

    // Verifica cache primeiro
    if (searchCache.has(term)) {
      const cachedResults = searchCache.get(term)!;
      setState(prev => ({
        ...prev,
        results: cachedResults,
        isLoading: false,
        error: null,
        hasSearched: true,
        searchTerm: term
      }));
      onResults?.(cachedResults);
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      searchTerm: term
    }));

    try {
      logger.info(`[useSearchDebounce] Buscando por: "${term}"`);
      const results = await searchFunction(term);
      
      // Salva no cache
      searchCache.set(term, results);
      
      setState(prev => ({
        ...prev,
        results,
        isLoading: false,
        error: null,
        hasSearched: true
      }));
      
      onResults?.(results);
      logger.info(`[useSearchDebounce] Encontrados ${results.length} resultados para: "${term}"`);
    } catch (error) {
      const searchError = error instanceof Error ? error : new Error(String(error));
      
      setState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        error: searchError,
        hasSearched: true
      }));
      
      onError?.(searchError);
      logger.error(`[useSearchDebounce] Erro na busca por "${term}":`, searchError);
    }
  }, [searchFunction, enabled, minSearchLength, onResults, onError, searchCache]);

  // Executa busca quando o termo debounced muda
  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      error: null,
      hasSearched: false
    }));
  }, []);

  const clearCache = useCallback(() => {
    searchCache.clear();
  }, [searchCache]);

  const retry = useCallback(() => {
    if (state.searchTerm) {
      performSearch(state.searchTerm);
    }
  }, [state.searchTerm, performSearch]);

  return {
    ...state,
    clearResults,
    clearCache,
    retry,
    isSearching: state.isLoading,
    hasResults: state.results.length > 0,
    isEmpty: state.hasSearched && state.results.length === 0 && !state.isLoading
  };
}

/**
 * Hook para busca em tempo real com sugestões
 */
export function useSearchSuggestions<T>({
  searchTerm,
  suggestionsFunction,
  debounceDelay = 200,
  minSearchLength = 1,
  maxSuggestions = 5,
  enabled = true
}: {
  searchTerm: string;
  suggestionsFunction: (term: string) => Promise<T[]>;
  debounceDelay?: number;
  minSearchLength?: number;
  maxSuggestions?: number;
  enabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);
  const suggestionsCache = useMemo(() => new Map<string, T[]>(), []);

  useEffect(() => {
    if (!enabled || debouncedSearchTerm.length < minSearchLength) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Verifica cache
    if (suggestionsCache.has(debouncedSearchTerm)) {
      const cachedSuggestions = suggestionsCache.get(debouncedSearchTerm)!;
      setSuggestions(cachedSuggestions.slice(0, maxSuggestions));
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    suggestionsFunction(debouncedSearchTerm)
      .then(results => {
        const limitedResults = results.slice(0, maxSuggestions);
        suggestionsCache.set(debouncedSearchTerm, results);
        setSuggestions(limitedResults);
        setIsLoading(false);
      })
      .catch(err => {
        const searchError = err instanceof Error ? err : new Error(String(err));
        setError(searchError);
        setSuggestions([]);
        setIsLoading(false);
        logger.error(`[useSearchSuggestions] Erro ao buscar sugestões:`, searchError);
      });
  }, [
    debouncedSearchTerm,
    suggestionsFunction,
    enabled,
    minSearchLength,
    maxSuggestions,
    suggestionsCache
  ]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    clearSuggestions,
    hasSuggestions: suggestions.length > 0
  };
}