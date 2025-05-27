"use client";

import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import CurrentStatusCard from '@/components/weight/current-status-card';
import WeightTrendChart from '@/components/weight/weight-trend-chart';
import QuickLogPanel, { WeightLogFormValues } from '@/components/weight/quick-log-panel';
import RecentHistoryList from '@/components/weight/recent-history-list';
import { MilestoneProgress } from '@/components/weight/milestone-progress';
import CatAvatarStack from '@/components/weight/cat-avatar-stack';
import { OnboardingTour } from '@/components/weight/onboarding-tour';
import GoalFormSheet, { GoalFormData } from '@/components/weight/goal-form-sheet';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Gauge, HelpCircle, Plus } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFeeding } from "@/lib/context/FeedingContext";
import { useWeight, useSelectCurrentWeight, useSelectWeightHistory, useSelectWeightGoals, useSelectWeightProgress } from "@/lib/context/WeightContext";
import { calcularIdadeEmAnos, gerarMarcos } from '@/lib/weight/milestoneUtils';
import { handleAsyncError, AppError, ValidationError } from '@/lib/utils/error-handler';
import { format, parseISO, compareDesc } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedRoute from '@/components/auth/protected-route';
import { GlobalLoading } from "@/components/ui/global-loading";
import { useLoadingState } from "@/lib/hooks/useLoadingState";
import { CatsContext } from '@/lib/context/CatsContext';
import { UserContext } from "@/lib/context/UserContext";

// Interface for Cat - matches expected API structure from /api/cats
interface Cat {
  id: string;
  name: string;
  photo_url?: string | null;
  weight?: number;
  targetWeight?: number;
  healthTip?: string;
  activeGoalId?: string | null;
  birthdate?: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for WeightGoalWithMilestones - matches expected API structure from /api/goals
interface WeightGoalWithMilestones {
  id: string;
  cat_id: string;
  goal_name: string;
  start_date: string;
  target_date: string;
  initial_weight: number;
  target_weight: number;
  unit: 'kg' | 'lbs';
  milestones: Milestone[];
  description?: string;
  isArchived?: boolean;
  achieved_date?: string | null;
  outcome_notes?: string;
}

// Interface for Milestone
interface Milestone {
  id: string;
  name: string;
  target_weight: number;
  target_date: string;
  description?: string;
  goal_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for WeightLog - matches API structure from /api/weight-logs
interface WeightLog {
  id: string;
  cat_id: string;
  date: string;
  weight: number;
  notes?: string;
  measured_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for WeightGoal - matches WeightContext
interface WeightGoal {
  id: string;
  catId: string;
  targetWeight: number;
  targetDate?: Date;
  startWeight?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define a type for the data used specifically when editing a log
// It combines form values with a mandatory ID.
type LogForEditing = WeightLogFormValues & { id: string };

// Interface para compatibilidade com o componente MilestoneProgress
interface WeightLogEntry {
  id: string;
  catId: string;
  weight: number;
  date: string;
  notes?: string;
  measuredBy?: string;
}

// Interface para o gato com propriedades adicionais
interface CatWithDetails extends Cat {
  targetWeight?: number;
  healthTip?: string;
  unit?: 'kg' | 'lbs';
}

const WeightPage = () => {
  // --- HOOKS AND STATE (ALWAYS AT THE TOP) ---
  // State
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [showArchivedGoals, setShowArchivedGoals] = useState(false);
  const [isQuickLogPanelOpen, setIsQuickLogPanelOpen] = useState(false);
  const [logToEditData, setLogToEditData] = useState<LogForEditing | null>(null);
  const [logChangeTimestamp, setLogChangeTimestamp] = useState<number>(Date.now());
  const [isGoalFormSheetOpen, setIsGoalFormSheetOpen] = useState(false);

  // Contexts (called unconditionally)
  const userContext = useContext(UserContext);
  const catsContext = useContext(CatsContext);

  // --- EARLY RETURNS (ANTES DE QUALQUER DESESTRUTURAÇÃO) ---
  if (!userContext) {
    return <div>Carregando contexto do usuário...</div>;
  }

  if (!catsContext) {
    return <div>Carregando contexto dos gatos...</div>;
  }

  // Destructure context results imediatamente após garantir que os contextos existem
  const { state: userState } = userContext || { state: {} };
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState as any; // Use 'as any' ou refine type se necessário
  const userId = currentUser?.id;
  const householdId = currentUser?.householdId;

  const { state: catsState, forceRefresh } = catsContext || { state: { cats: [] }, forceRefresh: () => {} };
  const { cats, isLoading: isLoadingCats } = catsState;

  const { state: feedingState } = useFeeding();
  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;

  const { state: weightState, dispatch: weightDispatch, forceRefresh: refreshWeightData } = useWeight();
  const { weightLogs, weightGoals, isLoading: isLoadingWeight } = weightState;

  // Custom Hooks depending on ID/state (selectedCatId and context states are defined above)
  // const currentWeight = useSelectCurrentWeight(selectedCatId || '');
  // const weightHistory = useSelectWeightHistory(selectedCatId || '', 30);
  // const activeGoalsHooks = useSelectWeightGoals(selectedCatId || '');

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
      setSelectedCatId(cats[0].id);
    }
  }, [cats, selectedCatId]); // Dependencies are defined

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenOnboarding = localStorage.getItem('hasSeenWeightOnboarding');
      if (!hasSeenOnboarding && cats.length > 0) {
        setIsOnboardingOpen(true);
      }
    }
  }, [cats]); // Dependency is defined


  // --- MEMOIZED VALUES (useMemo hooks) ---
  // Memoize selected cat (depends on selectedCatId, cats which are defined above)
  // const selectedCat = useMemo(() =>
  //   cats.find(cat => cat.id === selectedCatId) || null
  // , [selectedCatId, cats]);

  // Usar snake_case para goals vindos da API (depends on weightGoals which is defined above)
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
    const active = goalsForThisCat.find(goal => !goal.isArchived) || null;
    const archived = goalsForThisCat.filter(goal => goal.isArchived);
    return { activeGoalForSelectedCat: active, archivedGoalsForSelectedCat: archived };
  }, [selectedCatId, goals]); // Dependencies are defined

  // Memoize current and previous log (depends on weightLogsSnake which is defined above)
  // const { currentLog, previousLog } = useMemo(() => {
  //   if (weightLogsSnake.length === 0) return { currentLog: null, previousLog: null };
  //   const sortedLogs = [...weightLogsSnake].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  //   return {
  //     currentLog: sortedLogs[0] || null,
  //     previousLog: sortedLogs[1] || null,
  //   };
  // }, [weightLogsSnake]); // Dependency is defined


  // --- HANDLERS (useCallback hooks - depend on variables defined above) ---
  const handleOnboardingComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasSeenWeightOnboarding', 'true');
    }
    setIsOnboardingOpen(false);
    toast("Tour de integração concluído!", {
      description: "Você sempre pode encontrar ajuda clicando no botão 'Ajuda / Tour'.",
    });
  }, []); // No dependencies needed here

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
        const now = new Date();
        const payload = {
          ...formData,
          date: formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date, // YYYY-MM-DD
          catId: catId, // Use catId parameter
        };

        const url = logIdToUpdate
          ? `/api/weight/logs?id=${logIdToUpdate}&householdId=${householdId}` // Pass householdId to PUT
          : `/api/weight/logs?householdId=${householdId}`; // Pass householdId to POST
        const method = logIdToUpdate ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
          throw new AppError(
            errorData.error || `Falha ao ${logIdToUpdate ? 'atualizar' : 'criar'} registro de peso`,
            'API_ERROR',
            errorData,
            'Registro de Peso'
          );
        }

        // Após criar/editar, buscar logs atualizados e atualizar peso do gato
        // Refetch logs for the entire household since WeightContext stores all logs
        const logsResponse = await fetch(`/api/weight/logs?householdId=${householdId}`, {
          headers: { 'X-User-ID': userId }
        });
        if (!logsResponse.ok) throw new Error(`Failed to fetch updated logs: ${logsResponse.statusText}`);
        const updatedLogs: WeightLog[] = await logsResponse.json();
        // Mapear para camelCase antes de despachar para o contexto
        const mappedLogs = updatedLogs.map((log: any) => ({
          ...log,
          catId: log.cat_id,
          createdAt: log.created_at ? new Date(log.created_at) : undefined,
          updatedAt: log.updated_at ? new Date(log.updated_at) : undefined,
          measuredBy: log.measured_by,
          date: new Date(log.date), // Ensure date is a Date object for frontend logic
        }));
        weightDispatch({ type: 'FETCH_WEIGHT_LOGS_SUCCESS', payload: mappedLogs });

        // The API should update the cat's weight, so no need to update locally here
        // If cats context needs updating, consider a separate mechanism or refetch.

        setLogChangeTimestamp(Date.now());
        setIsQuickLogPanelOpen(false); // This might need adjustment if panel is per-cat
        setLogToEditData(null); // Clear logToEditData when closing
      },
      {
        context: 'Registro de Peso',
        successMessage: logIdToUpdate ? "Registro atualizado com sucesso!" : "Peso registrado com sucesso!",
        onError: (error) => {
          console.error("Error in handleLogSubmit:", error);
        }
      }
    );
  }, [userId, householdId, weightDispatch]); // Depend on userId, householdId, weightDispatch

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
      const response = await fetch(`/api/weight/logs?id=${logIdToDelete}&householdId=${householdId}`, { // Add householdId to delete
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido ao excluir." }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      // After deleting, refetch logs for the household
      const logsResponse = await fetch(`/api/weight/logs?householdId=${householdId}`, {
         headers: { 'X-User-ID': userId }
      });
      if (!logsResponse.ok) throw new Error(`Failed to fetch updated logs: ${logsResponse.statusText}`);
       const updatedLogs: WeightLog[] = await logsResponse.json();
       const mappedLogs = updatedLogs.map((log: any) => ({
         ...log,
         catId: log.cat_id,
         createdAt: log.created_at ? new Date(log.created_at) : undefined,
         updatedAt: log.updated_at ? new Date(log.updated_at) : undefined,
         measuredBy: log.measured_by,
         date: new Date(log.date), // Ensure date is a Date object
       }));
       weightDispatch({ type: 'FETCH_WEIGHT_LOGS_SUCCESS', payload: mappedLogs });
      setLogChangeTimestamp(Date.now());
      toast.success("Registro de peso excluído com sucesso.");
      return true;
    } catch (error: any) {
      console.error("Falha ao excluir o registro de peso:", error);
      toast.error(`Falha ao excluir o registro: ${error.message}`);
      return false;
    }
  }, [userId, householdId, weightDispatch]); // Dependencies are defined

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
            formData.start_date
          ).map(milestone => ({
            ...milestone,
            goal_id: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
        }

        const goalPayload = {
          ...formData,
          user_id: userId,
          cat_id: catId, // Use the catId parameter
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          milestones: milestones.length > 0 ? milestones : undefined
        };

        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId,
          },
          body: JSON.stringify(goalPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erro desconhecido ao criar meta." }));
          throw new AppError(
            errorData.error || `Falha ao criar meta: ${response.status}`,
            'API_ERROR',
            errorData,
            'Criação de Meta'
          );
        }

        // After creating a goal, refetch all goals for the household
        // The /api/goals route currently doesn't support filtering by household,
        // so we refetch all and let WeightContext handle filtering.
        const goalsResponse = await fetch(`/api/goals?householdId=${householdId}`, { // Added householdId param based on analysis of /api/goals GET (although not strictly needed per its current implementation)
           headers: { 'X-User-ID': userId } // userId is needed for /api/goals
        });
        if (!goalsResponse.ok) throw new Error(`Failed to fetch updated goals: ${goalsResponse.statusText}`);
        const updatedGoals: WeightGoalWithMilestones[] = await goalsResponse.json();
        // Mapping to camelCase is done in WeightContext's memoized `goals`
        const mappedGoals = updatedGoals.map((goal: any) => ({
          id: goal.id,
          catId: goal.cat_id,
          targetWeight: goal.target_weight,
          targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
          startWeight: goal.initial_weight ?? goal.start_weight,
          status: goal.status ?? (goal.isArchived ? 'completed' : 'active'),
          notes: goal.description ?? goal.notes ?? '',
          createdBy: goal.created_by ?? goal.createdBy ?? '',
          createdAt: goal.created_at ? new Date(goal.created_at) : new Date(),
          updatedAt: goal.updated_at ? new Date(goal.updated_at) : new Date(),
        }));
        weightDispatch({ type: 'FETCH_WEIGHT_GOALS_SUCCESS', payload: mappedGoals });

        setLogChangeTimestamp(Date.now());
        setIsGoalFormSheetOpen(false); // This might need adjustment if panel is per-cat
      },
      {
        context: 'Criação de Meta',
        successMessage: "Nova meta de peso criada com sucesso!",
        onError: (error) => {
          console.error("Error in handleGoalSubmit:", error);
        }
      }
    );

  }, [userId, householdId, cats, weightDispatch]); // Dependencies are defined


  // --- EARLY RETURNS (AFTER ALL HOOKS) ---

  if (isLoadingUser || isLoadingCats || !currentUser || typeof currentUser.householdId !== 'string' || currentUser.householdId.length === 0) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
        <p className="text-center text-muted-foreground">
          Carregando dados...
        </p>
      </div>
    );
  }

  if (cats.length === 0) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
        <p className="text-center text-muted-foreground">
          Nenhum gato encontrado. Adicione um gato para começar a acompanhar o peso dele.
        </p>
        <OnboardingTour isOpen={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} onComplete={handleOnboardingComplete} />
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => setIsOnboardingOpen(true)}>Mostrar Tour Novamente</Button>
        </div>
      </div>
    );
  }

  // Early return se selectedCatId ainda não foi definido
  if (!selectedCatId) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">Painel de Acompanhamento de Peso</h1>
        <p className="text-center text-muted-foreground">
          Carregando gato selecionado...
        </p>
      </div>
    );
  }

  // Check for selectedCat existence before accessing its properties in render logic
  if (!selectedCatId) {
     // This condition might still be possible if selectedCatId is set but the cat isn't found in the cats array.
     // This return handles that edge case.
    return (
      <div className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Painel de Acompanhamento de Peso</h1>
        <CatAvatarStack cats={cats} selectedCatId={null} onSelectCat={handleSelectCat} className="mb-6"/>
        <p className="text-center text-muted-foreground">Por favor, selecione um gato válido para ver os detalhes.</p>
        <OnboardingTour isOpen={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} onComplete={handleOnboardingComplete} />
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => setIsOnboardingOpen(true)}>Mostrar Tour Novamente</Button>
        </div>
      </div>
    );
  }


  // --- RENDER LOGIC ---
  const selectedCatForForm = selectedCatId ? cats.find(c => c.id === selectedCatId) : null;
  const selectedCatActiveGoal = selectedCatId ? goals.find(goal => goal.cat_id === selectedCatId && !goal.isArchived) : null;
  const selectedCatCurrentLog = selectedCatId ? weightLogsSnake.filter(log => log.cat_id === selectedCatId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null : null;
  const catForEditedLog = logToEditData ? cats.find(c => c.id === logToEditData.catId) : null;

  return (
    <ProtectedRoute children={
      <div className="container mx-auto p-4 space-y-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Gauge className="h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="text-3xl font-bold">Painel de Peso</h1>
          </div>
          <p className="text-base text-muted-foreground ml-11">
            Acompanhe e gerencie o peso de seus gatos.
          </p>
        </div>

        <div className="flex justify-between items-center mb-6 gap-4">
          <CatAvatarStack
            className="flex-grow"
            cats={cats} // cats defined above
            selectedCatId={selectedCatId} // selectedCatId defined above
            onSelectCat={handleSelectCat} // handleSelectCat defined above
            aria-label="Seleção de gatos"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOnboardingOpen(true)} // setIsOnboardingOpen defined above
            aria-label="Abrir tour de ajuda"
            aria-haspopup="dialog"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* isLoadingWeight and selectedCat?.name defined above */}
        {isLoadingWeight && <p className="text-center text-muted-foreground">Carregando histórico de peso para {selectedCatForForm?.name ?? ''}...</p>}

        {/* Iterate over cats and render details for each */}
        {cats.map(cat => {
           // Call hooks and derive data for *this specific cat* within the loop
          const currentWeightForCat = useSelectCurrentWeight(cat.id);
          const weightHistoryForCat = useSelectWeightHistory(cat.id, 30); // Use 30 days as before

           // Find the active goal for this cat from the memoized goals array
          const activeGoalForCat = goals.find(goal => goal.cat_id === cat.id && !goal.isArchived) || null;
          // Find archived goals for this cat from the memoized goals array
          const archivedGoalsForCat = goals.filter(goal => goal.cat_id === cat.id && goal.isArchived);


           // Find the latest feeding log for this cat
           const lastFeedingForCat = feedingLogs.find(log => log.catId === cat.id); // feedingLogs defined above

           // Find current and previous weight logs for this cat from the memoized weightLogsSnake array
           const logsForCat = weightLogsSnake.filter(log => log.cat_id === cat.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           const currentLogForCat = logsForCat[0] || null;
           const previousLogForCat = logsForCat[1] || null;


          return (
            <div key={cat.id} className={`space-y-6 border p-4 rounded-lg ${selectedCatId === cat.id ? 'border-primary' : ''}`}> {/* Add a border for selected cat */}
                <h2 className="text-xl font-semibold">{cat.name}</h2> {/* Display cat's name */}

              {/* isLoadingWeight applies to all, consider how to show loading per cat if needed */}
              {isLoadingWeight && <p className="text-center text-muted-foreground">Carregando dados de peso para {cat.name}...</p>}

              {/* Render detail components for this specific cat */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Keep grid layout - maybe adjust columns */}
                 {/* Left Column / Main Info */}
                 <div className="lg:col-span-1 space-y-6">
                   <CurrentStatusCard
                     currentWeight={currentLogForCat?.weight ?? cat.weight ?? 0}
                     currentWeightDate={currentLogForCat?.date ?? null}
                     targetWeight={activeGoalForCat?.target_weight}
                     healthTip={undefined} // Assuming healthTip is not needed or derived elsewhere
                     unit={activeGoalForCat?.unit || 'kg'}
                     previousWeight={previousLogForCat?.weight}
                     previousWeightDate={previousLogForCat?.date ?? null}
                     birthDate={typeof cat.birthdate === 'string' ? cat.birthdate : cat.birthdate?.toISOString() || null}
                     lastFeeding={lastFeedingForCat}
                     aria-label={`Status atual de peso de ${cat.name}`}
                   />
                   {/* QuickLogPanel - Needs catId to log for this specific cat */}
                    {/* Render QuickLogPanel inside the loop, but manage its open state and logToEditData globally or per-cat */}
                    {/* For simplicity now, let's keep it potentially global but ensure it gets the correct catId */}
                    {/* If the QuickLogPanel is opened via the RecentHistoryList, it will receive the specific log with its catId */}
                    {/* If it's opened via a general button, it needs to know which cat it's for. This might require a per-cat open state or passing the catId when opening. */}
                    {/* Let's assume for now QuickLogPanel open state is linked to the selectedCatId for simplicity of this refactor */}
                    {/* If QuickLogPanel should be usable for ANY cat shown, its state management needs to be per-cat */}
                    {/* Reverting QuickLogPanel and GoalFormSheet back to outside the loop for now, linked to selectedCatId, as refactoring them to be per-cat is a larger task. */}
                 </div>

                 {/* Right Column / Charts and Details */}
                 <div className="lg:col-span-2 space-y-6">
                   {activeGoalForCat && (
                     <MilestoneProgress
                       activeGoal={activeGoalForCat}
                       currentWeight={currentLogForCat?.weight ?? cat.weight ?? 0}
                       currentWeightDate={currentLogForCat?.date ?? null}
                       aria-label={`Progresso da meta de peso de ${cat.name}`}
                     />
                   )}
                   {!activeGoalForCat && !isLoadingWeight && (
                     <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                       <div className="flex flex-col items-center justify-center space-y-2">
                         <p className="text-center text-muted-foreground">
                           Nenhuma meta ativa definida para {cat.name}.
                         </p>
                          {/* Button to open goal form for this specific cat */}
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => {
                              setSelectedCatId(cat.id); // Select this cat when opening goal form
                              setIsGoalFormSheetOpen(true);
                           }}
                           aria-label={`Definir nova meta de peso para ${cat.name}`}
                           aria-haspopup="dialog"
                         >
                           <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                           Definir Nova Meta
                         </Button>
                       </div>
                     </div>
                   )}

                   <WeightTrendChart
                     catId={cat.id} // Pass the current cat's ID
                     userId={userId} // userId defined above
                     logChangeTimestamp={logChangeTimestamp} // logChangeTimestamp defined above
                     aria-label={`Gráfico de tendência de peso de ${cat.name}`}
                   />
                   <RecentHistoryList
                     catId={cat.id} // Pass the current cat's ID
                     userId={userId} // userId defined above
                     onEditRequest={handleRequestEditLog} // handleRequestEditLog uses global logToEditData state
                     onDeleteRequest={(logId) => handleRequestDeleteLog(logId, cat.id)} // Pass cat.id to delete handler
                     logChangeTimestamp={logChangeTimestamp} // logChangeTimestamp defined above
                     aria-label={`Histórico recente de peso de ${cat.name}`}
                   />

                    {/* Archived Goals - Display for each cat */}
                    <Accordion type="single" collapsible className="w-full" aria-label={`Metas arquivadas para ${cat.name}`}>
                      <AccordionItem value={`archived-goals-${cat.id}`}> {/* Unique value */}
                        <AccordionTrigger>Metas Arquivadas</AccordionTrigger>
                        <AccordionContent className="space-y-3 pb-20">
                           {isLoadingWeight && <p className="text-sm text-muted-foreground">Carregando metas arquivadas para {cat.name}...</p>}
                          {!isLoadingWeight && archivedGoalsForCat.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma meta arquivada para {cat.name}.</p>
                          )}
                          {!isLoadingWeight && archivedGoalsForCat.map((goal) => (
                             <div key={goal.id} className="p-4 border rounded-lg bg-muted/50 opacity-80 hover:opacity-100 transition-opacity">
                                {/* ... Archived Goal Display Logic (same as before) ... */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <h4 className="font-medium text-sm">{goal.goal_name} <span className="text-muted-foreground">(Arquivada)</span></h4>
                                  {goal.achieved_date && (
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      Alcançada: {goal.achieved_date ? new Date(goal.achieved_date).toLocaleDateString() : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  <div>
                                    <p>Alvo: {goal.target_weight}{goal.unit}</p>
                                    <p>Inicial: {goal.initial_weight}{goal.unit}</p>
                                  </div>
                                  <div>
                                    <p>Início: {goal.start_date ? new Date(goal.start_date).toLocaleDateString() : ''}</p>
                                    <p>Fim: {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : ''}</p>
                                  </div>
                                </div>
                                {goal.description && (
                                  <p className="text-xs mt-2 border-t pt-2">{goal.description}</p>
                                )}
                                {goal.outcome_notes && (
                                  <p className="text-xs mt-2 border-t pt-2 text-muted-foreground">
                                    Resultado: {goal.outcome_notes}
                                  </p>
                                )}
                             </div>
                           ))}
                           {/* Keep the global showArchivedGoals switch if desired, maybe move it outside the loop */}
                            {/* Removing the global switch here to avoid confusion, the Accordion handles visibility per cat */}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                 </div>
               </div>
            </div>
          );
        })}

        {/* Onboarding Tour (Keep outside the loop as it's global) */}
        <OnboardingTour
          isOpen={isOnboardingOpen}
          onOpenChange={setIsOnboardingOpen}
          onComplete={handleOnboardingComplete}
          aria-label="Tour de introdução"
        />
        {/* GoalFormSheet - Renderização condicional corrigida */}
        {selectedCatId && (
          <GoalFormSheet
            isOpen={isGoalFormSheetOpen}
            onOpenChange={setIsGoalFormSheetOpen}
            onSubmit={(formData) => handleGoalSubmit(selectedCatId, formData)}
            catId={selectedCatId}
            currentWeight={selectedCatCurrentLog?.weight ?? selectedCatForForm?.weight}
            defaultUnit={selectedCatActiveGoal?.unit || 'kg'}
            birthDate={typeof selectedCatForForm?.birthdate === 'string' ? selectedCatForForm?.birthdate : selectedCatForForm?.birthdate?.toISOString() || null}
            aria-label="Formulário de meta de peso"
          />
        )}
        {/* QuickLogPanel - permanece igual */}
        {isQuickLogPanelOpen && logToEditData && (
          <QuickLogPanel
            catId={logToEditData.catId}
            onLogSubmit={(formData) => handleLogSubmit(logToEditData.catId, formData, logToEditData.id)}
            logToEdit={logToEditData}
            isPanelOpen={isQuickLogPanelOpen}
            onPanelOpenChange={(isOpen) => {
              setIsQuickLogPanelOpen(isOpen);
              if (!isOpen) {
                setLogToEditData(null);
              }
            }}
            aria-label={`Painel de edição de registro de peso para ${catForEditedLog?.name || ''}`}
          />
        )}

        {/* Global "Mostrar Arquivadas" switch - Re-adding outside the loop if needed */}
        {/* <div className="flex items-center justify-center space-x-2 mt-4">
            <Label htmlFor="show-archived-goals" className="text-sm">Mostrar Metas Arquivadas (Todos os Gatos)</Label>
              <Switch
                id="show-archived-goals"
                checked={showArchivedGoals}
                onCheckedChange={setShowArchivedGoals}
                aria-label="Mostrar metas arquivadas para todos os gatos"
              />
          </div> */}


      </div>
    } />
  );
};

// Helper to find a cat by ID (can be used if needed)
// const findCatById = (cats: Cat[], catId: string | null) => {
//   if (!catId) return null;
//   return cats.find(cat => cat.id === catId);
// };

export default WeightPage;