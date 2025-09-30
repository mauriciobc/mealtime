"use client";

import React from 'react';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';
import { usePerformanceMetrics } from '@/lib/hooks/usePerformanceMetrics';

interface PerformanceLayoutProps {
  children: React.ReactNode;
  enableMonitoring?: boolean;
  showDetails?: boolean;
  autoRefresh?: boolean;
}

export function PerformanceLayout({
  children,
  enableMonitoring = process.env.NODE_ENV === 'development',
  showDetails = false,
  autoRefresh = true
}: PerformanceLayoutProps) {
  // Inicializa métricas de performance
  const { measureCustomMetric, getMetricsSummary } = usePerformanceMetrics({
    enableNavigationTiming: true,
    enablePaintTiming: true,
    enableLayoutShift: true,
    enableLongTask: true,
    enableResourceTiming: true
  });

  // Mede performance de renderização do layout
  React.useEffect(() => {
    measureCustomMetric('Layout Render', () => {
      // Simula operação de renderização
      console.log('[Performance] Layout renderizado');
    });
  }, [measureCustomMetric]);

  // Log de métricas em intervalos regulares (apenas em desenvolvimento)
  React.useEffect(() => {
    if (!enableMonitoring) return;

    const interval = setInterval(() => {
      const summary = getMetricsSummary();
      if (summary.total > 0) {
        console.log('[Performance] Resumo das métricas:', {
          total: summary.total,
          average: summary.average.toFixed(2),
          max: summary.max.toFixed(2),
          byType: summary.byType
        });
      }
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, [enableMonitoring, getMetricsSummary]);

  return (
    <>
      {children}
      
      {/* Monitor de performance */}
      {enableMonitoring && (
        <PerformanceMonitor
          enabled={enableMonitoring}
          showDetails={showDetails}
          autoRefresh={autoRefresh}
          refreshInterval={5000}
        />
      )}
    </>
  );
}

// Hook para medir performance de operações específicas
export function usePerformanceMeasurement() {
  const { measureCustomMetric, addMetric } = usePerformanceMetrics();

  const measureOperation = React.useCallback((
    operationName: string,
    operation: () => void | Promise<void>
  ) => {
    return measureCustomMetric(operationName, operation);
  }, [measureCustomMetric]);

  const addCustomMetric = React.useCallback((
    name: string,
    value: number,
    type: 'navigation' | 'paint' | 'layout' | 'script' | 'custom' = 'custom'
  ) => {
    addMetric({
      name,
      value,
      timestamp: Date.now(),
      type
    });
  }, [addMetric]);

  return {
    measureOperation,
    addCustomMetric
  };
}

// Componente para medir performance de seções específicas
export function PerformanceSection({
  name,
  children,
  measureRender = true
}: {
  name: string;
  children: React.ReactNode;
  measureRender?: boolean;
}) {
  const { measureOperation } = usePerformanceMeasurement();

  React.useEffect(() => {
    if (measureRender) {
      measureOperation(`${name} Section Render`, () => {
        console.log(`[Performance] Seção ${name} renderizada`);
      });
    }
  }, [name, measureOperation, measureRender]);

  return <>{children}</>;
}