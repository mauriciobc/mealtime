"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Cat, Clock, Utensils, BarChart3, Calendar, Users, PlusCircle } from "lucide-react";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedingLogItem } from "@/components/feeding-log-item";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "next-auth/react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FeedingDrawer } from "@/components/feeding-drawer";
import { NewFeedingSheet } from "@/components/new-feeding-sheet";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { FeedingLog, CatType } from "@/lib/types";

export default function Home() {
  const { state: appState } = useAppContext();
  const { state: userState } = useUserContext();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentUser } = userState;
  const { cats, feedingLogs } = appState;

  const [todayFeedingCount, setTodayFeedingCount] = useState(0);
  const [recentFeedingsData, setRecentFeedingsData] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewFeedingSheetOpen, setIsNewFeedingSheetOpen] = useState(false);

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

  useEffect(() => {
    if (status !== "authenticated" || !currentUser || !currentUser.householdId) {
      return;
    }
    if (!feedingLogs || feedingLogs.length === 0) {
        setTodayFeedingCount(0);
        setRecentFeedingsData([]);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = feedingLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
    
    setTodayFeedingCount(todayLogs.length);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    const currentCats = cats || [];

    const recentData = last7Days.map(date => {
      const dayLogs = feedingLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === compareDate.getTime();
      });

      const catData = currentCats.reduce((acc, cat) => {
        const catLogs = dayLogs.filter(log => log.catId === cat.id);
        const totalFood = catLogs.reduce((sum, log) => sum + (log.portionSize || 0), 0);
        return {
          ...acc,
          [cat.name]: totalFood
        };
      }, {} as Record<string, number>);

      return {
        name: format(date, 'EEE', { locale: ptBR }),
        ...catData
      };
    });

    setRecentFeedingsData(recentData);
  }, [status, currentUser, feedingLogs, cats]);

  const getLastFeedingLog = () => {
    if (!currentUser?.householdId || !feedingLogs || feedingLogs.length === 0) {
      console.log("Early return conditions:", {
        noCurrentUser: !currentUser?.householdId,
        noFeedingLogs: !feedingLogs,
        emptyFeedingLogs: feedingLogs?.length === 0
      });
      return null;
    }

    const sortedLogs = [...feedingLogs].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if(sortedLogs.length === 0) {
      console.log("No sorted logs found");
      return null;
    }
    const lastLog = sortedLogs[0];
    console.log("Last log found:", lastLog);

    const cat = cats?.find(cat => cat.id === lastLog.catId);
    console.log("Found cat:", cat);
    
    if (!cat) {
      console.log("No cat found for id:", lastLog.catId);
      return null;
    }

    const feedingLog: FeedingLog = {
      id: lastLog.id,
      catId: lastLog.catId,
      userId: lastLog.userId,
      timestamp: new Date(lastLog.timestamp),
      portionSize: lastLog.portionSize,
      notes: lastLog.notes,
      status: lastLog.status,
      createdAt: new Date(lastLog.createdAt || lastLog.timestamp),
      cat: {
        id: cat.id,
        name: cat.name,
        photoUrl: cat.photoUrl,
        birthdate: cat.birthdate ? new Date(cat.birthdate) : undefined,
        weight: cat.weight,
        restrictions: cat.restrictions,
        notes: cat.notes,
        householdId: cat.householdId,
        feedingInterval: cat.feedingInterval,
        portion_size: cat.portion_size
      },
      user: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar,
        householdId: currentUser.householdId,
        preferences: currentUser.preferences,
        role: currentUser.role
      } : undefined
    };

    return feedingLog;
  };

  const [lastFeedingLog, setLastFeedingLog] = useState<FeedingLog | null>(null);

  const isNewUserFlow = cats && cats.length === 0 && feedingLogs && feedingLogs.length === 0 && !!currentUser?.householdId;

  useEffect(() => {
    const log = getLastFeedingLog();
    console.log("Setting last feeding log:", log);
    if (log && log.id && log.catId && log.cat) {
      setLastFeedingLog(log);
    } else {
      console.log("No valid feeding log found, setting to null");
      setLastFeedingLog(null);
    }
  }, [feedingLogs, cats, currentUser]);

  useEffect(() => {
    console.log("Current lastFeedingLog state:", lastFeedingLog);
    const tableData = {
      appState: {
        cats: appState.cats,
        feedingLogs: appState.feedingLogs,
        households: appState.households,
        users: appState.users,
        error: appState.error
      },
      userState: {
        currentUser: userState.currentUser,
        error: userState.error
      },
      session,
      status,
      currentUser,
      cats,
      feedingLogs,
      todayFeedingCount,
      recentFeedingsData,
      isDrawerOpen,
      isNewFeedingSheetOpen,
      lastFeedingLog,
      isNewUserFlow
    };
    console.table(tableData);
  }, [appState, userState, session, status, currentUser, cats, feedingLogs, todayFeedingCount, recentFeedingsData, isDrawerOpen, isNewFeedingSheetOpen, lastFeedingLog, isNewUserFlow]);

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

  if (status === "loading" || (status === "authenticated" && !currentUser)) {
    return <Loading text="Carregando painel..." />;
  }

  if (status === "unauthenticated") {
     return <Loading text="Redirecionando para login..." />;
  }

  if (status === "authenticated" && currentUser && !currentUser.householdId) {
    return (
       <div className="container px-4 py-8">
         <EmptyState
           icon={Users}
           title="Associe uma Residência"
           description="Você precisa criar ou juntar-se a uma residência para usar o painel."
           actionLabel="Ir para Configurações"
           actionHref="/settings"
           className="max-w-xl mx-auto my-12"
         />
       </div>
     );
  }

  const dashboardItems = [
    {
      title: "Gatos",
      value: cats?.length ?? 0,
      icon: <Cat className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-500",
      href: "/cats",
      empty: (cats?.length ?? 0) === 0,
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
      title: "Residência",
      value: appState.households?.find(h => String(h.id) === String(currentUser?.householdId))?.name || "Minha Casa",
      icon: <Users className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-500",
      href: "/settings",
      empty: !currentUser?.householdId,
    },
  ];

  const chartConfig = cats?.reduce((config, cat, index) => {
    config[cat.name] = {
      label: cat.name,
      color: colorPalette[index % colorPalette.length],
    };
    return config;
  }, {} as { [key: string]: { label: string; color: string } }) || {};

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
                     {item.empty ? (item.title === "Residência" ? "Configure nos Ajustes" : "Nenhum registro ainda") : "Ver detalhes →"}
                   </p>
                 </CardFooter>
               </Card>
             </Link>
           ))}
         </motion.div>

         <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
               <div className="flex items-center justify-between">
                 <div>
                   <CardTitle>Última Alimentação</CardTitle>
                   <CardDescription>
                     Detalhes da última alimentação registrada
                   </CardDescription>
                 </div>
                 <Button onClick={() => setIsNewFeedingSheetOpen(true)} size="sm">
                   Alimentar agora
                 </Button>
               </div>
             </CardHeader>
             <CardContent>
               {lastFeedingLog ? (
                 <div 
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     console.log("Opening drawer with log:", lastFeedingLog);
                     setIsDrawerOpen(true);
                   }} 
                   className="cursor-pointer"
                 >
                   <FeedingLogItem
                     log={lastFeedingLog}
                     onView={() => setIsDrawerOpen(true)}
                     onEdit={() => router.push(`/feedings/${lastFeedingLog.id}/edit`)}
                     onDelete={() => {}}
                   />
                 </div>
               ) : (
                 <EmptyState
                   icon={Utensils}
                   title="Nenhuma alimentação registrada"
                   description="Registre a primeira alimentação do seu gato para começar a acompanhar."
                   actionLabel="Registrar Alimentação"
                   actionOnClick={() => setIsNewFeedingSheetOpen(true)}
                 />
               )}
             </CardContent>
           </Card>

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
                     config={chartConfig}
                   >
                     <div className="absolute inset-0 px-6">
                       <ResponsiveContainer>
                         <RechartsBarChart 
                           data={recentFeedingsData}
                           margin={{ top: 24, right: 24, left: 0, bottom: 0 }}
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
                             content={<ChartTooltipContent hideLabel />}
                             cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
                           />
                           {Object.entries(chartConfig).map(([catName, config], index) => (
                             <Bar 
                               key={catName}
                               dataKey={catName}
                               stackId="a"
                               radius={[4, 4, 0, 0]}
                               maxBarSize={32}
                               fill={config.color}
                             />
                           ))}
                         </RechartsBarChart>
                       </ResponsiveContainer>
                     </div>
                   </ChartContainer>
                 ) : (
                   <div className="h-full flex items-center justify-center">
                     <p className="text-muted-foreground">Sem dados para exibir gráfico</p>
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
       {lastFeedingLog && (
         <FeedingDrawer
           key={`drawer-${lastFeedingLog.id}`}
           isOpen={isDrawerOpen}
           onOpenChange={(open) => {
             console.log("Drawer open state changing to:", open);
             setIsDrawerOpen(open);
           }}
           feedingLog={lastFeedingLog}
         />
       )}
       <NewFeedingSheet
         isOpen={isNewFeedingSheetOpen}
         onOpenChange={setIsNewFeedingSheetOpen}
       />
    </div>
  );
}