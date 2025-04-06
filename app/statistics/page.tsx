"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, getHours } from "date-fns"
import { ptBR } from "date-fns/locale"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, ChevronDown, TrendingUp, AlertTriangle, BarChart3, PieChart, Filter, Calendar, PlusCircle, Users, Utensils, Scale, CalendarCheck } from "lucide-react"
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { motion } from "framer-motion"
import Link from "next/link"
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { useSession } from "next-auth/react"
import { StatCard } from "@/components/ui/stat-card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { FeedingLog, CatType } from "@/lib/types";

interface FeedingData extends FeedingLog {
  catName?: string
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
}

interface StatisticsData {
  totalFeedings: number
  averagePortionSize: number
  timeSeriesData: TimeSeriesDataPoint[]
  catPortionData: CatPortion[]
  timeDistributionData: TimeSeriesDataPoint[]
}

interface ChartProps {
  data: any[];
  config?: any;
  dataKey?: string;
  nameKey?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const LineChartComponent = ({ data }: { data: TimeSeriesDataPoint[] }) => (
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
          />
          <ChartTooltip 
            cursor={{ stroke: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
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

const BarChartComponent = ({ data }: { data: TimeSeriesDataPoint[] }) => (
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

const PieChartComponent = ({ data }: { data: CatPortion[] }) => {
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
      }
    },
  }), {});

  return (
    <div className="relative w-full" style={{ minHeight: '300px' }}>
      <ChartContainer config={config} className="absolute inset-0">
        <ResponsiveContainer>
          <RechartsPieChart 
            margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
          >
            <ChartTooltip />
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
          </RechartsPieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs pb-2">
        <ChartLegend />
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const router = useRouter()
  const { state: appState } = useAppContext()
  const { state: userState } = useUserContext()
  const { data: session, status } = useSession()
  const { currentUser } = userState
  const { cats, feedingLogs } = appState

  const [selectedPeriod, setSelectedPeriod] = useState("7dias")
  const [selectedCatId, setSelectedCatId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('Debug - Loading States:', {
    sessionStatus: status,
    hasCurrentUser: !!currentUser,
    hasCats: !!cats,
    hasFeedingLogs: !!feedingLogs,
    isLoading
  })

  // Reset loading state when data becomes available
  useEffect(() => {
    if (status === 'authenticated' && currentUser && cats && feedingLogs) {
      setIsLoading(false)
    }
  }, [status, currentUser, cats, feedingLogs])

  const processedData = useMemo(() => {
    if (status === "loading" || !currentUser || !cats || !feedingLogs) {
      return null
    }

    try {
      const now = new Date()
      let startDate: Date
      let endDate = endOfDay(now)

      switch (selectedPeriod) {
        case "hoje":
          startDate = startOfDay(now)
          break
        case "7dias":
          startDate = startOfDay(subDays(now, 6))
          break
        case "30dias":
          startDate = startOfDay(subDays(now, 29))
          break
        case "mesAtual":
          startDate = startOfMonth(now)
          break
        case "mesPassado":
          const lastMonth = subMonths(now, 1)
          startDate = startOfMonth(lastMonth)
          endDate = endOfMonth(lastMonth)
          break
        default:
          startDate = startOfDay(subDays(now, 6))
      }

      const filteredLogs = feedingLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        return logDate >= startDate && logDate <= endDate && 
               (selectedCatId === "all" || String(log.catId) === selectedCatId)
      })
      
      console.log('Filtered Logs:', filteredLogs.length, 'Start Date:', startDate, 'End Date:', endDate)
      
      if (filteredLogs.length === 0) {
        setError(`Nenhum registro encontrado para ${selectedCatId !== 'all' ? cats.find(c=>String(c.id) === selectedCatId)?.name || 'gato selecionado' : 'todos os gatos'} no período selecionado.`)
        return null
      }

      const totalFeedings = filteredLogs.length
      const totalPortion = filteredLogs.reduce((sum, log) => sum + (log.portionSize || 0), 0)
      const averagePortionSize = totalFeedings > 0 ? Math.round(totalPortion / totalFeedings) : 0

      // Time series data processing
      const timeSeriesMap = new Map<string, number>()
      let currentDate = new Date(startDate)
      
      // Initialize all dates in the range with 0
      while (currentDate <= endDate) {
        const dateString = format(currentDate, 'dd/MM')
        timeSeriesMap.set(dateString, 0)
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Sum up portions for each date
      filteredLogs.forEach(log => {
        const dateString = format(new Date(log.timestamp), 'dd/MM')
        const currentValue = timeSeriesMap.get(dateString) || 0
        timeSeriesMap.set(dateString, currentValue + (log.portionSize || 0))
      })

      const timeSeriesData = Array.from(timeSeriesMap.entries())
        .map(([name, valor]) => ({ name, valor }))
        .sort((a, b) => {
          const [dayA, monthA] = a.name.split('/').map(Number)
          const [dayB, monthB] = b.name.split('/').map(Number)
          return monthA === monthB ? dayA - dayB : monthA - monthB
        })

      // Cat portion data processing
      const catPortionMap = new Map<string, number>()
      cats.forEach(cat => catPortionMap.set(cat.name, 0)) // Initialize all cats with 0
      
      filteredLogs.forEach(log => {
        const cat = cats.find(c => c.id === log.catId)
        if (cat) {
          const currentTotal = catPortionMap.get(cat.name) || 0
          catPortionMap.set(cat.name, currentTotal + (log.portionSize || 0))
        }
      })

      const catPortionData = Array.from(catPortionMap.entries())
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))

      // Time distribution data processing
      const timeDistributionMap = new Map<string, number>()
      for (let i = 0; i < 24; i++) {
        timeDistributionMap.set(`${i.toString().padStart(2, '0')}:00`, 0)
      }
      
      filteredLogs.forEach(log => {
        const hour = getHours(new Date(log.timestamp))
        const hourString = `${hour.toString().padStart(2, '0')}:00`
        const currentCount = timeDistributionMap.get(hourString) || 0
        timeDistributionMap.set(hourString, currentCount + 1)
      })

      const timeDistributionData = Array.from(timeDistributionMap.entries())
        .map(([name, valor]) => ({ name, valor }))

      setError(null)
      return {
        totalFeedings,
        averagePortionSize,
        timeSeriesData,
        catPortionData,
        timeDistributionData,
      }
    } catch (e: any) {
      console.error("Error processing statistics:", e)
      setError(e.message || "Erro ao processar estatísticas.")
      return null
    }
  }, [selectedPeriod, selectedCatId, feedingLogs, cats, currentUser, status])

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

  if (!currentUser.householdId) {
      return (
        <PageTransition>
          <PageHeader title="Estatísticas" actionHref="/" />
          <div className="container mx-auto p-4">
            <EmptyState
              icon={Users}
              title="Residência Necessária"
              description="Associe ou crie uma residência para ver as estatísticas."
              actionLabel="Ir para Configurações"
              actionHref="/settings"
              className="mt-6"
            />
          </div>
        </PageTransition>
      )
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

  if (isLoading) {
      return (
         <PageTransition>
            <PageHeader title="Estatísticas" actionHref="/" />
            <div className="container mx-auto p-4">
               <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Skeleton className="h-10 w-full sm:w-48" />
                  <Skeleton className="h-10 w-full sm:w-48" />
               </div>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                   <Skeleton className="h-24" />
                   <Skeleton className="h-24" />
                   <Skeleton className="h-24" />
                   <Skeleton className="h-24" />
               </div>
               <Card>
                 <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                 <CardContent>
                   <Skeleton className="h-[300px] w-full" />
                 </CardContent>
               </Card>
            </div>
         </PageTransition>
       )
  }

  if (error) {
    return (
      <PageTransition>
        <PageHeader title="Estatísticas" actionHref="/" />
        <div className="container mx-auto p-4">
           <div className="flex flex-col sm:flex-row gap-4 mb-6">
             <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
               <SelectTrigger className="w-full sm:w-[180px]">
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
           <EmptyState
             icon={AlertTriangle}
             title="Sem Dados ou Erro"
             description={error}
             actionLabel="Limpar Filtros"
             actionOnClick={() => { setSelectedPeriod("7dias"); setSelectedCatId("all"); }}
             className="mt-6"
           />
        </div>
      </PageTransition>
    )
  }
  
  if (!processedData) {
      return (
          <PageTransition>
             <PageHeader title="Estatísticas" actionHref="/" />
             <div className="container mx-auto p-4">
                 <Loading text="Preparando dados..." />
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
              {cats.map(cat => (
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
            value={processedData.totalFeedings.toString()} 
            icon={<Utensils className="h-4 w-4" />} 
            description={`No período selecionado`}
          />
          <StatCard 
            title="Média por Alimentação" 
            value={`${processedData.averagePortionSize} g`} 
            icon={<Scale className="h-4 w-4" />} 
            description={`Média de ração por vez`}
          />
          <StatCard 
            title="Gatos Ativos" 
            value={selectedCatId === 'all' ? cats.length.toString() : '1'} 
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
              <LineChartComponent data={processedData.timeSeriesData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Distribuição por Gato (%)</CardTitle>
              <CardDescription>Percentual do consumo total por gato.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex justify-center">
              <PieChartComponent data={processedData.catPortionData} />
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
                      data={processedData.timeDistributionData}
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
                        tickFormatter={(value) => `${value}g`}
                        width={45}
                        tickMargin={8}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent hideLabel />}
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