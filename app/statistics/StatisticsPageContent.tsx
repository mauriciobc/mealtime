"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/ui/page-transition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, BarChart3, Users, Utensils, Scale, Calendar, Filter } from "lucide-react"
import { useUserContext } from "@/lib/context/UserContext"
import { useSelectFeedingStatistics } from "@/lib/selectors/statisticsSelectors"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { m } from "framer-motion"
import Link from "next/link"
import { StatCard } from "@/components/ui/stat-card"
import { StatisticsData, TimeSeriesDataPoint, CatPortion } from "@/lib/selectors/statisticsSelectors"
import { useStatistics } from "@/lib/hooks/useStatistics"
import { 
  resolveDateFnsLocale,
  getDateRange,
  type PeriodType
} from "@/lib/utils/date"

const chartLoading = () => (
  <div className="relative w-full aspect-[16/9] animate-pulse rounded-md bg-muted/40" />
)

const LineChartComponent = dynamic(
  () => import("./statistics-chart-components").then((m) => m.LineChartComponent),
  { ssr: false, loading: chartLoading }
)
const BarChartComponent = dynamic(
  () => import("./statistics-chart-components").then((m) => m.BarChartComponent),
  { ssr: false, loading: chartLoading }
)
const PieChartComponent = dynamic(
  () => import("./statistics-chart-components").then((m) => m.PieChartComponent),
  { ssr: false, loading: chartLoading }
)
const HourDistributionChart = dynamic(
  () => import("./statistics-chart-components").then((m) => m.HourDistributionChart),
  { ssr: false, loading: chartLoading }
)

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

interface StatisticsPageContentProps {
  initialPeriod: string;
  initialCatId: string;
}

export default function StatisticsPageContent({
  initialPeriod,
  initialCatId,
}: StatisticsPageContentProps) {
  return (
    <StatisticsPageInner
      initialPeriod={initialPeriod}
      initialCatId={initialCatId}
    />
  );
}

function StatisticsPageInner({
  initialPeriod,
  initialCatId,
}: StatisticsPageContentProps) {
  const router = useRouter()
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

  const selectedPeriod = initialPeriod
  const selectedCatId = initialCatId

  const handlePeriodChange = useCallback((period: string) => {
    const params = new URLSearchParams();
    params.set('period', period);
    params.set('catId', selectedCatId);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, selectedCatId]);

  const handleCatChange = useCallback((catId: string) => {
    const params = new URLSearchParams();
    params.set('catId', catId);
    params.set('period', selectedPeriod);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, selectedPeriod]);

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
            <m.div 
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
            </m.div>

            {/* Gráficos */}
            <m.div
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
                  <HourDistributionChart data={pageState.data.timeDistributionData || []} />
                </CardContent>
              </Card>
            </m.div>
          </div>
        </PageTransition>
      );
  }
}
