"use client";

import { useState, useEffect, useCallback } from "react";
// Comentar a importação do useAppContext
// import { useAppContext } from "@/lib/context/AppContext";
// Importar o useGlobalState
import { useGlobalState } from "@/lib/context/global-state";
import { Cat, FeedingLog, CatType } from "@/lib/types";
import { createFeedingLog, getNextFeedingTime } from "@/lib/services/apiService";
import { getRelativeTime, formatDateTime } from "@/lib/utils/dateUtils";
import { toast } from "sonner";

// Simple UUID function since we can't install the package
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useFeeding(catId: string) {
  // Usar o contexto global em vez do AppContext
  const { state, dispatch } = useGlobalState();
  const [cat, setCat] = useState<CatType | null>(null);
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);
  const [formattedNextFeedingTime, setFormattedNextFeedingTime] = useState<string>("");
  const [formattedTimeDistance, setFormattedTimeDistance] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the function to update feeding time display
  const updateFeedingTimeDisplay = useCallback((next: Date | null) => {
    if (next) {
      setFormattedNextFeedingTime(formatDateTime(next));
      setFormattedTimeDistance(getRelativeTime(next));
    }
  }, []);

  // Load cat and feeding data
  useEffect(() => {
    const fetchCatData = async () => {
      setIsLoading(true);
      
      try {
        // Primeiro, tenta buscar do estado local
        let foundCat = state.cats.find(c => c.id === catId) || null;
        
        // Se não encontrou localmente, busca da API
        if (!foundCat && catId) {
          const response = await fetch(`/api/cats/${catId}`);
          if (response.ok) {
            foundCat = await response.json();
            // Adiciona ao estado global se não existir
            if (foundCat && !state.cats.some(c => c.id === foundCat.id)) {
              dispatch({ type: "ADD_CAT", payload: foundCat });
            }
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
            .filter(log => log.catId === catId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          setLogs(catLogs);

          // Calculate next feeding time
          const next = getNextFeedingTime(catId, state.cats, state.feedingLogs);
          setNextFeedingTime(next);
          
          // Update displayed time in a separate step to avoid loops
          updateFeedingTimeDisplay(next);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do gato:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (catId) {
      fetchCatData();
    }
  }, [catId, state.cats, state.feedingLogs, updateFeedingTimeDisplay, dispatch]);

  // Refresh feeding times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (nextFeedingTime) {
        // Only update the time distance, not all state variables
        setFormattedTimeDistance(getRelativeTime(nextFeedingTime));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [nextFeedingTime]);

  const handleMarkAsFed = async (amount?: string, notes?: string) => {
    if (!cat) return;

    try {
      // Prepare feeding log
      const newLog: Omit<FeedingLog, "id"> = {
        catId: cat.id,
        userId: "1", // Usando um valor padrão para userId
        timestamp: new Date(),
        portionSize: amount ? parseFloat(amount) : undefined,
        notes: notes || undefined,
      };

      // Optimistic update
      const optimisticLog: FeedingLog = {
        ...newLog,
        id: `temp-${uuidv4()}`,
      };

      // Update local state
      dispatch({ type: "ADD_FEEDING_LOG", payload: optimisticLog });

      // Send to API
      const savedLog = await createFeedingLog(newLog, state.feedingLogs);

      // Replace optimistic log with saved one
      dispatch({ 
        type: "UPDATE_FEEDING_LOG", 
        payload: savedLog 
      });

      // Recalculate next feeding time
      const next = getNextFeedingTime(catId, state.cats, [...state.feedingLogs, savedLog]);
      setNextFeedingTime(next);

      // Update display times using the memoized function
      updateFeedingTimeDisplay(next);

      toast.success(`${cat.name} foi alimentado com sucesso!`);

      return savedLog;
    } catch (error) {
      console.error("Error logging feeding:", error);
      toast.error("Falha ao registrar alimentação. Tente novamente.");
      return null;
    }
  };

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
