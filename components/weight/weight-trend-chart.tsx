"use client"; // Required for Recharts and hooks like useState

<<<<<<< HEAD
<<<<<<< HEAD
import React, { useState, useMemo, useEffect } from 'react';
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

=======
import React, { useState } from 'react';
=======
import React, { useState, useMemo } from 'react';
<<<<<<< HEAD
>>>>>>> bbe560d (feat(weight): overlay feeding log density badges on WeightTrendChart)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
=======
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, DotProps
} from 'recharts';
>>>>>>> 213b60b (feat(weight): add Popover tooltips to WeightTrendChart data points)
import { Button } from '@/components/ui/button'; // Assuming @/components maps to components/ui or similar
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Updated Sample Data
const sampleWeightLogs = [
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

<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 05f022c (feat(weight): implement WeightTrendChart with Recharts and time toggles)
=======
// Sample feeding logs
=======
>>>>>>> 213b60b (feat(weight): add Popover tooltips to WeightTrendChart data points)
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

>>>>>>> bbe560d (feat(weight): overlay feeding log density badges on WeightTrendChart)
type TimeRange = 30 | 60 | 90;

interface WeightLog {
  date: string; // Should be ISO date string for easier manipulation
  weight: number;
<<<<<<< HEAD
<<<<<<< HEAD
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
  userId: string; // Added userId prop
  logChangeTimestamp: number; // Added to trigger re-fetch
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

const WeightTrendChart: React.FC<WeightTrendChartProps> = ({ catId, userId, logChangeTimestamp }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<WeightLog[]>([]);
  const [dateRange, setDateRange] = useState<{ start: number; end: number } | null>(null);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 10]);

  const chartMargins = { top: 5, right: 30, left: 0, bottom: 25 };

  useEffect(() => {
    if (!catId || !userId) {
      setIsLoading(false);
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch weight logs. API currently doesn't support timeRange directly for weight logs.
        // We fetch all and then filter, or API needs enhancement.
        const response = await fetch(`/api/weight-logs?catId=${catId}`, {
          headers: {
            'X-User-ID': userId
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch weight logs: ${response.statusText}`);
        }
        const allLogsRaw: any[] = await response.json(); // Temporarily use any[] for parsing

        // Parse weight from string to number
        const allLogs: WeightLog[] = allLogsRaw.map(log => ({
          ...log,
          weight: typeof log.weight === 'string' ? parseFloat(log.weight) : (typeof log.weight === 'number' ? log.weight : 0),
          date: log.date // Assuming date is already correctly formatted string
        }));

        // Filter by timeRange on client side for now
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeRange);

        const filteredLogs = allLogs
          .filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let minWeight = Infinity, maxWeight = -Infinity;
        if (filteredLogs.length > 0) {
          filteredLogs.forEach(log => {
            if (log.weight < minWeight) minWeight = log.weight;
            if (log.weight > maxWeight) maxWeight = log.weight;
          });
          setYAxisDomain([Math.floor(minWeight) - 0.5, Math.ceil(maxWeight) + 0.5]);
          setDateRange({ start: new Date(filteredLogs[0].date).getTime(), end: new Date(filteredLogs[filteredLogs.length - 1].date).getTime() });
        } else {
          // Default or sensible empty state for domain/range
          setYAxisDomain([0, 10]); 
          setDateRange(null);
        }
        setChartData(filteredLogs);

      } catch (error) {
        console.error("Error fetching weight trend data:", error);
        setChartData([]); // Clear data on error
        // Optionally set an error state to display to the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [catId, userId, timeRange, logChangeTimestamp]);

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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-1/3" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-8 w-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state condition
  if (!isLoading && chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tendência de Peso</CardTitle>
              <CardDescription>Últimos {timeRange} dias</CardDescription>
            </div>
            <div className="flex space-x-2">
              {([30, 60, 90] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  disabled // Disable buttons if no data to prevent re-fetch simulation for empty state
                >
                  {range}D
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center"> {/* Adjusted height for EmptyState */}
          <EmptyState
            IconComponent={BarChartBig}
            title="Nenhum Dado Disponível"
            description="Não há dados de peso para exibir para o período selecionado. Tente ajustar o intervalo de tempo ou adicione novos registros de peso."
            className="mt-8 mb-4" // Added margin for better spacing
          />
        </CardContent>
      </Card>
    );
  }

=======
=======
  notes?: string; // Added notes
>>>>>>> 213b60b (feat(weight): add Popover tooltips to WeightTrendChart data points)
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
  weightLogs?: WeightLog[]; // Optional: pass real data later
  feedingLogs?: FeedingLog[];
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
        <circle cx={cx} cy={cy} r={8} fill={stroke} strokeWidth={2} stroke="white" style={{ cursor: 'pointer' }} />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Log Details</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(payload.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="font-semibold">Weight:</span>
              <span className="col-span-2">{payload.weight.toFixed(2)} kg</span>
            </div>
            {payload.notes && (
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="font-semibold">Notes:</span>
                <span className="col-span-2 text-sm text-muted-foreground">{payload.notes}</span>
              </div>
            )}
            {allFeedingLogsForDay && allFeedingLogsForDay.length > 0 && (
              <>
                <div className="col-span-3"><hr className="my-2" /></div>
                <h5 className="col-span-3 font-medium text-sm mb-1">Feedings on this day:</h5>
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

const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  weightLogs = sampleWeightLogs,
  feedingLogs = sampleFeedingLogs,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  const [chartMargins] = useState({ top: 5, right: 30, left: 0, bottom: 25 }); // Keep track of margins for positioning

  const { chartData, feedingDataMap, dateRange, yAxisDomain, dailyFeedingLogsMap } = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - timeRange);

    const filteredWeightLogs = weightLogs
      .filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentFeedingDataMap = new Map<string, number>();
    const currentDailyFeedingLogsMap = new Map<string, ProcessedFeedingLog[]>();

    feedingLogs.forEach((log, index) => {
      const logDate = new Date(log.date);
      if (logDate >= startDate && logDate <= endDate) {
        const dateKey = logDate.toISOString().split('T')[0];
        currentFeedingDataMap.set(dateKey, (currentFeedingDataMap.get(dateKey) || 0) + 1);
        
        const dayLogs = currentDailyFeedingLogsMap.get(dateKey) || [];
        dayLogs.push({ ...log, id: `feeding-${dateKey}-${index}` });
        currentDailyFeedingLogsMap.set(dateKey, dayLogs);
      }
    });
    
    let minWeight = Infinity;
    let maxWeight = -Infinity;
    if (filteredWeightLogs.length > 0) {
      filteredWeightLogs.forEach(log => {
        if (log.weight < minWeight) minWeight = log.weight;
        if (log.weight > maxWeight) maxWeight = log.weight;
      });
    } else {
      minWeight = 5; // Default if no data
      maxWeight = 6;
    }

    return {
      chartData: filteredWeightLogs,
      feedingDataMap: currentFeedingDataMap,
      dailyFeedingLogsMap: currentDailyFeedingLogsMap,
      dateRange: { start: startDate.getTime(), end: endDate.getTime() },
      yAxisDomain: [Math.floor(minWeight) - 0.5, Math.ceil(maxWeight) + 0.5] // Dynamic Y-axis based on data + padding
    };
  }, [weightLogs, feedingLogs, timeRange]);

  const formatDateTick = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

<<<<<<< HEAD
>>>>>>> 05f022c (feat(weight): implement WeightTrendChart with Recharts and time toggles)
=======
  const renderCustomActiveDot = (dotProps: CustomActiveDotProps) => {
    if (!dotProps.payload) return null;
    const dateKey = new Date(dotProps.payload.date).toISOString().split('T')[0];
    const feedingsForDay = dailyFeedingLogsMap.get(dateKey);
    return <CustomActiveDot {...dotProps} allFeedingLogsForDay={feedingsForDay} />;
  };

>>>>>>> 213b60b (feat(weight): add Popover tooltips to WeightTrendChart data points)
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
<<<<<<< HEAD
            <CardTitle>Tendência de Peso</CardTitle>
            <CardDescription>Últimos {timeRange} dias</CardDescription>
          </div>
          <div className="flex space-x-2">
            {([30, 60, 90] as TimeRange[]).map((range) => (
=======
            <CardTitle>Weight Trend</CardTitle>
            <CardDescription>Last {timeRange} days</CardDescription>
          </div>
          <div className="flex space-x-2">
            {( [30, 60, 90] as TimeRange[]).map((range) => (
>>>>>>> 05f022c (feat(weight): implement WeightTrendChart with Recharts and time toggles)
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}D
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
<<<<<<< HEAD
<<<<<<< HEAD
        <div style={{ position: 'relative', width: '100%', height: '300px', overflowX: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={500}>
            <LineChart data={chartData} margin={chartMargins}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
=======
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}> {/* Adjusted left margin for YAxis */}
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5}/>
>>>>>>> 05f022c (feat(weight): implement WeightTrendChart with Recharts and time toggles)
=======
        <div style={{ position: 'relative', width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={chartMargins}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
>>>>>>> bbe560d (feat(weight): overlay feeding log density badges on WeightTrendChart)
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDateTick} 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
<<<<<<< HEAD
                domain={dateRange ? [dateRange.start, dateRange.end] : undefined} // Apply date range to XAxis if needed, or handle via data
                type="number" // If dateRange.start/end are timestamps
                scale="time" // If XAxis should scale as time
              />
              <YAxis 
                domain={yAxisDomain as [number,number]} 
=======
              />
              <YAxis 
<<<<<<< HEAD
                domain={['dataMin - 0.2', 'dataMax + 0.2']} 
>>>>>>> 05f022c (feat(weight): implement WeightTrendChart with Recharts and time toggles)
=======
                domain={yAxisDomain as [number,number]} 
>>>>>>> bbe560d (feat(weight): overlay feeding log density badges on WeightTrendChart)
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${value.toFixed(1)}kg`} 
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                labelFormatter={formatDateTick}
<<<<<<< HEAD
                formatter={(value: number | string) => { // Allow string for initial safety, parse to number
                  const numValue = typeof value === 'string' ? parseFloat(value) : value;
                  return [`${numValue.toFixed(2)} kg`, 'Weight'];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '14px'}} verticalAlign="bottom" />
              <Line type="monotone" dataKey="weight" strokeWidth={2} stroke={"hsl(var(--primary))"} dot={{ r: 3 }} activeDot={renderCustomActiveDot} name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
=======
                formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Weight']}
              />
              <Legend wrapperStyle={{ fontSize: '14px'}} verticalAlign="bottom" />
              <Line type="monotone" dataKey="weight" strokeWidth={2} stroke={"hsl(var(--primary))"} dot={{ r: 3 }} activeDot={renderCustomActiveDot} name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
          {/* Absolutely positioned badges for feeding logs */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            {chartData.map((log, index) => {
              const dateKey = new Date(log.date).toISOString().split('T')[0];
              const feedingCount = feedingDataMap.get(dateKey);
              if (!feedingCount) return null;

              // Approximate positioning logic
              const chartRenderWidth = typeof window !== 'undefined' ? document.querySelector('.recharts-responsive-container')?.firstChild?.clientWidth || 300 : 300; // Get actual render width
              const chartRenderHeight = 300; // Keep consistent with ResponsiveContainer height
              
              const plotAreaWidth = chartRenderWidth - chartMargins.left - chartMargins.right;
              const plotAreaHeight = chartRenderHeight - chartMargins.top - chartMargins.bottom;

              const logTime = new Date(log.date).getTime();
              const xRatio = (logTime - dateRange.start) / (dateRange.end - dateRange.start);
              let xPos = chartMargins.left + xRatio * plotAreaWidth;
              
              const [yMin, yMax] = yAxisDomain;
              const yRatio = (log.weight - yMin) / (yMax - yMin);
              let yPos = chartMargins.top + (1 - yRatio) * plotAreaHeight; // Y is inverted

              // Clamp positions to be within the plot area to avoid overflow with badges
              xPos = Math.max(chartMargins.left, Math.min(xPos, chartRenderWidth - chartMargins.right - 10)); // -10 for badge width
              yPos = Math.max(chartMargins.top, Math.min(yPos, chartRenderHeight - chartMargins.bottom - 10)); // -10 for badge height

              return (
                <Badge
                  key={`feeding-badge-${index}`}
                  variant="secondary" // Or other variants
                  className="absolute text-xs px-1 py-0.5"
                  style={{
                    left: `${xPos}px`,
                    top: `${yPos - 20}px`, // Position badge slightly above the point
                    transform: 'translateX(-50%)', // Center badge
                    pointerEvents: 'none' // So they don't interfere with chart interactions
                  }}
                >
                  {feedingCount > 1 ? `${feedingCount}x Fed` : 'Fed'}
                </Badge>
              );
            })}
          </div>
        </div>
        {chartData.length === 0 && (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No weight data available for the selected period.</p>
          </div>
        )}
<<<<<<< HEAD
        {/* Placeholder for feeding log density badges */}
        <div className="mt-4 text-xs text-muted-foreground">
          Feeding log density overlay (coming soon)
>>>>>>> 05f022c (feat(weight): implement WeightTrendChart with Recharts and time toggles)
        </div>
=======
>>>>>>> bbe560d (feat(weight): overlay feeding log density badges on WeightTrendChart)
      </CardContent>
    </Card>
  );
};

export default WeightTrendChart; 