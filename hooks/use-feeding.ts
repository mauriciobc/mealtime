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

export function useFeeding(catId: string) {
  const { state, dispatch } = useGlobalState();
  const numericId = parseInt(catId);
  const [cat, setCat] = useState<CatType | null>(null);
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);
  const [formattedNextFeedingTime, setFormattedNextFeedingTime] = useState<string>("");
  const [formattedTimeDistance, setFormattedTimeDistance] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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
    const fetchCatData = async () => {
      setIsLoading(true);
      
      try {
        // Primeiro, tenta buscar do estado local
        let foundCat = state.cats.find(c => c.id === numericId) || null;
        
        // Se não encontrou localmente, busca da API
        if (!foundCat && numericId) {
          const response = await fetch(`/api/cats/${numericId}`);
          if (response.ok) {
            const apiCat = await response.json();
            // Adiciona ao estado global se não existir
            if (apiCat && !state.cats.some(c => c.id === apiCat.id)) {
              dispatch({ type: "ADD_CAT", payload: apiCat });
            }
            foundCat = apiCat;
          } else if (response.status === 404) {
            console.error("Gato não encontrado");
            setIsLoading(false);
            return;
          }
        }
        
        setCat(foundCat);

        // Get feeding logs
        if (foundCat) {
          const catLogs = state.feedingLogs
            .filter(log => log.catId === numericId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          setLogs(catLogs);

          // Calculate next feeding time
          const next = await getNextFeedingTime(catId);
          if (next instanceof Date) {
            setNextFeedingTime(next);
            // Update displayed time in a separate step to avoid loops
            updateFeedingTimeDisplay(next);
          } else {
            setNextFeedingTime(null);
            setFormattedNextFeedingTime("");
            setFormattedTimeDistance("");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados do gato:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (numericId) {
      fetchCatData();
    }
  }, [numericId, state.cats, state.feedingLogs, updateFeedingTimeDisplay, dispatch]);

  // Refresh feeding times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (nextFeedingTime && !isNaN(nextFeedingTime.getTime())) {
        // Only update the time distance, not all state variables
        setFormattedTimeDistance(getRelativeTime(nextFeedingTime));
      } else {
        setFormattedTimeDistance("");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [nextFeedingTime]);

  const handleMarkAsFed = async (amount?: string, notes?: string) => {
    if (!cat) return;

    try {
      // Criar timestamp em UTC
      const now = new Date();
      now.setMilliseconds(0); // Remover milissegundos para consistência
      
      const newLog: Omit<FeedingLog, "id"> = {
        catId: numericId,
        userId: "1", // TODO: Usar ID do usuário atual
        timestamp: now, // Timestamp em UTC
        portionSize: amount ? parseFloat(amount) : null,
        notes: notes || null,
      };

      const result = await createFeedingLog(newLog, state.feedingLogs);

      // Atualizar estado global
      dispatch({
        type: "ADD_FEEDING_LOG",
        payload: result,
      });

      return result;
    } catch (error) {
      console.error("Erro ao registrar alimentação:", error);
      throw error;
    }
  };

  useEffect(() => {
    setIsLoading(false);
  }, [cat, logs]);

  return {
    cat,
    logs,
    nextFeedingTime,
    formattedNextFeedingTime,
    formattedTimeDistance,
    isLoading,
    handleMarkAsFed,
  };
}
