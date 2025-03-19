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

const calculateProgress = (total: number, current: number) => {
  if (total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
};

export default function Home() {
  const { state } = useGlobalState();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [todayFeedingCount, setTodayFeedingCount] = useState(0);
  const [scheduleCompletionRate, setScheduleCompletionRate] = useState(0);

  useEffect(() => {
    // Simulando carregamento de dados
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Calcular alimentações de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayLogs = state.feedingLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });
      
      setTodayFeedingCount(todayLogs.length);
      
      // Calcular taxa de conclusão dos agendamentos
      const totalSchedules = state.schedules.length;
      const completedSchedules = state.schedules.filter(s => s.status === "completed").length;
      
      setScheduleCompletionRate(calculateProgress(totalSchedules, completedSchedules));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [state.feedingLogs, state.schedules]);

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
              log={lastFeedingLog}
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
              <div className="flex items-center justify-center h-48 bg-muted/30 rounded-md">
                <BarChart3 className="h-16 w-16 text-muted" />
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