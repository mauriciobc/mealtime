import { FeedingLog } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GroupedLogs {
  [date: string]: FeedingLog[];
}

/**
 * Groups feeding logs by date.
 *
 * This function is optimized to first group all logs by date in a single O(n) pass,
 * and then sort each subgroup. This avoids the O(n^2) complexity that would result
 * from sorting within the initial grouping loop.
 *
 * @param logs Array of feeding logs to group
 * @returns Object with dates as keys and arrays of logs as values
 */
export function groupLogsByDate(logs: FeedingLog[]): GroupedLogs {
  // ⚡ Bolt: First, group logs by date in a single pass (O(n)).
  // This is much more efficient than sorting on every iteration of the reduce
  // loop, which would result in O(n^2) complexity.
  const grouped = logs.reduce((groups: GroupedLogs, log) => {
    const date = format(new Date(log.timestamp), 'yyyy-MM-dd');

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(log);

    return groups;
  }, {});

  // Then, sort the logs within each group.
  for (const date in grouped) {
    grouped[date].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  return grouped;
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