import React from 'react';
<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { differenceInWeeks, parseISO } from 'date-fns'; // For date calculations

interface CurrentStatusCardProps {
  currentWeight: number;
  currentWeightDate?: string | null; // Date of the current weight log (ISO string)
  targetWeight: number;
  healthTip: string;
  previousWeight?: number | null; // Previous weight measurement
  previousWeightDate?: string | null; // Date of the previous weight log (ISO string)
  unit?: 'kg' | 'lbs'; // To display with velocity
=======
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Progress } from 'components/ui/progress';

interface CurrentStatusCardProps {
  currentWeight: number;
  targetWeight: number;
  healthTip: string;
>>>>>>> 1b1a616 (feat(weight): implement CurrentStatusCard and integrate into weight page)
}

const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({
  currentWeight,
<<<<<<< HEAD
  currentWeightDate,
  targetWeight,
  healthTip,
  previousWeight,
  previousWeightDate,
  unit = 'kg',
}) => {
  const progressValue = targetWeight > 0 ? (currentWeight / targetWeight) * 100 : 0;
  const cappedProgressValue = Math.min(100, Math.max(0, progressValue));

  const displayCurrentWeight = typeof currentWeight === 'number' && !isNaN(currentWeight) 
    ? currentWeight.toFixed(1) 
    : 'N/D'; // N/A translated to N/D (Não Disponível)

  if (typeof currentWeight !== 'number' && currentWeight != null) { // Log if it's not number and not null/undefined
    console.warn(`CurrentStatusCard received non-numeric currentWeight. Type: ${typeof currentWeight}, Value:`, currentWeight);
  }

  let velocity: string | null = null;
  let VelocityIcon = Minus;

  if (
    previousWeight !== null && previousWeight !== undefined && 
    previousWeightDate && currentWeightDate && 
    currentWeight !== null && currentWeight !== undefined
  ) {
    try {
        const dateCurrent = parseISO(currentWeightDate);
        const datePrevious = parseISO(previousWeightDate);
        
        const weeksDifference = differenceInWeeks(dateCurrent, datePrevious, { roundingMethod: 'round' });

        if (weeksDifference > 0) {
            const weightDifference = currentWeight - previousWeight;
            const weeklyVelocity = weightDifference / weeksDifference;
            
            if (weeklyVelocity > 0.005) { // Threshold to show trending up
                velocity = `+${weeklyVelocity.toFixed(2)} ${unit}/week`;
                VelocityIcon = TrendingUp;
            } else if (weeklyVelocity < -0.005) { // Threshold to show trending down
                velocity = `${weeklyVelocity.toFixed(2)} ${unit}/week`;
                VelocityIcon = TrendingDown;
            } else {
                velocity = `~0.0 ${unit}/week (Stable)`;
                VelocityIcon = Minus;
            }
        } else if (weeksDifference === 0 && currentWeight !== previousWeight) {
            velocity = "Mudança recente, tempo insuficiente para taxa semanal.";
            VelocityIcon = currentWeight > previousWeight ? TrendingUp : TrendingDown;
        } else if (currentWeight === previousWeight){
            velocity = `Estável (sem alteração desde o último registro)`;
             VelocityIcon = Minus;
        } else {
            velocity = "Aguardando mais dados para taxa.";
            VelocityIcon = Minus;
        }
    } catch (e) {
        console.error("Error calculating velocity:", e);
        velocity = "Erro ao calcular a taxa.";
         VelocityIcon = Minus;
    }
  }
=======
  targetWeight,
  healthTip,
}) => {
  const progressValue = targetWeight > 0 ? (currentWeight / targetWeight) * 100 : 0;
>>>>>>> 1b1a616 (feat(weight): implement CurrentStatusCard and integrate into weight page)

  return (
    <Card>
      <CardHeader>
<<<<<<< HEAD
        <CardTitle>Estado Atual do Peso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold">{displayCurrentWeight} <span className="text-lg font-normal text-muted-foreground">{unit}</span></p>
          {targetWeight > 0 && (
            <p className="text-sm text-muted-foreground">
              Meta: {typeof targetWeight === 'number' ? targetWeight.toFixed(1) : 'N/D'} {unit}
            </p>
          )}
        </div>

        {targetWeight > 0 && (
          <div>
            <Progress value={cappedProgressValue} className="w-full" />
            <p className="text-xs text-muted-foreground text-center mt-1">
              {cappedProgressValue.toFixed(0)}% para a meta
            </p>
          </div>
        )}

        {velocity && (
          <div className="flex items-center justify-center text-sm text-muted-foreground pt-2">
            <VelocityIcon className={`h-4 w-4 mr-1.5 ${VelocityIcon === TrendingUp ? 'text-green-500' : VelocityIcon === TrendingDown ? 'text-red-500' : 'text-muted-foreground'}`} />
            {velocity}
          </div>
        )}

        <Alert className="mt-4 bg-secondary/50 border-secondary">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary/90">Dica de Saúde</AlertTitle>
          <AlertDescription className="text-foreground/80">
            {healthTip}
          </AlertDescription>
        </Alert>
=======
        <CardTitle>Current Weight Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">
            Current Weight: <span className="font-bold">{currentWeight} kg</span>
          </p>
          <p className="text-sm font-medium">
            Target Weight: <span className="font-bold">{targetWeight} kg</span>
          </p>
        </div>
        <Progress value={progressValue} className="w-full" />
        
        {/* Optional Circular Progress Indicator - Placeholder */}
        {/* <div className="flex items-center justify-center">
          <p className="text-lg font-semibold">{Math.round(progressValue)}%</p>
        </div> */}

        <div className="p-3 bg-blue-100 border-l-4 border-blue-500 text-blue-700 rounded-md">
          {/* Placeholder for vet icon */}
          <span className="mr-2">🩺</span> 
          <p className="text-sm">{healthTip}</p>
        </div>
>>>>>>> 1b1a616 (feat(weight): implement CurrentStatusCard and integrate into weight page)
      </CardContent>
    </Card>
  );
};

export default CurrentStatusCard; 