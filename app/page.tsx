"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Cat, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalLoading } from "@/components/ui/global-loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import DashboardContent from "./components/dashboard/dashboard-content";
import { useDashboard } from "@/lib/hooks/useDashboard";

export default function Home() {
  const { state: appState, data, currentUser } = useDashboard();
  const router = useRouter();

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
          cats={data.cats}
          todayFeedingCount={data.todayFeedingCount}
          averagePortionSize={data.averagePortionSize}
          lastFeedingLog={data.lastFeedingLog}
          recentFeedingsData={data.recentFeedingsData}
        />
      );
  }
}