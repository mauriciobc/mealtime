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
  // ⚡ Bolt: First, group all logs by date in a single O(n) pass.
  const groups = logs.reduce((groups: GroupedLogs, log) => {
    const date = format(new Date(log.timestamp), 'yyyy-MM-dd');
    
    if (!groups[date]) {
      groups[date] = [];
    }
    
    groups[date].push(log);
    return groups;
  }, {});

  // ⚡ Bolt: Now, sort each group once. This is much more efficient than sorting
  // on every insertion, avoiding O(n^2) complexity within the reducer.
  for (const date in groups) {
    groups[date].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  return groups;
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