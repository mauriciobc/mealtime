"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from 'date-fns-tz';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { CatType, FeedingLog } from "@/lib/types";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { useCats } from "@/lib/context/CatsContext";
import { useFeeding } from "@/lib/context/FeedingContext";
import { toast } from "sonner";

interface ApiFeedingResponse {
  id: string;
  cat_id: string;
  fed_by: string | null;
  fed_at: string;
  amount: number;
  notes: string | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_type?: string | null;
  household_id: string;
  tempId?: string;
}

interface UseNewFeedingSheetOptions {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCatId?: number;
  initialFeedingLog?: FeedingLog;
}

export function useNewFeedingSheet({
  isOpen,
  onOpenChange,
  initialCatId,
  initialFeedingLog,
}: UseNewFeedingSheetOptions) {
  const { state: userState, refreshUser } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState, dispatch: feedingDispatch } = useFeeding();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { currentUser } = userState;
  const { cats, isLoading: isLoadingCats } = catsState;
  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [portions, setPortions] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [feedingStatus, setFeedingStatus] = useState<{ [key: string]: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }>({});
  const [foodTypes, setFoodTypes] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = useMemo(() => [
    { value: "Normal", label: "Normal" },
    { value: "Comeu Pouco", label: "Comeu Pouco" },
    { value: "Recusou", label: "Recusou" },
    { value: "Vomitou", label: "Vomitou" },
    { value: "Outro", label: "Outro (ver notas)" },
  ], []);

  const foodTypeOptions = useMemo(() => [
    { value: "__none__", label: "Não especificado" },
    { value: "ração seca premium", label: "Ração Seca Premium" },
    { value: "ração seca standard", label: "Ração Seca Standard" },
    { value: "ração úmida sachê", label: "Ração Úmida Sachê" },
    { value: "ração úmida lata", label: "Ração Úmida Lata" },
    { value: "petisco", label: "Petisco" },
    { value: "ração terapêutica", label: "Ração Terapêutica" },
    { value: "ração para filhotes", label: "Ração para Filhotes" },
    { value: "ração para idosos", label: "Ração para Idosos" },
    { value: "comida caseira", label: "Comida Caseira" },
    { value: "medicamento", label: "Medicamento" },
    { value: "outro", label: "Outro" },
  ], []);

  const householdCats = useMemo(() => {
    if (isLoadingCats || !cats || !currentUser?.householdId) {
      console.log('[NewFeedingSheet useMemo] Guard clause triggered:', { isLoadingCats, hasCats: !!cats, currentUserHouseholdId: currentUser?.householdId });
      return [];
    }

    const userHouseholdIdStr = String(currentUser.householdId);

    console.log(`[NewFeedingSheet useMemo] User Household ID: '${userHouseholdIdStr}'`);
    console.log('[NewFeedingSheet useMemo] Cats from context:', cats);

    const filteredCats = cats.filter(cat => {
      const catHouseholdIdStr = String(cat.householdId);
      const match = catHouseholdIdStr === userHouseholdIdStr;
      if (!match) {
        console.warn(`[NewFeedingSheet useMemo] Mismatch: Cat ID '${cat.id}' Household '${catHouseholdIdStr}' !== User Household '${userHouseholdIdStr}'`);
      }
      return match;
    });

    console.log('[NewFeedingSheet useMemo] Filtered cats:', filteredCats);

    return filteredCats;
  }, [cats, isLoadingCats, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialFeedingLog) {
        setSelectedCats([initialFeedingLog.catId]);
        setPortions({ [initialFeedingLog.catId]: initialFeedingLog.portionSize?.toString() || "" });
        setNotes({ [initialFeedingLog.catId]: initialFeedingLog.notes || "" });
        setFeedingStatus({ [initialFeedingLog.catId]: initialFeedingLog.status || "Normal" });
        setFoodTypes({ [initialFeedingLog.catId]: initialFeedingLog.food_type || "" });
      } else {
        const initialPortions: { [key: string]: string } = {};
        householdCats.forEach((cat: CatType) => {
          initialPortions[cat.id] = cat.portion_size?.toString() || "";
        });
        setPortions(initialPortions);
        setNotes({});
        const initialCatIdStr = initialCatId?.toString();
        if (initialCatIdStr && householdCats.some(cat => cat.id === initialCatIdStr)) {
          setSelectedCats([initialCatIdStr]);
          setFeedingStatus({ [initialCatIdStr]: "Normal" });
          setFoodTypes({ [initialCatIdStr]: "" });
        } else {
          setSelectedCats([]);
          setFeedingStatus({});
          setFoodTypes({});
        }
      }
    } else {
      setSelectedCats([]);
      setPortions({});
      setNotes({});
      setFeedingStatus({});
      setFoodTypes({});
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, householdCats, initialCatId, cats, initialFeedingLog]);

  const formatRelativeTime = useCallback((utcDateTime: Date | string | null | undefined) => {
    if (!utcDateTime) return "Nunca";
    try {
      const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar tempo relativo:', error);
      return "Data inválida";
    }
  }, []);

  const getLastFeedingLog = useCallback((catId: string): FeedingLog | undefined => {
    if (isLoadingFeedings || !feedingLogs) return undefined;
    return feedingLogs
      .filter(log => log.catId === catId)
      [0];
  }, [feedingLogs, isLoadingFeedings]);

  const toggleCatSelection = useCallback((catId: string) => {
    setSelectedCats(prev => {
      const isCurrentlySelected = prev.includes(catId);
      if (isCurrentlySelected) {
        setFeedingStatus(currentStatus => {
          const { [catId]: _, ...rest } = currentStatus;
          return rest;
        });
        return prev.filter(id => id !== catId);
      } else {
        setFeedingStatus(currentStatus => ({
          ...currentStatus,
          [catId]: "Normal"
        }));
        return [...prev, catId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allCatIds = householdCats.map(cat => cat.id);
    setSelectedCats(allCatIds);
    const newStatus = allCatIds.reduce((acc, id) => ({ ...acc, [id]: "Normal" }), {});
    setFeedingStatus(newStatus);
  }, [householdCats]);

  const handleDeselectAll = useCallback(() => {
    setSelectedCats([]);
    setFeedingStatus({});
  }, []);

  const handlePortionChange = useCallback((catId: string, value: string) => {
    setPortions(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleNotesChange = useCallback((catId: string, value: string) => {
    setNotes(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleStatusChange = useCallback((catId: string, value: string) => {
    setFeedingStatus(prev => ({ ...prev, [catId]: value as "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }));
  }, []);

  const handleFoodTypeChange = useCallback((catId: string, value: string) => {
    const storedValue = value === "__none__" ? "" : value;
    setFoodTypes(prev => ({ ...prev, [catId]: storedValue }));
  }, []);

  const getMealTypeFromTime = useCallback((timestamp: Date | string): "breakfast" | "lunch" | "dinner" | "snack" => {
    const userTimezone = getUserTimezone(currentUser?.preferences?.timezone);
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const hourStr = formatInTimeZone(date, userTimezone, 'H');
    const hour = parseInt(hourStr, 10);

    if (hour >= 5 && hour < 11) return "breakfast";
    if (hour >= 11 && hour < 15) return "lunch";
    if (hour >= 17 && hour < 21) return "dinner";
    return "snack";
  }, [currentUser?.preferences?.timezone]);

  const handleSubmit = async () => {
    if (selectedCats.length === 0) {
      toast.error("Selecione pelo menos um gato");
      return;
    }

    const opId = initialFeedingLog ? `edit-feeding-${initialFeedingLog.id}` : "submit-feeding-logs";
    setIsSubmitting(true);
    setError(null);
    addLoadingOperation({ id: opId, description: initialFeedingLog ? "Editando alimentação..." : "Registrando alimentações..." });

    const timestamp = initialFeedingLog ? initialFeedingLog.timestamp : new Date();
    const logsToCreate = [];
    let validationError = null;

    for (const catId of selectedCats) {
      const portion = portions[catId];
      const note = notes[catId] || "";
      const status = feedingStatus[catId] || "Normal";
      const foodType = foodTypes[catId] || "";
      const mealType = getMealTypeFromTime(timestamp);
      let portionNum = null;
      if (portion) {
        portionNum = parseFloat(portion);
        if (isNaN(portionNum) || portionNum < 0) {
          validationError = `Porção inválida para ${householdCats.find(c => c.id === catId)?.name}`;
          break;
        }
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logsToCreate.push({
        catId,
        portionSize: portionNum || 0,
        timestamp: typeof timestamp === 'string' ? timestamp : timestamp.toISOString(),
        notes: note,
        status,
        mealType,
        food_type: foodType?.trim() || undefined,
        unit: 'g',
        tempId
      });
    }

    if (validationError) {
      toast.error("Erro de Validação", { description: validationError });
      setError(validationError);
      setIsSubmitting(false);
      removeLoadingOperation(opId);
      return;
    }

    try {
      let response: Response;
      let result: { logs?: ApiFeedingResponse[]; count?: number; [key: string]: any };

      const statusLookup = new Map<string, string>();
      logsToCreate.forEach(log => {
        statusLookup.set(log.tempId!, log.status);
      });

      if (initialFeedingLog && logsToCreate.length > 0) {
        const firstLog = logsToCreate[0]!;
        const updatePayload: any = {
          amount: firstLog.portionSize,
          notes: firstLog.notes,
          meal_type: getMealTypeFromTime(initialFeedingLog.timestamp),
          unit: firstLog.unit,
        };

        if (firstLog.food_type !== undefined) {
          updatePayload.food_type = firstLog.food_type || null;
        }

        response = await fetch(`/api/v2/feedings/${initialFeedingLog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Falha ao editar (${response.status})`);
        }
        result = await response.json();

        toast.success("Alimentação editada com sucesso!");

        const resultData = result.data || result;

        const isCurrentUser = resultData.userId === currentUser?.id;

        const updatedFeedingLog: FeedingLog = {
          id: resultData.id,
          catId: resultData.catId,
          userId: resultData.userId,
          timestamp: typeof resultData.timestamp === 'string' ? new Date(resultData.timestamp) : resultData.timestamp,
          portionSize: resultData.portionSize,
          notes: resultData.notes,
          mealType: resultData.mealType,
          food_type: resultData.food_type ?? null,
          householdId: resultData.householdId,
          user: resultData.user || {
            id: resultData.userId,
            name: isCurrentUser ? (currentUser?.name ?? null) : null,
            avatar: isCurrentUser ? (currentUser?.avatar ?? null) : null,
          },
          status: logsToCreate[0]?.status || "Normal",
        };

        feedingDispatch({ type: "UPDATE_FEEDING", payload: updatedFeedingLog });
      } else {
        response = await fetch("/api/feedings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: logsToCreate }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Falha ao registrar (${response.status})`);
        }
        result = await response.json();

        if (result.logs && Array.isArray(result.logs)) {
          (result.logs as ApiFeedingResponse[]).forEach((feeding: ApiFeedingResponse) => {
            const isCurrentUser = feeding.fed_by === currentUser?.id;

            const mappedStatus = feeding.tempId ? statusLookup.get(feeding.tempId) : undefined;

            const validStatuses: Array<"Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro"> = [
              "Normal", "Comeu Pouco", "Recusou", "Vomitou", "Outro"
            ];
            const safeStatus = mappedStatus && validStatuses.includes(mappedStatus as any)
              ? (mappedStatus as "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro")
              : "Normal";

            const feedingLog: FeedingLog = {
              id: feeding.id,
              catId: feeding.cat_id,
              userId: feeding.fed_by || '',
              timestamp: new Date(feeding.fed_at),
              portionSize: feeding.amount ? Number(feeding.amount) : null,
              notes: feeding.notes ?? '',
              mealType: feeding.meal_type,
              food_type: feeding.food_type ?? null,
              householdId: feeding.household_id,
              user: {
                id: feeding.fed_by || '',
                name: isCurrentUser ? (currentUser?.name || '') : '',
                avatar: isCurrentUser ? (currentUser?.avatar || undefined) : undefined,
              },
              cat: undefined,
              status: safeStatus,
              createdAt: new Date(feeding.fed_at),
            };
            feedingDispatch({ type: "ADD_FEEDING", payload: feedingLog });
          });
        }

        if (refreshUser) {
          await refreshUser();
        }
        toast.success(`${result.count} ${result.count === 1 ? 'alimentação registrada' : 'alimentações registradas'} com sucesso!`);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error submitting feeding logs:", err);
      setError(err.message || "Ocorreu um erro desconhecido.");
      toast.error(initialFeedingLog ? "Erro ao Editar" : "Erro ao Registrar", { description: err.message || "Ocorreu um erro desconhecido." });
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  };

  return {
    householdCats,
    isLoadingCats,
    selectedCats,
    portions,
    notes,
    feedingStatus,
    foodTypes,
    isSubmitting,
    error,
    statusOptions,
    foodTypeOptions,
    formatRelativeTime,
    getLastFeedingLog,
    toggleCatSelection,
    handleSelectAll,
    handleDeselectAll,
    handlePortionChange,
    handleNotesChange,
    handleStatusChange,
    handleFoodTypeChange,
    handleSubmit,
  };
}

export type NewFeedingSheetState = ReturnType<typeof useNewFeedingSheet>;
