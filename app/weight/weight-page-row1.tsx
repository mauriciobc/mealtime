"use client";

import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Scale, Target, TrendingUp, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { m } from "framer-motion";

const WeightTrendChart = dynamic(
  () => import('@/components/weight/weight-trend-chart').then((m) => ({ default: m.default })),
  { ssr: false }
);
import type { WeightPageMainProps } from './weight-page-sections';

export function WeightPageGridRow1(props: WeightPageMainProps) {
  const { cats, selectedCatId, setSelectedCatId, userId, setIsGoalFormSheetOpen, setIsTipsSheetOpen, selectedCatActiveGoal, selectedCatLastArchivedGoal, currentWeight, goalWeight, progress, selectedPeriod, setSelectedPeriod, logChangeTimestamp } = props;
  return (
    <>
            {/* Row 1: Cat Selector + Weight/Goal Cards + Trend Chart */}
            {/* Cat Selector - spans 2 cols */}
            <m.div
              id="weight-cat-selector"
              className="lg:col-span-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6 bg-card text-card-foreground h-full">
                  <div className="flex lg:flex-col gap-3 px-2 overflow-x-auto lg:overflow-visible p-[2px]">
                    {cats.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg p-3 transition-colors min-w-[80px] ${
                          selectedCatId === cat.id ? "bg-accent dark:bg-accent/40 ring-2 ring-blue-500" : "bg-background hover:bg-accent/60"
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={cat.photo_url || "/placeholder.svg"} alt={cat.name} />
                          <AvatarFallback>{cat.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </m.div>

            {/* Weight + Goal + Progress Cards - spans 4 cols */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <m.div
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Scale className="h-4 w-4 text-primary" />
                      Peso Atual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{currentWeight}</div>
                    <div className="text-sm text-muted-foreground">{selectedCatActiveGoal?.unit || "kg"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      Meta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCatActiveGoal ? (
                      <>
                        <div className="text-2xl font-bold text-foreground">{goalWeight}</div>
                        <div className="text-sm text-muted-foreground">{selectedCatActiveGoal?.unit || "kg"}</div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <span className="text-xs text-muted-foreground text-center">Nenhuma meta definida.</span>
                        <Button
                          className="mt-2"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsGoalFormSheetOpen(true)}
                        >
                          Definir Meta
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </m.div>
              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="flex-1"
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base font-semibold text-foreground">Progresso da Meta</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setIsTipsSheetOpen(true)}>
                        <Heart className="mr-2 h-4 w-4 text-primary" />
                        Ver Dicas
                      </Button>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">
                      {selectedCatActiveGoal ? (
                        progress >= 100
                          ? "Parabéns! Meta alcançada! 🎉"
                          : progress >= 90
                          ? "Quase lá! 🎯"
                          : progress >= 75
                          ? "Ótimo progresso! 💪"
                          : progress >= 50
                          ? "Meio caminho! 🌟"
                          : progress >= 25
                          ? "Bom começo! 👍"
                          : "Começando agora! 🚀"
                      ) : selectedCatLastArchivedGoal ? (
                        "Parabéns por atingir sua meta geral!"
                      ) : (
                        "Nenhuma meta definida."
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCatActiveGoal ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    ) : selectedCatLastArchivedGoal ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span className="font-semibold text-foreground">100%</span>
                        </div>
                        <Progress value={100} className="h-2" />
                      </div>
                    ) : null}
                    <Badge variant="secondary" className="w-fit">
                      {selectedCatActiveGoal
                        ? (typeof progress === 'number' && progress >= 75
                          ? "No caminho certo"
                          : "Atenção")
                        : selectedCatLastArchivedGoal
                        ? "Meta concluída"
                        : "Sem meta"}
                    </Badge>
                  </CardContent>
                </Card>
              </m.div>
            </div>

            {/* Trend Chart - spans 5 cols */}
            <m.div
              id="weight-trend-chart"
              className="lg:col-span-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tendência de Peso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedPeriod} onValueChange={value => setSelectedPeriod(value as '30' | '60' | '90')} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="30">30 Dias</TabsTrigger>
                      <TabsTrigger value="60">60 Dias</TabsTrigger>
                      <TabsTrigger value="90">90 Dias</TabsTrigger>
                    </TabsList>
                    <TabsContent value={selectedPeriod} className="mt-4">
                      <WeightTrendChart
                        catId={selectedCatId || ''}
                        userId={userId}
                        logChangeTimestamp={logChangeTimestamp}
                        period={parseInt(selectedPeriod)}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </m.div>

    </>
  );
}
