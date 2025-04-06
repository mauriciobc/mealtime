"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { CatType, FeedingLog } from "@/lib/types";
import { BaseFeedingLog } from "@/lib/types/common";
import { createFeedingLog, getNextFeedingTime } from "@/lib/services/apiService";
import { getRelativeTime, formatDateTimeForDisplay, getUserTimezone } from "@/lib/utils/dateUtils";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toDate, formatInTimeZone } from "date-fns-tz";
import { useSession } from "next-auth/react";
import { calculateNextFeeding } from "@/lib/utils/dateUtils";

// Simple UUID function since we can't install the package
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useFeeding(catId: number | null) {
  const { state: appState, dispatch } = useAppContext();
  const { state: userState } = useUserContext();
  const { data: session, status } = useSession();
  const [cat, setCat] = useState<CatType | null>(null);
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);
  const [formattedNextFeedingTime, setFormattedNextFeedingTime] = useState<string>("");
  const [formattedTimeDistance, setFormattedTimeDistance] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the function to update feeding time display
  const updateFeedingTimeDisplay = useCallback((next: Date | null) => {
    if (next) {
      const timezone = getUserTimezone();
      setFormattedNextFeedingTime(formatDateTimeForDisplay(next, timezone));
      setFormattedTimeDistance(getRelativeTime(next));
    }
  }, []);

  // Load cat and feeding data
  useEffect(() => {
    let isMounted = true;

    if (!session?.user?.email) {
      console.log('[useFeeding] No session user email');
      return;
    }

    console.log('[useFeeding] Effect triggered:', {
      catId,
      status,
      hasUser: !!userState.currentUser,
      userId: userState.currentUser?.id,
      householdId: userState.currentUser?.householdId,
      sessionEmail: session.user.email
    });

    const fetchCatData = async () => {
      if (!catId || !userState.currentUser?.id || !userState.currentUser?.householdId) {
        console.log('[useFeeding] Missing required data:', {
          catId,
          userId: userState.currentUser?.id,
          householdId: userState.currentUser?.householdId
        });
        setIsLoading(false);
        setError(null);
        setCat(null);
        setLogs([]);
        setNextFeedingTime(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const currentHouseholdId = userState.currentUser.householdId;
      const currentUserId = userState.currentUser.id;

      try {
        console.log('[useFeeding] Searching for cat in state:', {
          catId,
          householdId: currentHouseholdId,
          stateCats: appState.cats.map(c => ({ id: c.id, householdId: c.householdId }))
        });

        let foundCat = appState.cats.find(c => c.id === catId && String(c.householdId) === String(currentHouseholdId)) || null;

        if (!foundCat) {
          console.log('[useFeeding] Cat not found in state, fetching from API:', { catId });
          const response = await fetch(`/api/cats/${catId}`);
          
          if (response.ok) {
            const apiCat = await response.json();
            console.log('[useFeeding] API response:', { apiCat });
            
            if (String(apiCat.householdId) !== String(currentHouseholdId)) {
              throw new Error("Gato não pertence à sua residência.");
            }

            if (!appState.cats.some(c => c.id === apiCat.id)) {
              dispatch({ type: "ADD_CAT", payload: apiCat });
            }
            foundCat = apiCat;
          } else if (response.status === 404) {
            throw new Error("Gato não encontrado.");
          } else if (response.status === 401) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryResponse = await fetch(`/api/cats/${catId}`);
            if (retryResponse.ok) {
              const apiCat = await retryResponse.json();
              if (String(apiCat.householdId) !== String(currentHouseholdId)) {
                throw new Error("Gato não pertence à sua residência.");
              }
              if (!appState.cats.some(c => c.id === apiCat.id)) {
                dispatch({ type: "ADD_CAT", payload: apiCat });
              }
              foundCat = apiCat;
            } else {
              throw new Error(`Erro ao buscar gato: ${retryResponse.statusText}`);
            }
          } else {
            throw new Error(`Erro ao buscar gato: ${response.statusText}`);
          }
        }

        if (!isMounted) return;

        if (foundCat) {
          console.log('[useFeeding] Cat found:', { foundCat });
          setCat(foundCat);
          const catLogs = appState.feedingLogs
            .filter(log => log.catId === catId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(catLogs);

          const next = await getNextFeedingTime(catId);
          if (next instanceof Date && isMounted) {
            setNextFeedingTime(next);
            updateFeedingTimeDisplay(next);
          } else if (isMounted) {
            setNextFeedingTime(null);
            setFormattedNextFeedingTime("");
            setFormattedTimeDistance("");
          }
        } else {
          if (isMounted) {
            console.log('[useFeeding] No cat found after all attempts');
            setError("Não foi possível carregar os dados do gato.");
            setCat(null);
            setLogs([]);
            setNextFeedingTime(null);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[useFeeding] Error:', err);
          setError(err.message || "Erro ao carregar dados.");
          setCat(null);
          setLogs([]);
          setNextFeedingTime(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (status === "authenticated" && userState.currentUser?.householdId) {
      console.log('[useFeeding] Starting data fetch');
      fetchCatData();
    } else if (status === "authenticated" && !userState.currentUser?.householdId) {
      console.log('[useFeeding] Authenticated but waiting for user data');
      setIsLoading(true);
    } else if (status !== "loading") {
      console.log('[useFeeding] Not ready to fetch:', { status, hasUser: !!userState.currentUser });
      setIsLoading(false);
      setError(null);
      setCat(null);
      setLogs([]);
      setNextFeedingTime(null);
    }

    return () => {
      isMounted = false;
    };
  }, [catId, status, userState.currentUser, appState.cats, appState.feedingLogs, updateFeedingTimeDisplay, dispatch, session?.user?.email]);

  // Refresh feeding times every minute
  useEffect(() => {
    if (!nextFeedingTime || isNaN(nextFeedingTime.getTime())) {
      setFormattedTimeDistance("");
      return;
    }

    const interval = setInterval(() => {
      setFormattedTimeDistance(getRelativeTime(nextFeedingTime));
    }, 60000);

    setFormattedTimeDistance(getRelativeTime(nextFeedingTime));

    return () => clearInterval(interval);
  }, [nextFeedingTime]);

  const handleMarkAsFed = async (amount?: string, notes?: string, timestamp?: Date) => {
    if (!cat || !userState.currentUser?.id) {
      toast.error("Não é possível registrar alimentação: dados do gato ou usuário ausentes.");
      return;
    }
    const currentUserId = userState.currentUser.id;

    try {
      const now = timestamp || new Date();

      const newLogData: Omit<BaseFeedingLog, 'id'> = {
        catId: cat.id,
        userId: currentUserId,
        timestamp: now,
        portionSize: amount ? parseFloat(amount) : undefined,
        notes: notes || undefined,
        status: "Normal",
        createdAt: now
      };

      const createdLog = await createFeedingLog(newLogData);

      dispatch({
        type: "ADD_FEEDING_LOG",
        payload: createdLog
      });

      const next = await getNextFeedingTime(cat.id);
      if (next instanceof Date) {
        setNextFeedingTime(next);
        updateFeedingTimeDisplay(next);
      } else {
        setNextFeedingTime(null);
      }

      toast.success(`Alimentação registrada para ${cat.name}`);
      return createdLog;

    } catch (error) {
      console.error("Erro ao registrar alimentação:", error);
      toast.error("Falha ao registrar alimentação.");
      throw error;
    }
  };

  return {
    cat,
    logs,
    nextFeedingTime,
    formattedNextFeedingTime,
    formattedTimeDistance,
    isLoading,
    error,
    handleMarkAsFed,
  };
}
