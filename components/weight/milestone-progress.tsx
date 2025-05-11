"use client";

<<<<<<< HEAD
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
=======
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For milestone completion alert
import { Button } from '@/components/ui/button';
// import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // For feeding adjustments
// import { CheckCircle2, AlertTriangle, Settings2, Edit } from 'lucide-react'; // Example icons

// Based on weight-tracking-todo.md schema reference
interface WeightGoalMilestone {
  id: string;
  goal_id: string;
  weight: number; // Representing Decimal as number
  date: string;   // Representing DateTime as string (ISO)
  notes?: string | null;
  // created_at will be managed by DB
>>>>>>> e13f30a (feat(weight): add MilestoneProgress component and integrate into dashboard)
}

interface WeightGoalWithMilestones {
  id: string;
<<<<<<< HEAD
  goal_name: string;
  start_date: string; // ISO date string
  target_date: string; // ISO date string for the overall goal
  initial_weight: number;
  target_weight: number;
  unit: 'kg' | 'lbs'; // Unit for weight values
  milestones: Milestone[];
  description?: string;
=======
  cat_id: string;
  target_weight: number;
  target_date?: string | null;
  start_weight?: number | null;
  status: string; // e.g., "active", "completed", "paused"
  notes?: string | null;
  created_by: string;
  milestones: WeightGoalMilestone[];
  // created_at, updated_at managed by DB
>>>>>>> e13f30a (feat(weight): add MilestoneProgress component and integrate into dashboard)
}

interface MilestoneProgressProps {
  activeGoal: WeightGoalWithMilestones | null;
  currentWeight: number | null;
<<<<<<< HEAD
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

export function MilestoneProgress({ activeGoal, currentWeight }: MilestoneProgressProps) {
  const [newlyCompletedMilestone, setNewlyCompletedMilestone] = useState<Milestone | null>(null);
  const [prevCurrentWeight, setPrevCurrentWeight] = useState<number | null>(currentWeight);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMilestoneForSheet, setSelectedMilestoneForSheet] = useState<Milestone | null>(null);

  const isWeightLossGoal = useMemo(() => {
    if (!activeGoal) return false;
    return activeGoal.target_weight < activeGoal.initial_weight;
  }, [activeGoal]);

  const processedMilestones = useMemo(() => {
    if (!activeGoal || currentWeight === null) return [];
    
    const overallInitialWeight = activeGoal.initial_weight;
    const overallTargetWeight = activeGoal.target_weight;

    return activeGoal.milestones
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
  }, [activeGoal, currentWeight, isWeightLossGoal]);

  useEffect(() => {
    if (currentWeight !== null && prevCurrentWeight !== null && currentWeight !== prevCurrentWeight && activeGoal) {
      const justCompleted: Milestone[] = [];
      for (const milestone of activeGoal.milestones) {
        // Use the new isWeightLossGoal for accurate previous status calculation
        const prevStatus = getMilestoneStatus(milestone, prevCurrentWeight, activeGoal.start_date, isWeightLossGoal);
        const currentProcessedMilestone = processedMilestones.find(pm => pm.id === milestone.id);
        // Ensure currentStatusValue also uses isWeightLossGoal, which it does via processedMilestones
        const currentStatusValue = currentProcessedMilestone ? currentProcessedMilestone.status : getMilestoneStatus(milestone, currentWeight, activeGoal.start_date, isWeightLossGoal);
        if (prevStatus !== 'completed' && currentStatusValue === 'completed') {
          justCompleted.push(milestone);
        }
      }
      if (justCompleted.length > 0) {
        justCompleted.sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
        setNewlyCompletedMilestone(justCompleted[0]);
      }
    }
    if (currentWeight !== prevCurrentWeight) {
      setPrevCurrentWeight(currentWeight);
    }
  }, [currentWeight, prevCurrentWeight, activeGoal, processedMilestones]);

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

  if (!activeGoal || currentWeight === null) {
    return (
      <Card>
        <CardHeader><CardTitle>Milestone Progress</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active weight goal or current weight data available.
=======
  // onOpenFeedingAdjustmentSheet?: (milestoneId: string) => void;
}

const MilestoneProgress: React.FC<MilestoneProgressProps> = ({
  activeGoal,
  currentWeight,
  // onOpenFeedingAdjustmentSheet
}) => {
  if (!activeGoal || currentWeight === null) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Milestone Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            { !activeGoal ? 'No active weight goal set.' : 'Current weight not available.' }
>>>>>>> e13f30a (feat(weight): add MilestoneProgress component and integrate into dashboard)
          </p>
        </CardContent>
      </Card>
    );
  }

<<<<<<< HEAD
  let progressValue = 0;
  if (activeGoal.target_weight !== activeGoal.initial_weight) {
    if (isWeightLossGoal) {
      progressValue = ((activeGoal.initial_weight - currentWeight) / (activeGoal.initial_weight - activeGoal.target_weight)) * 100;
    } else {
      progressValue = ((currentWeight - activeGoal.initial_weight) / (activeGoal.target_weight - activeGoal.initial_weight)) * 100;
    }
  }
  const goalProgressPercentage = Math.min(100, Math.max(0, progressValue));
  const isGoalAchieved = isWeightLossGoal ? currentWeight <= activeGoal.target_weight : currentWeight >= activeGoal.target_weight;

  const pieData = [
    { name: 'Completed', value: goalProgressPercentage },
    { name: 'Remaining', value: 100 - goalProgressPercentage },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Goal: {activeGoal.goal_name}</CardTitle>
          {activeGoal.description && <p className="text-sm text-muted-foreground pt-1">{activeGoal.description}</p>}
        </CardHeader>
        <CardContent>
          {newlyCompletedMilestone && (
            <Alert className="mb-4 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <AlertTitle className="font-semibold">Milestone Reached!</AlertTitle>
              <AlertDescription>
                Congratulations! You\\'ve completed: "{newlyCompletedMilestone.name}"
                (Target: {newlyCompletedMilestone.target_weight}{activeGoal.unit}).
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6 flex flex-col items-center">
            <div className="text-sm font-medium mb-2 text-center">
               Overall Goal Progress: {" "}
              <span className="font-semibold">
                {isGoalAchieved
                  ? "Goal Achieved!"
                  : `${currentWeight?.toFixed(1)}${activeGoal.unit} / ${activeGoal.target_weight.toFixed(1)}${activeGoal.unit}`}
              </span>
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

          <p className="text-lg font-semibold mb-3 mt-6">Milestones</p>
          {processedMilestones.length > 0 ? (
            <ul className="space-y-3">
              {processedMilestones.map((milestone) => (
                <li key={milestone.id} className="flex items-center justify-between p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Target: {milestone.target_weight}{activeGoal.unit} by {new Date(milestone.target_date).toLocaleDateString()}
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
                      {milestone.isConflicting ? 'Conflict' : milestone.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenSheet(milestone)} className="p-1.5 h-auto">
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                      <span className="sr-only">Adjust Feed for {milestone.name}</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No milestones defined for this goal.</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Adjust Feeding for: {selectedMilestoneForSheet?.name}</SheetTitle>
            <SheetDescription>
              Make changes to the feeding plan related to this milestone. 
              Target: {selectedMilestoneForSheet?.target_weight}{activeGoal?.unit} by {selectedMilestoneForSheet ? new Date(selectedMilestoneForSheet.target_date).toLocaleDateString() : 'N/A'}.
              {selectedMilestoneForSheet?.description && <p className="mt-2 italic">Notes: {selectedMilestoneForSheet.description}</p>}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            {/* Placeholder for feeding adjustment form/content */}
            <p className="text-sm text-muted-foreground">
              Feeding adjustment form or details for "{selectedMilestoneForSheet?.name}" will go here.
            </p>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
            {/* <Button type="submit">Save changes</Button> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
=======
  const { start_weight, target_weight, milestones } = activeGoal;
  const overallProgressValue = 
    start_weight && target_weight && currentWeight
      ? ((currentWeight - start_weight) / (target_weight - start_weight)) * 100
      : 0;

  const getMilestoneStatus = (milestone: WeightGoalMilestone): 'completed' | 'pending' | 'overdue' => {
    if (currentWeight >= milestone.weight) return 'completed';
    // Basic overdue check, could be more sophisticated based on milestone.date vs today
    if (new Date(milestone.date) < new Date() && currentWeight < milestone.weight) return 'overdue';
    return 'pending';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Milestone Progress</CardTitle>
        <CardDescription>
          Tracking progress towards target weight of {target_weight.toFixed(1)} kg.
          {start_weight && ` (Started at ${start_weight.toFixed(1)} kg)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span>Overall Progress</span>
            <span className="font-semibold">{Math.max(0, Math.min(100, overallProgressValue)).toFixed(0)}%</span>
          </div>
          <Progress value={Math.max(0, Math.min(100, overallProgressValue))} className="w-full" />
          {/* Placeholder for circular progress - currently using linear Progress */}
        </div>

        {milestones.length > 0 && (
          <div>
            <h4 className="text-md font-semibold mb-3">Milestones</h4>
            <div className="space-y-4">
              {milestones.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((milestone) => {
                const status = getMilestoneStatus(milestone);
                const isCompleted = status === 'completed';
                // Placeholder: Check if this is the most recently completed milestone for an alert
                // const isNewlyCompleted = isCompleted && recentlyCompletedMilestoneId === milestone.id;

                return (
                  <div key={milestone.id} className="flex items-center justify-between p-3 rounded-md border
                    ${isCompleted ? 'bg-green-50 border-green-200' : status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-secondary/30'}\">
                    <div>
                      <p className="font-medium flex items-center">
                        Target: {milestone.weight.toFixed(1)} kg by {new Date(milestone.date).toLocaleDateString()}
                        {/* Placeholder for conflict badge */}
                        {/* <Badge variant="destructive" className="ml-2">Conflict</Badge> */}
                      </p>
                      {milestone.notes && <p className="text-xs text-muted-foreground mt-0.5">{milestone.notes}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={isCompleted ? 'success' : status === 'overdue' ? 'destructive' : 'outline'}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      {/* Placeholder: Button to link to feeding adjustments (Sheet) */}
                      {/* <Button variant="ghost" size="sm" onClick={() => onOpenFeedingAdjustmentSheet?.(milestone.id)}>Adjust Feed</Button> */}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Placeholder: Animated Alert on milestone completion */}
            {/* {showMilestoneCompletionAlert && (
              <Alert className="mt-4 bg-green-100 border-green-500 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Milestone Reached!</AlertTitle>
                <AlertDescription>Great job! You've reached a weight milestone.</AlertDescription>
              </Alert>
            )} */}
          </div>
        )}
        {milestones.length === 0 && (
          <p className="text-sm text-muted-foreground">No specific milestones set for this goal.</p>
        )}
      </CardContent>
    </Card>
  );
};
>>>>>>> e13f30a (feat(weight): add MilestoneProgress component and integrate into dashboard)

export default MilestoneProgress; 