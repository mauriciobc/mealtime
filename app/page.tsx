"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Cat, Clock, Utensils, BarChart3, Calendar, Users, PlusCircle } from "lucide-react";
import { useGlobalState } from "@/lib/context/global-state";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FeedingLogItem } from "@/components/feeding-log-item";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { getCatsByHouseholdId } from "@/lib/services/apiService";
import { useSession } from "next-auth/react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FeedingDrawer } from "@/components/feeding-drawer";
import { NewFeedingSheet } from "@/components/new-feeding-sheet";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const calculateProgress = (total: number, current: number) => {
  if (total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
};

export default function Home() {
  const { state } = useGlobalState();
  const router = useRouter();
  const { data: session } = useSession();
  const [todayFeedingCount, setTodayFeedingCount] = useState(0);
  const [scheduleCompletionRate, setScheduleCompletionRate] = useState(0);
  const [recentFeedingsData, setRecentFeedingsData] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewFeedingSheetOpen, setIsNewFeedingSheetOpen] = useState(false);

  // Memoize cats and feedingLogs to prevent unnecessary re-renders
  const feedingLogsRef = useRef(state.feedingLogs);
  const catsRef = useRef(state.cats);

  // Update refs when state changes
  useEffect(() => {
    feedingLogsRef.current = state.feedingLogs;
  }, [state.feedingLogs]);

  useEffect(() => {
    catsRef.current = state.cats;
  }, [state.cats]);

  // Paleta de cores temática
  const colorPalette = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(221 83% 53%)", // azul
    "hsl(142 76% 36%)", // verde
    "hsl(334 86% 48%)", // rosa
    "hsl(288 95.8% 60.6%)", // roxo
    "hsl(31 97.8% 58.8%)", // laranja
    "hsl(266, 100%, 60%)", // violeta
  ];

  // Effect for calculating feeding data
  useEffect(() => {
    if (!feedingLogsRef.current.length) return;

    // Calcular alimentações de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = feedingLogsRef.current.filter(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
    
    setTodayFeedingCount(todayLogs.length);

    // Preparar dados para o gráfico de alimentações recentes
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const recentData = last7Days.map(date => {
      const dayLogs = feedingLogsRef.current.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === compareDate.getTime();
      });

      // Agrupar por gato
      const catData = catsRef.current.reduce((acc, cat) => {
        const catLogs = dayLogs.filter(log => log.catId === cat.id);
        const totalFood = catLogs.reduce((sum, log) => sum + (log.portionSize || 0), 0);
        return {
          ...acc,
          [cat.name]: totalFood
        };
      }, {});

      return {
        name: format(date, 'EEE', { locale: ptBR }),
        ...catData
      };
    });

    setRecentFeedingsData(recentData);
  }, []);  // Empty dependency array since we're using refs

  useEffect(() => {
    // Calcular taxa de conclusão dos agendamentos
    const totalSchedules = state.schedules.length;
    const completedSchedules = state.schedules.filter(s => s.status === "completed").length;
    setScheduleCompletionRate(calculateProgress(totalSchedules, completedSchedules));
  }, [state.schedules]);

  const dashboardItems = [
    {
      title: "Gatos",
      value: state.cats.length,
      icon: <Cat className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-500",
      href: "/cats",
      empty: state.cats.length === 0,
    },
    {
      title: "Alimentações Hoje",
      value: todayFeedingCount,
      icon: <Utensils className="h-5 w-5" />,
      color: "bg-emerald-100 text-emerald-500",
      href: "/feedings",
      empty: todayFeedingCount === 0,
    },
    {
      title: "Agendamentos",
      value: state.schedules.length,
      icon: <Calendar className="h-5 w-5" />,
      color: "bg-amber-100 text-amber-500",
      href: "/schedules",
      empty: state.schedules.length === 0,
    },
    {
      title: "Residências",
      value: state.households.length,
      icon: <Users className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-500",
      href: "/households",
      empty: state.households.length === 0,
    },
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

  const getLastFeedingLog = () => {
    if (state.feedingLogs.length === 0) return null;
    
    const lastLog = state.feedingLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    const cat = state.cats.find(cat => cat.id === lastLog.catId);
    
    return {
      ...lastLog,
      cat: cat ? {
        id: cat.id,
        name: cat.name,
        photoUrl: cat.photoUrl,
        householdId: cat.householdId,
        feeding_interval: cat.feeding_interval
      } : undefined
    };
  };

  const lastFeedingLog = getLastFeedingLog();

  const isNewUser = state.cats.length === 0 && state.feedingLogs.length === 0;

  if (isNewUser) {
    return (
      <div className="container px-4 py-8">
        <EmptyState
          icon={Cat}
          title="Bem-vindo ao MealTime!"
          description="Para começar, cadastre seu primeiro gato e comece a registrar as alimentações."
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

  return (
    <div className="container px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold mb-6">Painel de Controle</h1>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardItems.map((item) => (
            <Link href={item.href} key={item.title} className="block">
              <Card className="h-full hover:shadow-md transition-all duration-300">
                <CardHeader className="py-4 px-5">
                  <div className={`p-2 rounded-full w-fit ${item.color}`}>
                    {item.icon}
                  </div>
                </CardHeader>
                <CardContent className="py-0 px-5">
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <h3 className="text-2xl font-bold">{item.value}</h3>
                </CardContent>
                <CardFooter className="py-4 px-5">
                  <p className="text-xs text-muted-foreground">
                    {item.empty ? "Nenhum registro ainda" : "Ver detalhes →"}
                  </p>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Última Alimentação</CardTitle>
                  <CardDescription>
                    Detalhes da última alimentação registrada
                  </CardDescription>
                </div>
                <Button onClick={() => setIsNewFeedingSheetOpen(true)}>
                  Alimentar agora
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lastFeedingLog ? (
                <div onClick={() => setIsDrawerOpen(true)} className="cursor-pointer">
                  <FeedingLogItem
                    log={{
                      ...lastFeedingLog,
                      createdAt: lastFeedingLog.timestamp,
                      cat: lastFeedingLog.cat ? {
                        ...lastFeedingLog.cat,
                        householdId: lastFeedingLog.cat.householdId || 0,
                        feeding_interval: lastFeedingLog.cat.feeding_interval || 0
                      } : undefined,
                      user: lastFeedingLog.user ? {
                        id: lastFeedingLog.user.id,
                        name: lastFeedingLog.user.name,
                        email: lastFeedingLog.user.email,
                        avatar: lastFeedingLog.user.avatar,
                        householdId: lastFeedingLog.user.households?.[0] ? parseInt(lastFeedingLog.user.households[0]) : null,
                        preferences: {
                          timezone: "America/Sao_Paulo",
                          language: "pt-BR",
                          notifications: {
                            pushEnabled: true,
                            emailEnabled: true,
                            feedingReminders: true,
                            missedFeedingAlerts: true,
                            householdUpdates: true
                          }
                        },
                        role: lastFeedingLog.user.role || "user"
                      } : undefined
                    }}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : (
                <EmptyState
                  icon={Utensils}
                  title="Nenhuma alimentação registrada"
                  description="Registre a primeira alimentação do seu gato para começar a acompanhar."
                  actionLabel="Registrar Alimentação"
                  actionHref="/feedings/new"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <FeedingDrawer
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          feedingLog={lastFeedingLog}
        />

        <NewFeedingSheet
          isOpen={isNewFeedingSheetOpen}
          onOpenChange={setIsNewFeedingSheetOpen}
        />

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Alimentação</CardTitle>
              <CardDescription>
                Acompanhe padrões e dados sobre a alimentação dos seus gatos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full h-[240px]">
                {recentFeedingsData.length > 0 ? (
                  <ChartContainer
                    config={state.cats.reduce((acc, cat, index) => ({
                      ...acc,
                      [cat.name]: {
                        label: cat.name,
                        theme: {
                          light: colorPalette[index % colorPalette.length],
                          dark: colorPalette[index % colorPalette.length],
                        },
                      },
                    }), {})}
                  >
                    <div className="absolute inset-0 px-6">
                      <ResponsiveContainer>
                        <RechartsBarChart 
                          data={recentFeedingsData}
                          margin={{ top: 24, right: 24, left: 24, bottom: 24 }}
                          barCategoryGap={40}
                          barGap={8}
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
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="flex flex-col gap-1">
                                    {payload.map((entry, index) => (
                                      <div key={index} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: entry.color }}
                                          />
                                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                                            {entry.name}
                                          </span>
                                        </div>
                                        <span className="font-bold text-muted-foreground">
                                          {entry.value}g
                                        </span>
                                      </div>
                                    ))}
                                    <div className="mt-1 pt-1 border-t border-border">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                          Total
                                        </span>
                                        <span className="font-bold">
                                          {total}g
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                            cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
                          />
                          {state.cats.map((cat, index) => (
                            <Bar 
                              key={cat.id}
                              dataKey={cat.name}
                              stackId="a"
                              radius={index === state.cats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              maxBarSize={32}
                              fill={colorPalette[index % colorPalette.length]}
                            />
                          ))}
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Sem dados para exibir</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/statistics">
                  Ver Estatísticas Completas
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
} 