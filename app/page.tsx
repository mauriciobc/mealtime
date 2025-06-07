"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Cat, Users } from "lucide-react";
import { useUserContext } from "@/lib/context/UserContext";
import { useCats } from "@/lib/context/CatsContext";
import {
  useFeeding,
  useSelectTodayFeedingCount,
  useSelectLastFeedingLog,
  useSelectRecentFeedingsChartData,
  useSelectAveragePortionSize
} from "@/lib/context/FeedingContext";
import { Button } from "@/components/ui/button";
import { GlobalLoading } from "@/components/ui/global-loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import DashboardContent from "./components/dashboard/dashboard-content";

type AppState = 
  | { type: 'LOADING_USER' }
  | { type: 'ERROR_USER'; error: string }
  | { type: 'NO_USER' }
  | { type: 'NO_HOUSEHOLD' }
  | { type: 'LOADING_DASHBOARD' }
  | { type: 'ERROR_DASHBOARD'; error: { cats?: string; feedings?: string } }
  | { type: 'NEW_USER_FLOW' }
  | { type: 'DASHBOARD' };

export default function Home() {
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState } = useFeeding();
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  const { isLoading: isLoadingFeedings, error: errorFeedings } = feedingState;

  const todayFeedingCount = useSelectTodayFeedingCount();
  const recentFeedingsData = useSelectRecentFeedingsChartData();
  const lastFeedingLog = useSelectLastFeedingLog();
  const averagePortionSize = useSelectAveragePortionSize();

  const router = useRouter();

  const appState = useMemo<AppState>(() => {
    if (isLoadingUser) return { type: 'LOADING_USER' };
    if (errorUser) return { type: 'ERROR_USER', error: errorUser };
    if (!currentUser) return { type: 'NO_USER' };
    if (!currentUser.householdId) return { type: 'NO_HOUSEHOLD' };
    if (isLoadingCats || isLoadingFeedings) return { type: 'LOADING_DASHBOARD' };
    if (errorCats || errorFeedings) return { 
      type: 'ERROR_DASHBOARD', 
      error: {
        cats: errorCats || undefined,
        feedings: errorFeedings || undefined
      }
    };
    if ((cats || []).length === 0) return { type: 'NEW_USER_FLOW' };
    return { type: 'DASHBOARD' };
  }, [isLoadingUser, errorUser, currentUser, isLoadingCats, isLoadingFeedings, errorCats, errorFeedings, cats]);

  useEffect(() => {
    if (appState.type === 'NO_USER') {
      router.replace("/login?callbackUrl=/");
    }
  }, [appState.type, router]);

  // Renderização baseada no estado
  switch (appState.type) {
    case 'LOADING_USER':
      return <GlobalLoading mode="lottie" text="Carregando dados do usuário..." />;
    
    case 'ERROR_USER':
      return (
        <div className="container px-4 py-8 text-center">
          <p className="text-destructive">Erro ao carregar dados do usuário: {appState.error}</p>
        </div>
      );
    
    case 'NO_USER':
      return <GlobalLoading mode="lottie" text="Redirecionando para login..." />;
    
    case 'NO_HOUSEHOLD':
      return (
        <div className="container px-4 py-8">
          <EmptyState
            IconComponent={Users}
            title="Associe uma Residência"
            description="Você precisa criar ou juntar-se a uma residência para usar o painel."
            actionButton={
              <Button asChild>
                <Link href="/households">Ir para Configurações de Residência</Link>
              </Button>
            }
            className="max-w-xl mx-auto my-12"
          />
        </div>
      );
    
    case 'LOADING_DASHBOARD':
      return <GlobalLoading mode="lottie" text="Carregando dados do painel..." />;
    
    case 'ERROR_DASHBOARD':
      return (
        <div className="container px-4 py-8 text-center space-y-4">
          {appState.error.cats && (
            <p className="text-destructive">Erro ao carregar dados dos gatos: {appState.error.cats}</p>
          )}
          {appState.error.feedings && (
            <p className="text-destructive">Erro ao carregar dados das refeições: {appState.error.feedings}</p>
          )}
        </div>
      );
    
    case 'NEW_USER_FLOW':
      return (
        <div className="container px-4 py-8">
          <EmptyState
            IconComponent={Cat}
            title="Bem-vindo ao MealTime!"
            description="Sua residência está configurada! Cadastre seu primeiro gato para começar."
            actionButton={
              <Button asChild>
                <Link href="/cats/new">Cadastrar Meu Primeiro Gato</Link>
              </Button>
            }
            className="max-w-xl mx-auto my-12"
          />
        </div>
      );
    
    case 'DASHBOARD':
      return (
        <DashboardContent
          cats={cats || []}
          todayFeedingCount={todayFeedingCount}
          averagePortionSize={averagePortionSize}
          lastFeedingLog={lastFeedingLog}
          recentFeedingsData={recentFeedingsData}
        />
      );
  }
}