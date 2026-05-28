"use client";

import { MilestoneProgressProps } from "./milestone-progress-types";
import { useMilestoneProgress } from "./use-milestone-progress";
import { MilestoneProgressEmpty, MilestoneProgressContent } from "./milestone-progress-sections";

export type { MilestoneProgressProps } from "./milestone-progress-types";

export function MilestoneProgress(props: MilestoneProgressProps) {
  const data = useMilestoneProgress(props);

  if (!data.activeGoal || props.currentWeight === null) {
    return <MilestoneProgressEmpty />;
  }

  return (
    <MilestoneProgressContent
      activeGoal={data.activeGoal}
      currentWeight={props.currentWeight}
      parsedTargetWeight={data.parsedTargetWeight}
      state={data.state}
      dispatch={data.dispatch}
      processedMilestones={data.processedMilestones}
      alertFlags={data.alertFlags}
      goalProgressPercentage={data.goalProgressPercentage}
      isGoalAchieved={data.isGoalAchieved}
      pieData={data.pieData}
      onOpenSheet={data.handleOpenSheet}
    />
  );
}
