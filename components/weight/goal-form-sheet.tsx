"use client";

import React, { useReducer } from 'react';
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { DateTimePicker } from "@/components/ui/datetime-picker-new";

export interface GoalFormData {
  cat_id: string;
  goal_name: string;
  initial_weight: number;
  target_weight: number;
  unit: 'kg' | 'lbs';
  start_date?: string;
  target_date?: string;
  description?: string;
}

interface GoalFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: GoalFormData) => Promise<void>;
  catId: string | null;
  currentWeight?: number | null;
  defaultUnit?: 'kg' | 'lbs';
  birthDate?: string | null;
}

type GoalFormState = {
  goalName: string;
  initialWeight: string;
  targetWeight: string;
  editedUnit: 'kg' | 'lbs' | null;
  startDate: Date | null;
  targetDate: Date | null;
  description: string;
  isSubmitting: boolean;
};

type GoalFormAction =
  | { type: 'SET_FIELD'; field: 'goalName' | 'initialWeight' | 'targetWeight' | 'description'; value: string }
  | { type: 'SET_UNIT'; value: 'kg' | 'lbs' }
  | { type: 'SET_START_DATE'; value: Date | null }
  | { type: 'SET_TARGET_DATE'; value: Date | null }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'INIT_FROM_WEIGHT'; currentWeight: number | null | undefined }
  | { type: 'RESET_AFTER_SUBMIT'; currentWeight: number | null | undefined };

const initialGoalFormState: GoalFormState = {
  goalName: '',
  initialWeight: '',
  targetWeight: '',
  editedUnit: null,
  startDate: null,
  targetDate: null,
  description: '',
  isSubmitting: false,
};

function goalFormReducer(state: GoalFormState, action: GoalFormAction): GoalFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_UNIT':
      return { ...state, editedUnit: action.value };
    case 'SET_START_DATE':
      return { ...state, startDate: action.value };
    case 'SET_TARGET_DATE':
      return { ...state, targetDate: action.value };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    case 'INIT_FROM_WEIGHT':
      return {
        ...state,
        initialWeight: action.currentWeight ? String(action.currentWeight) : state.initialWeight,
        startDate: new Date(),
      };
    case 'RESET_AFTER_SUBMIT':
      return {
        ...initialGoalFormState,
        initialWeight: action.currentWeight ? String(action.currentWeight) : '',
      };
    default:
      return state;
  }
}

const GoalFormSheet: React.FC<GoalFormSheetProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  catId,
  currentWeight,
  defaultUnit = 'kg',
  birthDate,
}) => {
  const [state, dispatch] = useReducer(goalFormReducer, initialGoalFormState);
  const { goalName, initialWeight, targetWeight, editedUnit, startDate, targetDate, description, isSubmitting } = state;
  const unit = editedUnit ?? defaultUnit;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      dispatch({ type: 'INIT_FROM_WEIGHT', currentWeight });
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catId) {
      toast.error("ID do gato não encontrado. Não é possível criar a meta.");
      return;
    }
    if (!goalName.trim()) {
      toast.error("Por favor, dê um nome para sua meta.");
      return;
    }
    if (new Date(targetDate ?? '') <= new Date(startDate ?? '')) {
      toast.error("A data alvo deve ser posterior à data de início.");
      return;
    }

    const parsedInitialWeight = parseFloat(initialWeight);
    const parsedTargetWeight = parseFloat(targetWeight);

    if (isNaN(parsedInitialWeight) || isNaN(parsedTargetWeight) || parsedInitialWeight <= 0 || parsedTargetWeight <= 0) {
      toast.error("Os pesos inicial e alvo devem ser números positivos.");
      return;
    }

    if (parsedInitialWeight > parsedTargetWeight) {
      const weeks = (targetDate!.getTime() - startDate!.getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeks <= 0) {
        toast.error("O período entre as datas deve ser de pelo menos 7 dias para validar a meta de peso.");
        return;
      }
      let initialKg = parsedInitialWeight;
      let targetKg = parsedTargetWeight;
      if (unit === 'lbs') {
        initialKg = parsedInitialWeight * 0.453592;
        targetKg = parsedTargetWeight * 0.453592;
      }
      const weeklyLoss = (initialKg - targetKg) / weeks;
      const weeklyLossPercent = weeklyLoss / initialKg;
      if (weeklyLossPercent > 0.02) {
        toast.error("Meta insegura: a perda semanal de peso excede 2%. Por favor, defina um objetivo mais gradual.");
        return;
      }
    }

    dispatch({ type: 'SET_SUBMITTING', value: true });
    try {
      await onSubmit({
        cat_id: catId || '',
        goal_name: goalName.trim(),
        initial_weight: parsedInitialWeight,
        target_weight: parsedTargetWeight,
        unit,
        start_date: startDate ? startDate.toISOString().split('T')[0] : '',
        target_date: targetDate ? targetDate.toISOString().split('T')[0] : '',
        description: description.trim() || undefined,
      });
      dispatch({ type: 'RESET_AFTER_SUBMIT', currentWeight });
    } catch (error) {
      console.error("Erro ao submeter meta:", error);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  };

  if (!catId) return null;

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Definir Nova Meta de Peso</DrawerTitle>
            <DrawerDescription>
              Preencha os detalhes da nova meta de peso para seu gato.
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-4 py-2 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="goalName">Nome da Meta</Label>
              <Input 
                id="goalName" 
                value={goalName} 
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'goalName', value: e.target.value })} 
                placeholder="Ex: Chegar ao peso ideal"
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialWeight">Peso Inicial</Label>
                <Input 
                  id="initialWeight" 
                  type="number" 
                  step="0.01" 
                  value={initialWeight} 
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'initialWeight', value: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetWeight">Peso Alvo</Label>
                <Input 
                  id="targetWeight" 
                  type="number" 
                  step="0.01" 
                  value={targetWeight} 
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'targetWeight', value: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select value={unit} onValueChange={(value: 'kg' | 'lbs') => dispatch({ type: 'SET_UNIT', value })}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="lbs">Libras (lbs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início</Label>
                <DateTimePicker
                  value={startDate ?? undefined}
                  onChange={(date) => dispatch({ type: 'SET_START_DATE', value: date ?? null })}
                  placeholder="Selecione a data de início"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Data Alvo</Label>
                <DateTimePicker
                  value={targetDate ?? undefined}
                  onChange={(date) => dispatch({ type: 'SET_TARGET_DATE', value: date ?? null })}
                  placeholder="Selecione a data alvo"
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })} 
                placeholder="Alguma observação sobre a meta?"
                className="resize-none"
              />
            </div>
          </form>
          <DrawerFooter className="px-4 pb-4 pt-2">
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Salvando Meta...' : 'Salvar Meta'}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GoalFormSheet;
