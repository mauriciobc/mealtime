"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/lib/context/AppContext";
import { Cat, FeedingLog } from "@/lib/types";
import { createFeedingLog, getNextFeedingTime } from "@/lib/services/apiService";
import { getRelativeTime, formatDateTime } from "@/lib/utils/dateUtils";
import { toast } from "@/components/ui/use-toast";

// Simple UUID function since we can't install the package
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useFeeding(catId: string) {
  const { state, dispatch } = useAppContext();
  const [cat, setCat] = useState<Cat | null>(null);
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
    if (state.cats.length > 0 && catId) {
      // Find cat
      const foundCat = state.cats.find(c => c.id === catId) || null;
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
      
      setIsLoading(false);
    }
  }, [catId, state.cats, state.feedingLogs, updateFeedingTimeDisplay]);

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
    if (!cat || !state.currentUser) return;

    try {
      // Prepare feeding log
      const newLog: Omit<FeedingLog, "id"> = {
        catId: cat.id,
        userId: state.currentUser.id,
        timestamp: new Date(),
        amount: amount || cat.regularAmount,
        notes: notes || undefined,
        isCompleted: true,
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
        payload: { ...savedLog, id: optimisticLog.id } 
      });

      // Recalculate next feeding time
      const next = getNextFeedingTime(catId, state.cats, [...state.feedingLogs, savedLog]);
      setNextFeedingTime(next);

      // Update display times using the memoized function
      updateFeedingTimeDisplay(next);

      toast({
        title: "Success!",
        description: `${cat.name} has been fed ${amount || cat.regularAmount} ${cat.foodUnit}.`,
      });

      return savedLog;
    } catch (error) {
      console.error("Error logging feeding:", error);
      toast({
        title: "Error",
        description: "Failed to log feeding. Please try again.",
        variant: "destructive",
      });
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
