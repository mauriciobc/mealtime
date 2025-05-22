import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { differenceInWeeks, parseISO } from 'date-fns'; // For date calculations
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HeartPulse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CurrentStatusCardProps {
  currentWeight: number;
  currentWeightDate?: string | null; // Date of the current weight log (ISO string)
  targetWeight: number;
  healthTip: string;
  previousWeight?: number | null; // Previous weight measurement
  previousWeightDate?: string | null; // Date of the previous weight log (ISO string)
  unit?: 'kg' | 'lbs'; // To display with velocity
  birthDate?: string | null; // ISO date string for age-based classification
}

const classifyWeight = (weight: number, birthDate?: string | null): { label: string, color: 'green'|'yellow'|'red'|undefined } => {
  if (!weight || !birthDate) return { label: 'Desconhecido', color: undefined };
  const now = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return { label: 'Desconhecido', color: undefined };
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  // Chart: 0-1 month: 100-450g, 1-2m: 450-900g, 2-3m: 900-1350g, 3-6m: 1.35-2.7kg, 6-12m: 2.7-4.5kg, 1-2y: 3.6-5.4kg, 2+y: 3.6-5.4kg
  let min = 0, max = 0, severe = false;
  if (ageMonths < 1) { min = 0.1; max = 0.45; severe = weight < 0.08 || weight > 0.5; }
  else if (ageMonths < 2) { min = 0.45; max = 0.9; severe = weight < 0.35 || weight > 1.1; }
  else if (ageMonths < 3) { min = 0.9; max = 1.35; severe = weight < 0.7 || weight > 1.6; }
  else if (ageMonths < 6) { min = 1.35; max = 2.7; severe = weight < 1.0 || weight > 3.2; }
  else if (ageMonths < 12) { min = 2.7; max = 4.5; severe = weight < 2.2 || weight > 5.2; }
  else { min = 3.6; max = 5.4; severe = weight < 3.0 || weight > 6.0; }
  // Convert to kg if needed
  const w = weight;
  if (w < min) return { label: severe ? 'Muito abaixo do ideal' : 'Abaixo do ideal', color: severe ? 'red' : 'yellow' };
  if (w > max) return { label: severe ? 'Muito acima do ideal' : 'Acima do ideal', color: severe ? 'red' : 'yellow' };
  return { label: 'Peso ideal', color: 'green' };
};

const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({
  currentWeight,
  currentWeightDate,
  targetWeight,
  healthTip,
  previousWeight,
  previousWeightDate,
  unit = 'kg',
  birthDate,
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

  const weightClassification = classifyWeight(currentWeight, birthDate);

  const [isHealthSheetOpen, setIsHealthSheetOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado Atual do Peso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-3xl font-bold">{displayCurrentWeight} <span className="text-lg font-normal text-muted-foreground">{unit}</span></p>
            {weightClassification.label !== 'Desconhecido' && (
              <Badge
                variant={weightClassification.color === 'green' ? 'default' : weightClassification.color === 'yellow' ? 'secondary' : 'destructive'}
                className="ml-2"
              >
                {weightClassification.label}
              </Badge>
            )}
          </div>
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

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsHealthSheetOpen(true)}
          >
            <HeartPulse className="h-4 w-4 text-pink-500" />
            Dica de Saúde
          </Button>
        </div>
        <Sheet open={isHealthSheetOpen} onOpenChange={setIsHealthSheetOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>⚖️ Controle de Peso Seguro</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-2 text-base text-foreground">
              <div className="space-y-2">
                <p className="font-semibold">🩺 Acompanhamento obrigatório:</p>
                <p>Sempre consulte um veterinário antes de iniciar qualquer plano.</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">📊 Funcionalidades:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Registro e gráficos de evolução de peso.</li>
                  <li>Compartilhamento de dados com seu veterinário.</li>
                  <li>Alertas para mudanças bruscas.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-yellow-700 dark:text-yellow-400">⚠️ Atenção:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Perda de peso não supervisionada pode causar doenças graves.</li>
                  <li>Dietas restritivas sem orientação são perigosas.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">💡 Dica:</p>
                <p>Combine dados do app com exames clínicos para um cuidado completo.</p>
              </div>
              <div className="pt-2 border-t text-sm text-muted-foreground">
                Priorize a saúde do seu gato: o app é um apoio, não substitui o veterinário.
              </div>
            </div>
            <SheetClose asChild>
              <Button className="mt-6 w-full" variant="default">Fechar</Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
};

export default CurrentStatusCard; 