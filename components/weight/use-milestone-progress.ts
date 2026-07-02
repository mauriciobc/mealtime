"use client";

import { useReducer, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Milestone,
  MilestoneProgressProps,
  ProcessedMilestone,
  WeightGoalWithMilestones,
  getMilestoneStatus,
  initialMilestoneProgressState,
  milestoneProgressReducer,
} from "./milestone-progress-types";

export function useMilestoneProgress({
  activeGoal,
  currentWeight,
  currentWeightDate,
  householdId,
  onGoalArchived,
}: MilestoneProgressProps) {
  const [state, dispatch] = useReducer(milestoneProgressReducer, initialMilestoneProgressState);
  const prevCurrentWeightRef = useRef<number | null>(currentWeight);
  const prevCurrentWeightDateRef = useRef<string | null | undefined>(currentWeightDate);
  const hasArchived = useRef(false);
  const refreshCounter = useRef(0);
  const clearCelebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsedInitialWeight = activeGoal
    ? Number((activeGoal as WeightGoalWithMilestones & { start_weight?: number }).initial_weight ?? (activeGoal as { start_weight?: number }).start_weight)
    : null;
  const parsedTargetWeight = activeGoal ? Number(activeGoal.target_weight) : null;

  const isWeightLossGoal = useMemo(() => {
    if (!activeGoal || parsedInitialWeight === null || parsedTargetWeight === null) return false;
    return parsedTargetWeight < parsedInitialWeight;
  }, [activeGoal, parsedInitialWeight, parsedTargetWeight]);

  console.log("[MilestoneProgress] Debug:", {
    activeGoal,
    currentWeight,
    currentWeightDate,
    prevCurrentWeight: prevCurrentWeightRef.current,
    prevCurrentWeightDate: prevCurrentWeightDateRef.current,
    parsedInitialWeight,
    parsedTargetWeight,
    isWeightLossGoal,
  });

  const processedMilestones = useMemo((): ProcessedMilestone[] => {
    if (
      !activeGoal ||
      currentWeight === null ||
      !Array.isArray(activeGoal.milestones) ||
      parsedInitialWeight === null ||
      parsedTargetWeight === null
    ) {
      return [];
    }

    const overallInitialWeight = parsedInitialWeight;
    const overallTargetWeight = parsedTargetWeight;

    const result = (activeGoal.milestones || [])
      .map((milestone) => {
        let isConflicting = false;
        if (isWeightLossGoal) {
          if (milestone.target_weight > overallInitialWeight) isConflicting = true;
          if (milestone.target_weight < overallTargetWeight) isConflicting = true;
        } else {
          if (milestone.target_weight < overallInitialWeight) isConflicting = true;
          if (milestone.target_weight > overallTargetWeight) isConflicting = true;
        }

        return {
          ...milestone,
          status: getMilestoneStatus(milestone, currentWeight, activeGoal.start_date, isWeightLossGoal),
          isConflicting,
        };
      })
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
    console.log("[MilestoneProgress] processedMilestones:", result);
    return result;
  }, [activeGoal, currentWeight, isWeightLossGoal, parsedInitialWeight, parsedTargetWeight]);

  useEffect(() => {
    const prevCurrentWeight = prevCurrentWeightRef.current;
    const prevCurrentWeightDate = prevCurrentWeightDateRef.current;
    const weightChanged =
      currentWeight !== null && prevCurrentWeight !== null && currentWeight !== prevCurrentWeight;
    const dateChanged =
      currentWeightDate && prevCurrentWeightDate && currentWeightDate !== prevCurrentWeightDate;
    if (weightChanged && dateChanged && activeGoal) {
      const justCompleted: Milestone[] = [];
      const milestonesArr = Array.isArray(activeGoal.milestones) ? activeGoal.milestones : [];
      for (const milestone of milestonesArr) {
        const prevStatus = getMilestoneStatus(milestone, prevCurrentWeight, activeGoal.start_date, isWeightLossGoal);
        const currentProcessedMilestone = processedMilestones.find((pm) => pm.id === milestone.id);
        const currentStatusValue = currentProcessedMilestone
          ? currentProcessedMilestone.status
          : getMilestoneStatus(milestone, currentWeight, activeGoal.start_date, isWeightLossGoal);
        if (prevStatus !== "completed" && currentStatusValue === "completed") {
          justCompleted.push(milestone);
        }
      }
      if (justCompleted.length > 0) {
        justCompleted.sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
        console.log("[MilestoneProgress] justCompleted milestones:", justCompleted);
        dispatch({ type: "SET_NEWLY_COMPLETED", milestone: justCompleted[0] || null });
        if (clearCelebrationTimerRef.current) clearTimeout(clearCelebrationTimerRef.current);
        clearCelebrationTimerRef.current = setTimeout(() => {
          dispatch({ type: "SET_NEWLY_COMPLETED", milestone: null });
        }, 5000);
      }
    }
    prevCurrentWeightRef.current = currentWeight;
    prevCurrentWeightDateRef.current = currentWeightDate;
  }, [currentWeight, currentWeightDate, activeGoal, processedMilestones, isWeightLossGoal]);

  const alertFlags = useMemo(() => {
    if (!activeGoal || !Array.isArray(activeGoal.milestones) || !currentWeightDate) {
      return { showVetReminder: false, showPlateauAlert: false, showAcceleratedLoss: false };
    }
    const start = new Date(activeGoal.start_date);
    const now = new Date(currentWeightDate);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const showVetReminder = diffDays > 0 && diffDays % 28 < 14;

    const weights = processedMilestones
      .filter((m) => m.status === "completed")
      .slice(-3)
      .map((m) => m.target_weight);
    const showPlateauAlert = weights.length === 3 && Math.max(...weights) - Math.min(...weights) <= 0.1;

    let showAcceleratedLoss = false;
    if (processedMilestones.length >= 2) {
      const last = processedMilestones[processedMilestones.length - 1];
      const prev = processedMilestones[processedMilestones.length - 2];
      if (
        last &&
        prev &&
        prev.target_weight > 0 &&
        (prev.target_weight - last.target_weight) / prev.target_weight > 0.015
      ) {
        showAcceleratedLoss = true;
      }
    }

    return { showVetReminder, showPlateauAlert, showAcceleratedLoss };
  }, [activeGoal, processedMilestones, currentWeightDate]);

  let progressValue = 0;
  if (parsedInitialWeight !== null && parsedTargetWeight !== null && parsedTargetWeight !== parsedInitialWeight) {
    if (isWeightLossGoal) {
      progressValue =
        ((parsedInitialWeight - (currentWeight ?? parsedInitialWeight)) /
          (parsedInitialWeight - parsedTargetWeight)) *
        100;
    } else {
      progressValue =
        (((currentWeight ?? parsedInitialWeight) - parsedInitialWeight) /
          (parsedTargetWeight - parsedInitialWeight)) *
        100;
    }
  }
  const goalProgressPercentage = Math.min(100, Math.max(0, progressValue));
  const isGoalAchieved =
    parsedTargetWeight !== null &&
    parsedInitialWeight !== null &&
    (isWeightLossGoal
      ? (currentWeight ?? parsedInitialWeight) <= parsedTargetWeight
      : (currentWeight ?? parsedInitialWeight) >= parsedTargetWeight);
  const pieData = [
    { name: "Completed", value: goalProgressPercentage },
    { name: "Remaining", value: 100 - goalProgressPercentage },
  ];

  const archiveGoalMutation = useMutation({
    mutationFn: async ({ goalId, hhId }: { goalId: string; hhId: string }) => {
      const res = await fetch(`/api/weight/goals?id=${goalId}&householdId=${hhId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
    },
    onSuccess: () => {
      refreshCounter.current += 1;
      if (onGoalArchived) onGoalArchived();
    },
    onError: (err) => {
      console.error("[MilestoneProgress] Erro ao arquivar meta automaticamente:", err);
    },
  });

  useEffect(() => {
    if (!activeGoal) return;
    const goalWithMeta = activeGoal as WeightGoalWithMilestones & { status?: string; isArchived?: boolean };
    const isGoalAlreadyArchived =
      (typeof goalWithMeta.status === "string" &&
        (goalWithMeta.status === "completed" || goalWithMeta.status === "cancelled")) ||
      (typeof goalWithMeta.isArchived === "boolean" && goalWithMeta.isArchived === true);
    if (activeGoal && isGoalAchieved && !hasArchived.current && householdId && !isGoalAlreadyArchived) {
      hasArchived.current = true;
      archiveGoalMutation.mutate({ goalId: activeGoal.id, hhId: householdId });
    }
    if (!isGoalAchieved) {
      hasArchived.current = false;
    }
  }, [activeGoal, isGoalAchieved, householdId, onGoalArchived, archiveGoalMutation]);

  const handleOpenSheet = (milestone: Milestone) => {
    dispatch({ type: "OPEN_SHEET", milestone });
  };

  return {
    state,
    dispatch,
    activeGoal,
    currentWeight,
    parsedTargetWeight,
    processedMilestones,
    alertFlags,
    goalProgressPercentage,
    isGoalAchieved,
    pieData,
    handleOpenSheet,
  };
}
