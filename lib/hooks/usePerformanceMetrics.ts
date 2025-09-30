import { useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'paint' | 'layout' | 'script' | 'custom';
}

interface PerformanceObserverOptions {
  enableNavigationTiming?: boolean;
  enablePaintTiming?: boolean;
  enableLayoutShift?: boolean;
  enableLongTask?: boolean;
  enableResourceTiming?: boolean;
  customMetrics?: string[];
}

/**
 * Hook para coleta de métricas de performance
 */
export function usePerformanceMetrics(options: PerformanceObserverOptions = {}) {
  const {
    enableNavigationTiming = true,
    enablePaintTiming = true,
    enableLayoutShift = true,
    enableLongTask = true,
    enableResourceTiming = false,
    customMetrics = []
  } = options;

  const metricsRef = useRef<PerformanceMetric[]>([]);
  const observersRef = useRef<PerformanceObserver[]>([]);

  const addMetric = useCallback((metric: PerformanceMetric) => {
    metricsRef.current.push(metric);
    logger.info(`[Performance] ${metric.name}: ${metric.value}ms`, {
      type: metric.type,
      timestamp: metric.timestamp
    });
  }, []);

  const getNavigationTiming = useCallback(() => {
    if (!enableNavigationTiming || typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = [
        { name: 'DNS Lookup', value: navigation.domainLookupEnd - navigation.domainLookupStart },
        { name: 'TCP Connection', value: navigation.connectEnd - navigation.connectStart },
        { name: 'TLS Negotiation', value: navigation.secureConnectionStart ? navigation.connectEnd - navigation.secureConnectionStart : 0 },
        { name: 'Request', value: navigation.responseStart - navigation.requestStart },
        { name: 'Response', value: navigation.responseEnd - navigation.responseStart },
        { name: 'DOM Processing', value: navigation.domContentLoadedEventEnd - navigation.responseEnd },
        { name: 'Load Complete', value: navigation.loadEventEnd - navigation.loadEventStart },
        { name: 'Total Load Time', value: navigation.loadEventEnd - navigation.navigationStart }
      ];

      metrics.forEach(metric => {
        if (metric.value > 0) {
          addMetric({
            ...metric,
            type: 'navigation',
            timestamp: Date.now()
          });
        }
      });
    }
  }, [enableNavigationTiming, addMetric]);

  const getPaintTiming = useCallback(() => {
    if (!enablePaintTiming || typeof window === 'undefined') return;

    const paintEntries = performance.getEntriesByType('paint');
    
    paintEntries.forEach((entry) => {
      addMetric({
        name: entry.name,
        value: entry.startTime,
        type: 'paint',
        timestamp: Date.now()
      });
    });
  }, [enablePaintTiming, addMetric]);

  const setupLayoutShiftObserver = useCallback(() => {
    if (!enableLayoutShift || typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            addMetric({
              name: 'Layout Shift',
              value: (entry as any).value,
              type: 'layout',
              timestamp: Date.now()
            });
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      observersRef.current.push(observer);
    } catch (error) {
      logger.warn('[Performance] Layout Shift Observer não suportado:', error);
    }
  }, [enableLayoutShift, addMetric]);

  const setupLongTaskObserver = useCallback(() => {
    if (!enableLongTask || typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          addMetric({
            name: 'Long Task',
            value: entry.duration,
            type: 'script',
            timestamp: Date.now()
          });
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      observersRef.current.push(observer);
    } catch (error) {
      logger.warn('[Performance] Long Task Observer não suportado:', error);
    }
  }, [enableLongTask, addMetric]);

  const setupResourceTimingObserver = useCallback(() => {
    if (!enableResourceTiming || typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          addMetric({
            name: `Resource: ${resourceEntry.name}`,
            value: resourceEntry.duration,
            type: 'custom',
            timestamp: Date.now()
          });
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      observersRef.current.push(observer);
    } catch (error) {
      logger.warn('[Performance] Resource Timing Observer não suportado:', error);
    }
  }, [enableResourceTiming, addMetric]);

  const measureCustomMetric = useCallback((name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    addMetric({
      name,
      value: end - start,
      type: 'custom',
      timestamp: Date.now()
    });
  }, [addMetric]);

  const getMetrics = useCallback(() => {
    return [...metricsRef.current];
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
  }, []);

  const getMetricsSummary = useCallback(() => {
    const metrics = metricsRef.current;
    const summary = {
      total: metrics.length,
      byType: {} as Record<string, number>,
      average: 0,
      max: 0,
      min: Infinity
    };

    metrics.forEach(metric => {
      summary.byType[metric.type] = (summary.byType[metric.type] || 0) + 1;
      summary.max = Math.max(summary.max, metric.value);
      summary.min = Math.min(summary.min, metric.value);
    });

    summary.average = metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
    summary.min = summary.min === Infinity ? 0 : summary.min;

    return summary;
  }, []);

  useEffect(() => {
    // Coleta métricas iniciais
    getNavigationTiming();
    getPaintTiming();

    // Configura observers
    setupLayoutShiftObserver();
    setupLongTaskObserver();
    setupResourceTimingObserver();

    // Cleanup
    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
    };
  }, [
    getNavigationTiming,
    getPaintTiming,
    setupLayoutShiftObserver,
    setupLongTaskObserver,
    setupResourceTimingObserver
  ]);

  return {
    addMetric,
    measureCustomMetric,
    getMetrics,
    clearMetrics,
    getMetricsSummary
  };
}

/**
 * Hook para monitoramento de performance de componentes
 */
export function useComponentPerformance(componentName: string) {
  const renderStartRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  const startRender = useCallback(() => {
    renderStartRef.current = performance.now();
    renderCountRef.current += 1;
  }, []);

  const endRender = useCallback(() => {
    if (renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current;
      
      logger.info(`[Component Performance] ${componentName}`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCountRef.current
      });

      // Avisa se o componente está renderizando muito lentamente
      if (renderTime > 16) { // Mais de 16ms (60fps)
        logger.warn(`[Component Performance] ${componentName} está renderizando lentamente: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, [componentName]);

  useEffect(() => {
    startRender();
    return () => {
      endRender();
    };
  }, [startRender, endRender]);

  return {
    startRender,
    endRender,
    renderCount: renderCountRef.current
  };
}