"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import PageTransition from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import type { HouseholdPageViewProps } from "./use-household-page";

type HouseholdPageStateSectionsProps = Pick<
  HouseholdPageViewProps,
  "router" | "isLoadingUser" | "errorUser" | "currentUser" | "isLoadingData" | "loadError" | "household"
>;

export function HouseholdPageStateSections({
  router,
  isLoadingUser,
  errorUser,
  currentUser,
  isLoadingData,
  loadError,
  household,
}: HouseholdPageStateSectionsProps) {
  if (isLoadingUser) {
    return <Loading text="Verificando usuário..." />;
  }

  if (errorUser) {
    return (
      <PageTransition>
        <div className="p-4 text-center">
          <p className="text-destructive">
            Erro ao carregar dados do usuário: {errorUser}. Tente recarregar a página.
          </p>
          <Button onClick={() => router.back()} className="mt-4">
            Voltar
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (!currentUser) {
    return <Loading text="Redirecionando para login..." />;
  }

  if (isLoadingData) {
    return <Loading text="Carregando dados da residência..." />;
  }

  if (loadError) {
    return (
      <PageTransition>
        <div className="p-4 text-center">
          <EmptyState
            IconComponent={AlertTriangle}
            title="Erro ao Carregar Residência"
            description={loadError || "Não foi possível carregar os dados desta residência."}
            actionButton={
              <Button onClick={() => router.push("/households")}>Voltar para Residências</Button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  if (household === null) {
    return (
      <PageTransition>
        <div className="p-4 text-center">
          <EmptyState
            IconComponent={ShieldAlert}
            title="Residência Não Encontrada"
            description="A residência que você está tentando acessar não foi encontrada ou você não tem permissão."
            actionButton={
              <Button onClick={() => router.push("/households")}>Voltar para Residências</Button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  if (household === undefined) {
    return <Loading text="Inicializando..." />;
  }

  return null;
}
