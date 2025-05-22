"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  ChartContainer,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// TypeScript Interfaces (Define or import from a central types file e.g., types/weight.ts)
interface Milestone {
  id: string;
  name: string;
  target_weight: number;
  target_date: string; // ISO date string e.g., "2024-12-31"
  description?: string;
}

interface WeightGoalWithMilestones {
  id: string;
  goal_name: string;
  start_date: string; // ISO date string
  target_date: string; // ISO date string for the overall goal
  initial_weight: number;
  target_weight: number;
  unit: 'kg' | 'lbs'; // Unit for weight values
  milestones: Milestone[];
  description?: string;
}

interface MilestoneProgressProps {
  activeGoal: WeightGoalWithMilestones | null;
  currentWeight: number | null;
  currentWeightDate?: string | null;
}

type MilestoneStatus = 'completed' | 'pending' | 'overdue' | 'upcoming';

// Helper function to determine milestone status
const getMilestoneStatus = (
  milestone: Milestone,
  currentWeight: number | null,
  goalStartDateStr: string, // Retained for 'upcoming' logic, though its direct use for status may be refined
  isWeightLossGoal: boolean // Added to correctly determine completion
): MilestoneStatus => {
  if (currentWeight === null) return 'pending';

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Normalize for date comparison

  const milestoneTargetDate = new Date(milestone.target_date);
  milestoneTargetDate.setHours(0, 0, 0, 0);
  const goalStartDate = new Date(goalStartDateStr);
  goalStartDate.setHours(0, 0, 0, 0);

  // This logic determines if the goal itself hasn't started. Milestones of such a goal are 'upcoming'.
  if (currentDate < goalStartDate) return 'upcoming';

  // Determine if the milestone's weight target has been met
  const isMilestoneAchieved = isWeightLossGoal
    ? currentWeight <= milestone.target_weight
    : currentWeight >= milestone.target_weight;

  if (isMilestoneAchieved) {
    return 'completed';
  }

  // If not completed, check if it's past its target date
  if (currentDate > milestoneTargetDate) {
    return 'overdue';
  }

  // If not completed, not overdue, and the overall goal has started, it's 'pending'
  return 'pending';
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))']; // Primary for progress, muted for remainder

// Traduções e constantes em português
const STATUS_LABELS: Record<MilestoneStatus, string> = {
  completed: 'Concluído',
  pending: 'Pendente',
  overdue: 'Atrasado',
  upcoming: 'Futuro',
};

const SAFETY_BANNER =
  'Este plano é um guia. Sempre siga a orientação do seu veterinário.';
const NO_MILESTONES = 'Nenhum marco definido para esta meta.';
const GOAL_PROGRESS = 'Progresso da Meta';
const GOAL_ACHIEVED = 'Meta alcançada!';
const CURRENT_WEIGHT_LABEL = 'Peso atual';
const GOAL_LABEL = 'Meta';
const MILESTONES_LABEL = 'Marcos';
const VET_REMINDER =
  'Lembrete: agende exames clínicos e ajuste o plano com o veterinário.';
const PLATEAU_ALERT =
  'Platô detectado. Reavalie a dieta com um profissional.';
const ACCELERATED_LOSS_ALERT =
  'Atenção: perda de peso acelerada! Reduza a meta e consulte o veterinário.';
const MILESTONE_REACHED = 'Parabéns! Você completou:';

export function MilestoneProgress({ activeGoal, currentWeight, currentWeightDate }: MilestoneProgressProps) {
  const [newlyCompletedMilestone, setNewlyCompletedMilestone] = useState<Milestone | null>(null);
  const [prevCurrentWeight, setPrevCurrentWeight] = useState<number | null>(currentWeight);
  const [prevCurrentWeightDate, setPrevCurrentWeightDate] = useState<string | null | undefined>(currentWeightDate);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMilestoneForSheet, setSelectedMilestoneForSheet] = useState<Milestone | null>(null);

  // Parse weights as numbers for all logic
  const parsedInitialWeight = activeGoal ? Number((activeGoal as any).initial_weight ?? (activeGoal as any).start_weight) : null;
  const parsedTargetWeight = activeGoal ? Number(activeGoal.target_weight) : null;

  // Determine if this is a weight loss or gain goal
  const isWeightLossGoal = useMemo(() => {
    if (!activeGoal || parsedInitialWeight === null || parsedTargetWeight === null) return false;
    return parsedTargetWeight < parsedInitialWeight;
  }, [activeGoal, parsedInitialWeight, parsedTargetWeight]);

  // Debug logging for all relevant values
  console.log('[MilestoneProgress] Debug:', {
    activeGoal,
    currentWeight,
    currentWeightDate,
    prevCurrentWeight,
    prevCurrentWeightDate,
    parsedInitialWeight,
    parsedTargetWeight,
    isWeightLossGoal
  });

  const processedMilestones = useMemo(() => {
    if (!activeGoal || currentWeight === null || !Array.isArray(activeGoal.milestones) || parsedInitialWeight === null || parsedTargetWeight === null) return [];
    
    const overallInitialWeight = parsedInitialWeight;
    const overallTargetWeight = parsedTargetWeight;

    const result = (activeGoal.milestones || [])
      .map(milestone => {
        let isConflicting = false;
        if (isWeightLossGoal) { // e.g., initial 10, target 5 (loss)
          if (milestone.target_weight > overallInitialWeight) isConflicting = true; // Milestone target is a gain
          if (milestone.target_weight < overallTargetWeight) isConflicting = true;  // Milestone overshoots final loss target
        } else { // Gain goal e.g., initial 10, target 15 (gain)
          if (milestone.target_weight < overallInitialWeight) isConflicting = true; // Milestone target is a loss
          if (milestone.target_weight > overallTargetWeight) isConflicting = true;  // Milestone overshoots final gain target
        }
        
        return {
          ...milestone,
          status: getMilestoneStatus(milestone, currentWeight, activeGoal.start_date, isWeightLossGoal),
          isConflicting: isConflicting,
        };
      })
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
    console.log('[MilestoneProgress] processedMilestones:', result);
    return result;
  }, [activeGoal, currentWeight, isWeightLossGoal, parsedInitialWeight, parsedTargetWeight]);

  useEffect(() => {
    // Only trigger if both weight and date changed (i.e., a new log was registered)
    const weightChanged = currentWeight !== null && prevCurrentWeight !== null && currentWeight !== prevCurrentWeight;
    const dateChanged = currentWeightDate && prevCurrentWeightDate && currentWeightDate !== prevCurrentWeightDate;
    if (weightChanged && dateChanged && activeGoal) {
      const justCompleted: Milestone[] = [];
      const milestonesArr = Array.isArray(activeGoal.milestones) ? activeGoal.milestones : [];
      for (const milestone of milestonesArr) {
        const prevStatus = getMilestoneStatus(milestone, prevCurrentWeight, activeGoal.start_date, isWeightLossGoal);
        const currentProcessedMilestone = processedMilestones.find(pm => pm.id === milestone.id);
        const currentStatusValue = currentProcessedMilestone ? currentProcessedMilestone.status : getMilestoneStatus(milestone, currentWeight, activeGoal.start_date, isWeightLossGoal);
        if (prevStatus !== 'completed' && currentStatusValue === 'completed') {
          justCompleted.push(milestone);
        }
      }
      if (justCompleted.length > 0) {
        justCompleted.sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
        console.log('[MilestoneProgress] justCompleted milestones:', justCompleted);
        setNewlyCompletedMilestone(justCompleted[0]);
      }
    }
    if (currentWeight !== prevCurrentWeight) {
      setPrevCurrentWeight(currentWeight);
    }
    if (currentWeightDate !== prevCurrentWeightDate) {
      setPrevCurrentWeightDate(currentWeightDate);
    }
  }, [currentWeight, prevCurrentWeight, currentWeightDate, prevCurrentWeightDate, activeGoal, processedMilestones]);

  useEffect(() => {
    if (newlyCompletedMilestone) {
      const timer = setTimeout(() => {
        setNewlyCompletedMilestone(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyCompletedMilestone]);

  const handleOpenSheet = (milestone: Milestone) => {
    setSelectedMilestoneForSheet(milestone);
    setIsSheetOpen(true);
  };

  // --- Algoritmo de monitoramento dinâmico ---
  // Detecta perda acelerada (>1.5% em 2 semanas) e platô (3 marcos estáveis)
  const [showVetReminder, setShowVetReminder] = useState(false);
  const [showPlateauAlert, setShowPlateauAlert] = useState(false);
  const [showAcceleratedLoss, setShowAcceleratedLoss] = useState(false);

  useEffect(() => {
    if (!activeGoal || !Array.isArray(activeGoal.milestones) || !currentWeightDate) return;
    // Vet reminder: a cada 4 semanas (28 dias) desde o início
    const start = new Date(activeGoal.start_date);
    const now = new Date(currentWeightDate);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    setShowVetReminder(diffDays > 0 && diffDays % 28 < 14); // Mostra por 2 semanas a cada ciclo

    // Plateau: peso estável (±0,1kg) por 3 marcos consecutivos
    const weights = processedMilestones
      .filter(m => m.status === 'completed')
      .slice(-3)
      .map(m => m.target_weight);
    if (weights.length === 3 && Math.max(...weights) - Math.min(...weights) <= 0.1) {
      setShowPlateauAlert(true);
    } else {
      setShowPlateauAlert(false);
    }

    // Accelerated loss: perda >1.5% em 2 semanas
    if (processedMilestones.length >= 2) {
      const last = processedMilestones[processedMilestones.length - 1];
      const prev = processedMilestones[processedMilestones.length - 2];
      if (
        last && prev &&
        prev.target_weight > 0 &&
        (prev.target_weight - last.target_weight) / prev.target_weight > 0.015
      ) {
        setShowAcceleratedLoss(true);
      } else {
        setShowAcceleratedLoss(false);
      }
    }
  }, [activeGoal, processedMilestones, currentWeightDate]);

  if (!activeGoal || currentWeight === null) {
    return (
      <Card>
        <CardHeader><CardTitle>{GOAL_PROGRESS}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{NO_MILESTONES}</p>
        </CardContent>
      </Card>
    );
  }

  let progressValue = 0;
  if (parsedInitialWeight !== null && parsedTargetWeight !== null && parsedTargetWeight !== parsedInitialWeight) {
    if (isWeightLossGoal) {
      progressValue = ((parsedInitialWeight - (currentWeight ?? parsedInitialWeight)) / (parsedInitialWeight - parsedTargetWeight)) * 100;
    } else {
      progressValue = (((currentWeight ?? parsedInitialWeight) - parsedInitialWeight) / (parsedTargetWeight - parsedInitialWeight)) * 100;
    }
  }
  const goalProgressPercentage = Math.min(100, Math.max(0, progressValue));
  const isGoalAchieved = isWeightLossGoal ? (currentWeight ?? parsedInitialWeight) <= parsedTargetWeight : (currentWeight ?? parsedInitialWeight) >= parsedTargetWeight;

  const pieData = [
    { name: 'Completed', value: goalProgressPercentage },
    { name: 'Remaining', value: 100 - goalProgressPercentage },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{GOAL_LABEL}: {activeGoal.goal_name}</CardTitle>
          {activeGoal.description && <p className="text-sm text-muted-foreground pt-1">{activeGoal.description}</p>}
        </CardHeader>
        <CardContent>
          {/* Banner de segurança */}
          <Alert className="mb-4 bg-blue-50 border-blue-300 text-blue-900">
            <AlertTitle className="font-semibold">Atenção</AlertTitle>
            <AlertDescription>{SAFETY_BANNER}</AlertDescription>
          </Alert>

          {/* Alertas dinâmicos */}
          {showVetReminder && (
            <Alert className="mb-2 bg-yellow-50 border-yellow-300 text-yellow-900">
              <AlertTitle className="font-semibold">Lembrete Veterinário</AlertTitle>
              <AlertDescription>{VET_REMINDER}</AlertDescription>
            </Alert>
          )}
          {showPlateauAlert && (
            <Alert className="mb-2 bg-orange-50 border-orange-300 text-orange-900">
              <AlertTitle className="font-semibold">Platô Detectado</AlertTitle>
              <AlertDescription>{PLATEAU_ALERT}</AlertDescription>
            </Alert>
          )}
          {showAcceleratedLoss && (
            <Alert className="mb-2 bg-red-50 border-red-300 text-red-900">
              <AlertTitle className="font-semibold">Alerta de Perda Rápida</AlertTitle>
              <AlertDescription>{ACCELERATED_LOSS_ALERT}</AlertDescription>
            </Alert>
          )}

          {newlyCompletedMilestone && (
            <Alert className="mb-4 animate-in fade-in zoom-in-95 bg-green-50 border-green-300 text-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <AlertTitle className="font-semibold">{MILESTONE_REACHED}</AlertTitle>
              <AlertDescription>
                {`"${newlyCompletedMilestone.name}" (Alvo: ${newlyCompletedMilestone.target_weight}${activeGoal.unit}).`}
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6 flex flex-col items-center">
            <div className="text-sm font-medium mb-2 text-center">
              {GOAL_PROGRESS}: {isGoalAchieved
                ? <span className="font-semibold text-green-700">{GOAL_ACHIEVED}</span>
                : <span>{CURRENT_WEIGHT_LABEL}: {currentWeight?.toFixed(1)}{activeGoal.unit} / {GOAL_LABEL}: {parsedTargetWeight !== null ? parsedTargetWeight.toFixed(1) : 'N/A'}{activeGoal.unit}</span>
              }
            </div>
            <ChartContainer config={{}} className="mx-auto aspect-square h-[160px] w-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    innerRadius={50} // This makes it a donut
                    dataKey="value"
                    stroke="hsl(var(--background))" // To create separation between segments
                    strokeWidth={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <Label
                      value={`${goalProgressPercentage.toFixed(0)}%`}
                      position="center"
                      fill="hsl(var(--foreground))"
                      className="text-xl font-semibold"
                      dy={5} // Fine-tune vertical position
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            {isGoalAchieved && (
              <p className="text-sm text-green-600 mt-3 text-center">
                Congratulations on reaching your overall goal!
              </p>
            )}
          </div>

          <p className="text-lg font-semibold mb-3 mt-6">{MILESTONES_LABEL}</p>
          {processedMilestones.length > 0 ? (
            <ul className="space-y-3">
              {processedMilestones.map((milestone) => (
                <li key={milestone.id} className="flex items-center justify-between p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Alvo: {milestone.target_weight}{activeGoal.unit} até {new Date(milestone.target_date).toLocaleDateString('pt-BR')}
                      {milestone.description && <span className="block text-xs text-muted-foreground/80 italic mt-0.5 truncate">{milestone.description}</span>}
                    </p>
                  </div>
                  <div className="flex items-center ml-2">
                    <Badge
                      variant={
                        milestone.isConflicting ? 'destructive' :
                        milestone.status === 'completed' ? 'default' :
                        milestone.status === 'overdue' ? 'destructive' :
                        milestone.status === 'upcoming' ? 'outline' :
                        'secondary'
                      }
                      className={cn(
                        "capitalize text-xs px-2.5 py-1 mr-2 whitespace-nowrap border transition-colors",
                        milestone.isConflicting && "border-2",
                        !milestone.isConflicting && milestone.status === 'completed' && 
                          "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
                        !milestone.isConflicting && milestone.status === 'overdue' && 
                          "",
                        !milestone.isConflicting && milestone.status === 'upcoming' && 
                          "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200", 
                        !milestone.isConflicting && milestone.status === 'pending' && 
                          "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200"
                      )}
                    >
                      {milestone.isConflicting ? 'Conflito' : STATUS_LABELS[milestone.status]}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenSheet(milestone)} className="p-1.5 h-auto">
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                      <span className="sr-only">Ajustar alimentação para {milestone.name}</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{NO_MILESTONES}</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ajustar alimentação para: {selectedMilestoneForSheet?.name}</SheetTitle>
            <SheetDescription>
              Alvo: {selectedMilestoneForSheet?.target_weight}{activeGoal?.unit} até {selectedMilestoneForSheet ? new Date(selectedMilestoneForSheet.target_date).toLocaleDateString('pt-BR') : 'N/A'}.
              {selectedMilestoneForSheet?.description && <p className="mt-2 italic">Notas: {selectedMilestoneForSheet.description}</p>}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            {/* Placeholder para formulário de ajuste de alimentação */}
            <p className="text-sm text-muted-foreground">
              O formulário de ajuste de alimentação para "{selectedMilestoneForSheet?.name}" será exibido aqui.
            </p>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Fechar</Button>
            </SheetClose>
            {/* <Button type="submit">Salvar alterações</Button> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
} 