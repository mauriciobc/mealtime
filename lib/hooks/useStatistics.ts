import { useMemo } from 'react'
import { format, startOfDay, endOfDay, parseISO, getHours } from 'date-fns'
import type { Locale } from 'date-fns'
import { FeedingLog, CatType } from '@/lib/types'
import { StatisticsData, TimeSeriesDataPoint, CatPortion } from '@/lib/selectors/statisticsSelectors'

// Helper function for safe parsing
const safeParseISO = (timestamp: string | Date | unknown): Date | null => {
  try {
    const timestampStr = typeof timestamp === 'string'
      ? timestamp
      : timestamp instanceof Date
        ? timestamp.toISOString()
        : String(timestamp);

    if (!timestampStr) return null;
    const date = parseISO(timestampStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (e) {
    console.error(`[safeParseISO] Error processing timestamp:`, timestamp, e);
    return null;
  }
};

function filterLogs(logs: FeedingLog[], dateRange: { start: Date; end: Date }, selectedCatId: string) {
  if (!logs || logs.length === 0) return [];
  
  return logs.filter(log => {
    if (selectedCatId !== "all" && String(log.catId) !== String(selectedCatId)) {
      return false;
    }
    
    const logDate = safeParseISO(log.timestamp);
    if (!logDate) return false;
    
    const logStartOfDay = startOfDay(logDate);
    const filterStartOfDay = startOfDay(dateRange.start);
    const filterEndOfDay = endOfDay(dateRange.end);
    
    return logStartOfDay >= filterStartOfDay && logStartOfDay <= filterEndOfDay;
  });
}

function calculateStatistics(logs: FeedingLog[], cats: CatType[], dateRange: { start: Date; end: Date }, locale: Locale): StatisticsData {
  if (!logs || logs.length === 0) {
    return {
      totalFeedings: 0,
      averagePortionSize: 0,
      totalPortionSize: 0,
      timeSeriesData: [],
      catPortionData: [],
      timeDistributionData: [],
    };
  }

  // Calculate basic statistics
  const totalFeedings = logs.length;
  const validPortions = logs.filter(log => {
    const amount = typeof log.amount === 'number' ? log.amount : 0;
    return amount > 0;
  });
  const totalPortionSize = validPortions.reduce((sum, log) => sum + (log.amount || 0), 0);
  const averagePortionSize = validPortions.length > 0 
    ? Number((totalPortionSize / validPortions.length).toFixed(1))
    : 0;

  // Calculate time series data
  const timeSeriesMap = new Map<string, number>();
  let currentDate = new Date(dateRange.start);
  while (currentDate <= dateRange.end) {
    const dayKey = format(currentDate, 'yyyy-MM-dd');
    timeSeriesMap.set(dayKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  logs.forEach(log => {
    const logDate = safeParseISO(log.timestamp);
    if (!logDate) return;
    const dayKey = format(logDate, 'yyyy-MM-dd');
    const currentSum = timeSeriesMap.get(dayKey) || 0;
    const amount = typeof log.amount === 'number' ? log.amount : 0;
    if (amount > 0) {
      timeSeriesMap.set(dayKey, currentSum + amount);
    }
  });

  const timeSeriesData: TimeSeriesDataPoint[] = Array.from(timeSeriesMap.entries())
    .map(([fullDate, valor]) => ({
      name: format(parseISO(fullDate), 'dd/MM'),
      fullDate,
      valor: Number(valor.toFixed(1))
    }))
    .sort((a, b) => a.fullDate!.localeCompare(b.fullDate!));

  // Calculate cat portion data
  const catPortionMap = new Map<string, number>();
  
  // First ensure we have an entry for each cat, even if they have no feedings
  cats.forEach(cat => {
    catPortionMap.set(cat.name, 0);
  });

  // Then process the feeding logs
  logs.forEach(log => {
    const amount = typeof log.amount === 'number' ? log.amount : 0; // Default to 0 if no amount
    const cat = cats.find(c => String(c.id) === String(log.catId));
    if (!cat) {
      console.log('Debug - Skipping log due to cat not found:', { logId: log.id, catId: log.catId });
      return;
    }
    
    const currentSum = catPortionMap.get(cat.name) || 0;
    catPortionMap.set(cat.name, currentSum + amount);
  });

  const totalPortion = Array.from(catPortionMap.values()).reduce((sum, value) => sum + value, 0);
  const catPortionData: CatPortion[] = Array.from(catPortionMap.entries())
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(1)),
      percent: totalPortion > 0 ? Number((value / totalPortion * 100).toFixed(1)) : 0
    }))
    .filter(item => item.value > 0) // Only include cats with feedings
    .sort((a, b) => b.value - a.value);

  // Calculate time distribution data
  const timeDistributionMap = new Map<number, number>();
  for (let i = 0; i < 24; i++) {
    timeDistributionMap.set(i, 0);
  }

  logs.forEach(log => {
    const logDate = safeParseISO(log.timestamp);
    if (!logDate) return;
    const hour = getHours(logDate);
    timeDistributionMap.set(hour, (timeDistributionMap.get(hour) || 0) + 1);
  });

  const timeDistributionData = Array.from(timeDistributionMap.entries())
    .map(([hour, count]) => ({
      name: `${hour.toString().padStart(2, '0')}:00`,
      valor: count
    }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  return {
    totalFeedings,
    averagePortionSize,
    totalPortionSize,
    timeSeriesData,
    catPortionData,
    timeDistributionData,
  };
}

export function useStatistics(
  logs: FeedingLog[],
  cats: CatType[],
  dateRange: { start: Date; end: Date },
  selectedCatId: string,
  locale: Locale
) {
  return useMemo(() => {
    const filteredLogs = filterLogs(logs, dateRange, selectedCatId);
    return calculateStatistics(filteredLogs, cats, dateRange, locale);
  }, [logs, cats, dateRange, selectedCatId, locale]);
} 