"use client";

import { useEffect, useState } from "react";
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
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const calculateProgress = (total: number, current: number) => {
  if (total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
};

export default function Home() {
  const { state, dispatch } = useGlobalState();
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [todayFeedingCount, setTodayFeedingCount] = useState(0);
  const [scheduleCompletionRate, setScheduleCompletionRate] = useState(0);
  const [recentFeedingsData, setRecentFeedingsData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Carregar gatos do domicílio ativo do usuário, se existir
      if (session?.user && state.households.length > 0) {
        const activeHousehold = state.households[0]; // Assumindo que o primeiro domicílio é o ativo
        
        try {
          const cats = await getCatsByHouseholdId(activeHousehold.id);
          if (cats && cats.length > 0) {
            dispatch({
              type: "SET_CATS",
              payload: cats,
            });
          }

          // Carregar logs de alimentação
          const response = await fetch('/api/feedings');
          console.log("Resposta da API de alimentações:", response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log("Dados recebidos da API:", data);
            
            dispatch({
              type: "SET_FEEDING_LOGS",
              payload: data
            });

            // Calcular alimentações de hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayLogs = data.filter(log => {
              const logDate = new Date(log.timestamp);
              logDate.setHours(0, 0, 0, 0);
              return logDate.getTime() === today.getTime();
            });
            
            console.log("Logs de hoje:", todayLogs);
            setTodayFeedingCount(todayLogs.length);

            // Preparar dados para o gráfico de alimentações recentes
            const last7Days = Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - i);
              return date;
            }).reverse();

            console.log("Últimos 7 dias:", last7Days.map(d => format(d, 'dd/MM/yyyy')));

            const recentData = last7Days.map(date => {
              const dayLogs = data.filter(log => {
                const logDate = new Date(log.timestamp);
                logDate.setHours(0, 0, 0, 0);
                const compareDate = new Date(date);
                compareDate.setHours(0, 0, 0, 0);
                
                console.log(`Comparando datas:
                  Log: ${format(logDate, 'dd/MM/yyyy HH:mm:ss')}
                  Dia: ${format(compareDate, 'dd/MM/yyyy')}
                  Match: ${logDate.getTime() === compareDate.getTime()}
                `);
                
                return logDate.getTime() === compareDate.getTime();
              });

              console.log(`Logs do dia ${format(date, 'dd/MM/yyyy')}:`, dayLogs);

              // Calcular a quantidade total de alimento para o dia
              const totalFood = dayLogs.reduce((sum, log) => {
                console.log(`Porção do log:`, log.portionSize);
                return sum + (log.portionSize || 0);
              }, 0);

              const dataPoint = {
                name: format(date, 'EEE', { locale: ptBR }),
                valor: totalFood
              };

              console.log(`Ponto de dados para ${format(date, 'dd/MM/yyyy')}:`, dataPoint);
              return dataPoint;
            });

            console.log("Dados finais do gráfico:", recentData);
            setRecentFeedingsData(recentData);
          } else {
            console.error("Erro na resposta da API:", response.statusText);
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
        }
      }
      
      // Calcular taxa de conclusão dos agendamentos
      const totalSchedules = state.schedules.length;
      const completedSchedules = state.schedules.filter(s => s.status === "completed").length;
      
      setScheduleCompletionRate(calculateProgress(totalSchedules, completedSchedules));
      setIsLoading(false);
    };
    
    loadData();
  }, [state.households, session, dispatch]);

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
    
    // Ordenar por data mais recente
    return state.feedingLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  };

  const lastFeedingLog = getLastFeedingLog();

  if (isLoading) {
    return <Loading text="Carregando seu painel..." />;
  }

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
            // Mostrar tour de onboarding
            localStorage.removeItem("onboarding-completed");
            // Limpar quaisquer flags que possam estar causando problemas de sobreposição
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
              <CardTitle>Progresso dos Agendamentos</CardTitle>
              <CardDescription>
                Taxa de conclusão dos agendamentos de alimentação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Concluídos</span>
                  <span className="text-sm text-muted-foreground">{scheduleCompletionRate}%</span>
                </div>
                <Progress value={scheduleCompletionRate} className="h-2" />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/schedules" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Ver Agendamentos</span>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Última Alimentação</h2>
            <Button size="sm" variant="outline" asChild>
              <Link href="/feedings/new" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Nova Alimentação</span>
              </Link>
            </Button>
          </div>

          {lastFeedingLog ? (
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
              onView={() => router.push(`/feedings/${lastFeedingLog.id}`)}
              onEdit={() => router.push(`/feedings/${lastFeedingLog.id}/edit`)}
              onDelete={() => {
                // Função para excluir o registro
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-6">
                <EmptyState
                  icon={Utensils}
                  title="Sem registros de alimentação"
                  description="Você ainda não registrou nenhuma alimentação."
                  actionLabel="Registrar Alimentação"
                  actionHref="/feedings/new"
                  variant="feeding"
                  className="py-6"
                />
              </CardContent>
            </Card>
          )}
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Alimentação</CardTitle>
              <CardDescription>
                Acompanhe padrões e dados sobre a alimentação dos seus gatos
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="h-48 w-full">
                {recentFeedingsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={recentFeedingsData}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        hide={true}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'transparent',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        formatter={(value) => [`${value}g de alimento`, '']}
                      />
                      <Bar 
                        dataKey="valor" 
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
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