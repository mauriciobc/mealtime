"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNotifications } from "@/lib/context/NotificationContext";
import { useAppContext } from "@/lib/context/AppContext";

// Constants for backoff strategy
const INITIAL_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_CHECK_INTERVAL = 300000; // 5 minutes
const BACKOFF_MULTIPLIER = 1.5;

export default function NotificationChecker() {
  const { refreshNotifications } = useNotifications();
  const { state: appState } = useAppContext();
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  const currentIntervalRef = useRef(INITIAL_CHECK_INTERVAL);
  const consecutiveErrorsRef = useRef(0);

  // Memoize the check function to prevent unnecessary re-renders
  const checkNotifications = useCallback(async () => {
    if (isCheckingRef.current || !mountedRef.current) {
      console.log(`[NotificationChecker] Skipping check - previous check still in progress or component unmounted`);
      return;
    }

    try {
      isCheckingRef.current = true;
      console.log(`[NotificationChecker] Starting notification check`);
      await refreshNotifications();
      
      // Reset backoff on successful check
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = INITIAL_CHECK_INTERVAL;
      
      // Update interval with current backoff
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(checkNotifications, currentIntervalRef.current);
      
    } catch (error) {
      console.error(`[NotificationChecker] Error checking notifications:`, error);
      
      // Implement backoff strategy
      consecutiveErrorsRef.current += 1;
      currentIntervalRef.current = Math.min(
        INITIAL_CHECK_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, consecutiveErrorsRef.current),
        MAX_CHECK_INTERVAL
      );
      
      // Update interval with new backoff
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(checkNotifications, currentIntervalRef.current);
      
    } finally {
      if (mountedRef.current) {
        isCheckingRef.current = false;
        console.log(`[NotificationChecker] Completed notification check, next check in ${currentIntervalRef.current}ms`);
      }
    }
  }, [refreshNotifications]);

  useEffect(() => {
    if (!appState.currentUser?.id) return;

    // Initial check
    checkNotifications();

    // Set up interval for periodic checks with initial interval
    intervalRef.current = setInterval(checkNotifications, INITIAL_CHECK_INTERVAL);

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log(`[NotificationChecker] Cleaned up notification checker`);
      }
    };
  }, [appState.currentUser?.id, checkNotifications]);

  return null;
} 