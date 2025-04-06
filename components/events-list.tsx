"use client"

import { useState, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { getFeedingLogs } from "@/lib/data"

interface FeedingLogType {
  id: number;
  catId: number;
  userId: number;
  timestamp: Date;
  portionSize: number | null;
  notes: string | null;
  createdAt: Date;
  cat: {
    id: number;
    name: string;
    photoUrl: string | null;
  };
  user: {
    id: number;
    name: string;
  };
}

export default function EventsList() {
  const [feedingLogs, setFeedingLogs] = useState<FeedingLogType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadFeedingLogs() {
      try {
        setIsLoading(true)
        const logs = await getFeedingLogs(undefined, 5) // Limitar a 5 registros
        setFeedingLogs(logs)
      } catch (error) {
        console.error("Erro ao carregar registros de alimentação:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFeedingLogs()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-muted rounded"></div>
                  <div className="h-3 w-1/2 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (feedingLogs.length === 0) {
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
      {feedingLogs.map((log, index) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={log.cat.photoUrl || ""} alt={log.cat.name} />
                  <AvatarFallback>
                    {log.cat.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{log.cat.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Alimentado por {log.user.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { 
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                  {log.portionSize && (
                    <p className="text-xs mt-1">
                      <span className="font-medium">Quantidade:</span> {log.portionSize}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-xs mt-1">
                      <span className="font-medium">Observações:</span> {log.notes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
