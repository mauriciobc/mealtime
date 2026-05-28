"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlobalLoading } from "@/components/ui/global-loading";
import CatAvatarStack from '@/components/weight/cat-avatar-stack';
import { logger } from '@/lib/monitoring/logger';
import { WeightPageState } from './weight-page-types';
import type { CatType } from '@/lib/types';

export interface WeightPageStateViewsProps {
  pageState: WeightPageState;
  cats: CatType[];
  handleSelectCat: (catId: string) => void;
}

export function WeightPageStateViews({ pageState, cats, handleSelectCat }: WeightPageStateViewsProps) {
    switch (pageState.type) {
      case 'LOADING':
        logger.info('Página de peso em estado LOADING');
        return (
          <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
            <GlobalLoading mode="lottie" text="Carregando dados do painel de peso..." />
          </div>
        );
      case 'ERROR':
        logger.error('Erro ao carregar dados na página de peso', { error: pageState.error });
        return (
          <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
            <p className="text-center text-destructive">
              Erro ao carregar dados: {pageState.error}
            </p>
          </div>
        );
      case 'NO_USER':
        logger.warn('Usuário não autenticado na página de peso');
        return (
          <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
            <GlobalLoading mode="lottie" text="Redirecionando para login..." />
          </div>
        );
      case 'NO_HOUSEHOLD':
        logger.warn('Usuário sem householdId na página de peso');
        return (
          <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
            <p className="text-center text-muted-foreground">
              Você precisa criar ou juntar-se a uma residência para usar o painel.
            </p>
            <Button asChild>
              <Link href="/households">Ir para Configurações de Residência</Link>
            </Button>
          </div>
        );
      case 'NO_CATS':
        logger.info('Nenhum gato cadastrado para o usuário');
        return (
          <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
            <p className="text-center text-muted-foreground">
              Nenhum gato encontrado. Adicione um gato para começar a acompanhar o peso dele.
            </p>
          </div>
        );
      case 'NO_SELECTED_CAT':
        logger.warn('selectedCatId inválido ou não encontrado');
        return (
          <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold">Painel de Acompanhamento de Peso</h1>
            <CatAvatarStack cats={cats} selectedCatId={null} onSelectCat={handleSelectCat} className="mb-6"/>
            <p className="text-center text-muted-foreground">Por favor, selecione um gato válido para ver os detalhes.</p>
          </div>
        );
      case 'READY':
      default:
        break;
    }
}
