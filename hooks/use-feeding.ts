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
import { validate as validateUUID } from 'uuid'; // Import UUID validation
import { useRouter } from "next/navigation";

// Simple UUID function might not be needed if API generates IDs
// function uuidv4(): string { ... }

// Error code constants for type-safe error handling
const ERROR_CODES = {
  NO_SCHEDULE: 'NO_SCHEDULE',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Changed catId to string to be consistent
export function useFeeding(catId: string | null) {
  // const { state: appState, dispatch } = useAppContext(); // REMOVED
  const { state: userState, pauseAuthChecks, resumeAuthChecks } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState, dispatch: feedingDispatch } = useFeedingContextState();
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  // const { data: session, status } = useSession(); // REMOVED (use userState)
  const router = useRouter();

  // State for specific errors within this hook instance
  const [internalError, setInternalError] = useState<string | null>(null);

  // --- ADD UUID Validation ---
  useEffect(() => {
    // Explicitly check for null/undefined before validating
    if (catId === null || catId === undefined) {
      setInternalError(null); // No ID provided is not an *invalid format* error
    } else if (!validateUUID(catId)) {
      console.error(`[useFeeding] Invalid UUID format for catId: ${catId}`);
      setInternalError("Formato de ID inválido.");
    } else {
      setInternalError(null); // Clear error if ID is valid
    }
  }, [catId]);
  // --- END UUID Validation ---

  // Log input and state
  console.log(`[useFeeding] Hook rendered for catId: ${catId}`);
  console.log(`[useFeeding] isLoadingCats: ${isLoadingCats}, errorCats: ${errorCats}`);
  console.log(`[useFeeding] Cats from context:`, cats);
  
  // Derive cat and logs from context state using useMemo
  const cat = useMemo(() => {
    console.log(`[useFeeding] useMemo executing for catId: ${catId}`);
    if (!catId || !cats) {
        console.log(`[useFeeding] useMemo returning null (missing catId or cats)`);
        return null;
    }
    // --- Fix: Compare IDs as strings --- 
    const foundCat = cats.find(c => String(c.id) === String(catId)) || null;
    console.log(`[useFeeding] Found cat in context:`, foundCat);
    if (!foundCat) {
      console.error(`[useFeeding] Cat not found in context for ID: ${catId}`);
    }
    return foundCat;
  }, [catId, cats]);

  // Handle error state based on found cat
  useEffect(() => {
    if (cat === null && catId && cats) {
      console.error(`[useFeeding] Cat not found in context for ID: ${catId}`);
      setInternalError("Gato não encontrado.");
    } else if (cat !== null) {
      // Clear error when cat is found
      setInternalError(null);
    }
  }, [catId, cats, cat]);

  const logs = useMemo(() => {
    if (!catId || !feedingState.feedingLogs) return [];
    // Logs are already sorted in context
    return feedingState.feedingLogs.filter(log => String(log.catId) === String(catId));
  }, [catId, feedingState.feedingLogs]);

  // State for next feeding time specific to this cat/hook instance
  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);
  const [formattedNextFeedingTime, setFormattedNextFeedingTime] = useState<string>("");
  const [formattedTimeDistance, setFormattedTimeDistance] = useState<string>("");
  const [isNextTimeLoading, setIsNextTimeLoading] = useState(false); // Loading state for next feeding time fetch
  const [nextTimeError, setNextTimeError] = useState<string | null>(null); // Error state for next feeding time fetch

  // Combined loading state from contexts
  const isLoading = isLoadingCats || feedingState.isLoading;
  // Combined error state from contexts + internal validation
  const error = internalError || errorCats || feedingState.error || nextTimeError; // Combine all error sources

  // Log combined loading/error states
  console.log(`[useFeeding] Combined isLoading: ${isLoading}, Combined error: ${error}`);

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
    
    // Clear any previous errors
    setNextTimeError(null);
    
    if (!catId || !cat) {
      console.log(`[useFeeding] Skipping next feeding time fetch - no cat/id`);
      setNextFeedingTime(null);
      updateFeedingTimeDisplay(null);
      return;
    }

    if (internalError) {
      console.log(`[useFeeding] Skipping next feeding time fetch - internal error: ${internalError}`);
      return;
    }

    const fetchNextTime = async () => {
      setIsNextTimeLoading(true);
      try {
        console.log(`[useFeeding] Fetching next feeding time for cat: ${catId}`);
        const next = await getNextFeedingTime(catId, userState.currentUser?.id);
        
        if (isMounted) {
          // Handle null as a valid state
          if (next === null) {
            console.log(`[useFeeding] No next feeding time scheduled for cat: ${catId}`);
            setNextFeedingTime(null);
            updateFeedingTimeDisplay(null);
          } else {
            console.log(`[useFeeding] Received next feeding time:`, next);
            setNextFeedingTime(next);
            updateFeedingTimeDisplay(next);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // Use explicit error codes if available, fallback to message
          const errorCode = err?.code as ErrorCode | undefined;
          const errorMessage = err?.message || "Erro ao buscar próximo horário.";
          
          console.error(`[useFeeding] Error fetching next feeding time:`, {
            code: errorCode,
            message: errorMessage,
            error: err
          });
          
          // Only set error states for actual errors, not for "no schedule" cases
          // Check explicit error code first, fall back to message matching if code is absent
          const isNoSchedule = errorCode === ERROR_CODES.NO_SCHEDULE || 
                               (!errorCode && errorMessage.includes('No next feeding time available'));
          
          if (!isNoSchedule) {
            setNextTimeError(errorMessage);
            
            // Only set critical errors that should trigger redirect
            // Check explicit error codes first, fall back to message matching if code is absent
            const isCriticalError = 
              errorCode === ERROR_CODES.NOT_FOUND ||
              errorCode === ERROR_CODES.UNAUTHORIZED ||
              errorCode === ERROR_CODES.AUTH_REQUIRED ||
              (!errorCode && (
                errorMessage.toLowerCase().includes('not found') || 
                errorMessage.toLowerCase().includes('unauthorized') ||
                errorMessage.toLowerCase().includes('authentication required')
              ));
            
            if (isCriticalError) {
              setInternalError(errorMessage);
            }
          }
          
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
  }, [catId, cat, updateFeedingTimeDisplay, internalError, userState.currentUser?.id]);

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
  const handleMarkAsFed = useCallback(async (amount?: string, notes?: string, timestamp?: Date): Promise<FeedingLog> => {
    if (!cat || !userState.currentUser?.id) {
      toast.error("Não é possível registrar: dados do gato ou usuário ausentes.");
      throw new Error("Missing cat or user data"); // Throw error to indicate failure
    }
    const currentUserId = userState.currentUser.id;

    try {
      // Pausar verificações de auth durante operação crítica
      pauseAuthChecks();
      
      const now = timestamp || new Date();

      // Construct payload for API - BaseFeedingLog structure
      const newLogData: Omit<BaseFeedingLog, 'id'> = {
        catId: cat.id,
        userId: currentUserId,
        timestamp: now,
        ...(amount && { portionSize: parseFloat(amount) }), // Only include if amount exists
        ...(notes && { notes }), // Only include if notes exists
        status: "Normal",
        createdAt: now
      };

      // Call API to create log
      const createdLog = await createFeedingLog(newLogData, currentUserId);

      // Dispatch action to update FeedingContext state
      feedingDispatch({
        type: "ADD_FEEDING",
        // Ensure payload matches expected FeedingLog structure (with Date objects)
        payload: { 
            ...createdLog, 
            // createdLog already has Date objects for timestamp and createdAt from createFeedingLog
            // Potentially add cat/user details here if context expects enriched logs
        }
      });

      // Refetch next feeding time after logging
      const next = await getNextFeedingTime(cat.id, userState.currentUser?.id);
      const nextDate = next instanceof Date ? next : null;
      setNextFeedingTime(nextDate);
      updateFeedingTimeDisplay(nextDate);

      toast.success(`Alimentação registrada para ${cat.name}`);
      return createdLog; // Return the created log

    } catch (error: any) {
      console.error("Erro ao registrar alimentação:", error);
      toast.error(`Falha ao registrar alimentação: ${error.message}`);
      throw error; // Re-throw error so calling component knows it failed
    } finally {
      // Retomar verificações de auth após operação
      resumeAuthChecks();
    }
  }, [cat, userState.currentUser, feedingDispatch, updateFeedingTimeDisplay, userState.currentUser?.id, pauseAuthChecks, resumeAuthChecks]);

  // Update the useEffect that handles redirection
  useEffect(() => {
    if (!isLoading && internalError) {
      console.error(`[useFeeding] Critical error detected:`, internalError);
      // Instead of throwing (which crashes React tree), redirect to error page
      // Log the incident for debugging
      console.error(`[useFeeding] Redirecting to error page due to critical error: ${internalError}`);
      router.replace('/error');
    }
  }, [internalError, isLoading, router]);

  // Return state and handlers
  return {
    cat, // Derived from context
    logs, // Derived from context
    nextFeedingTime,
    formattedNextFeedingTime,
    formattedTimeDistance,
    isLoading: isLoading || isNextTimeLoading, // Combine loading states
    error, // All errors are already combined in the error variable (line 99)
    handleMarkAsFed,
  };
}
