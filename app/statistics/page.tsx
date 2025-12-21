"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageTransition } from "@/components/ui/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, BarChart3, Users, Utensils, Scale, Calendar, Filter } from "lucide-react"
import { useUserContext } from "@/lib/context/UserContext"
import { useSelectFeedingStatistics } from "@/lib/selectors/statisticsSelectors"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { motion } from "framer-motion"
import Link from "next/link"
import { StatCard } from "@/components/ui/stat-card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { StatisticsData, TimeSeriesDataPoint, CatPortion } from "@/lib/selectors/statisticsSelectors"
import { useStatistics } from "@/lib/hooks/useStatistics"
import { 
  resolveDateFnsLocale,
  getDateRange,
  type PeriodType
} from "@/lib/utils/date"

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile };
};

interface TimeDistributionDataPoint {
  name: string;
  valor: number;
}

interface _ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  }
}

interface _CatPortionConfig {
  [key: string]: {
    label: string;
    theme: {
      light: string;
      dark: string;
    };
    color: string;
  }
}

const LineChartComponent = ({ data }: { data: TimeSeriesDataPoint[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] flex items-center justify-center">
        <p className="text-muted-foreground text-xs">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9]">
      <ChartContainer
        config={{
          valor: {
            label: "Consumo (g)",
            color: "hsl(var(--primary))",
          }
        }}
        className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart 
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={data.length > 10 ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              allowDecimals={false}
              width={35}
            />
            <ChartTooltip 
              cursor={{ stroke: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
            />
            <Line 
              type="monotone" 
              dataKey="valor" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 1, r: 2 }}
              activeDot={{ r: 4 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

const BarChartComponent = ({ data }: { data: TimeDistributionDataPoint[] }) => {
  const { isMobile } = useResponsive();

  if (!data || data.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9]">
      <ChartContainer
        config={{
          valor: {
            label: "Quantidade",
            color: "hsl(var(--primary))",
          }
        }}
        className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart 
            data={data}
            margin={{
              top: 16,
              right: isMobile ? 8 : 16,
              left: 0,
              bottom: isMobile ? 8 : 16
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              allowDecimals={false}
            />
            <ChartTooltip 
              cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
              content={<ChartTooltipContent formatter={(value) => `${value}x`} />}
            />
            <Bar 
              dataKey="valor" 
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
              maxBarSize={isMobile ? 24 : 32}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

const PieChartComponent = ({ data }: { data: CatPortion[] }) => {
  const { isMobile } = useResponsive();
  
  console.log('Debug - PieChart data:', JSON.stringify(data, null, 2));
  
  if (!data || data.length === 0) {
    return (
      <div className="relative mx-auto aspect-square max-h-[250px] flex items-center justify-center">
        <p className="text-muted-foreground text-xs">Sem dados por gato</p>
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

  const chartDimensions = {
    outerRadius: isMobile ? '56%' : '70%',
    innerRadius: data.length === 1 ? '0%' : (isMobile ? '36%' : '48%'),
    startAngle: 90,
    endAngle: -270,
  };

  return (
    <ChartContainer
      config={config}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <ChartTooltip
            content={<ChartTooltipContent hideLabel nameKey="name" formatter={((value: any, name: any) => {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              const nameStr = String(name);
              const item = data.find(d => d.name === nameStr);
              return [`${numValue.toFixed(1)}g (${item?.percent || 0}%)`];
            }) as any} />}
            cursor={false}
          />
          <Pie
            data={data as any[]}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={chartDimensions.outerRadius}
            innerRadius={chartDimensions.innerRadius}
            startAngle={chartDimensions.startAngle}
            endAngle={chartDimensions.endAngle}
            paddingAngle={data.length === 1 ? 0 : 2}
            minAngle={data.length === 1 ? 360 : 10}
            strokeWidth={5}
          >
            {data.map((entry, index) => {
              console.log('Debug - Rendering pie slice:', {
                name: entry.name,
                value: entry.value,
                percent: entry.percent,
                color: COLORS[index % COLORS.length]
              });
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                />
              );
            })}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Definição dos tipos de estado
type StatisticsPageState = 
  | { type: 'LOADING_USER' }
  | { type: 'ERROR_USER'; error: string }
  | { type: 'NO_USER' }
  | { type: 'NO_HOUSEHOLD' }
  | { type: 'LOADING_STATISTICS' }
  | { type: 'ERROR_STATISTICS'; error: string }
  | { type: 'NO_DATA' }
  | { type: 'STATISTICS'; data: StatisticsData };

export default function StatisticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isMobile: _isMobile2 } = useResponsive()

  // Hooks existentes
  const { state: userState } = useUserContext()
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState
  const { 
    cats,
    feedingLogs,
    isLoading: isLoadingAggregated,
    error: errorAggregated,
  } = useSelectFeedingStatistics()

  const userLanguage = userState.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(searchParams.get('period') || '7dias')
  const [selectedCatId, setSelectedCatId] = useState<string>(searchParams.get('catId') || 'all')

  // Handlers para atualizar estado e URL
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('period', period);
    params.set('catId', selectedCatId); // mantém o filtro de gato
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, selectedCatId]);

  const handleCatChange = useCallback((catId: string) => {
    setSelectedCatId(catId);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('catId', catId);
    params.set('period', selectedPeriod); // mantém o filtro de período
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, selectedPeriod]);

  // Calcular o dateRange usando o novo utilitário
  const dateRange = useMemo(() => getDateRange(selectedPeriod as PeriodType), [selectedPeriod]);

  // Usar o hook useStatistics diretamente
  const statistics = useStatistics(feedingLogs, cats, dateRange, selectedCatId, userLocale);

  // Cálculo do estado da página
  const pageState = useMemo<StatisticsPageState>(() => {
    if (isLoadingUser) return { type: 'LOADING_USER' };
    if (errorUser) return { type: 'ERROR_USER', error: errorUser };
    if (!currentUser) return { type: 'NO_USER' };
    if (!currentUser.householdId) return { type: 'NO_HOUSEHOLD' };
    if (isLoadingAggregated) return { type: 'LOADING_STATISTICS' };
    if (errorAggregated) return { type: 'ERROR_STATISTICS', error: errorAggregated };
    if (!feedingLogs || feedingLogs.length === 0) return { type: 'NO_DATA' };
    
    return { type: 'STATISTICS', data: statistics };
  }, [
    isLoadingUser,
    errorUser,
    currentUser,
    isLoadingAggregated,
    errorAggregated,
    feedingLogs,
    statistics
  ]);

  // Renderização baseada no estado
  switch (pageState.type) {
    case 'LOADING_USER':
      return <Loading text="Verificando usuário..." />;
    
    case 'ERROR_USER':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <PageHeader title="Estatísticas" />
            <EmptyState 
              IconComponent={AlertTriangle}
              title="Erro ao Carregar Usuário"
              description={`Não foi possível carregar os dados do usuário: ${pageState.error}`}
            />
            <Button variant="outline" onClick={() => router.back()} className="mt-4">Voltar</Button>
          </div>
        </PageTransition>
      );
    
    case 'NO_USER':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <PageHeader title="Estatísticas" />
            <EmptyState 
              IconComponent={Users}
              title="Usuário Não Autenticado"
              description="Faça login para ver as estatísticas."
            />
            <Button variant="outline" onClick={() => router.push('/login')} className="mt-4">Fazer Login</Button>
          </div>
        </PageTransition>
      );
    
    case 'NO_HOUSEHOLD':
      return (
        <PageTransition>
          <div className="p-4">
            <PageHeader title="Estatísticas" />
            <EmptyState
              IconComponent={Users}
              title="Sem Residência Associada"
              description="Associe-se a uma residência para ver estatísticas."
              actionButton={
                <Button asChild variant="default" className="mt-4">
                  <Link href="/settings">
                    Ir para Configurações
                  </Link>
                </Button>
              }
              className="mt-8"
            />
          </div>
        </PageTransition>
      );
    
    case 'LOADING_STATISTICS':
      return <Loading text="Carregando estatísticas..." />;
    
    case 'ERROR_STATISTICS':
      return (
        <PageTransition>
          <div className="p-4 text-center">
            <PageHeader title="Estatísticas" />
            <EmptyState 
              IconComponent={AlertTriangle}
              title="Erro ao Carregar Estatísticas"
              description={`Não foi possível carregar os dados: ${pageState.error}`}
            />
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">Tentar Novamente</Button>
          </div>
        </PageTransition>
      );
    
    case 'NO_DATA':
      return (
        <PageTransition>
          <div className="p-4">
            <PageHeader title="Estatísticas" />
            <EmptyState
              IconComponent={BarChart3}
              title="Sem Dados"
              description="Não há dados de alimentação para exibir no período selecionado."
              actionButton={
                <Button asChild variant="default" className="mt-4">
                  <Link href="/feeding">
                    Registrar Alimentação
                  </Link>
                </Button>
              }
              className="mt-8"
            />
          </div>
        </PageTransition>
      );
    
    case 'STATISTICS':
      return (
        <PageTransition>
          <PageHeader 
            title="Estatísticas" 
            description="Análise detalhada dos padrões de alimentação." 
            icon={<BarChart3 />} 
          />
          <div className="container mx-auto p-4 pb-7 space-y-6">
            {/* Filtros */}
            <div className="flex flex-row gap-2">
              <Select 
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger className="w-full">
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
              <Select value={selectedCatId} onValueChange={handleCatChange}>
                <SelectTrigger className="w-full">
                  <Filter className="mr-2 h-4 w-4 opacity-50" />
                  <SelectValue placeholder="Gato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Gatos</SelectItem>
                  {cats.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cards de Estatísticas */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-2 h-[120px]"
            >
              <StatCard 
                title="Total de Alimentações" 
                value={pageState.data.totalFeedings.toString()} 
                icon={<Utensils className="h-4 w-4" />} 
                description={`No período`}
                className="h-full"
              />
              <StatCard 
                title="Porção média" 
                value={`${pageState.data.averagePortionSize} g`} 
                icon={<Scale className="h-4 w-4" />} 
                description={`Média por vez`}
                className="h-full"
              />
              <StatCard
                title="Gatos Ativos"
                value={selectedCatId === 'all' ? cats.length.toString() : '1'}
                icon={<Users className="h-4 w-4" />}
                description={selectedCatId === 'all' ? `Na residência` : `Selecionado`}
                className="h-full"
              />
            </motion.div>

            {/* Gráficos */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid gap-4 grid-cols-1 md:grid-cols-2"
            >
              <Card>
                <CardHeader className="space-y-1 p-4">
                  <CardTitle className="text-base">Consumo Total Diário (g)</CardTitle>
                  <CardDescription className="text-xs">Total de ração consumida por dia no período.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 px-2 pb-4">
                  <LineChartComponent data={pageState.data.timeSeriesData || []} />
                </CardContent>
              </Card>
              <Card className="flex flex-col">
                <CardHeader className="space-y-1 p-4">
                  <CardTitle className="text-base">Distribuição por Gato (%)</CardTitle>
                  <CardDescription className="text-xs">Percentual do consumo total por gato.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <PieChartComponent data={pageState.data.catPortionData || []} />
                </CardContent>
                <CardFooter className="flex justify-center gap-4 text-sm">
                  {pageState.data.catPortionData.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center gap-1">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ background: COLORS[idx % COLORS.length] }}
                      />
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </CardFooter>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader className="space-y-1 p-4">
                  <CardTitle className="text-base">Distribuição por Horário</CardTitle>
                  <CardDescription className="text-xs">Quantidade de alimentações por hora do dia.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 px-2 pb-4">
                  <div className="relative w-full aspect-[16/9]">
                    <ChartContainer
                      config={{
                        valor: {
                          label: "Quantidade",
                          color: "hsl(var(--primary))",
                        }
                      }}
                      className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={pageState.data.timeDistributionData || []}
                          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                        >
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickMargin={8}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(value) => `${value}x`}
                            width={35}
                            tickMargin={4}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent hideLabel formatter={(value) => `${value} alimentações`}/>}
                            cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
                          />
                          <Bar
                            dataKey="valor"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={24}
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
      );
  }
}
