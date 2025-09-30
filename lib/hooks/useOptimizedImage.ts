import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface UseOptimizedImageOptions {
  src: string;
  alt: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface OptimizedImageResult {
  src: string;
  srcSet: string;
  sizes: string;
  alt: string;
  loading: 'lazy' | 'eager';
  placeholder: string | undefined;
  onLoad: () => void;
  onError: () => void;
  isLoaded: boolean;
  isError: boolean;
  isInView: boolean;
  ref: (element: HTMLElement | null) => void;
}

/**
 * Hook para otimização de imagens com lazy loading e geração de srcSet
 */
export function useOptimizedImage({
  src,
  alt,
  sizes = '100vw',
  quality = 75,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError
}: UseOptimizedImageOptions): OptimizedImageResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Gera srcSet para diferentes tamanhos de tela
  const generateSrcSet = useCallback((baseSrc: string) => {
    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map(width => `${baseSrc}?w=${width}&q=${quality} ${width}w`)
      .join(', ');
  }, [quality]);

  // Gera URL otimizada
  const optimizedSrc = useCallback((baseSrc: string) => {
    // Se for uma URL externa, retorna como está
    if (baseSrc.startsWith('http') || baseSrc.startsWith('//')) {
      return baseSrc;
    }
    
    // Se for uma URL local, adiciona parâmetros de otimização
    const url = new URL(baseSrc, window.location.origin);
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'webp');
    
    return url.toString();
  }, [quality]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
    logger.info(`[useOptimizedImage] Imagem carregada: ${src}`);
  }, [src, onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
    const error = new Error(`Falha ao carregar imagem: ${src}`);
    onError?.(error);
    logger.error(`[useOptimizedImage] Erro ao carregar imagem:`, error);
  }, [src, onError]);

  // Configura intersection observer para lazy loading
  useEffect(() => {
    if (priority || !ref) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observerRef.current.observe(ref);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref, priority]);

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
    if (priority) {
      setIsInView(true);
    }
  }, [src, priority]);

  const srcSet = generateSrcSet(src);
  const optimizedSrcValue = optimizedSrc(src);

  return {
    src: isInView ? optimizedSrcValue : '',
    srcSet: isInView ? srcSet : '',
    sizes,
    alt,
    loading: priority ? 'eager' : 'lazy',
    placeholder: placeholder === 'blur' && blurDataURL ? blurDataURL : undefined,
    onLoad: handleLoad,
    onError: handleError,
    isLoaded,
    isError,
    isInView,
    ref: setRef
  };
}

/**
 * Hook para pré-carregamento de imagens
 */
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback(async (url: string) => {
    if (loadedImages.has(url) || loadingImages.has(url)) {
      return;
    }

    setLoadingImages(prev => new Set(prev).add(url));

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
      });

      setLoadedImages(prev => new Set(prev).add(url));
      setFailedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
      
      logger.info(`[useImagePreloader] Imagem pré-carregada: ${url}`);
    } catch (error) {
      setFailedImages(prev => new Set(prev).add(url));
      logger.error(`[useImagePreloader] Erro ao pré-carregar imagem:`, error);
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  }, [loadedImages, loadingImages]);

  const preloadAll = useCallback(async () => {
    const promises = urls.map(url => preloadImage(url));
    await Promise.allSettled(promises);
  }, [urls, preloadImage]);

  useEffect(() => {
    preloadAll();
  }, [preloadAll]);

  return {
    loadedImages,
    loadingImages,
    failedImages,
    preloadImage,
    preloadAll,
    isLoaded: (url: string) => loadedImages.has(url),
    isLoading: (url: string) => loadingImages.has(url),
    isFailed: (url: string) => failedImages.has(url)
  };
}