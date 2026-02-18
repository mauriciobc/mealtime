"use client"

import React from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { m } from "framer-motion"

import type { CatType, FeedingLog } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

interface EventListItemProps {
  log: FeedingLog
  cat: CatType | undefined
  index: number
}

// ⚡ Bolt: This component is memoized with React.memo.
// This prevents it from re-rendering if its props (log, cat, index) have not changed,
// even if the parent EventsList component re-renders. This is a significant performance
// optimization for lists, as it avoids unnecessary render cycles for each item,
// saving CPU time and preventing UI jank.
const EventListItem = ({ log, cat, index }: EventListItemProps) => {
  const catName = cat?.name || "Gato Desconhecido"
  const catPhoto = cat?.photo_url || undefined
  const catInitials = catName.substring(0, 2).toUpperCase()

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={catPhoto} alt={catName} />
              <AvatarFallback>{catInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{catName}</h3>
                  {log.user && (
                    <p className="text-xs text-muted-foreground">
                      Alimentado por {log.user?.name || "Usuário Desconhecido"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.timestamp), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              {log.portionSize != null && (
                <p className="text-xs mt-1">
                  <span className="font-medium">Quantidade:</span> {log.portionSize}g
                </p>
              )}
              {log.notes && (
                <p className="text-xs mt-1 text-muted-foreground">
                  <span className="font-medium">Notas:</span> {log.notes}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  )
}

export default React.memo(EventListItem)
