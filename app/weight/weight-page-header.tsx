"use client";

import { Button } from "@/components/ui/button";
import { Gauge, Target } from 'lucide-react';
import { m } from "framer-motion";
import type { WeightPageMainProps } from './weight-page-sections';

export function WeightPageHeader(props: WeightPageMainProps) {
  const { setIsGoalFormSheetOpen } = props;
  return (
    <>
            {/* Header */}
            <m.div
              id="weight-header"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Gauge className="h-8 w-8 text-primary" aria-hidden="true" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Painel de Peso</h1>
                  <p className="text-sm text-muted-foreground">Acompanhe a saúde do seu gato</p>
                </div>
              </div>
              {/* Botão de adicionar meta */}
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setIsGoalFormSheetOpen(true)}
                aria-label="Nova Meta de Peso"
              >
                <Target className="h-5 w-5 text-primary" />
                Nova Meta
              </Button>
            </div>
          </m.div>

          {/* Desktop Layout: Two rows */}
    </>
  );
}
