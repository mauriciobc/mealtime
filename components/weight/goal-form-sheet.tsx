"use client";

import React, { useState, useEffect } from 'react';
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
  start_date: string; // ISO string YYYY-MM-DD
  target_date: string; // ISO string YYYY-MM-DD
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

const GoalFormSheet: React.FC<GoalFormSheetProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  catId,
  currentWeight,
  defaultUnit = 'kg',
  birthDate,
}) => {
  const [goalName, setGoalName] = useState('');
  const [initialWeight, setInitialWeight] = useState<string>('');
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(defaultUnit);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentWeight) {
      setInitialWeight(String(currentWeight));
    }
    // Set default start date to today
    setStartDate(new Date());
  }, [currentWeight, isOpen]); // Reset/initialize when sheet opens or currentWeight changes

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

    // Validação de segurança: bloqueia metas com perda semanal >2%
    if (parsedInitialWeight > parsedTargetWeight) {
      const weeks = (targetDate!.getTime() - startDate!.getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeks <= 0) {
        toast.error("O período entre as datas deve ser de pelo menos 7 dias para validar a meta de peso.");
        return;
      }
      // Convert to kg if needed
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

    setIsSubmitting(true);
    try {
      await onSubmit({
        cat_id: catId,
        goal_name: goalName.trim(),
        initial_weight: parsedInitialWeight,
        target_weight: parsedTargetWeight,
        unit,
        start_date: startDate ? startDate.toISOString().split('T')[0] : '',
        target_date: targetDate ? targetDate.toISOString().split('T')[0] : '',
        description: description.trim() || undefined,
      });
      // Clear form on successful submit (parent component will close sheet)
      setGoalName('');
      setInitialWeight(currentWeight ? String(currentWeight) : '');
      setTargetWeight('');
      setUnit(defaultUnit);
      setStartDate(null);
      setTargetDate(null);
      setDescription('');
    } catch (error) {
      // Error is handled by the parent onSubmit usually, but a local log can be useful
      console.error("Erro ao submeter meta:", error);
      // toast.error("Falha ao criar meta. Tente novamente."); // Parent will show specific error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!catId) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Definir Nova Meta de Peso</DrawerTitle>
            <DrawerDescription>
              Preencha os detalhes da nova meta de peso para seu gato.
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-4 py-2 space-y-4">
            <div>
              <Label htmlFor="goalName">Nome da Meta</Label>
              <Input 
                id="goalName" 
                value={goalName} 
                onChange={(e) => setGoalName(e.target.value)} 
                placeholder="Ex: Chegar ao peso ideal"
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="initialWeight">Peso Inicial</Label>
                <Input 
                  id="initialWeight" 
                  type="number" 
                  step="0.01" 
                  value={initialWeight} 
                  onChange={(e) => setInitialWeight(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="targetWeight">Peso Alvo</Label>
                <Input 
                  id="targetWeight" 
                  type="number" 
                  step="0.01" 
                  value={targetWeight} 
                  onChange={(e) => setTargetWeight(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div>
              <Label htmlFor="unit">Unidade</Label>
              <Select value={unit} onValueChange={(value: 'kg' | 'lbs') => setUnit(value)}>
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
              <div>
                <Label htmlFor="startDate">Data de Início</Label>
                <DateTimePicker
                  value={startDate ?? undefined}
                  onChange={(date) => setStartDate(date ?? null)}
                  placeholder="Selecione a data de início"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="targetDate">Data Alvo</Label>
                <DateTimePicker
                  value={targetDate ?? undefined}
                  onChange={(date) => setTargetDate(date ?? null)}
                  placeholder="Selecione a data alvo"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Alguma observação sobre a meta?"
              />
            </div>
          </form>
          <DrawerFooter className="px-4 pb-4 pt-2 border-t">
            <DrawerClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando Meta...' : 'Salvar Meta'}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GoalFormSheet; 