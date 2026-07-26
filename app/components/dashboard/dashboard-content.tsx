"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { m } from "framer-motion";
import Link from "next/link";
import { Clock, Utensils, Calendar, PlusCircle, Gauge, Plus, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedingLogItem } from "@/components/feeding/feeding-log-item";
import { CatType, FeedingLog, User } from "@/lib/types";
import { NewFeedingSheet } from "@/components/feeding/new-feeding-sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import EventsList from "@/components/events-list";
import { DashboardCatsScroll } from "./dashboard-cats-scroll";

const DashboardFeedingsChart = dynamic(
  () => import("./dashboard-feedings-chart").then((m) => m.DashboardFeedingsChart),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-md bg-muted/40" />,
  }
);

interface ChartDataPoint {
  name: string;
  [catId: string]: string | number;
}

const colorPalette = [
  "#E8A87C", 
  "#85D8C9", 
  "#D8B4E8", 
  "#A8D8EA", 
  "#FFD6A5", 
  "#C9B1FF", 
  "#FFB5B5", 
  "#B5E8D5",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
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

export interface DashboardContentProps {
  cats: CatType[];
  todayFeedingCount: number;
  averagePortionSize: number | null;
  lastFeedingLog: FeedingLog | null;
  recentFeedingsData: ChartDataPoint[];
  currentUser: User | null;
}

export default function DashboardContent({
  cats,
  todayFeedingCount,
  averagePortionSize,
  lastFeedingLog,
  recentFeedingsData,
  currentUser
}: DashboardContentProps) {
  const [isNewFeedingSheetOpen, setIsNewFeedingSheetOpen] = useState(false);
  const chartCats = useMemo(() => cats || [], [cats]);

  const fedCats = useMemo(() => {
    if (!lastFeedingLog) return [];
    const fedTime = new Date(lastFeedingLog.timestamp);
    const now = new Date();
    const hoursSinceFed = (now.getTime() - fedTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceFed < 4 ? [lastFeedingLog.catId] : [];
  }, [lastFeedingLog]);

  // Extract first name from user
  const firstName = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.name) {
      const nameParts = currentUser.name.trim().split(' ');
      const first = nameParts[0];
      if (!first) return null;
      // Capitalize first letter
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }
    // Fallback to email username
    if (currentUser.email) {
      const emailName = currentUser.email.split('@')[0];
      if (!emailName) return null;
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
    }
    return null;
  }, [currentUser]);

  return (
    <m.div
      className="container max-w-7xl mx-auto px-4 py-6 md:py-8 pb-28"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      layoutId="dashboard-container"
    >
      <m.div variants={itemVariants} className="mb-6" layoutId="dashboard-header">
        <div className="mb-4">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            Olá{firstName ? `, ${firstName}` : ''}! 🐱
          </h1>
          <p className="text-muted-foreground mt-1">
            {todayFeedingCount > 0 
              ? `${todayFeedingCount} alimentaç${todayFeedingCount === 1 ? 'ão' : 'ões'} hoje`
              : 'Nenhuma alimentação registrada hoje'}
          </p>
        </div>
      </m.div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),auto] gap-6 mb-6">
        {cats && cats.length > 0 && (
          <m.div variants={itemVariants} layoutId="dashboard-cats-scroll" className="min-w-0 max-w-full">
            <DashboardCatsScroll cats={cats} fedCatIds={fedCats} />
          </m.div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          <m.div variants={itemVariants}>
            <Card 
              className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                todayFeedingCount === 0 
                  ? 'bg-gradient-to-br from-orange-500/10 to-orange-500/5' 
                  : 'bg-gradient-to-br from-green-500/10 to-green-500/5'
              }`}
              onClick={() => setIsNewFeedingSheetOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    todayFeedingCount === 0 
                      ? 'bg-orange-500/20' 
                      : 'bg-green-500/20'
                  }`}>
                    <Utensils className={`h-6 w-6 ${
                      todayFeedingCount === 0 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-bold">{todayFeedingCount}</p>
                    <p className="text-xs text-muted-foreground">Alimentações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>

          <m.div variants={itemVariants}>
            <Link href="/statistics">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/3 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Gauge className="h-6 w-6 text-primary/70" />
                    </div>
                    <div>
                      <p className="text-3xl md:text-4xl font-bold">
                        {averagePortionSize != null && averagePortionSize > 0
                          ? `${Math.round(averagePortionSize)}`
                          : '—'}
                        {averagePortionSize != null && averagePortionSize > 0 && (
                          <span className="text-lg md:text-xl font-semibold text-muted-foreground ml-0.5">g</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Porção média</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </m.div>

          <div className="hidden lg:block h-full">
            <m.div variants={itemVariants} className="h-full">
              <Card 
                className="bg-gradient-to-br from-primary to-primary/90 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] h-full"
                onClick={() => setIsNewFeedingSheetOpen(true)}
              >
                <CardContent className="p-4 h-full flex items-center justify-center">
                  <div className="flex items-center gap-3 text-primary-foreground">
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Registrar</p>
                      <p className="text-xs opacity-90">Nova alimentação</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </m.div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {recentFeedingsData.length > 0 && chartCats.length > 0 && (
          <m.div variants={itemVariants} layoutId="dashboard-feeding-chart" className="lg:col-span-2">
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  Alimentações
                </CardTitle>
                <CardDescription className="text-xs">Últimos 7 dias (gramas)</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardFeedingsChart
                  data={recentFeedingsData}
                  chartCats={chartCats}
                  colorPalette={colorPalette}
                />
              </CardContent>
            </Card>
          </m.div>
        )}

        <div className="space-y-6">
          <m.div variants={itemVariants} layoutId="dashboard-recent-logs">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EventsList />
              </CardContent>
            </Card>
          </m.div>

          <m.div variants={itemVariants} layoutId="dashboard-last-feeding">
            <Card className="shadow-sm hover:shadow-md transition-shadow overflow-hidden" data-tour="last-feeding">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  Última Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastFeedingLog ? (
                  <FeedingLogItem log={lastFeedingLog} />
                ) : (
                  <div className="py-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Utensils className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-3">Nenhuma alimentação ainda</p>
                    <Button onClick={() => setIsNewFeedingSheetOpen(true)} size="sm" className="rounded-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Registrar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </m.div>
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              className="fixed bottom-24 right-6 h-16 w-16 rounded-2xl shadow-lg flex items-center justify-center text-2xl z-20 bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 lg:hidden" 
              variant="default" 
              size="icon"
              aria-label="Registrar nova alimentação"
              onClick={() => setIsNewFeedingSheetOpen(true)}
            >
              <Plus className="h-7 w-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Registrar Alimentação</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <NewFeedingSheet
        isOpen={isNewFeedingSheetOpen}
        onOpenChange={setIsNewFeedingSheetOpen}
      />
    </m.div>
  );
}