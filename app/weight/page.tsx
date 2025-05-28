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
import { Gauge, HelpCircle, Plus, Scale, Target, Clock, TrendingUp, CalendarDays, Heart } from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";

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
  const [isTipsSheetOpen, setIsTipsSheetOpen] = useState(false);

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

  // Filtro para logs do gato selecionado
  const logsForSelectedCat = useMemo(() =>
    weightLogsSnake
      .filter(log => log.cat_id === selectedCatId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [weightLogsSnake, selectedCatId]
  );

  // Histórico recente (últimos 5)
  const recentHistory = logsForSelectedCat.slice(0, 5);

  // Dados para gráfico (filtrando por período)
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90'>('30');
  // O gráfico já usa useSelectWeightHistory internamente, só precisamos passar o período

  // selectedCatForForm e selectedCatActiveGoal precisam ser declarados antes do uso
  const selectedCatForForm = selectedCatId ? cats.find(c => c.id === selectedCatId) : null;
  const selectedCatActiveGoal = selectedCatId ? goals.find(goal => goal.cat_id === selectedCatId && !goal.isArchived) : null;

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
  const selectedCatCurrentLog = selectedCatId ? weightLogsSnake.filter(log => log.cat_id === selectedCatId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null : null;
  const catForEditedLog = logToEditData ? cats.find(c => c.id === logToEditData.catId) : null;

  return (
    <ProtectedRoute children={
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <motion.div
          className="mx-auto max-w-md lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Header (agora span em todas as colunas) */}
          <motion.div
            className="text-center lg:col-span-3"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between gap-2 mb-1 relative">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Gauge className="h-8 w-8 text-primary" aria-hidden="true" />
                  <h1 className="text-2xl font-bold text-foreground">Painel de Peso</h1>
                </div>
                <p className="text-sm text-muted-foreground">Acompanhe a saúde do seu gato</p>
              </div>
              {/* Botão de adicionar meta */}
              <Button
                size="icon"
                variant="ghost"
                className=""
                onClick={() => setIsGoalFormSheetOpen(true)}
                aria-label="Nova Meta de Peso"
              >
                <Scale className="h-6 w-6 text-primary" />
              </Button>
            </div>
            <div className="w-full flex justify-center mt-4">
              <div className="border-b border-gray-200 w-full max-w-4xl" />
            </div>
          </motion.div>

          {/* Coluna 1: Seletor de Gatos */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card>
                <CardContent className="pt-6 bg-card text-card-foreground">
                  <div className="flex gap-3 px-2 overflow-x-auto lg:overflow-visible p-[2px]">
                    {cats.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg p-3 transition-colors ${
                          selectedCatId === cat.id ? "bg-blue-50 ring-2 ring-blue-500" : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={cat.photo_url || "/placeholder.svg"} alt={cat.name} />
                          <AvatarFallback>{cat.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Coluna 2: Peso Atual, Meta, Progresso da Meta */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Scale className="h-4 w-4 text-primary" />
                    Peso Atual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{currentWeight}</div>
                  <div className="text-sm text-muted-foreground">{selectedCatActiveGoal?.unit || "kg"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    Meta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCatActiveGoal ? (
                    <>
                      <div className="text-2xl font-bold text-foreground">{goalWeight}</div>
                      <div className="text-sm text-muted-foreground">{selectedCatActiveGoal?.unit || "kg"}</div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <span className="text-xs text-muted-foreground text-center">Nenhuma meta definida.</span>
                      <Button
                        className="mt-3"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsGoalFormSheetOpen(true)}
                      >
                        Definir Meta
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground">Progresso da Meta</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsTipsSheetOpen(true)}>
                      <Heart className="mr-2 h-4 w-4 text-primary" />
                      Ver Dicas
                    </Button>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    {progress >= 100
                      ? "Parabéns! Meta alcançada! 🎉"
                      : progress >= 90
                      ? "Quase lá! 🎯"
                      : progress >= 75
                      ? "Ótimo progresso! 💪"
                      : progress >= 50
                      ? "Meio caminho! 🌟"
                      : progress >= 25
                      ? "Bom começo! 👍"
                      : "Começando agora! 🚀"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {progress >= 75 ? "No caminho certo" : "Atenção"}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Coluna 3: Gráfico de Tendência + Histórico Recente */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tendência de Peso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedPeriod} onValueChange={value => setSelectedPeriod(value as '30' | '60' | '90')} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="30">30 Dias</TabsTrigger>
                      <TabsTrigger value="60">60 Dias</TabsTrigger>
                      <TabsTrigger value="90">90 Dias</TabsTrigger>
                    </TabsList>
                    <TabsContent value={selectedPeriod} className="mt-4">
                      <WeightTrendChart
                        catId={selectedCatId}
                        userId={userId}
                        logChangeTimestamp={logChangeTimestamp}
                        period={parseInt(selectedPeriod)}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Histórico Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentHistory.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <div>
                            <div className="font-medium text-foreground">{entry.weight} kg</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(entry.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString("pt-BR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Botão Flutuante */}
          <Button
            size="icon"
            className="fixed bottom-24 right-4 z-50 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg flex items-center justify-center h-14 w-14 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 print:hidden"
            onClick={() => setIsQuickLogPanelOpen(true)}
            aria-label="Registrar Peso"
          >
            <Plus className="h-7 w-7" />
          </Button>

          {/* Painel de log rápido (QuickLogPanel) */}
          <QuickLogPanel
            catId={selectedCatId || ''}
            onLogSubmit={async (data, logIdToUpdate) => {
              if (selectedCatId) {
                await handleLogSubmit(selectedCatId, data, logIdToUpdate);
              }
            }}
            logToEdit={logToEditData || undefined}
            isPanelOpen={isQuickLogPanelOpen}
            onPanelOpenChange={setIsQuickLogPanelOpen}
          />

          {/* Bottom Sheet de Dicas */}
          <Sheet open={isTipsSheetOpen} onOpenChange={setIsTipsSheetOpen}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>⚖️ Dicas para Controle de Peso</SheetTitle>
                <SheetDescription>
                  Recomendações para um acompanhamento saudável do peso do seu gato.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-2 text-base text-foreground">
                <div className="space-y-2">
                  <p className="font-semibold">🩺 Consulte sempre o veterinário:</p>
                  <p>Antes de iniciar qualquer plano de perda ou ganho de peso, busque orientação profissional.</p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">📊 Use o app a seu favor:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Registre o peso regularmente para acompanhar tendências.</li>
                    <li>Compartilhe os dados com o veterinário.</li>
                    <li>Fique atento a alertas de mudanças bruscas.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">⚠️ Atenção:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Evite dietas restritivas sem acompanhamento.</li>
                    <li>Perda de peso rápida pode ser perigosa.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">💡 Dica extra:</p>
                  <p>Combine os registros do app com exames clínicos para um cuidado completo.</p>
                </div>
                <div className="pt-2 border-t text-sm text-muted-foreground">
                  O app é um apoio, mas não substitui o veterinário. Priorize sempre a saúde do seu gato!
                </div>
              </div>
              <SheetClose asChild>
                <Button className="mt-6 w-full" variant="default">Fechar</Button>
              </SheetClose>
            </SheetContent>
          </Sheet>

          {/* Bottom Sheet de Nova Meta */}
          <GoalFormSheet
            isOpen={isGoalFormSheetOpen}
            onOpenChange={setIsGoalFormSheetOpen}
            onSubmit={async (data) => {
              if (selectedCatId) {
                await handleGoalSubmit(selectedCatId, data);
              }
            }}
            catId={selectedCatId}
            currentWeight={currentWeight}
            defaultUnit={selectedCatActiveGoal?.unit || 'kg'}
            birthDate={selectedCatForForm?.birthdate}
          />
        </motion.div>
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