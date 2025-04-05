"use client";

import { useMemo } from "react";
import { useCats } from "@/lib/context/CatsContext";
import { useFeeding } from "@/lib/context/FeedingContext";
import { useUserContext } from "@/lib/context/UserContext";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, getHours, parseISO, format } from "date-fns";
import { FeedingLog, CatType, Household } from "@/lib/types";
import { User } from 'next-auth';

// Define interfaces for structured data
export interface StatisticsData {
  totalFeedings: number;
  averagePortionSize: number;
  totalPortionSize: number;
  timeSeriesData: TimeSeriesDataPoint[];
  catPortionData: CatPortion[];
  timeDistributionData: TimeSeriesDataPoint[];
}

export interface TimeSeriesDataPoint {
  name: string; // e.g., 'dd/MM', 'HH:00'
  fullDate?: string; // Optional: 'yyyy-MM-dd' for line chart tooltips
  valor: number;
}

export interface CatPortion {
  name: string;
  value: number;
}

// Helper function to calculate date range
export const getDateRange = (period: string): { start: Date; end: Date } => {
  const now = new Date();
  switch (period) {
    case "7dias":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "30dias":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "mesAtual":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "mesPassado":
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    default: // Default to last 7 days
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  }
}

// --- Main Selector Hook ---

export function useSelectFeedingStatistics(): {
  // Return values adjusted
  currentUser: CurrentUserType | null;
  cats: CatType[] | null;
  feedingLogs: FeedingLog[] | null;
  isLoading: boolean;
  error: string | null;
} {
  const { state: catsState } = useCats();
  const { state: feedingState } = useFeeding();
  const { state: userState } = useUserContext();

  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  const { feedingLogs, isLoading: isLoadingFeedings, error: errorFeedings } = feedingState;
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;

  // Combine loading and error states
  const isLoading = isLoadingUser || isLoadingCats || isLoadingFeedings;
  const error = errorCats || errorFeedings || errorUser;

  // Remove the entire useMemo calculation block
  /* useMemo block removed */

  // Return the raw data and combined states
  return { 
    currentUser, 
    cats, 
    feedingLogs, 
    isLoading, 
    error 
  };
} 