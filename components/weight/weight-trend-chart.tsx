"use client"; // Required for Recharts and hooks like useState

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, DotProps
} from 'recharts';
import { Button } from '@/components/ui/button'; // Assuming @/components maps to components/ui or similar
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { EmptyState } from "@/components/ui/empty-state"; // Import EmptyState
import { BarChartBig } from "lucide-react"; // Import an icon for EmptyState

// Updated Sample Data
export const sampleWeightLogs = [
  { date: '2023-10-01', weight: 5.0, notes: 'First weigh-in after diet change.' },
  { date: '2023-10-08', weight: 5.1 },
  { date: '2023-10-15', weight: 5.05, notes: 'Slightly less active this week.' },
  { date: '2023-10-22', weight: 5.15 },
  { date: '2023-10-29', weight: 5.2, notes: 'Good progress!' },
  { date: '2023-11-05', weight: 5.25 },
  { date: '2023-11-12', weight: 5.2 },
  { date: '2023-11-19', weight: 5.3, notes: 'Increased portion size slightly.' },
  { date: '2023-11-26', weight: 5.35 },
  { date: '2023-12-03', weight: 5.3 },
  { date: '2023-12-10', weight: 5.4, notes: 'Vet check-up, all good.' },
  { date: '2023-12-17', weight: 5.38 },
  { date: '2023-12-24', weight: 5.45, notes: 'Holiday treats!' },
  { date: '2023-12-31', weight: 5.5 },
  { date: '2024-01-07', weight: 5.48, notes: 'Back to normal diet.' },
  { date: '2024-01-14', weight: 5.52 },
];

const sampleFeedingLogs = [
  { date: '2023-10-01', meal_type: 'Wet Food', amount: 1, unit: 'can' },
  { date: '2023-10-08', meal_type: 'Dry Kibble', amount: 0.5, unit: 'cup' },
  { date: '2023-10-08', meal_type: 'Treat', amount: 2, unit: 'pcs' },
  { date: '2023-10-15', meal_type: 'Wet Food', amount: 1, unit: 'can' },
  { date: '2023-10-29', meal_type: 'Dry Kibble', amount: 0.5, unit: 'cup' },
  { date: '2023-11-12', meal_type: 'Treat', amount: 3, unit: 'pcs' },
  { date: '2023-11-26', meal_type: 'Wet Food', amount: 1, unit: 'can' },
  { date: '2023-12-10', meal_type: 'Dry Kibble', amount: 0.5, unit: 'cup' },
  { date: '2023-12-10', meal_type: 'Wet Food', amount: 0.5, unit: 'can' },
  { date: '2023-12-24', meal_type: 'Treat', amount: 5, unit: 'pcs' },
  { date: '2024-01-07', meal_type: 'Treat', amount: 1, unit: 'pc' },
  { date: '2024-01-14', meal_type: 'Wet Food', amount: 1, unit: 'can' },
];

type TimeRange = 30 | 60 | 90;

interface WeightLog {
  date: string | number; // Aceita string (ISO) ou timestamp numérico
  weight: number;
  notes?: string; // Added notes
}

interface FeedingLog {
  date: string;
  meal_type: string; // Changed from type
  amount?: number;
  unit?: string;
}

interface ProcessedFeedingLog extends FeedingLog {
  id: string;
}

interface WeightTrendChartProps {
  catId: string;
  userId: string;
  logChangeTimestamp: number;
  period?: number;
}

// Custom Active Dot for Popover Trigger
interface CustomActiveDotProps extends DotProps {
  payload?: WeightLog;
  allFeedingLogsForDay?: ProcessedFeedingLog[];
}

const CustomActiveDot: React.FC<CustomActiveDotProps> = (props) => {
  const { cx, cy, stroke, payload, allFeedingLogsForDay } = props;

  if (!cx || !cy || !payload) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <circle cx={cx} cy={cy} r={8} fill={stroke} strokeWidth={2} stroke={"hsl(var(--background))"} style={{ cursor: 'pointer' }} />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Detalhes do Registro</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(payload.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Peso:</span>
              <span className="col-span-2">{payload.weight.toFixed(2)} {/** Assuming unit is globally kg or handled elsewhere */}</span>
            </div>
            {payload.notes && (
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="font-semibold">Notas:</span>
                <span className="col-span-2 text-sm text-muted-foreground">{payload.notes}</span>
              </div>
            )}
            {allFeedingLogsForDay && allFeedingLogsForDay.length > 0 && (
              <>
                <div className="col-span-3"><hr className="my-2" /></div>
                <h5 className="col-span-3 font-medium text-sm mb-1">Alimentações neste dia:</h5>
                {allFeedingLogsForDay.map((feeding, index) => (
                  <div key={feeding.id || index} className="grid grid-cols-3 items-center gap-4 text-xs col-span-3">
                    <span className="col-span-2">{feeding.meal_type}</span>
                    <span>{feeding.amount} {feeding.unit}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const WeightTrendChart: React.FC<WeightTrendChartProps> = ({ catId, userId, logChangeTimestamp, period }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<WeightLog[]>([]);
  const [dateRange, setDateRange] = useState<{ start: number; end: number } | null>(null);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 10]);
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([]);
  const [feedingDataMap, setFeedingDataMap] = useState<Map<string, number>>(new Map());

  // Add ref and width state for chart container
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(300);

  const chartMargins = { top: 5, right: 30, left: 0, bottom: 25 };

  useEffect(() => {
    if (!catId || !userId) {
      setIsLoading(false);
      setChartData([]);
      setFeedingLogs([]);
      setFeedingDataMap(new Map());
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch weight logs
        const response = await fetch(`/api/weight-logs?catId=${catId}`, {
          headers: {
            'X-User-ID': userId
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch weight logs: ${response.statusText}`);
        }
        const allLogsRaw: any[] = await response.json();
        const allLogs: WeightLog[] = allLogsRaw.map(log => ({
          ...log,
          weight: typeof log.weight === 'string' ? parseFloat(log.weight) : (typeof log.weight === 'number' ? log.weight : 0),
          date: log.date
        }));
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeRange);
        const filteredLogs = allLogs
          .filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(log => ({
            ...log,
            date: new Date(log.date).getTime(), // Agora 'date' é um timestamp numérico
          }));
        let minWeight = Infinity, maxWeight = -Infinity;
        if (filteredLogs.length > 0) {
          filteredLogs.forEach(log => {
            if (log.weight < minWeight) minWeight = log.weight;
            if (log.weight > maxWeight) maxWeight = log.weight;
          });
          setYAxisDomain([Math.floor(minWeight) - 0.5, Math.ceil(maxWeight) + 0.5]);
          setDateRange({ start: new Date(filteredLogs[0].date).getTime(), end: new Date(filteredLogs[filteredLogs.length - 1].date).getTime() });
        } else {
          setYAxisDomain([0, 10]);
          setDateRange(null);
        }
        setChartData(filteredLogs);
        // LOG DE DEBUG DOS DADOS DO GRÁFICO
        console.log('[WeightTrendChart] Dados do gráfico (chartData):', filteredLogs);

        // Fetch feeding logs for the cat
        const feedingResp = await fetch(`/api/feeding-logs?catId=${catId}`, {
          headers: { 'X-User-ID': userId }
        });
        if (!feedingResp.ok) throw new Error(`Failed to fetch feeding logs: ${feedingResp.statusText}`);
        const logs: FeedingLog[] = await feedingResp.json();
        setFeedingLogs(logs);
        // Build the map: date (YYYY-MM-DD) -> count
        const map = new Map<string, number>();
        logs.forEach(log => {
          const dateKey = new Date(log.date).toISOString().split('T')[0];
          map.set(dateKey, (map.get(dateKey) || 0) + 1);
        });
        setFeedingDataMap(map);
      } catch (error) {
        console.error("Error fetching weight trend data:", error);
        setChartData([]);
        setFeedingLogs([]);
        setFeedingDataMap(new Map());
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [catId, userId, timeRange, logChangeTimestamp]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (let entry of entries) {
        if (entry.contentRect) {
          setChartWidth(entry.contentRect.width);
        }
      }
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(chartContainerRef.current);
    // Set initial width
    setChartWidth(chartContainerRef.current.offsetWidth || 300);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (period && [30, 60, 90].includes(period) && period !== timeRange) {
      setTimeRange(period as TimeRange);
    }
  }, [period]);

  const formatDateTick = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
  };

  const renderCustomActiveDot = (dotProps: CustomActiveDotProps) => {
    if (!dotProps.payload || typeof dotProps.payload.weight !== 'number') return null; // Add check for weight being a number
    const dateKey = new Date(dotProps.payload.date).toISOString().split('T')[0];
    // Assuming dailyFeedingLogsMap is populated with data
    // const feedingsForDay = dailyFeedingLogsMap.get(dateKey); // This line was problematic as dailyFeedingLogsMap is not populated
    return <CustomActiveDot {...dotProps} allFeedingLogsForDay={undefined} />; // Pass undefined for allFeedingLogsForDay
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  // Empty state condition
  if (!isLoading && chartData.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center w-full">
        <EmptyState
          IconComponent={BarChartBig}
          title="Nenhum Dado Disponível"
          description="Não há dados de peso para exibir para o período selecionado. Tente ajustar o intervalo de tempo ou adicione novos registros de peso."
          className="mt-8 mb-4"
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={chartMargins}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDateTick} 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              domain={dateRange ? [dateRange.start, dateRange.end] : undefined}
              type="number"
              scale="time"
            />
            <YAxis 
              domain={yAxisDomain as [number,number]} 
              tick={{ fontSize: 12 }} 
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${value.toFixed(1)}kg`} 
            />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              labelFormatter={formatDateTick}
              formatter={(value: number | string) => {
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                return [`${numValue.toFixed(2)} kg`, 'Weight'];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px'}} verticalAlign="bottom" />
            <Line type="monotone" dataKey="weight" strokeWidth={2} stroke={"hsl(var(--primary))"} dot={{ r: 3 }} activeDot={renderCustomActiveDot} name="Peso (kg)" />
          </LineChart>
        </ResponsiveContainer>
        {/* Absolutely positioned badges for feeding logs */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {chartData.map((log, index) => {
            const dateKey = new Date(log.date).toISOString().split('T')[0];
            const feedingCount = feedingDataMap.get(dateKey);
            if (!feedingCount) return null;

            // Não renderiza o badge se dateRange for nulo
            if (!dateRange) return null;

            // Approximate positioning logic
            const chartRenderWidth = chartWidth;
            const chartRenderHeight = 300;
            
            const plotAreaWidth = chartRenderWidth - chartMargins.left - chartMargins.right;
            const plotAreaHeight = chartRenderHeight - chartMargins.top - chartMargins.bottom;

            const logTime = new Date(log.date).getTime();
            const xRatio = (logTime - dateRange.start) / (dateRange.end - dateRange.start);
            let xPos = chartMargins.left + xRatio * plotAreaWidth;
            
            const [yMin, yMax] = yAxisDomain;
            const yRatio = (log.weight - yMin) / (yMax - yMin);
            let yPos = chartMargins.top + (1 - yRatio) * plotAreaHeight;

            xPos = Math.max(chartMargins.left, Math.min(xPos, chartRenderWidth - chartMargins.right - 10));
            yPos = Math.max(chartMargins.top, Math.min(yPos, chartRenderHeight - chartMargins.bottom - 10));

            return (
              <Badge
                key={`feeding-badge-${index}`}
                variant="secondary"
                className="absolute text-xs px-1 py-0.5"
                style={{
                  left: `${xPos}px`,
                  top: `${yPos - 20}px`,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none'
                }}
              >
                {feedingCount > 1 ? `${feedingCount}x Fed` : 'Fed'}
              </Badge>
            );
          })}
        </div>
      </div>
      {chartData.length === 0 && (
        <div className="flex items-center justify-center h-[300px] bg-muted rounded-md">
          <p className="text-muted-foreground">No weight data available for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default WeightTrendChart; 