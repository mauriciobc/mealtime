"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, getHours, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PageTransition } from "@/components/ui/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, ChevronDown, TrendingUp, AlertTriangle, BarChart3, PieChart, Filter, Calendar, PlusCircle, Users, Utensils, Scale, CalendarCheck } from "lucide-react"
import { useUserContext } from "@/lib/context/UserContext"
import { useCats } from "@/lib/context/CatsContext"
import { useFeeding } from "@/lib/context/FeedingContext"
import { useSelectFeedingStatistics } from "@/lib/selectors/statisticsSelectors"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { motion } from "framer-motion"
import Link from "next/link"
import { StatCard } from "@/components/ui/stat-card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { FeedingLog, CatType } from "@/lib/types"
import { useSession } from "next-auth/react"
import { getDateRange, StatisticsData, TimeSeriesDataPoint, CatPortion } from "@/lib/selectors/statisticsSelectors"

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']

// Helper function for safe parsing
const safeParseISO = (timestamp: string | Date | unknown): Date | null => {
  try {
    const timestampStr = typeof timestamp === 'string'
      ? timestamp
      : timestamp instanceof Date
        ? timestamp.toISOString()
        : String(timestamp);

    if (!timestampStr) return null;
    const date = parseISO(timestampStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (e) {
    console.error(`[safeParseISO] Error processing timestamp:`, timestamp, e);
    return null;
  }
};

const LineChartComponent = ({ data }: { data: any[] }) => (
  <div className="relative w-full" style={{ minHeight: '300px' }}>
    <ChartContainer
      config={{
        valor: {
          label: "Consumo (g)",
          color: "hsl(var(--primary))",
        }
      }}
      className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
    >
      <ResponsiveContainer>
        <RechartsLineChart 
          data={data}
          margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            interval={data.length > 10 ? 'preserveStartEnd' : 0}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
            allowDecimals={false}
            fontSize={12}
            tickFormatter={(value) => `${value}g`}
          />
          <ChartTooltip 
            cursor={{ stroke: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
            content={<ChartTooltipContent 
              indicator="line" 
              labelFormatter={(value, payload) => { 
                const dataPoint = payload?.[0]?.payload;
                return dataPoint?.fullDate ? format(parseISO(dataPoint.fullDate), 'dd/MM/yyyy') : value;
              }}
              formatter={(value) => `${value}g`} 
            />}
          />
          <Line 
            type="monotone" 
            dataKey="valor" 
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 1, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  </div>
)

const BarChartComponent = ({ data }: { data: any[] }) => (
  <div className="relative w-full" style={{ minHeight: '300px' }}>
    <ChartContainer
      config={{
        valor: {
          label: "Quantidade",
          color: "hsl(var(--primary))",
        }
      }}
      className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
    >
      <ResponsiveContainer>
        <RechartsBarChart 
          data={data}
          margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
            allowDecimals={false}
            fontSize={12}
          />
          <ChartTooltip 
            cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
            content={<ChartTooltipContent formatter={(value) => `${value}x`} />}
          />
          <Bar 
            dataKey="valor" 
            radius={[4, 4, 0, 0]}
            fill="hsl(var(--primary))" 
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  </div>
)

const PieChartComponent = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="relative w-full" style={{ minHeight: '300px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Sem dados por gato</p>
        </div>
      </div>
    );
  }

  const config = data.reduce((acc, item, index) => ({
    ...acc,
    [item.name]: {
      label: item.name,
      theme: {
        light: COLORS[index % COLORS.length],
        dark: COLORS[index % COLORS.length]
      },
      color: COLORS[index % COLORS.length]
    },
  }), {});

  return (
    <div className="relative w-full" style={{ minHeight: '300px' }}>
      <ChartContainer config={config} className="absolute inset-0">
        <ResponsiveContainer>
          <RechartsPieChart 
            margin={{ top: 16, right: 16, left: 16, bottom: 30 }}
          >
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" formatter={(value, name, entry) => `${value}g (${(entry.payload.percent * 100).toFixed(0)}%)`} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="35%"
              innerRadius="25%"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} className="[&_.recharts-legend-item]:basis-[calc(50%_-_8px)]" />
          </RechartsPieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

export default function StatisticsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [selectedPeriod, setSelectedPeriod] = useState("7dias")
  const [selectedCatId, setSelectedCatId] = useState<string>("all")

  const { currentUser, cats, feedingLogs, isLoading, error } = useSelectFeedingStatistics()

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
  }

  const handleCatChange = (value: string) => {
    setSelectedCatId(value)
  }

  const householdCats = useMemo(() => {
    if (!cats || !currentUser?.householdId) return []
    return cats.filter(cat => String(cat.householdId) === String(currentUser.householdId))
  }, [cats, currentUser?.householdId])

  const statisticsData = useMemo<StatisticsData | null>(() => {
    if (!currentUser) {
      return null;
    }
    if (!currentUser.householdId) {
      return null;
    }
    if (!cats || cats.length === 0) {
      return null;
    }
    if (!feedingLogs || feedingLogs.length === 0) {
      return null;
    }

    const primaryHouseholdId = currentUser.householdId;
    const { start, end } = getDateRange(selectedPeriod);

    const relevantLogs = feedingLogs.filter(log => {
      if (selectedCatId !== "all" && String(log.catId) !== String(selectedCatId)) return false;

      // Use helper function for filtering
      const logDate = safeParseISO(log.timestamp);
      if (!logDate) return false; // Skip if timestamp is invalid

      return logDate >= start && logDate <= end;
    });

    if (relevantLogs.length === 0) {
      return {
        totalFeedings: 0,
        averagePortionSize: 0,
        totalPortionSize: 0,
        timeSeriesData: [],
        catPortionData: [],
        timeDistributionData: [],
      };
    }

    const totalFeedings = relevantLogs.length;
    const totalPortionSize = relevantLogs.reduce((sum, log) => sum + (log.portionSize || 0), 0);
    const averagePortionSize = totalFeedings > 0 
        ? parseFloat((totalPortionSize / relevantLogs.filter(l => l.portionSize != null).length || 0).toFixed(1))
        : 0;

    const timeSeriesMap = new Map<string, number>();
    relevantLogs.forEach(log => {
      // Use helper function and check result
      const logDate = safeParseISO(log.timestamp);
      if (!logDate) return; // Skip if timestamp is invalid

      const day = format(logDate, 'yyyy-MM-dd');
      const currentSum = timeSeriesMap.get(day) || 0;
      timeSeriesMap.set(day, currentSum + (log.portionSize || 0));
    });
    const timeSeriesData: TimeSeriesDataPoint[] = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
        const dayKey = format(currentDate, 'yyyy-MM-dd');
        const shortDayName = format(currentDate, 'dd/MM');
        timeSeriesData.push({ name: shortDayName, fullDate: dayKey, valor: timeSeriesMap.get(dayKey) || 0 });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const catPortionMap = new Map<string, number>();
    relevantLogs.forEach(log => {
      const cat = cats.find(c => String(c.id) === String(log.catId));
      const catName = cat?.name || "Desconhecido";
      const currentSum = catPortionMap.get(catName) || 0;
      catPortionMap.set(catName, currentSum + (log.portionSize || 0));
    });
    const catPortionData: CatPortion[] = Array.from(catPortionMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const timeDistributionMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) { timeDistributionMap.set(i, 0); }
    relevantLogs.forEach(log => {
        // Use helper function and check result
        const logDate = safeParseISO(log.timestamp);
        if (!logDate) return; // Skip if timestamp is invalid

        try { // Keep try-catch for getHours specifically, though less critical now
           const hour = getHours(logDate);
           timeDistributionMap.set(hour, (timeDistributionMap.get(hour) || 0) + 1);
        } catch (e) {
             console.error(`[StatisticsPage] Error getting hours from date:`, logDate, log, e);
        }
    });
    const timeDistributionData: TimeSeriesDataPoint[] = Array.from(timeDistributionMap.entries())
        .map(([hour, count]) => ({ name: `${hour.toString().padStart(2, '0')}:00`, valor: count }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name)); 

    const finalStats = {
      totalFeedings,
      averagePortionSize,
      totalPortionSize,
      timeSeriesData,
      catPortionData,
      timeDistributionData,
    };

    return finalStats;
  }, [
    currentUser, 
    cats, 
    feedingLogs, 
    selectedPeriod, 
    selectedCatId
  ]);

  if (isLoading) {
    return (
        <PageTransition>
            <PageHeader title="Estatísticas" description="Análise detalhada dos padrões de alimentação." icon={<BarChart3 />} />
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="animate-pulse"><CardHeader><Skeleton className="h-5 w-24"/></CardHeader><CardContent><Skeleton className="h-8 w-16"/></CardContent></Card>
                    <Card className="animate-pulse"><CardHeader><Skeleton className="h-5 w-32"/></CardHeader><CardContent><Skeleton className="h-8 w-16"/></CardContent></Card>
                    <Card className="animate-pulse"><CardHeader><Skeleton className="h-5 w-28"/></CardHeader><CardContent><Skeleton className="h-8 w-16"/></CardContent></Card>
                </div>
                <Card className="animate-pulse"><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-72 w-full"/></CardContent></Card>
                 <Card className="animate-pulse"><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-72 w-full"/></CardContent></Card>
                  <Card className="animate-pulse"><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-72 w-full"/></CardContent></Card>
            </div>
        </PageTransition>
    );
  }

  if (error) {
     return (
        <PageTransition>
            <PageHeader title="Estatísticas" description="Análise detalhada dos padrões de alimentação." icon={<BarChart3 />} />
            <EmptyState icon={AlertTriangle} title="Erro ao carregar estatísticas" description={error} />
        </PageTransition>
    );
  }

  if (cats && cats.length === 0) {
     return (
       <PageTransition>
         <PageHeader title="Estatísticas" actionHref="/" />
         <div className="container mx-auto p-4">
           <EmptyState
             icon={BarChart3}
             title="Sem Gatos"
             description="Cadastre um gato para começar a gerar estatísticas."
             actionLabel="Cadastrar Gato"
             actionHref="/cats/new"
             className="mt-6"
           />
         </div>
       </PageTransition>
     )
  }

  if (!statisticsData || statisticsData.totalFeedings === 0) {
    return (
      <PageTransition>
        <PageHeader title="Estatísticas" description="Análise detalhada dos padrões de alimentação." icon={<BarChart3 />} />
        <div className="mb-4 flex gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                    <SelectItem value="mesAtual">Mês Atual</SelectItem>
                    <SelectItem value="mesPassado">Mês Passado</SelectItem>
                </SelectContent>
            </Select>
             <Select value={selectedCatId} onValueChange={handleCatChange}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Gato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Gatos</SelectItem>
                   {householdCats.map(cat => (
                       <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                   ))}
                </SelectContent>
            </Select>
        </div>
        <EmptyState
            icon={BarChart3}
            title="Sem dados suficientes"
            description="Não há dados de alimentação registrados para o período ou filtro selecionado."
        />
      </PageTransition>
    );
  }

  if (status === 'loading' || !currentUser) {
    return (
        <PageTransition>
           <PageHeader title="Estatísticas" actionHref="/" />
           <div className="container mx-auto p-4">
               <Loading text="Carregando dados do usuário..." />
           </div>
        </PageTransition>
     )
  }

  return (
    <PageTransition>
      <PageHeader title="Estatísticas" actionHref="/" />
      <div className="container mx-auto p-4 pb-7 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
               <Calendar className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">Últimos 7 dias</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="mesAtual">Mês Atual</SelectItem>
              <SelectItem value="mesPassado">Mês Passado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCatId} onValueChange={setSelectedCatId}>
            <SelectTrigger className="w-full sm:w-[180px]">
               <Filter className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue placeholder="Gato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Gatos</SelectItem>
              {householdCats.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
         >
          <StatCard 
            title="Total de Alimentações" 
            value={statisticsData.totalFeedings.toString()} 
            icon={<Utensils className="h-4 w-4" />} 
            description={`No período selecionado`}
          />
          <StatCard 
            title="Média por Alimentação" 
            value={`${statisticsData.averagePortionSize} g`} 
            icon={<Scale className="h-4 w-4" />} 
            description={`Média de ração por vez`}
          />
          <StatCard
            title="Gatos Ativos"
            value={selectedCatId === 'all' ? householdCats.length.toString() : '1'}
            icon={<Users className="h-4 w-4" />}
            description={selectedCatId === 'all' ? `Gatos na residência` : `Gato selecionado`}
          />
           <StatCard
            title="Período"
            value={selectedPeriod.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            icon={<Calendar className="h-4 w-4" />}
            description={`Dados referentes a este período`}
          />
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="grid gap-6 md:grid-cols-2"
         >
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Consumo Total Diário (g)</CardTitle>
              <CardDescription>Total de ração consumida por dia no período.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex justify-center">
              <LineChartComponent data={statisticsData.timeSeriesData || []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Distribuição por Gato (%)</CardTitle>
              <CardDescription>Percentual do consumo total por gato.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex justify-center">
              <PieChartComponent data={statisticsData.catPortionData || []} />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="space-y-1">
              <CardTitle>Distribuição por Horário</CardTitle>
              <CardDescription>Quantidade de alimentações por hora do dia.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative w-full" style={{ minHeight: '300px' }}>
                <ChartContainer
                  config={{
                    valor: {
                      label: "Quantidade",
                      color: "hsl(var(--primary))",
                    }
                  }}
                  className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
                >
                  <ResponsiveContainer>
                    <RechartsBarChart
                      data={statisticsData.timeDistributionData || []}
                      margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                    >
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickMargin={12}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(value) => `${value}x`}
                        width={45}
                        tickMargin={8}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel formatter={(value) => `${value} alimentações`}/>}
                        cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
                      />
                      <Bar
                        dataKey="valor"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        fill="hsl(var(--primary))"
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </PageTransition>
  )
}
