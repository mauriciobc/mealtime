"use client";

import dynamic from 'next/dynamic';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { m } from "framer-motion";

const MilestoneProgress = dynamic(
  () => import('@/components/weight/milestone-progress').then((m) => ({ default: m.MilestoneProgress })),
  { ssr: false }
);
import type { WeightPageMainProps } from './weight-page-sections';

export function WeightPageGridRow2(props: WeightPageMainProps) {
  const { recentHistory, selectedCatActiveGoal, selectedCatLastArchivedGoal, currentWeight, logsForSelectedCat, currentUser, handleGoalArchived } = props;
  return (
    <>
            {/* Row 2: Recent History + Milestone Progress */}
            {/* Recent History - spans 6 cols on desktop */}
            <m.div
              id="weight-history"
              className="lg:col-span-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Histórico Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentHistory.map((entry, index) => {
                      // Calcula a diferença de peso em relação ao registro anterior
                      const prevEntry = recentHistory[index + 1];
                      let diff = null;
                      let diffType: 'up' | 'down' | 'none' = 'none';
                      if (prevEntry) {
                        const delta = entry.weight - prevEntry.weight;
                        if (delta > 0) {
                          diff = `+${delta.toFixed(2)} kg`;
                          diffType = 'up';
                        } else if (delta < 0) {
                          diff = `${delta.toFixed(2)} kg`;
                          diffType = 'down';
                        } else {
                          diff = '0 kg';
                          diffType = 'none';
                        }
                      }

                      // Data: sempre pelo campo 'date' (dia/mês)
                      let dataMedida = '';
                      let dataValida = false;
                      try {
                        const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
                        if (!isNaN(d.getTime())) {
                          dataValida = true;
                          dataMedida = d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
                        }
                      } catch (e) {
                        dataValida = false;
                      }

                      // Horário: usar createdAt, se não existir usar updatedAt, se não existir não exibe
                      let horaMedida = '';
                      let horaValida = false;
                      let horaFonte = null;
                      if (entry.createdAt && !isNaN(new Date(entry.createdAt).getTime())) {
                        horaFonte = entry.createdAt;
                      } else if (entry.updatedAt && !isNaN(new Date(entry.updatedAt).getTime())) {
                        horaFonte = entry.updatedAt;
                      }
                      if (horaFonte) {
                        try {
                          const d = horaFonte instanceof Date ? horaFonte : new Date(horaFonte);
                          if (!isNaN(d.getTime())) {
                            horaValida = true;
                            horaMedida = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          }
                        } catch (e) {
                          horaValida = false;
                        }
                      }

                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <div>
                              <div className="font-medium text-foreground flex items-center gap-2">
                                {entry.weight} kg
                                {prevEntry && diffType !== 'none' && (
                                  <span className={`text-xs flex items-center gap-0.5 ${diffType === 'up' ? 'text-green-600' : 'text-red-600'}`}
                                        title={diffType === 'up' ? 'Ganho de peso' : 'Perda de peso'}>
                                    {diffType === 'up' ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                    )}
                                    {diff}
                                  </span>
                                )}
                              </div>
                              {horaValida && (
                                <div className="text-sm text-muted-foreground">
                                  {horaMedida}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {dataValida ? dataMedida : ''}
                          </div>
                        </div>
                      );
                    })}
                    {recentHistory.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Nenhum registro de peso encontrado.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </m.div>

            {/* Milestone Progress - spans 6 cols on desktop */}
            <m.div
              className="lg:col-span-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <MilestoneProgress
                activeGoal={selectedCatActiveGoal || selectedCatLastArchivedGoal}
                currentWeight={currentWeight}
                currentWeightDate={logsForSelectedCat[0]?.date || null}
                householdId={currentUser?.householdId || null}
                onGoalArchived={handleGoalArchived}
              />
            </m.div>
    </>
  );
}
