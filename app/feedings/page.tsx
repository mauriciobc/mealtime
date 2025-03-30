"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Filter, SortDesc, Utensils, CheckCircle2, Clock, AlertCircle } from "lucide-react"
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
import { Timeline, TimelineItem } from "@/components/ui/timeline"
import { Badge } from "@/components/ui/badge"

const getStatusIcon = (status: string | undefined) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case "in-progress":
      return <Clock className="h-5 w-5 text-blue-500" />
    case "pending":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    default:
      return <Utensils className="h-5 w-5 text-primary" />
  }
}

const getStatusVariant = (status: string | undefined) => {
  switch (status) {
    case "completed":
      return "default"
    case "in-progress":
      return "secondary"
    case "pending":
      return "warning"
    default:
      return "outline"
  }
}

const getStatusText = (status: string | undefined) => {
  switch (status) {
    case "completed":
      return "Concluído"
    case "in-progress":
      return "Em andamento"
    case "pending":
      return "Pendente"
    default:
      return "Não especificado"
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
        payload: logId,
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
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Timeline className="mt-4">
                {state.feedingLogs
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log: FeedingLog) => (
                    <TimelineItem
                      key={log.id}
                      date={new Date(log.timestamp)}
                      title={
                        <div className="flex items-center gap-2">
                          <span>{log.cat?.name || 'Gato'}</span>
                          <Badge variant={getStatusVariant(log.status)}>
                            {getStatusText(log.status)}
                          </Badge>
                        </div>
                      }
                      description={`${log.portionSize ? `${log.portionSize}g` : 'Quantidade não especificada'} - ${log.notes || `Alimentado por ${log.user?.name || 'Usuário'}`}`}
                      icon={getStatusIcon(log.status)}
                      status={log.status || "completed"}
                    />
                  ))}
              </Timeline>
            </motion.div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
} 