"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Filter, SortDesc, Utensils, CheckCircle2, Clock, AlertCircle, Users } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
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
import { useSession } from "next-auth/react"
import { toast } from "sonner"

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
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    if (status !== "authenticated" || !state.currentUser?.householdId) {
      if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
        setIsLoading(false)
      }
      return
    }

    const currentHouseholdId = state.currentUser.householdId
    setIsLoading(true)

    const fetchFeedingLogs = async () => {
      try {
        const response = await fetch('/api/feedings')
        if (!response.ok) {
          throw new Error(`Failed to fetch feeding logs: ${response.statusText}`)
        }
        const data: FeedingLog[] = await response.json()

        dispatch({
          type: "SET_FEEDING_LOGS",
          payload: data
        })
      } catch (error) {
        console.error("Erro ao carregar registros de alimentação:", error)
        toast.error("Não foi possível carregar o histórico de alimentações.")
        dispatch({ type: "SET_FEEDING_LOGS", payload: [] })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeedingLogs()
  }, [status, state.currentUser, dispatch])
  
  const handleDeleteFeedingLog = async (logId: string) => {
    const previousLogs = state.feedingLogs
    dispatch({ type: "DELETE_FEEDING_LOG", payload: { id: logId } })

    try {
      const response = await fetch(`/api/feedings/${logId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Falha ao excluir registro: ${response.statusText}`)
      }
      toast.success("Registro excluído com sucesso!")
    } catch (error: any) {
      console.error("Erro ao deletar registro de alimentação:", error)
      toast.error(`Erro ao excluir: ${error.message}`)
      dispatch({ type: "SET_FEEDING_LOGS", payload: previousLogs })
    }
  }

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
    return <Loading text="Carregando histórico..." />
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return <Loading text="Redirecionando..." />
  }

  if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader
              title="Histórico de Alimentações"
              description="Veja todos os registros de alimentação dos seus gatos"
            />
            <EmptyState
              icon={Users}
              title="Sem Residência Associada"
              description="Você precisa criar ou juntar-se a uma residência para ver e registrar alimentações."
              actionLabel="Ir para Configurações"
              actionHref="/settings"
            />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  if (isLoading) {
    return <Loading text="Carregando registros..." />
  }

  const feedingLogsToDisplay = state.feedingLogs

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4 pb-24">
          <PageHeader
            title="Histórico de Alimentações"
            description="Veja todos os registros de alimentação dos seus gatos"
            actionIcon={<PlusCircle className="h-4 w-4" />}
            actionLabel="Registrar"
            actionHref="/feedings/new"
            showActionButton={!!state.currentUser?.householdId}
          />
          
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
          
          {feedingLogsToDisplay.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="Sem registros de alimentação"
              description={
                state.cats.length === 0
                  ? "Cadastre seus gatos primeiro para poder registrar alimentações."
                  : "Você ainda não registrou nenhuma alimentação para os gatos nesta residência."
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Timeline className="mt-4">
                {feedingLogsToDisplay
                  .map((log: FeedingLog) => {
                    const catName = state.cats.find(c => c.id === log.catId)?.name || 'Gato desconhecido'
                    const userName = log.user?.name || 'Usuário desconhecido'

                    return (
                      <TimelineItem
                        key={log.id}
                        date={new Date(log.timestamp)}
                        title={
                          <div className="flex items-center gap-2">
                            <Link href={`/cats/${log.catId}`} className="font-medium hover:underline">
                              {catName}
                            </Link>
                            {log.status && log.status !== 'completed' && (
                              <Badge variant={getStatusVariant(log.status)}>
                                {getStatusText(log.status)}
                              </Badge>
                            )}
                          </div>
                        }
                        description={
                          `${log.portionSize ? `${log.portionSize}g` : 'Quantidade não registrada'} ${log.notes ? `- ${log.notes}` : `- por ${userName}`}`
                        }
                        icon={getStatusIcon(log.status)}
                        status={log.status || "completed"}
                        onClick={() => router.push(`/feedings/${log.id}`)}
                        className="cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
                      />
                    )
                  })}
              </Timeline>
            </motion.div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
} 