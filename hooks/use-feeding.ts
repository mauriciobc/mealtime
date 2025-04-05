"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
// import { useAppContext } from "@/lib/context/AppContext"; // REMOVED
import { useUserContext } from "@/lib/context/UserContext";
import { useCats } from "@/lib/context/CatsContext"; // ADDED
import { useFeeding as useFeedingContextState } from "@/lib/context/FeedingContext"; // ADDED
import { CatType, FeedingLog } from "@/lib/types";
import { BaseFeedingLog } from "@/lib/types/common";
import { createFeedingLog, getNextFeedingTime } from "@/lib/services/apiService";
import { getRelativeTime, formatDateTimeForDisplay, getUserTimezone } from "@/lib/utils/dateUtils";
import { toast } from "sonner";
import { format, formatDistanceToNow, isBefore, addHours, parseISO, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toDate, formatInTimeZone } from "date-fns-tz";
// import { useSession } from "next-auth/react"; // No longer needed directly
import { calculateNextFeeding } from "@/lib/utils/dateUtils";

// Simple UUID function might not be needed if API generates IDs
// function uuidv4(): string { ... }

// Changed catId to string to be consistent
export function useFeeding(catId: string | null) {
  // const { state: appState, dispatch } = useAppContext(); // REMOVED
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState, dispatch: feedingDispatch } = useFeedingContextState();
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  // const { data: session, status } = useSession(); // REMOVED (use userState)

  // Derive cat and logs from context state using useMemo
  const cat = useMemo(() => {
    if (!catId || !cats) return null;
    // --- Fix: Compare IDs as strings --- 
    // c.id is likely a number from context, catId is a string
    return cats.find(c => String(c.id) === catId) || null;
  }, [catId, cats]);

  const logs = useMemo(() => {
    if (!catId || !feedingState.feedingLogs) return [];
    // Logs are already sorted in context
    return feedingState.feedingLogs.filter(log => log.catId === catId);
  }, [catId, feedingState.feedingLogs]);

  // State for next feeding time specific to this cat/hook instance
  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);
  const [formattedNextFeedingTime, setFormattedNextFeedingTime] = useState<string>("");
  const [formattedTimeDistance, setFormattedTimeDistance] = useState<string>("");
  const [isNextTimeLoading, setIsNextTimeLoading] = useState(false); // Loading state for next feeding time fetch
  const [nextTimeError, setNextTimeError] = useState<string | null>(null); // Error state for next feeding time fetch

  // Combined loading state from contexts
  const isLoading = isLoadingCats || feedingState.isLoading;
  // Combined error state from contexts
  const error = errorCats || feedingState.error;

  // Memoize the function to update feeding time display
  const updateFeedingTimeDisplay = useCallback((next: Date | null) => {
    if (next) {
      // Get timezone from user context preferences
      const timezone = userState.currentUser?.preferences?.timezone || getUserTimezone(); // Fallback
      setFormattedNextFeedingTime(formatDateTimeForDisplay(next, timezone));
      setFormattedTimeDistance(getRelativeTime(next));
    } else {
      setFormattedNextFeedingTime("");
      setFormattedTimeDistance("");
    }
  }, [userState.currentUser?.preferences?.timezone]);

  // Fetch next feeding time when catId changes or cat data is available
  useEffect(() => {
    let isMounted = true;
    if (!catId || !cat) { // Only fetch if we have a valid cat from context
      setNextFeedingTime(null);
      updateFeedingTimeDisplay(null);
      return;
    }

    const fetchNextTime = async () => {
      setIsNextTimeLoading(true);
      setNextTimeError(null);
      try {
        const next = await getNextFeedingTime(catId);
        if (isMounted) {
          const nextDate = next instanceof Date ? next : null;
          setNextFeedingTime(nextDate);
          updateFeedingTimeDisplay(nextDate);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(`[useFeeding] Error fetching next feeding time for ${catId}:`, err);
          setNextTimeError(err.message || "Erro ao buscar próximo horário.");
          setNextFeedingTime(null);
          updateFeedingTimeDisplay(null);
        }
      } finally {
        if (isMounted) {
          setIsNextTimeLoading(false);
        }
      }
    };

    fetchNextTime();

    return () => {
      isMounted = false;
    };
    // Depend on catId and potentially cat object if its details influence next time
  }, [catId, cat, updateFeedingTimeDisplay]); 

  // Refresh relative time display every minute
  useEffect(() => {
    if (!nextFeedingTime || isNaN(nextFeedingTime.getTime())) {
      setFormattedTimeDistance("");
      return;
    }

    const interval = setInterval(() => {
      setFormattedTimeDistance(getRelativeTime(nextFeedingTime));
    }, 60000);

    // Initial set
    setFormattedTimeDistance(getRelativeTime(nextFeedingTime));

    return () => clearInterval(interval);
  }, [nextFeedingTime]);

  // Function to handle marking the cat as fed
  const handleMarkAsFed = useCallback(async (amount?: string, notes?: string, timestamp?: Date) => {
    if (!cat || !userState.currentUser?.id) {
      toast.error("Não é possível registrar: dados do gato ou usuário ausentes.");
      throw new Error("Missing cat or user data"); // Throw error to indicate failure
    }
    const currentUserId = userState.currentUser.id;

    try {
      const now = timestamp || new Date();

      // Construct payload for API
      const newLogData: Omit<BaseFeedingLog, 'id' | 'createdAt'> = {
        catId: cat.id,
        userId: currentUserId,
        timestamp: now,
        portionSize: amount ? parseFloat(amount) : undefined,
        notes: notes || undefined,
        status: "Normal", // Or allow passing status?
      };

      // Call API to create log
      const createdLog = await createFeedingLog(newLogData);

      // Dispatch action to update FeedingContext state
      feedingDispatch({
        type: "ADD_FEEDING",
        // Ensure payload matches expected FeedingLog structure (with Date objects)
        payload: { 
            ...createdLog, 
            timestamp: new Date(createdLog.timestamp), 
            createdAt: new Date(createdLog.createdAt)
            // Potentially add cat/user details here if context expects enriched logs
        }
      });

      // Refetch next feeding time after logging
      const next = await getNextFeedingTime(cat.id);
      const nextDate = next instanceof Date ? next : null;
      setNextFeedingTime(nextDate);
      updateFeedingTimeDisplay(nextDate);

      toast.success(`Alimentação registrada para ${cat.name}`);
      return createdLog; // Return the created log

    } catch (error: any) {
      console.error("Erro ao registrar alimentação:", error);
      toast.error(`Falha ao registrar alimentação: ${error.message}`);
      throw error; // Re-throw error so calling component knows it failed
    }
  }, [cat, userState.currentUser, feedingDispatch, updateFeedingTimeDisplay]);

  // Return state and handlers
  return {
    cat, // Derived from context
    logs, // Derived from context
    nextFeedingTime,
    formattedNextFeedingTime,
    formattedTimeDistance,
    isLoading: isLoading || isNextTimeLoading, // Combine loading states
    error: error || nextTimeError, // Combine error states
    handleMarkAsFed,
  };
}
