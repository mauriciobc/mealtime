"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Filter, SortDesc, Utensils, CheckCircle2, Clock, AlertCircle, Users, Trash2, Ban, AlertTriangle, HelpCircle } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { motion } from "framer-motion"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { FeedingLog, CatType } from "@/lib/types"
import { Timeline, TimelineItem } from "@/components/ui/timeline"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { groupLogsByDate } from "@/lib/utils/feedingUtils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const getStatusIcon = (status: string | undefined) => {
  switch (status) {
    case "Normal":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "Comeu Pouco":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "Recusou":
      return <Ban className="h-5 w-5 text-red-500" />;
    case "Vomitou":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "Outro":
      return <HelpCircle className="h-5 w-5 text-blue-500" />;
    default:
      return <Utensils className="h-5 w-5 text-primary" />;
  }
};

const getStatusVariant = (status: string | undefined): "default" | "secondary" | "warning" | "destructive" | "outline" => {
  switch (status) {
    case "Normal":
      return "default";
    case "Comeu Pouco":
      return "warning";
    case "Recusou":
    case "Vomitou":
      return "destructive";
    case "Outro":
      return "secondary";
    default:
      return "outline";
  }
};

const getStatusText = (status: string | undefined) => {
  switch (status) {
    case "Normal":
      return "Normal";
    case "Comeu Pouco":
      return "Comeu Pouco";
    case "Recusou":
      return "Recusou";
    case "Vomitou":
      return "Vomitou";
    case "Outro":
      return "Outro";
    default:
      return "-";
  }
};

export default function FeedingsPage() {
  const router = useRouter()
  const { state: appState, dispatch: appDispatch } = useAppContext()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { data: session, status } = useSession()
  const { currentUser } = userState
  const { cats, feedingLogs } = appState

  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [logToDelete, setLogToDelete] = useState<FeedingLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === "authenticated" || status === "unauthenticated") {
      setIsLoadingPage(false)
    }
  }, [status])

  const handleDeleteFeedingLog = async (logId: number) => {
    if (!logId) return
    const opId = `delete-feeding-${logId}`
    addLoadingOperation({ id: opId, description: "Excluindo registro..." })
    setIsDeleting(true)
    const previousLogs = feedingLogs

    appDispatch({ type: "DELETE_FEEDING_LOG", payload: { id: String(logId) } })

    try {
      const response = await fetch(`/api/feedings/${logId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        appDispatch({ type: "SET_FEEDING_LOGS", payload: previousLogs })
        throw new Error(errorData.error || `Falha ao excluir registro: ${response.statusText}`)
      }
      toast.success("Registro excluído com sucesso!")
    } catch (error: any) {
      console.error("Erro ao deletar registro de alimentação:", error)
      toast.error(`Erro ao excluir: ${error.message}`)
      appDispatch({ type: "SET_FEEDING_LOGS", payload: previousLogs })
    } finally {
      setIsDeleting(false)
      setLogToDelete(null)
      removeLoadingOperation(opId)
    }
  }

  const filteredAndSortedLogs = useMemo(() => {
    if (!feedingLogs) return []
    
    let logs = [...feedingLogs]
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      logs = logs.filter(log => 
        cats.find(c => c.id === log.catId)?.name.toLowerCase().includes(lowerSearchTerm) ||
        log.notes?.toLowerCase().includes(lowerSearchTerm) || 
        log.user?.name?.toLowerCase().includes(lowerSearchTerm)
      )
    }
    
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })
    
    return logs
  }, [feedingLogs, cats, searchTerm, sortOrder])
  
  const groupedLogs = useMemo(() => groupLogsByDate(filteredAndSortedLogs), [filteredAndSortedLogs])

  if (status === "loading" || (status === "authenticated" && (!currentUser || !cats || !feedingLogs))) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader title="Histórico de Alimentações" description="Veja todos os registros" />
            <Loading text="Carregando histórico..." />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return <Loading text="Redirecionando..." />
  }

  if (status === "authenticated" && currentUser && !currentUser.householdId) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader
              title="Histórico de Alimentações"
              description="Veja todos os registros"
            />
            <EmptyState
              icon={Users}
              title="Sem Residência Associada"
              description="Você precisa criar ou juntar-se a uma residência para ver e registrar alimentações."
              actionLabel="Ir para Configurações"
              actionHref="/settings"
              className="mt-6"
            />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  if (isLoadingPage) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader title="Histórico de Alimentações" description="Veja todos os registros" />
            <Loading text="Carregando registros..." />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

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
            showActionButton={!!currentUser?.householdId}
          />
          
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por gato, notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm h-9"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              title={`Ordenar ${sortOrder === 'desc' ? 'Ascendente' : 'Descendente'}`}
            >
              <SortDesc size={18} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          {filteredAndSortedLogs.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title={searchTerm ? "Nenhum Resultado" : "Sem Registros"}
              description={
                searchTerm
                  ? "Nenhum registro encontrado para sua busca."
                  : cats.length === 0
                  ? "Cadastre seus gatos primeiro para poder registrar alimentações."
                  : "Você ainda não registrou nenhuma alimentação para os gatos nesta residência."
              }
              actionLabel={
                searchTerm
                  ? "Limpar Busca"
                  : cats.length === 0
                  ? "Cadastrar Gato"
                  : "Registrar Alimentação"
              }
              actionOnClick={searchTerm ? () => setSearchTerm("") : undefined}
              actionHref={!searchTerm ? (cats.length === 0 ? "/cats/new" : "/feedings/new") : undefined}
              variant="feeding"
              className="mt-10"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {Object.entries(groupedLogs).map(([date, logs]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background/90 backdrop-blur py-1 px-1 -mx-1 z-10">{date}</h3>
                  <Timeline className="ml-1">
                    {logs.map((log: FeedingLog) => {
                      const cat = cats.find(c => c.id === log.catId)
                      const catName = cat?.name || 'Gato desconhecido'
                      const userName = log.user?.name || '-'

                      return (
                        <TimelineItem
                          key={log.id}
                          time={new Date(log.timestamp)}
                          title={
                            <div className="flex items-center gap-2">
                              <Link href={`/cats/${log.catId}`} className="font-medium hover:underline">
                                {catName}
                              </Link>
                              {log.portionSize !== null && (
                                <Badge variant="secondary" className="font-normal">{log.portionSize}g</Badge>
                              )}
                            </div>
                          }
                          description={
                            log.notes ? `${log.notes} (por ${userName})` : `Registrado por ${userName}`
                          }
                          icon={getStatusIcon(undefined)}
                          status={"completed"}
                          onClick={() => router.push(`/feedings/${log.id}`)}
                          onDelete={() => setLogToDelete(log)}
                          className="cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
                        />
                      )
                    })}
                  </Timeline>
                </div>
              ))}
            </motion.div>
          )}
        </div>
        
        {logToDelete && (
          <AlertDialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este registro de alimentação para "{cats.find(c=>c.id === logToDelete.catId)?.name || 'este gato'}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDeleteFeedingLog(logToDelete.id)}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? <Loading text="Excluindo..." size="sm" /> : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <BottomNav />
      </div>
    </PageTransition>
  )
} 