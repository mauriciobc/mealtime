"use client";

import React, { Dispatch } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "@/lib/recharts-dynamic";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  COLORS,
  STATUS_LABELS,
  SAFETY_BANNER,
  NO_MILESTONES,
  GOAL_PROGRESS,
  GOAL_ACHIEVED,
  CURRENT_WEIGHT_LABEL,
  GOAL_LABEL,
  MILESTONES_LABEL,
  VET_REMINDER,
  PLATEAU_ALERT,
  ACCELERATED_LOSS_ALERT,
  MILESTONE_REACHED,
  Milestone,
  MilestoneProgressAction,
  MilestoneProgressState,
  ProcessedMilestone,
  WeightGoalWithMilestones,
} from "./milestone-progress-types";

export function MilestoneProgressEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{GOAL_PROGRESS}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{NO_MILESTONES}</p>
      </CardContent>
    </Card>
  );
}

type MilestoneProgressContentProps = {
  activeGoal: WeightGoalWithMilestones;
  currentWeight: number;
  parsedTargetWeight: number | null;
  state: MilestoneProgressState;
  dispatch: Dispatch<MilestoneProgressAction>;
  processedMilestones: ProcessedMilestone[];
  alertFlags: { showVetReminder: boolean; showPlateauAlert: boolean; showAcceleratedLoss: boolean };
  goalProgressPercentage: number;
  isGoalAchieved: boolean;
  pieData: { name: string; value: number }[];
  onOpenSheet: (milestone: Milestone) => void;
};

export function MilestoneProgressContent({
  activeGoal,
  currentWeight,
  parsedTargetWeight,
  state,
  dispatch,
  processedMilestones,
  alertFlags,
  goalProgressPercentage,
  isGoalAchieved,
  pieData,
  onOpenSheet,
}: MilestoneProgressContentProps) {
  const { newlyCompletedMilestone, isSheetOpen, selectedMilestoneForSheet } = state;
  const { showVetReminder, showPlateauAlert, showAcceleratedLoss } = alertFlags;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {GOAL_LABEL}: {activeGoal.goal_name}
          </CardTitle>
          {activeGoal.description && (
            <p className="text-sm text-muted-foreground pt-1">{activeGoal.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-blue-50 border-blue-300 text-blue-900">
            <AlertTitle className="font-semibold">Atenção</AlertTitle>
            <AlertDescription>{SAFETY_BANNER}</AlertDescription>
          </Alert>

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
              {GOAL_PROGRESS}:{" "}
              {isGoalAchieved ? (
                <span className="font-semibold text-green-700">{GOAL_ACHIEVED}</span>
              ) : (
                <span>
                  {CURRENT_WEIGHT_LABEL}: {currentWeight?.toFixed(1)}
                  {activeGoal.unit} / {GOAL_LABEL}:{" "}
                  {parsedTargetWeight !== null ? parsedTargetWeight.toFixed(1) : "N/A"}
                  {activeGoal.unit}
                </span>
              )}
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
                    innerRadius={50}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}-${entry.value}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <Label
                      value={`${goalProgressPercentage.toFixed(0)}%`}
                      position="center"
                      fill="hsl(var(--foreground))"
                      className="text-xl font-semibold"
                      dy={5}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            {isGoalAchieved && (
              <p className="text-sm text-green-600 mt-3 text-center">Parabéns por atingir sua meta geral!</p>
            )}
          </div>

          <p className="text-lg font-semibold mb-3 mt-6">{MILESTONES_LABEL}</p>
          {processedMilestones.length > 0 ? (
            <ul className="space-y-3">
              {processedMilestones.map((milestone) => (
                <li
                  key={milestone.id}
                  className="flex items-center justify-between p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Alvo: {milestone.target_weight}
                      {activeGoal.unit} até {new Date(milestone.target_date).toLocaleDateString("pt-BR")}
                      {milestone.description && (
                        <span className="block text-xs text-muted-foreground/80 italic mt-0.5 truncate">
                          {milestone.description}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center ml-2">
                    <Badge
                      variant={
                        milestone.isConflicting
                          ? "destructive"
                          : milestone.status === "completed"
                            ? "default"
                            : milestone.status === "overdue"
                              ? "destructive"
                              : milestone.status === "upcoming"
                                ? "outline"
                                : "secondary"
                      }
                      className={cn(
                        "capitalize text-xs px-2.5 py-1 mr-2 whitespace-nowrap border transition-colors",
                        milestone.isConflicting && "border-2",
                        !milestone.isConflicting &&
                          milestone.status === "completed" &&
                          "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
                        !milestone.isConflicting && milestone.status === "overdue" && "",
                        !milestone.isConflicting &&
                          milestone.status === "upcoming" &&
                          "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",
                        !milestone.isConflicting &&
                          milestone.status === "pending" &&
                          "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200"
                      )}
                    >
                      {milestone.isConflicting ? "Conflito" : STATUS_LABELS[milestone.status]}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => onOpenSheet(milestone)} className="p-1.5 h-auto">
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

      <Sheet open={isSheetOpen} onOpenChange={(value) => dispatch({ type: "SET_SHEET_OPEN", value })}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ajustar alimentação para: {selectedMilestoneForSheet?.name}</SheetTitle>
            <SheetDescription>
              Alvo: {selectedMilestoneForSheet?.target_weight}
              {activeGoal.unit} até{" "}
              {selectedMilestoneForSheet
                ? new Date(selectedMilestoneForSheet.target_date).toLocaleDateString("pt-BR")
                : "N/A"}
              .
              {selectedMilestoneForSheet?.description && (
                <p className="mt-2 italic">Notas: {selectedMilestoneForSheet.description}</p>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              O formulário de ajuste de alimentação para &quot;{selectedMilestoneForSheet?.name}&quot; será exibido
              aqui.
            </p>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Fechar</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
