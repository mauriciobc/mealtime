"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useFeeding } from "@/lib/context/FeedingContext"
import { Skeleton } from "@/components/ui/skeleton"
import { useCats } from "@/lib/context/CatsContext"
import EventListItem from "./event-list-item"

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
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

  const recentLogs = (feedingLogs || []).slice(0, 5)

  if (recentLogs.length === 0) {
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
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {recentLogs.map((log, index) => {
        // ⚡ Bolt: Replaced O(n) `find` with O(1) `get` for significant performance gain,
        // especially with many cats or frequent re-renders.
        // The `cat` object is passed to the memoized `EventListItem`, preventing
        // re-renders unless the cat's data itself changes.
        const cat = log.cat || catsMap.get(String(log.catId))
        return <EventListItem key={log.id} log={log} cat={cat} index={index} />
      })}
    </motion.div>
  )
}
