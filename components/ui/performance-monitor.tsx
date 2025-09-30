"use client";

import React, { useState, useEffect } from 'react';
import { usePerformanceMetrics, useComponentPerformance } from '@/lib/hooks/usePerformanceMetrics';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface PerformanceMonitorProps {
  enabled?: boolean;
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  className,
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 5000
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const {
    addMetric,
    measureCustomMetric,
    getMetrics,
    clearMetrics,
    getMetricsSummary
  } = usePerformanceMetrics({
    enableNavigationTiming: true,
    enablePaintTiming: true,
    enableLayoutShift: true,
    enableLongTask: true,
    enableResourceTiming: true
  });

  const [metrics, setMetrics] = useState(getMetrics());
  const [summary, setSummary] = useState(getMetricsSummary());

  const refreshMetrics = () => {
    const newMetrics = getMetrics();
    const newSummary = getMetricsSummary();
    setMetrics(newMetrics);
    setSummary(newSummary);
  };

  useEffect(() => {
    if (!enabled) return;

    if (autoRefresh) {
      const interval = setInterval(refreshMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, autoRefresh, refreshInterval]);

  useEffect(() => {
    refreshMetrics();
  }, []);

  if (!enabled) return null;

  const getPerformanceColor = (value: number, type: string) => {
    switch (type) {
      case 'navigation':
        if (value < 1000) return 'text-green-600';
        if (value < 3000) return 'text-yellow-600';
        return 'text-red-600';
      case 'paint':
        if (value < 100) return 'text-green-600';
        if (value < 300) return 'text-yellow-600';
        return 'text-red-600';
      case 'layout':
        if (value < 0.1) return 'text-green-600';
        if (value < 0.25) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceIcon = (type: string) => {
    switch (type) {
      case 'navigation':
        return <Clock className="h-4 w-4" />;
      case 'paint':
        return <Zap className="h-4 w-4" />;
      case 'layout':
        return <Activity className="h-4 w-4" />;
      case 'script':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Métricas</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Tempo Médio</p>
                <p className="text-2xl font-bold">{summary.average.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Tempo Máximo</p>
                <p className="text-2xl font-bold">{summary.max.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Tempo Mínimo</p>
                <p className="text-2xl font-bold">{summary.min.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Métricas por Tipo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(summary.byType).map(([type, count]) => (
            <Badge key={type} variant="outline" className="justify-between">
              <span className="flex items-center space-x-1">
                {getPerformanceIcon(type)}
                <span className="capitalize">{type}</span>
              </span>
              <span>{count}</span>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <ScrollArea className="h-96">
      <div className="space-y-2">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getPerformanceIcon(metric.type)}
              <div>
                <p className="font-medium">{metric.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("font-bold", getPerformanceColor(metric.value, metric.type))}>
                {metric.value.toFixed(2)}ms
              </p>
              <Badge variant="outline" className="text-xs">
                {metric.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2"
        size="sm"
        variant="outline"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
      
      {isVisible && (
        <Card className="w-96 max-h-96">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Performance Monitor</CardTitle>
              <div className="flex space-x-2">
                <Button
                  onClick={refreshMetrics}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={clearMetrics}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                {renderOverview()}
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                {renderDetails()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook para monitorar performance de componentes específicos
export function useComponentPerformanceMonitor(componentName: string) {
  const { startRender, endRender, renderCount } = useComponentPerformance(componentName);
  
  return {
    startRender,
    endRender,
    renderCount,
    isSlowRender: renderCount > 10 // Considera lento se renderizou mais de 10 vezes
  };
}