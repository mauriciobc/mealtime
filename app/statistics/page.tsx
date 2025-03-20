"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, ChevronDown, TrendingUp, AlertTriangle, BarChart3, LineChart, PieChart, Filter, Calendar, PlusCircle } from "lucide-react"
import { useAppContext } from "@/lib/context/AppContext"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, Pie, Cell, Legend } from "recharts"
import { getFeedingStatistics } from "@/lib/services/statistics-service"
import { DataTableSkeleton } from "@/components/skeletons/data-table-skeleton"
import NoDataMessage from "@/components/no-data-message"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { motion } from "framer-motion"
import Link from "next/link"
import { useGlobalState } from "@/lib/context/global-state"

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
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={timeSeriesData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={formatTooltip} />
        <Line type="monotone" dataKey="valor" stroke="#8884d8" />
      </RechartsBarChart>
    </ResponsiveContainer>
  </div>
)

const BarChartComponent = ({ timeDistributionData }: ChartProps) => (
  <div className="h-[300px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={timeDistributionData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="valor" fill="#8884d8" />
      </RechartsBarChart>
    </ResponsiveContainer>
  </div>
)

const PieChartComponent = ({ catPortionData }: ChartProps) => (
  <div className="h-[300px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart>
        <Pie
          data={catPortionData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
        >
          {catPortionData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsBarChart>
    </ResponsiveContainer>
  </div>
)

export default function StatisticsPage() {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
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

  // Carregar dados de alimentação quando a página for montada
  useEffect(() => {
    const fetchFeedingLogs = async () => {
      try {
        const response = await fetch('/api/feedings')
        const data = await response.json()
        
        dispatch({
          type: "SET_FEEDING_LOGS",
          payload: data
        })
      } catch (error) {
        console.error("Erro ao carregar registros de alimentação:", error)
        toast.error("Não foi possível carregar os registros de alimentação")
      }
    }

    fetchFeedingLogs()
  }, [dispatch])
  
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        
        // Em produção, seria uma chamada à API real
        const result = await getFeedingStatistics(selectedPeriod, selectedCat)
        
        // Aqui usamos dados mockados enquanto não temos a API
        if (state.feedingLogs.length > 0) {
          // Filtrar por período
          const now = new Date()
          let startDate = new Date()
          
          switch (selectedPeriod) {
            case "7dias":
              startDate = subDays(now, 7)
              break
            case "30dias":
              startDate = subDays(now, 30)
              break
            case "3meses":
              startDate = subMonths(now, 3)
              break
            default:
              startDate = subDays(now, 7)
          }
          
          // Mapear os feedingLogs para o formato que precisamos
          let filteredData = state.feedingLogs.map(log => ({
            id: log.id,
            catId: log.catId,
            catName: state.cats.find(cat => cat.id === log.catId)?.name || "Desconhecido",
            timestamp: new Date(log.timestamp),
            portionSize: log.portionSize || 0
          })).filter(log => new Date(log.timestamp) >= startDate)
          
          // Filtrar por gato, se necessário
          if (selectedCat !== "all") {
            filteredData = filteredData.filter(log => log.catId === parseInt(selectedCat))
          }
          
          setFeedingData(filteredData)
          
          // Gerar dados para o gráfico de linha (tempo x porção)
          const timeSeriesMap = new Map<string, number>()
          
          filteredData.forEach(log => {
            const dateKey = format(new Date(log.timestamp), "dd/MM")
            const currentValue = timeSeriesMap.get(dateKey) || 0
            timeSeriesMap.set(dateKey, currentValue + (log.portionSize || 0))
          })
          
          const timeSeriesDataArray = Array.from(timeSeriesMap).map(([name, value]) => ({
            name,
            valor: value
          }))
          
          setTimeSeriesData(timeSeriesDataArray)
          
          // Gerar dados para o gráfico de pizza (porção por gato)
          const catPortionMap = new Map<string, number>()
          
          filteredData.forEach(log => {
            const currentValue = catPortionMap.get(log.catName) || 0
            catPortionMap.set(log.catName, currentValue + (log.portionSize || 0))
          })
          
          const catPortionDataArray = Array.from(catPortionMap).map(([name, value]) => ({
            name,
            value
          }))
          
          setCatPortionData(catPortionDataArray)
          
          // Gerar dados para distribuição de horários
          const hourDistribution = new Map<string, number>()
          
          filteredData.forEach(log => {
            const hourKey = format(new Date(log.timestamp), "HH:00")
            const currentCount = hourDistribution.get(hourKey) || 0
            hourDistribution.set(hourKey, currentCount + 1)
          })
          
          const timeDistributionArray = Array.from(hourDistribution).map(([name, value]) => ({
            name,
            valor: value
          })).sort((a, b) => {
            // Ordenar por hora do dia
            const hourA = parseInt(a.name.split(':')[0])
            const hourB = parseInt(b.name.split(':')[0])
            return hourA - hourB
          })
          
          setTimeDistributionData(timeDistributionArray)
          
          // Calcular estatísticas resumidas
          const totalFeedings = filteredData.length
          const validPortions = filteredData.filter(log => log.portionSize !== null && log.portionSize > 0)
          const averagePortionSize = validPortions.length > 0 
            ? validPortions.reduce((sum, log) => sum + (log.portionSize || 0), 0) / validPortions.length
            : 0
            
          // Em um sistema real, buscaríamos esses dados de uma API
          const maxConsecutiveDays = 5 // Exemplo
          const missedSchedules = 2 // Exemplo
          
          setStatsSummary({
            totalFeedings,
            averagePortionSize,
            maxConsecutiveDays,
            missedSchedules
          })
        }
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error)
        toast.error("Não foi possível carregar as estatísticas")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [selectedPeriod, selectedCat, state.feedingLogs, state.cats, dispatch])
  
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

  if (isLoading) {
    return <Loading text="Carregando estatísticas..." />;
  }

  // Verificar se há dados suficientes para exibir estatísticas
  const hasFeedingData = state.feedingLogs.length > 0;

  if (!hasFeedingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Estatísticas"
          description="Análise dos padrões de alimentação dos seus gatos"
          icon={<BarChart3 className="h-6 w-6" />}
        />

        <EmptyState
          icon={BarChart3}
          title="Sem dados suficientes"
          description={
            state.cats.length === 0
              ? "Cadastre seus gatos primeiro e registre alimentações para visualizar estatísticas."
              : "Registre algumas alimentações para começar a visualizar estatísticas e análises."
          }
          actionLabel={
            state.cats.length === 0
              ? "Cadastrar Gato"
              : "Registrar Alimentação"
          }
          actionHref={state.cats.length === 0 ? "/cats/new" : "/feedings/new"}
          variant="default"
        />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
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
          
          {isLoading ? (
            <DataTableSkeleton />
          ) : feedingData.length === 0 ? (
            <NoDataMessage
              title="Sem dados de alimentação"
              description="Não há registros de alimentação para o período e filtros selecionados."
              actionLabel="Registrar alimentação"
              actionHref="/feedings/new"
            />
          ) : (
            <>
              {/* Cards de Resumo */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total de Alimentações</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{statsSummary.totalFeedings}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Porção Média</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{formatNumber(statsSummary.averagePortionSize)} g</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Máx. Dias Consecutivos</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{statsSummary.maxConsecutiveDays}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Alimentações Perdidas</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{statsSummary.missedSchedules}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <Tabs defaultValue="consumo" className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <TabsList>
                        <TabsTrigger value="consumo">Consumo</TabsTrigger>
                        <TabsTrigger value="tempo">Horários</TabsTrigger>
                        <TabsTrigger value="gatos">Por Gato</TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <TabsContent value="consumo">
                      <Card>
                        <CardHeader>
                          <CardTitle>Consumo Diário de Alimento</CardTitle>
                          <CardDescription>Quantidade total consumida por dia (em gramas)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-1 h-[300px]">
                          <LineChartComponent 
                            timeSeriesData={timeSeriesData}
                            timeDistributionData={timeDistributionData}
                            catPortionData={catPortionData}
                            formatTooltip={formatTooltip}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="tempo">
                      <Card>
                        <CardHeader>
                          <CardTitle>Distribuição de Horários</CardTitle>
                          <CardDescription>Frequência de alimentações por hora do dia</CardDescription>
                        </CardHeader>
                        <CardContent className="p-1 h-[300px]">
                          <BarChartComponent 
                            timeSeriesData={timeSeriesData}
                            timeDistributionData={timeDistributionData}
                            catPortionData={catPortionData}
                            formatTooltip={formatTooltip}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="gatos">
                      <Card>
                        <CardHeader>
                          <CardTitle>Consumo por Gato</CardTitle>
                          <CardDescription>Quantidade total consumida por cada gato</CardDescription>
                        </CardHeader>
                        <CardContent className="p-1 h-[300px]">
                          <PieChartComponent 
                            timeSeriesData={timeSeriesData}
                            timeDistributionData={timeDistributionData}
                            catPortionData={catPortionData}
                            formatTooltip={formatTooltip}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </motion.div>
            </>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
}

