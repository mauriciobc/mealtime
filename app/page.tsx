"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cat, Clock, Utensils, BarChart3, Calendar, Users, PlusCircle, Gauge, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserContext } from "@/lib/context/UserContext";
import { useCats } from "@/lib/context/CatsContext";
import {
  useFeeding,
  useSelectTodayFeedingCount,
  useSelectLastFeedingLog,
  useSelectRecentFeedingsChartData,
  useSelectAveragePortionSize
} from "@/lib/context/FeedingContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedingLogItem } from "@/components/feeding-log-item";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "next-auth/react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { FeedingLog, CatType } from "@/lib/types";
import { NewFeedingSheet } from "@/components/new-feeding-sheet";

export default function Home() {
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState } = useFeeding();
  const { data: session, status } = useSession();
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  const { isLoading: isLoadingFeedings, error: errorFeedings } = feedingState;

  const todayFeedingCount = useSelectTodayFeedingCount();
  const recentFeedingsData = useSelectRecentFeedingsChartData();
  const lastFeedingLog = useSelectLastFeedingLog();
  const averagePortionSize = useSelectAveragePortionSize();

  const [isNewFeedingSheetOpen, setIsNewFeedingSheetOpen] = useState(false);

  const isDataLoading = isLoadingUser || isLoadingCats || isLoadingFeedings;
  const isNewUserFlow = !isDataLoading && cats && cats.length === 0 && !!currentUser?.householdId;

  const colorPalette = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(221 83% 53%)",
    "hsl(142 76% 36%)",
    "hsl(334 86% 48%)",
    "hsl(288 95.8% 60.6%)",
    "hsl(31 97.8% 58.8%)",
    "hsl(266, 100%, 60%)",
  ];

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

  if (status === "loading" || (status === "authenticated" && isDataLoading)) {
    return <Loading text="Carregando painel..." />;
  }

  const dataError = errorUser || errorCats || errorFeedings;
  if (dataError) {
    return (
      <div className="container px-4 py-8 text-center">
        <p className="text-destructive">Erro ao carregar dados: {dataError}</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Loading text="Redirecionando para login..." />;
  }
  
  if (status === "authenticated" && !currentUser?.householdId) {
    return (
       <div className="container px-4 py-8">
         <EmptyState
           icon={Users}
           title="Associe uma Residência"
           description="Você precisa criar ou juntar-se a uma residência para usar o painel."
           actionLabel="Ir para Configurações de Residência"
           actionHref="/settings/household"
           className="max-w-xl mx-auto my-12"
         />
       </div>
     );
  }

  if (isNewUserFlow) {
    return (
      <div className="container px-4 py-8">
        <EmptyState
          icon={Cat}
          title="Bem-vindo ao MealTime!"
          description="Sua residência está configurada! Cadastre seu primeiro gato para começar."
          actionLabel="Cadastrar Meu Primeiro Gato"
          actionHref="/cats/new"
           secondaryActionLabel="Ver Tutorial"
          secondaryActionOnClick={() => {
            localStorage.removeItem("onboarding-completed");
            document.body.style.overflow = "auto";
            document.body.classList.remove("overflow-hidden");
            window.location.reload();
          }}
          className="max-w-xl mx-auto my-12"
        />
      </div>
    );
  }

  const chartCats = cats || [];

  return (
    <motion.div
      className="container px-4 py-6 md:py-8 pb-28"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm text-center p-3 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-1">
              <CardDescription className="text-xs flex items-center justify-center">
                <Cat className="mr-1 h-3 w-3" />
                Total de Gatos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg font-semibold">{cats?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm text-center p-3 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-1">
              <CardDescription className="text-xs flex items-center justify-center">
                <Utensils className="mr-1 h-3 w-3" />
                Alimentações Hoje
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg font-semibold">{todayFeedingCount}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm text-center p-3 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-1">
              <CardDescription className="text-xs flex items-center justify-center">
                <Gauge className="mr-1 h-3 w-3" />
                Porção Média
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg font-semibold">
                {averagePortionSize !== null
                  ? `${averagePortionSize.toFixed(1)}g`
                  : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm text-center p-3 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 mb-1">
              <CardDescription className="text-xs flex items-center justify-center">
                <Clock className="mr-1 h-3 w-3" />
                Última Vez
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg font-semibold">
                {lastFeedingLog
                  ? format(new Date(lastFeedingLog.timestamp), "HH:mm", { locale: ptBR })
                  : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm hover:shadow-md transition-shadow" data-tour="last-feeding">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  Última Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastFeedingLog ? (
                  <FeedingLogItem log={lastFeedingLog} />
                ) : (
                  <EmptyState
                    title="Nenhuma alimentação encontrada"
                    description="Registre a primeira alimentação para vê-la aqui."
                    icon={Utensils}
                  />
                )}
              </CardContent>
              <CardFooter className="flex justify-between sm:justify-end items-center gap-2">
                <Button size="sm" onClick={() => setIsNewFeedingSheetOpen(true)} data-tour="log-feeding-button" className="flex-grow sm:flex-grow-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nova
                </Button>
                <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                  <Link href="/feedings" className="flex items-center">
                    Ver todas
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="shadow-sm hover:shadow-md transition-shadow" data-tour="feeding-chart">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  Alimentações (Últimos 7 dias)
                </CardTitle>
                <CardDescription>Total de ração (gramas) por gato por dia</CardDescription>
              </CardHeader>
              <CardContent>
                {recentFeedingsData.length > 0 && chartCats.length > 0 ? (
                  <ChartContainer config={{}} className="h-[250px] w-full">
                    <RechartsBarChart data={recentFeedingsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}g`} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      {chartCats.map((cat, index) => (
                        <Bar
                          key={cat.id}
                          dataKey={cat.name}
                          fill={colorPalette[index % colorPalette.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </RechartsBarChart>
                  </ChartContainer>
                ) : (
                  <EmptyState
                    title="Sem dados suficientes"
                    description="Registre mais alimentações ou adicione gatos para gerar o gráfico."
                    icon={BarChart3}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <motion.div variants={itemVariants}>
            <Card className="shadow-sm hover:shadow-md transition-shadow" data-tour="quick-actions">
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" asChild>
                  <Link href="/cats">
                    <Cat className="mr-2 h-4 w-4" /> Ver Gatos ({cats?.length || 0})
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/feedings">
                    <Utensils className="mr-2 h-4 w-4" /> Histórico
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/schedules">
                    <Calendar className="mr-2 h-4 w-4" /> Agendamentos
                  </Link>
                </Button>
                 <Button variant="outline" asChild>
                  <Link href="/settings/household">
                    <Users className="mr-2 h-4 w-4" /> Residência
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <NewFeedingSheet isOpen={isNewFeedingSheetOpen} onOpenChange={setIsNewFeedingSheetOpen} />

      <div className="h-28" />

    </motion.div>
  );
}