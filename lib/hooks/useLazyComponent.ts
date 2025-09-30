import { useState, useEffect, useCallback, ComponentType } from 'react';
import { logger } from '@/lib/logger';

interface UseLazyComponentOptions {
  fallback?: ComponentType;
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Hook para lazy loading de componentes com tratamento de erro e retry
 */
export function useLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: UseLazyComponentOptions = {}
) {
  const {
    fallback: Fallback,
    errorBoundary: ErrorBoundary,
    retryDelay = 1000,
    maxRetries = 3
  } = options;

  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadComponent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      logger.info(`[useLazyComponent] Carregando componente, tentativa ${retryCount + 1}`);
      
      const module = await importFn();
      const component = module.default;
      
      setComponent(() => component);
      setIsLoading(false);
      setRetryCount(0);
      
      logger.info(`[useLazyComponent] Componente carregado com sucesso`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`[useLazyComponent] Erro ao carregar componente:`, error);
      
      setError(error);
      setIsLoading(false);
      
      if (retryCount < maxRetries) {
        logger.info(`[useLazyComponent] Tentando novamente em ${retryDelay}ms`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      }
    }
  }, [importFn, retryCount, retryDelay, maxRetries]);

  useEffect(() => {
    loadComponent();
  }, [loadComponent]);

  const retry = useCallback(() => {
    setRetryCount(0);
    loadComponent();
  }, [loadComponent]);

  if (error && retryCount >= maxRetries) {
    if (ErrorBoundary) {
      return <ErrorBoundary error={error} retry={retry} />;
    }
    return null;
  }

  if (isLoading) {
    return Fallback ? <Fallback /> : null;
  }

  return Component;
}

/**
 * Hook para lazy loading com intersection observer
 * Carrega o componente apenas quando ele está visível na viewport
 */
export function useLazyComponentWithIntersection<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: UseLazyComponentOptions & { rootMargin?: string; threshold?: number } = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    ...lazyOptions
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  const Component = useLazyComponent(importFn, lazyOptions);

  return { Component, ref: setRef, isVisible };
}