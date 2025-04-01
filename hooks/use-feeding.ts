"use client";

import { useState, useEffect, useCallback } from "react";
// Comentar a importação do useAppContext
// import { useAppContext } from "@/lib/context/AppContext";
// Importar o useGlobalState
import { useGlobalState } from "@/lib/context/global-state";
import { CatType, FeedingLog } from "@/lib/types";
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
  const { state, dispatch } = useGlobalState();
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
      // Converter de UTC para local apenas na exibição
      setFormattedNextFeedingTime(formatDateTimeForDisplay(next, timezone));
      setFormattedTimeDistance(getRelativeTime(next));
    }
  }, []);

  // Load cat and feeding data
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchCatData = async () => {
      if (!catId || status !== "authenticated" || !state.currentUser?.id || !state.currentUser?.householdId) {
        setIsLoading(false);
        if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
            setError("Nenhuma residência associada.");
        } else if (status === "authenticated" && !catId) {
             setError("ID do gato inválido.");
        } else {
             setError(null);
        }
        setCat(null);
        setLogs([]);
        setNextFeedingTime(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const currentHouseholdId = state.currentUser.householdId;
      const currentUserId = state.currentUser.id;

      try {
        let foundCat = state.cats.find(c => c.id === catId && String(c.householdId) === String(currentHouseholdId)) || null;

        if (!foundCat) {
          const response = await fetch(`/api/cats/${catId}`);
          if (response.ok) {
            const apiCat = await response.json();
            if (String(apiCat.householdId) !== String(currentHouseholdId)) {
                 console.warn(`Fetched cat ${catId} belongs to household ${apiCat.householdId}, but user is in ${currentHouseholdId}.`);
                 throw new Error("Gato não pertence à sua residência.");
            }

            if (!state.cats.some(c => c.id === apiCat.id)) {
               dispatch({ type: "ADD_CAT", payload: apiCat });
            }
            foundCat = apiCat;
          } else if (response.status === 404) {
            throw new Error("Gato não encontrado.");
          } else {
             throw new Error(`Erro ao buscar gato: ${response.statusText}`);
          }
        }

        if (!isMounted) return;
        setCat(foundCat);

        if (foundCat) {
          const catLogs = state.feedingLogs
            .filter(log => log.catId === catId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(catLogs);

          const next = await getNextFeedingTime(catId.toString());
          if (next instanceof Date && isMounted) {
            setNextFeedingTime(next);
            updateFeedingTimeDisplay(next);
          } else if (isMounted) {
            setNextFeedingTime(null);
            setFormattedNextFeedingTime("");
            setFormattedTimeDistance("");
          }
        }
      } catch (err: any) {
        console.error("Erro ao buscar dados do gato:", err);
        if (isMounted) setError(err.message || "Erro ao carregar dados.");
        setCat(null);
        setLogs([]);
        setNextFeedingTime(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    timeoutId = setTimeout(fetchCatData, 50);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [catId, status, state.currentUser, state.cats, state.feedingLogs, updateFeedingTimeDisplay, dispatch]);

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
    if (!cat || !state.currentUser?.id) {
        toast.error("Não é possível registrar alimentação: dados do gato ou usuário ausentes.");
        return;
    }
    const currentUserId = state.currentUser.id;

    try {
      const now = timestamp || new Date();

      const newLogData: Omit<FeedingLog, "id"> = {
        catId: cat.id,
        userId: currentUserId,
        timestamp: now,
        portionSize: amount ? parseFloat(amount) : null,
        notes: notes || null,
      };

      const createdLog = await createFeedingLog(newLogData);

       dispatch({
         type: "ADD_FEEDING_LOG",
         payload: createdLog,
       });

       const next = await getNextFeedingTime(cat.id.toString());
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
