"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Filter, SortDesc, Utensils } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import { motion } from "framer-motion"
import { getFeedingLogs } from "@/lib/data"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { useGlobalState } from "@/lib/context/global-state"
import { FeedingLog } from "@/lib/types"
import { FeedingLogItem } from "@/components/feeding-log-item"

// Definindo a interface para o registro de alimentação
interface FeedingLogType {
  id: number
  catId: number
  userId: number
  timestamp: Date
  portionSize: number | null
  notes: string | null
  createdAt: Date
  cat: {
    id: number
    name: string
    photoUrl: string | null
  }
  user: {
    id: number
    name: string
  }
}

export default function FeedingsPage() {
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const fetchFeedingLogs = async () => {
      try {
        const response = await fetch('/api/feedings')
        const data = await response.json()
        
        dispatch({
          type: "SET_FEEDING_LOGS",
          payload: data
        })
      } catch (error) {
        console.error("Erro ao carregar registros de alimentação:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeedingLogs()
  }, [dispatch])
  
  const handleDeleteFeedingLog = async (logId: string) => {
    try {
      await fetch(`/api/feedings/${logId}`, {
        method: 'DELETE'
      })
      
      dispatch({
        type: "DELETE_FEEDING_LOG",
        payload: { id: logId },
      })
    } catch (error) {
      console.error("Erro ao deletar registro de alimentação:", error)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Histórico de Alimentações</h1>
            <Link href="/feedings/new">
              <Button className="flex items-center gap-2">
                <PlusCircle size={16} />
                <span>Registrar</span>
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar registros..."
                className="w-full rounded-md border border-input pl-10 py-2 text-sm"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter size={18} />
            </Button>
            <Button variant="outline" size="icon">
              <SortDesc size={18} />
            </Button>
          </div>
          
          {isLoading ? (
            <Loading />
          ) : state.feedingLogs.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="Sem registros de alimentação"
              description={
                state.cats.length === 0
                  ? "Cadastre seus gatos primeiro para poder registrar alimentações."
                  : "Você ainda não registrou nenhuma alimentação. Registre a primeira alimentação para começar a acompanhar."
              }
              actionLabel={
                state.cats.length === 0
                  ? "Cadastrar Gato"
                  : "Registrar Primeira Alimentação"
              }
              actionHref={state.cats.length === 0 ? "/cats/new" : "/feedings/new"}
              variant="feeding"
            />
          ) : (
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {state.feedingLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((log: FeedingLog) => (
                  <motion.div key={log.id} variants={itemVariants}>
                    <FeedingLogItem
                      log={log}
                      onView={() => router.push(`/feedings/${log.id}`)}
                      onEdit={() => router.push(`/feedings/${log.id}/edit`)}
                      onDelete={() => handleDeleteFeedingLog(log.id)}
                    />
                  </motion.div>
                ))}
            </motion.div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
} 