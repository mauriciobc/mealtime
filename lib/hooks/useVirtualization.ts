import { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Número de itens extras para renderizar fora da viewport
  threshold?: number; // Threshold para considerar scroll
}

interface VirtualizationResult<T> {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    data: T;
  }>;
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
  scrollToIndex: (index: number) => void;
  isScrolling: boolean;
}

/**
 * Hook para virtualização de listas longas
 * Renderiza apenas os itens visíveis na viewport + overscan
 */
export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
): VirtualizationResult<T> {
  const { itemHeight, containerHeight, overscan = 5, threshold = 10 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleCount + overscan * 2
  );

  const virtualItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((data, index) => {
      const actualIndex = startIndex + index;
      return {
        index: actualIndex,
        start: actualIndex * itemHeight,
        end: (actualIndex + 1) * itemHeight,
        data
      };
    });
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Set new timeout to detect end of scrolling
    const timeout = setTimeout(() => {
      setIsScrolling(false);
    }, threshold);

    setScrollTimeout(timeout);
  }, [scrollTimeout, threshold]);

  const scrollToIndex = useCallback((index: number) => {
    const newScrollTop = Math.max(0, Math.min(
      index * itemHeight,
      totalHeight - containerHeight
    ));
    setScrollTop(newScrollTop);
  }, [itemHeight, totalHeight, containerHeight]);

  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop: handleScroll,
    scrollToIndex,
    isScrolling
  };
}

/**
 * Hook para virtualização com intersection observer
 * Mais eficiente para listas muito grandes
 */
export function useVirtualizationWithIntersection<T>(
  items: T[],
  options: VirtualizationOptions & { 
    rootMargin?: string;
    threshold?: number | number[];
  }
) {
  const { rootMargin = '100px', threshold = 0.1, ...virtualizationOptions } = options;
  
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [refs, setRefs] = useState<Map<number, HTMLElement>>(new Map());

  const { itemHeight, containerHeight } = virtualizationOptions;

  useEffect(() => {
    const observers = new Map<number, IntersectionObserver>();

    refs.forEach((element, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleRange(prev => ({
              start: Math.min(prev.start, index),
              end: Math.max(prev.end, index)
            }));
          }
        },
        { rootMargin, threshold }
      );

      observer.observe(element);
      observers.set(index, observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [refs, rootMargin, threshold]);

  const visibleItems = useMemo(() => {
    const start = Math.max(0, visibleRange.start - 5);
    const end = Math.min(items.length - 1, visibleRange.end + 5);
    
    return items.slice(start, end + 1).map((data, index) => ({
      index: start + index,
      data,
      ref: (el: HTMLElement | null) => {
        if (el) {
          setRefs(prev => new Map(prev).set(start + index, el));
        }
      }
    }));
  }, [items, visibleRange]);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    containerHeight
  };
}