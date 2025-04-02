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
  const mountedRef = useRef(true);
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const consecutiveErrorsRef = useRef(0);
  const currentIntervalRef = useRef(INITIAL_CHECK_INTERVAL);

  const checkNotifications = useCallback(async () => {
    if (isCheckingRef.current || !mountedRef.current) {
      return;
    }

    try {
      isCheckingRef.current = true;
      await refreshNotifications();
      
      if (mountedRef.current) {
        // Reset backoff on successful check
        consecutiveErrorsRef.current = 0;
        currentIntervalRef.current = INITIAL_CHECK_INTERVAL;
        
        // Update interval with current backoff
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(checkNotifications, currentIntervalRef.current);
      }
    } catch (error) {
      if (mountedRef.current) {
        // Implement exponential backoff with jitter
        consecutiveErrorsRef.current += 1;
        const backoffTime = Math.min(
          INITIAL_CHECK_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, consecutiveErrorsRef.current),
          MAX_CHECK_INTERVAL
        );
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        currentIntervalRef.current = backoffTime + jitter;
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(checkNotifications, currentIntervalRef.current);
      }
    } finally {
      if (mountedRef.current) {
        isCheckingRef.current = false;
      }
    }
  }, [refreshNotifications]);

  useEffect(() => {
    if (!appState.currentUser?.id) return;

    // Initial check
    checkNotifications();

    // Set up interval
    intervalRef.current = setInterval(checkNotifications, INITIAL_CHECK_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [appState.currentUser?.id, checkNotifications]);

  return null;
} 