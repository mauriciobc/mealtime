"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { m } from "framer-motion"
import { useFeeding } from "@/lib/context/FeedingContext"
import { Skeleton } from "@/components/ui/skeleton"
import { useCats } from "@/lib/context/CatsContext"
import EventListItem from "./event-list-item"
import { isToday, isYesterday, isSameWeek, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { FeedingLog } from "@/lib/types"

function formatDateGroup(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  
  if (isToday(date)) return "Hoje"
  if (isYesterday(date)) return "Ontem"
  if (isSameWeek(date, new Date(), { weekStartsOn: 0 })) return "Esta Semana"
  
  // For older dates, show month and year
  return format(date, "MMMM yyyy", { locale: ptBR })
}

export default function EventsList() {
  const { state: feedingState } = useFeeding()
  const { feedingLogs, isLoading, error } = feedingState
  const { state: catsState } = useCats()
  const { cats, isLoading: isLoadingCats } = catsState

  // ⚡ Bolt: Memoize cats into a Map for O(1) lookup
  // This prevents the O(n*m) complexity of calling cats.find() inside the feedingLogs.map()
  // This prevents re-calculating the map on every render and speeds up cat lookups.
  // This avoids an O(n) `find` operation inside the `map` loop below,
  // which can be a performance bottleneck with many cats.
  const catsMap = useMemo(() => {
    if (!cats) return new Map()
    return new Map(cats.map(cat => [String(cat.id), cat]))
  }, [cats])

  const groupedLogs = useMemo(() => {
    const recentLogs = (feedingLogs || []).slice(0, 5)
    const groups: Record<string, FeedingLog[]> = {}

    recentLogs.forEach(log => {
      const dateKey = formatDateGroup(log.timestamp)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(log)
    })

    return { groups, recentCount: recentLogs.length }
  }, [feedingLogs])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {(['sk-a', 'sk-b', 'sk-c'] as const).map((skeletonKey) => (
          <Card key={skeletonKey} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-2/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-destructive">
          Erro ao carregar eventos: {error}
        </CardContent>
      </Card>
    )
  }

  if (groupedLogs.recentCount === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">
            Nenhum registro de alimentação encontrado.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <m.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {Object.entries(groupedLogs.groups).map(([dateGroup, logs], groupIndex) => (
        <div key={dateGroup} className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {dateGroup}
          </h3>
          {logs.map((log, index) => {
            const cat = log.cat || catsMap.get(String(log.catId))
            return <EventListItem key={log.id} log={log} cat={cat} index={groupIndex * logs.length + index} />
          })}
        </div>
      ))}
    </m.div>
  )
}
