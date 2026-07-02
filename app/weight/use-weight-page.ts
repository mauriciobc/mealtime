"use client";

import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { toast } from 'sonner';
import QuickLogPanel, { WeightLogFormValues } from '@/components/weight/quick-log-panel';
import GoalFormSheet, { GoalFormData } from '@/components/weight/goal-form-sheet';
import { useFeeding } from "@/lib/context/FeedingContext";
import { useWeight } from "@/lib/context/WeightContext";
import { calcularIdadeEmAnos, gerarMarcos } from '@/lib/weight/milestoneUtils';
import { handleAsyncError, AppError, ValidationError } from '@/lib/utils/error-handler';
import { useLoadingState } from "@/lib/hooks/useLoadingState";
import { CatsContext } from '@/lib/context/CatsContext';
import { UserContext } from "@/lib/context/UserContext";
import { logger } from '@/lib/monitoring/logger';
import { v2Delete, v2Post, v2Put } from '@/lib/api/v2-client';
import {
  Cat,
  WeightGoalWithMilestones,
  Milestone,
  WeightLog,
  LogForEditing,
  WeightLogEntry,
  WeightPageState,
} from './weight-page-types';

export function useWeightPage() {
  // State
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [showArchivedGoals, setShowArchivedGoals] = useState(false);
  const [isQuickLogPanelOpen, setIsQuickLogPanelOpen] = useState(false);
  const [logToEditData, setLogToEditData] = useState<LogForEditing | null>(null);
  const [logChangeTimestamp, setLogChangeTimestamp] = useState<number>(() => Date.now());
  const [isGoalFormSheetOpen, setIsGoalFormSheetOpen] = useState(false);
  const [isTipsSheetOpen, setIsTipsSheetOpen] = useState(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0); // contador de refresh automático
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90'>('30');

  // Contexts (called unconditionally)
  const userContext = useContext(UserContext);
  const catsContext = useContext(CatsContext);

  // All custom hooks MUST be called before any early returns
  const feedingHook = useFeeding();
  const weightHook = useWeight();

  // --- Destructure after all hooks are called ---
  const { state: userState } = userContext || { state: {} };
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState as any;
  const userId = currentUser?.id;
  const householdId = currentUser?.householdId;

  const { state: catsState, forceRefresh } = catsContext || { state: { cats: [] }, forceRefresh: () => {} };
  const { cats, isLoading: isLoadingCats } = catsState;

  const { state: feedingState } = feedingHook;
  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;

  const { state: weightState, forceRefresh: refreshWeightData } = weightHook;
  const { weightLogs, weightGoals, isLoading: isLoadingWeight } = weightState;

  // Other Hooks (depend on loading states defined above)
  useLoadingState(isLoadingCats, {
    description: 'Carregando dados dos gatos...',
    priority: 1,
  });

  useLoadingState(isLoadingWeight, {
    description: 'Carregando dados de peso...',
    priority: 2,
  });

  useLoadingState(isLoadingFeedings, {
    description: 'Carregando dados de alimentação...',
    priority: 3,
  });

  // Effects (depend on state and context data defined above)
  useEffect(() => {
    if (cats.length > 0 && !selectedCatId) {
      setSelectedCatId(cats[0]!.id);
    }
  }, [cats, selectedCatId]);

  // --- MEMOIZED VALUES (useMemo hooks) - ALL BEFORE EARLY RETURNS ---
  const goals = useMemo(() => weightGoals.map(goal => {
    const g: any = goal;
    return {
      ...g,
      cat_id: g.cat_id || g.catId,
      goal_name: g.goal_name || g.notes || 'Meta de Peso',
      start_date: g.start_date || (g.createdAt ? g.createdAt.toISOString() : undefined) || (g.created_at),
      target_date: g.target_date || (g.targetDate ? g.targetDate.toISOString() : undefined) || (g.target_date),
      initial_weight: g.initial_weight || g.startWeight || 0,
      target_weight: g.target_weight || g.targetWeight,
      unit: g.unit || 'kg',
      milestones: g.milestones || [],
      description: g.description || g.notes,
      isArchived: g.isArchived !== undefined ? g.isArchived : (g.status === 'completed' || g.status === 'cancelled'),
      achieved_date: g.achieved_date || (g.status === 'completed' ? (g.updatedAt ? g.updatedAt.toISOString() : null) : null),
      outcome_notes: g.outcome_notes || (g.status === 'completed' ? 'Meta alcançada' : null),
    };
  }), [weightGoals]);

  // Memoize weight logs in snake_case (depends on weightLogs which is defined above)
  const weightLogsSnake = useMemo(() => weightLogs.map(log => {
    const l: any = log;
    return {
      ...l,
      cat_id: l.cat_id || l.catId,
      date: l.date instanceof Date ? l.date.toISOString() : l.date,
      weight: typeof l.weight === 'string' ? parseFloat(l.weight) : (typeof l.weight === 'number' ? l.weight : 0),
      notes: l.notes,
      measured_by: l.measured_by || l.measuredBy,
      created_at: l.created_at || (l.createdAt ? l.createdAt.toISOString() : undefined),
      updated_at: l.updated_at || (l.updatedAt ? l.updatedAt.toISOString() : undefined),
    };
  }), [weightLogs]);

  // Memoize active and archived goals (depend on selectedCat and goals which are defined above)
  const { activeGoalForSelectedCat, archivedGoalsForSelectedCat } = useMemo(() => {
    if (!selectedCatId) return { activeGoalForSelectedCat: null, archivedGoalsForSelectedCat: [] };
    const goalsForThisCat = goals.filter(goal => goal.cat_id === selectedCatId);
    // Considere arquivada se status for completed/cancelled ou isArchived true
    const isArchived = (g: any) =>
      (typeof g.status === 'string' && (g.status === 'completed' || g.status === 'cancelled')) ||
      (typeof g.isArchived === 'boolean' && g.isArchived === true);
    const active = goalsForThisCat.find(goal => !isArchived(goal)) || null;
    const archived = goalsForThisCat.filter(goal => isArchived(goal));
    return { activeGoalForSelectedCat: active, archivedGoalsForSelectedCat: archived };
  }, [selectedCatId, goals]);

  // selectedCatActiveGoal agora sempre reflete a meta ativa, nunca arquivada
  const selectedCatActiveGoal = activeGoalForSelectedCat;
  // Nova lógica: se não houver meta ativa, exiba a última meta arquivada
  const selectedCatLastArchivedGoal = archivedGoalsForSelectedCat.length > 0 ? archivedGoalsForSelectedCat[0] : null;

  // Memoize current and previous log (depends on weightLogsSnake which is defined above)
  // const { currentLog, previousLog } = useMemo(() => {
  //   if (weightLogsSnake.length === 0) return { currentLog: null, previousLog: null };
  //   const sortedLogs = [...weightLogsSnake].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  //   return {
  //     currentLog: sortedLogs[0] || null,
  //     previousLog: sortedLogs[1] || null,
  //   };
  // }, [weightLogsSnake]); // Dependency is defined

  // Filtro para logs do gato selecionado
  const logsForSelectedCat = useMemo(() =>
    weightLogsSnake
      .filter(log => log.cat_id === selectedCatId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [weightLogsSnake, selectedCatId]
  );

  // Histórico recente (últimos 5)
  const recentHistory = logsForSelectedCat.slice(0, 5);

  // selectedCatForForm e selectedCatActiveGoal precisam ser declarados antes do uso
  const selectedCatForForm = selectedCatId ? cats.find(c => c.id === selectedCatId) : null;

  // Progresso da meta
  const currentWeight = logsForSelectedCat[0]?.weight ?? selectedCatForForm?.weight ?? 0;
  const goalWeight = selectedCatActiveGoal?.target_weight ?? 0;
  const initialWeight = selectedCatActiveGoal?.initial_weight ?? selectedCatActiveGoal?.startWeight ?? 0;
  let progress = 0;
  if (selectedCatActiveGoal && initialWeight !== goalWeight) {
    const totalDistance = goalWeight - initialWeight;
    const currentDistance = currentWeight - initialWeight;
    // Progresso é a fração do caminho percorrido, limitado entre 0 e 100
    progress = Math.min(Math.max((currentDistance / totalDistance) * 100, 0), 100);
  }

  // Última alimentação do gato selecionado
  const lastFeedingForCat = feedingLogs.find(log => log.catId === selectedCatId);

  // --- NOVO: cálculo centralizado do estado da página (não altera renderização ainda) ---
  const pageState = useMemo<WeightPageState>(() => {
    if (isLoadingUser || isLoadingCats || isLoadingWeight || isLoadingFeedings) return { type: 'LOADING' };
    const errorCat = catsState && 'error' in catsState ? catsState.error : undefined;
    const errorWeight = weightState && 'error' in weightState ? weightState.error : undefined;
    const errorFeeding = feedingState && 'error' in feedingState ? feedingState.error : undefined;
    if (errorUser || errorCat || errorWeight || errorFeeding) return { type: 'ERROR', error: errorUser || errorCat || errorWeight || errorFeeding || 'Erro desconhecido' };
    if (!currentUser) return { type: 'NO_USER' };
    if (!currentUser.householdId) return { type: 'NO_HOUSEHOLD' };
    if (cats.length === 0) return { type: 'NO_CATS' };
    if (!selectedCatId) return { type: 'NO_SELECTED_CAT' };
    return { type: 'READY' };
  }, [isLoadingUser, isLoadingCats, isLoadingWeight, isLoadingFeedings, errorUser, catsState, weightState, feedingState, currentUser, cats, selectedCatId]);

  // --- HANDLERS (useCallback hooks - depend on variables defined above) ---
  const handleSelectCat = useCallback((catId: string) => {
    setSelectedCatId(catId);
    setLogToEditData(null);
    setIsQuickLogPanelOpen(false);
  }, []); // No dependencies needed here

  const handleLogSubmit = useCallback(async (catId: string, formData: WeightLogFormValues, logIdToUpdate?: string): Promise<void> => {
    if (!userId) { // userId is defined above
      throw new ValidationError("Você precisa estar logado para registrar pesos.", null, "Registro de Peso");
    }

    if (!householdId) { // householdId is defined above
      throw new ValidationError("ID da casa não identificado.", null, "Registro de Peso");
    }

    await handleAsyncError(
      async () => {
        const payload = {
          catId: catId,
          weight: typeof formData.weight === 'string' ? parseFloat(formData.weight) : formData.weight,
          date: formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date,
          notes: formData.notes || undefined,
        };

        if (logIdToUpdate) {
          await v2Put(`/api/v2/weight-logs?id=${logIdToUpdate}`, payload);
        } else {
          await v2Post('/api/v2/weight-logs', payload);
        }

        await refreshWeightData();

        setLogChangeTimestamp(Date.now());
        setIsQuickLogPanelOpen(false); // This might need adjustment if panel is per-cat
        setLogToEditData(null); // Clear logToEditData when closing
      },
      {
        context: 'Registro de Peso',
        successMessage: logIdToUpdate ? "Registro atualizado com sucesso!" : "Peso registrado com sucesso!",
        onError: () => {
        }
      }
    );
  }, [userId, householdId, refreshWeightData]);

  const handleRequestEditLog = useCallback((log: WeightLogEntry) => {
    // The QuickLogPanel is global, open it and pass the log data
    const formData: LogForEditing = {
      id: log.id,
      catId: log.catId, // This is the correct catId from the log
      weight: log.weight,
      date: new Date(log.date),
      notes: log.notes || '',
    };
    setLogToEditData(formData);
    setIsQuickLogPanelOpen(true);
  }, []); // Dependencies: setLogToEditData, setIsQuickLogPanelOpen

  const handleRequestDeleteLog = useCallback(async (logIdToDelete: string, catId: string): Promise<boolean> => {
    if (!userId || !householdId) { // userId and householdId are defined above
      toast.error("Usuário ou casa não identificada.");
      return false;
    }

    const confirmed = window.confirm("Tem certeza que deseja excluir este registro de peso?");
    if (!confirmed) {
      return false;
    }

    try {
      await v2Delete(`/api/v2/weight-logs?id=${logIdToDelete}`);
      await refreshWeightData();
      setLogChangeTimestamp(Date.now());
      toast.success("Registro de peso excluído com sucesso.");
      return true;
    } catch (error: any) {
      toast.error(`Falha ao excluir o registro: ${error.message}`);
      return false;
    }
  }, [userId, householdId, refreshWeightData]);

  const handleGoalSubmit = useCallback(async (catId: string, formData: GoalFormData): Promise<void> => {
    if (!userId || !householdId) { // userId and householdId are defined above
      throw new ValidationError(
        "Usuário ou casa não identificada. Não é possível criar a meta.",
        null,
        "Criação de Meta"
      );
    }

    await handleAsyncError(
      async () => {
        let milestones: Milestone[] = [];
        let usedBirthdate: string | null = null;
        let usedAge: number | null = null;
        let initialWeightKg = formData.initial_weight;
        let targetWeightKg = formData.target_weight;

        // Find the specific cat in the cats array
        const cat = cats.find(c => c.id === catId); // Use the catId parameter
        if (cat?.birthdate) {
          usedBirthdate = typeof cat.birthdate === 'string' ? cat.birthdate : cat.birthdate?.toISOString();
          usedAge = calcularIdadeEmAnos(usedBirthdate);
        } else {
          toast.warning("Data de nascimento do gato não informada. Marque a data para metas mais precisas.");
          usedAge = 5;
        }

        if (formData.unit === 'lbs') {
          initialWeightKg = formData.initial_weight * 0.453592;
          targetWeightKg = formData.target_weight * 0.453592;
        }

        if (formData.unit === 'kg' || formData.unit === 'lbs') {
          milestones = gerarMarcos(
            initialWeightKg,
            targetWeightKg,
            usedAge ?? 5,
            formData.start_date || ''
          ).map(milestone => ({
            ...milestone,
            goal_id: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
        }

        const goalPayload = {
          cat_id: catId,
          goal_name: formData.goal_name || `Meta de peso - ${cat?.name ?? 'gato'}`,
          start_date: formData.start_date || new Date().toISOString().split('T')[0],
          target_date: formData.target_date,
          initial_weight: initialWeightKg,
          target_weight: targetWeightKg,
          unit: formData.unit,
          description: formData.description,
          milestones: milestones.length > 0 ? milestones : undefined,
        };

        await v2Post('/api/v2/goals', goalPayload);
        await refreshWeightData();

        setLogChangeTimestamp(Date.now());
        setIsGoalFormSheetOpen(false); // This might need adjustment if panel is per-cat
      },
      {
        context: 'Criação de Meta',
        successMessage: "Nova meta de peso criada com sucesso!",
        onError: () => {
        }
      }
    );

  }, [userId, householdId, cats, refreshWeightData]);

  // handler para passar para MilestoneProgress
  const handleGoalArchived = useCallback(() => {
    setAutoRefreshCount((c) => c + 1);
    refreshWeightData();
  }, [refreshWeightData]);

  // --- EARLY RETURNS (AFTER ALL HOOKS) ---
  return {
    pageState,
    cats,
    selectedCatId,
    setSelectedCatId,
    userId,
    currentUser,
    handleSelectCat,
    handleLogSubmit,
    handleRequestEditLog,
    handleRequestDeleteLog,
    handleGoalSubmit,
    handleGoalArchived,
    selectedCatActiveGoal,
    selectedCatLastArchivedGoal,
    recentHistory,
    logsForSelectedCat,
    currentWeight,
    goalWeight,
    progress,
    selectedCatForForm,
    logToEditData,
    isQuickLogPanelOpen,
    setIsQuickLogPanelOpen,
    isGoalFormSheetOpen,
    setIsGoalFormSheetOpen,
    isTipsSheetOpen,
    setIsTipsSheetOpen,
    selectedPeriod,
    setSelectedPeriod,
    logChangeTimestamp,
  };
}
