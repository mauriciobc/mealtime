import { FeedingLog } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GroupedLogs {
  [date: string]: FeedingLog[];
}

/**
 * Groups feeding logs by date
 * @param logs Array of feeding logs to group
 * @returns Object with dates as keys and arrays of logs as values
 */
export function groupLogsByDate(logs: FeedingLog[]): GroupedLogs {
  // ⚡ Bolt: Efficiently group logs by date first, then sort each small group.
  // This is a significant improvement over the original O(n^2) approach of sorting on every reduce iteration.
  // This approach is safer than assuming pre-sorted input.

  // Step 1: Group logs by date in a single O(n) pass.
  const groupedLogs = logs.reduce((groups: GroupedLogs, log) => {
    const date = format(new Date(log.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {});

  // Step 2: Sort the logs within each date group.
  // This is much more efficient as we're sorting smaller, separate arrays.
  for (const date in groupedLogs) {
    groupedLogs[date].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  return groupedLogs;
}

/**
 * Formats a date key from groupLogsByDate into a readable string
 * @param dateKey Date key in format 'yyyy-MM-dd'
 * @returns Formatted date string
 */
export function formatGroupDate(dateKey: string): string {
  const date = new Date(dateKey);
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
} 