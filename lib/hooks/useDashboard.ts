import { useMemo } from 'react';
import { useUserContext } from '@/lib/context/UserContext';
import { useCats } from '@/lib/context/CatsContext';
import {
  useFeeding,
  useSelectTodayFeedingCount,
  useSelectLastFeedingLog,
  useSelectRecentFeedingsChartData,
  useSelectAveragePortionSize
} from '@/lib/context/FeedingContext';
import type { CatType, FeedingLog } from '@/lib/types';

export type DashboardState = 
  | { type: 'LOADING_USER' }
  | { type: 'ERROR_USER'; error: string }
  | { type: 'NO_USER' }
  | { type: 'NO_HOUSEHOLD' }
  | { type: 'LOADING_DASHBOARD' }
  | { type: 'ERROR_DASHBOARD'; error: { cats?: string; feedings?: string } }
  | { type: 'NEW_USER_FLOW' }
  | { type: 'DASHBOARD' };

export interface FeedingChartDataPoint {
  name: string;
  [catId: string]: number | string;
}

export interface DashboardData {
  cats: CatType[];
  todayFeedingCount: number;
  averagePortionSize: number | null;
  lastFeedingLog: FeedingLog | null;
  recentFeedingsData: FeedingChartDataPoint[];
}

export function useDashboard() {
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState } = useFeeding();
  
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState;
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState;
  const { isLoading: isLoadingFeedings, error: errorFeedings } = feedingState;

  // Dashboard selectors
  const todayFeedingCount = useSelectTodayFeedingCount();
  const recentFeedingsData = useSelectRecentFeedingsChartData();
  const lastFeedingLog = useSelectLastFeedingLog();
  const averagePortionSize = useSelectAveragePortionSize();

  const dashboardState = useMemo<DashboardState>(() => {
    if (isLoadingUser) return { type: 'LOADING_USER' };
    if (errorUser) return { type: 'ERROR_USER', error: errorUser };
    if (!currentUser) return { type: 'NO_USER' };
    if (!currentUser.householdId) return { type: 'NO_HOUSEHOLD' };
    if (isLoadingCats || isLoadingFeedings) return { type: 'LOADING_DASHBOARD' };
    if (errorCats || errorFeedings) return { 
      type: 'ERROR_DASHBOARD', 
      error: {
        cats: errorCats || undefined,
        feedings: errorFeedings || undefined
      }
    };
    if ((cats || []).length === 0) return { type: 'NEW_USER_FLOW' };
    return { type: 'DASHBOARD' };
  }, [isLoadingUser, errorUser, currentUser, isLoadingCats, isLoadingFeedings, errorCats, errorFeedings, cats]);

  const dashboardData = useMemo<DashboardData>(() => ({
    cats: cats || [],
    todayFeedingCount,
    averagePortionSize,
    lastFeedingLog,
    recentFeedingsData
  }), [cats, todayFeedingCount, averagePortionSize, lastFeedingLog, recentFeedingsData]);

  return {
    state: dashboardState,
    data: dashboardData,
    currentUser
  };
} 