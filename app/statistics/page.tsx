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
import { CalendarIcon, ChevronDown, TrendingUp, AlertTriangle, BarChart3, PieChart, Filter, Calendar, PlusCircle } from "lucide-react"
import { useAppContext } from "@/lib/context/AppContext"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts"
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
      <RechartsLineChart data={timeSeriesData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={formatTooltip} />
        <Line type="monotone" dataKey="valor" stroke="#8884d8" />
      </RechartsLineChart>
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

const PieChartComponent = ({ catPortionData, formatTooltip }: ChartProps) => {
  console.log("PieChartComponent - catPortionData:", catPortionData);
  
  if (!catPortionData || catPortionData.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className="relative h-[300px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={catPortionData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label={(entry) => `${entry.name}: ${entry.value}g`}
          >
            {catPortionData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
          <Tooltip 
            formatter={(value) => `${value} g`}
            labelStyle={{ color: '#666' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatisticsPage() {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const { data: session } = useSession()
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
    const fetchData = async () => {
      if (!session?.user?.householdId) {
        console.log("Usuário não tem residência");
        toast.error("Você precisa estar associado a uma residência para ver estatísticas");
        router.push("/households");
        return;
      }
      
      setIsLoading(true);
      try {
        console.log("Buscando estatísticas...");
        const response = await fetch(`/api/statistics?period=${selectedPeriod}&catId=${selectedCat}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Falha ao buscar estatísticas');
        }

        const stats = await response.json();
        console.log("Estatísticas recebidas:", stats);
        console.log("Dados por gato:", stats.catPortionData);
        
        setStatsSummary({
          totalFeedings: stats.totalFeedings,
          averagePortionSize: stats.averagePortionSize,
          maxConsecutiveDays: stats.maxConsecutiveDays,
          missedSchedules: stats.missedSchedules,
        });
        
        setTimeSeriesData(stats.timeSeriesData);
        setCatPortionData(stats.catPortionData);
        setTimeDistributionData(stats.timeDistributionData);
        setFeedingData(stats.feedingLogs || []);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        toast.error("Não foi possível carregar as estatísticas");
      }
      setIsLoading(false);
    };

    fetchData();
  }, [session?.user?.householdId, selectedPeriod, selectedCat, router]);
  
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
  const hasFeedingData = feedingData.length > 0;

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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
              >
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total de Alimentações</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{statsSummary.totalFeedings}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Porção Média</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{formatNumber(statsSummary.averagePortionSize)} g</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Máx. Dias Consecutivos</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{statsSummary.maxConsecutiveDays}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="py-4 px-5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Alimentações Perdidas</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-5">
                      <p className="text-2xl font-bold">{statsSummary.missedSchedules}</p>
                    </CardContent>
                  </Card>
                </motion.div>
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
                        {catPortionData && catPortionData.length > 0 ? (
                          <PieChartComponent 
                            timeSeriesData={timeSeriesData}
                            timeDistributionData={timeDistributionData}
                            catPortionData={catPortionData}
                            formatTooltip={formatTooltip}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-muted-foreground">Sem dados para exibir</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

