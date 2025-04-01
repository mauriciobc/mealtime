"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppHeader } from "@/components/app-header"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, ChevronDown, TrendingUp, AlertTriangle, BarChart3, PieChart, Filter, Calendar, PlusCircle, Users } from "lucide-react"
import { useAppContext } from "@/lib/context/AppContext"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton"
import NoDataMessage from "@/components/no-data-message"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { motion } from "framer-motion"
import Link from "next/link"
import { useGlobalState } from "@/lib/context/global-state"
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { useSession } from "next-auth/react"
import { StatCard } from "@/components/ui/stat-card"
import { Utensils, Scale, CalendarCheck } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

interface FeedingData {
  id: string
  catId: number
  catName: string
  timestamp: Date
  portionSize: number | null
}

interface TimeSeriesDataPoint {
  name: string
  valor: number
}

interface CatPortion {
  name: string
  value: number
}

interface StatsSummary {
  totalFeedings: number
  averagePortionSize: number
  maxConsecutiveDays: number
  missedSchedules: number
}

interface StatisticsData {
  totalFeedings: number
  averagePortionSize: number
  maxConsecutiveDays: number
  missedSchedules: number
  timeSeriesData: TimeSeriesDataPoint[]
  catPortionData: CatPortion[]
  timeDistributionData: TimeSeriesDataPoint[]
}

interface ChartProps {
  timeSeriesData: TimeSeriesDataPoint[];
  timeDistributionData: TimeSeriesDataPoint[];
  catPortionData: CatPortion[];
  formatTooltip: (value: number) => string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const LineChartComponent = ({ timeSeriesData, formatTooltip }: ChartProps) => (
  <div className="h-[300px] w-full">
    <ChartContainer
      config={{
        valor: {
          label: "Consumo (g)",
          color: "hsl(var(--primary))",
        },
      }}
      className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
    >
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height={250}>
          <RechartsLineChart 
            data={timeSeriesData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              fontSize={12}
              interval={timeSeriesData.length > 10 ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              domain={[0, 'auto']}
              allowDecimals={false}
              fontSize={12}
            />
            <ChartTooltip 
              content={<ChartTooltipContent indicator="line" />}
              cursor={{ stroke: 'hsl(var(--muted-foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="valor" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 1, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-center">
          <ChartLegend content={<ChartLegendContent />} />
        </div>
      </div>
    </ChartContainer>
  </div>
)

const BarChartComponent = ({ timeDistributionData }: ChartProps) => (
  <div className="h-[300px] w-full">
    <ChartContainer
      config={{
        valor: {
          label: "Quantidade",
          color: "hsl(var(--primary))",
        },
      }}
      className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
    >
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height={250}>
          <RechartsBarChart 
            data={timeDistributionData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              fontSize={12}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              domain={[0, 'auto']}
              allowDecimals={false}
              fontSize={12}
            />
            <ChartTooltip 
              content={<ChartTooltipContent indicator="dot" />}
              cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
            />
            <Bar 
              dataKey="valor" 
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))" 
            />
          </RechartsBarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-center">
          <ChartLegend content={<ChartLegendContent />} />
        </div>
      </div>
    </ChartContainer>
  </div>
)

const PieChartComponent = ({ catPortionData }: ChartProps) => {
  if (!catPortionData || catPortionData.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">Sem dados por gato</p>
      </div>
    );
  }

  const config = catPortionData.reduce((acc, item, index) => ({
    ...acc,
    [item.name]: {
      label: item.name,
      color: COLORS[index % COLORS.length],
    },
  }), {});

  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={config} className="mx-auto max-w-[250px]">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={catPortionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                paddingAngle={2}
              >
                {catPortionData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} /> 
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center">
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}

export default function StatisticsPage() {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const { data: session, status } = useSession()
  const [selectedPeriod, setSelectedPeriod] = useState("7dias")
  const [selectedCat, setSelectedCat] = useState<string>("all")
  const [feedingData, setFeedingData] = useState<FeedingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statsSummary, setStatsSummary] = useState<StatsSummary>({
    totalFeedings: 0,
    averagePortionSize: 0,
    maxConsecutiveDays: 0,
    missedSchedules: 0,
  })
  
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([])
  const [catPortionData, setCatPortionData] = useState<CatPortion[]>([])
  const [timeDistributionData, setTimeDistributionData] = useState<TimeSeriesDataPoint[]>([])

  // Loading states
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [userHasHousehold, setUserHasHousehold] = useState<boolean | undefined>(undefined)

  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // 1. Effect to track initial context readiness (user and households)
  useEffect(() => {
    if (status === "loading") {
      setInitialLoadComplete(false)
      return
    }
    
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      if (state.currentUser && state.households) {
        const currentHouseholdId = state.currentUser.householdId
        setUserHasHousehold(!!currentHouseholdId)
        
        if (currentHouseholdId && !state.households.some(h => String(h.id) === String(currentHouseholdId))) {
          console.warn(`Statistics: User's household ${currentHouseholdId} not found in state.households.`)
        }
        setInitialLoadComplete(true)
      } else {
        setInitialLoadComplete(false) 
      }
    }
  }, [status, state.currentUser, state.households, router])

  // 2. Effect to fetch statistics data once context is ready and filters change
  useEffect(() => {
    if (!initialLoadComplete || !userHasHousehold) {
      if (initialLoadComplete && userHasHousehold === false) {
         setIsLoadingStats(false)
      }
      return 
    }

    const fetchData = async () => {
      console.log("Fetching statistics for period:", selectedPeriod, "cat:", selectedCat)
      setIsLoadingStats(true)
      try {
        const response = await fetch(`/api/statistics?period=${selectedPeriod}&catId=${selectedCat}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Falha ao buscar estatísticas')
        }

        const stats = await response.json()

        setStatsSummary({
          totalFeedings: stats.totalFeedings ?? 0,
          averagePortionSize: stats.averagePortionSize ?? 0,
          maxConsecutiveDays: stats.maxConsecutiveDays ?? 0,
          missedSchedules: stats.missedSchedules ?? 0,
        })
        setTimeSeriesData(stats.timeSeriesData || [])
        setCatPortionData(stats.catPortionData || [])
        setTimeDistributionData(stats.timeDistributionData || [])
        setFeedingData(stats.feedingLogs || [])

      } catch (error: any) {
        console.error("Erro ao carregar estatísticas:", error)
        toast.error(`Não foi possível carregar as estatísticas: ${error.message}`)
        setStatsSummary({ totalFeedings: 0, averagePortionSize: 0, maxConsecutiveDays: 0, missedSchedules: 0 })
        setTimeSeriesData([])
        setCatPortionData([])
        setTimeDistributionData([])
        setFeedingData([])
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchData()
  }, [initialLoadComplete, userHasHousehold, selectedPeriod, selectedCat])
  
  // Formatador para o tooltip do gráfico
  const formatTooltip = (value: number) => {
    return `${value} g`
  }
  
  // Formatar rótulos numéricos
  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // A. Initial Loading (Waiting for context/auth)
  if (!initialLoadComplete) {
     return <Loading text="Carregando dados do usuário..." />;
  }

  // B. Context loaded, but user has no associated household
  if (userHasHousehold === false) {
    return (
       <PageTransition>
          <div className="flex flex-col min-h-screen bg-background">
             <div className="container mx-auto px-4 py-8 pb-24">
                <PageHeader
                  title="Estatísticas"
                  description="Análise dos padrões de alimentação dos seus gatos"
                  icon={<BarChart3 className="h-6 w-6" />}
                />
                <EmptyState
                  icon={Users}
                  title="Sem Residência Associada"
                  description="Você precisa criar ou juntar-se a uma residência para visualizar estatísticas."
                  actionLabel="Ir para Configurações"
                  actionHref="/settings"
                />
             </div>
          </div>
       </PageTransition>
    );
  }

  // C. Context ready, user has household, but stats are loading (initial or filter change)
  if (isLoadingStats) {
    return (
       <PageTransition>
         <div className="flex flex-col min-h-screen bg-background">
           <div className="container mx-auto px-4 py-8 pb-24">
              <PageHeader
                 title="Estatísticas"
                 description="Análise dos padrões de alimentação dos seus gatos"
                 icon={<BarChart3 className="h-6 w-6" />}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-10 w-32 rounded-md" />
                      <Skeleton className="h-10 w-40 rounded-md" />
                  </div>
                  <Skeleton className="h-9 w-44 rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
               </div>
               <Skeleton className="h-10 w-full max-w-sm rounded-md mb-4" />
               <Skeleton className="h-[350px] w-full rounded-lg border bg-card" /> 
           </div>
         </div>
       </PageTransition>
    );
  }

  // D. Stats loaded, but no data found for the current filters
  const hasAnyStatsData = statsSummary.totalFeedings > 0 || timeSeriesData.length > 0 || catPortionData.length > 0 || timeDistributionData.length > 0;
  if (!isLoadingStats && !hasAnyStatsData) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 pb-24">
             <PageHeader
                title="Estatísticas"
                description="Análise dos padrões de alimentação dos seus gatos"
                icon={<BarChart3 className="h-6 w-6" />}
             />
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
               <div className="flex flex-wrap gap-2">
                 <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Período" /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="7dias">7 dias</SelectItem>
                       <SelectItem value="30dias">30 dias</SelectItem>
                       <SelectItem value="3meses">3 meses</SelectItem>
                    </SelectContent>
                 </Select>
                 <Select value={selectedCat} onValueChange={setSelectedCat}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Gato" /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">Todos os gatos</SelectItem>
                       {state.cats?.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
               </div>
               <Button variant="outline" size="sm" asChild>
                 <Link href="/feedings/new" className="flex items-center gap-2">
                   <PlusCircle className="h-4 w-4" /><span>Registrar Alimentação</span>
                 </Link>
               </Button>
             </div>
             <EmptyState
                icon={Filter}
                title="Sem Dados para os Filtros"
                description="Não há registros de alimentação que correspondam aos filtros selecionados. Tente um período diferente ou registre mais alimentações."
                actionLabel="Registrar Alimentação"
                actionHref="/feedings/new"
             />
          </div>
        </div>
      </PageTransition>
    );
  }

  // E. Main Render: Context ready, Stats loaded, Data available
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 pb-24">
          <PageHeader
            title="Estatísticas"
            description="Análise dos padrões de alimentação dos seus gatos"
            icon={<BarChart3 className="h-6 w-6" />}
          />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7dias">7 dias</SelectItem>
                  <SelectItem value="30dias">30 dias</SelectItem>
                  <SelectItem value="3meses">3 meses</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={selectedCat}
                onValueChange={setSelectedCat}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Gato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os gatos</SelectItem>
                  {state.cats.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm" asChild>
              <Link href="/feedings/new" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Registrar Alimentação</span>
              </Link>
            </Button>
          </div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
             <motion.div variants={itemVariants}>
               <StatCard
                 title="Total Alimentações"
                 value={statsSummary.totalFeedings}
                 icon={<Utensils />}
                 description="Registros no período"
               />
             </motion.div>
             <motion.div variants={itemVariants}>
               <StatCard
                 title="Porção Média"
                 value={`${formatNumber(statsSummary.averagePortionSize)} g`}
                 icon={<Scale />}
                 description="Por alimentação"
               />
             </motion.div>
             <motion.div variants={itemVariants}>
               <StatCard
                 title="Máx. Dias Seguidos"
                 value={statsSummary.maxConsecutiveDays}
                 icon={<CalendarCheck />}
                 description="Com registros"
               />
             </motion.div>
             <motion.div variants={itemVariants}>
               <StatCard
                 title="Agend. Perdidos"
                 value={statsSummary.missedSchedules}
                 icon={<AlertTriangle />}
                 description="Horários não registrados"
               />
             </motion.div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="consumo" className="mb-8">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-6">
                 <TabsTrigger value="consumo">Consumo Diário</TabsTrigger>
                 <TabsTrigger value="tempo">Horários Frequentes</TabsTrigger>
                 <TabsTrigger value="gatos">Consumo por Gato</TabsTrigger>
              </TabsList>
              
              <TabsContent value="consumo">
                <Card>
                  <CardHeader>
                     <CardTitle className="text-base">Consumo Diário (g)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-1">
                    <LineChartComponent 
                       timeSeriesData={timeSeriesData} 
                       timeDistributionData={[]}
                       catPortionData={[]} 
                       formatTooltip={formatTooltip} 
                     />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="tempo">
                <Card>
                   <CardHeader>
                      <CardTitle className="text-base">Frequência por Hora</CardTitle>
                   </CardHeader>
                   <CardContent className="p-1">
                     <BarChartComponent 
                       timeSeriesData={[]} 
                       timeDistributionData={timeDistributionData}
                       catPortionData={[]} 
                       formatTooltip={formatTooltip} 
                     />
                   </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="gatos">
                <Card>
                   <CardHeader>
                      <CardTitle className="text-base">Consumo Total por Gato (g)</CardTitle>
                   </CardHeader>
                   <CardContent className="p-1 flex justify-center">
                     <PieChartComponent 
                       timeSeriesData={[]} 
                       timeDistributionData={[]} 
                       catPortionData={catPortionData} 
                       formatTooltip={formatTooltip} 
                     />
                   </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}

