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
import { useCats } from "@/lib/context/CatsContext"
import { useFeeding } from "@/lib/context/FeedingContext"
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
  const { state: catsState } = useCats()
  const { state: feedingState, dispatch: feedingDispatch } = useFeeding()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { data: session, status } = useSession()
  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState
  const { feedingLogs, isLoading: isLoadingFeedings, error: errorFeedings } = feedingState

  const isLoading = isLoadingUser || isLoadingCats || isLoadingFeedings
  const error = errorUser || errorCats || errorFeedings
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [logToDelete, setLogToDelete] = useState<FeedingLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteFeedingLog = async (logId: number) => {
    if (!logId) return
    const opId = `delete-feeding-${logId}`
    addLoadingOperation({ id: opId, description: "Excluindo registro..." })
    setIsDeleting(true)
    const previousLogs = feedingState.feedingLogs
    const logToDeleteObject = previousLogs.find(log => Number(log.id) === logId)

    if (!logToDeleteObject) {
      toast.error("Erro: Registro não encontrado para exclusão.")
      setIsDeleting(false)
      removeLoadingOperation(opId)
      return
    }
    
    feedingDispatch({ type: "REMOVE_FEEDING", payload: logToDeleteObject })

    try {
      const response = await fetch(`/api/feedings/${logId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs })
        throw new Error(errorData.error || `Falha ao excluir registro: ${response.statusText}`)
      }
      toast.success("Registro excluído com sucesso!")
    } catch (error: any) {
      console.error("Erro ao deletar registro de alimentação:", error)
      toast.error(`Erro ao excluir: ${error.message}`)
      feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs })
    } finally {
      setIsDeleting(false)
      setLogToDelete(null)
      removeLoadingOperation(opId)
    }
  }

  const filteredAndSortedLogs = useMemo(() => {
    if (!feedingLogs || !cats) return []
    
    let logs = [...feedingLogs]
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      logs = logs.filter(log => 
        cats.find(c => String(c.id) === String(log.catId))?.name.toLowerCase().includes(lowerSearchTerm) ||
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

  if (status === "loading" || (status === "authenticated" && isLoading)) {
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

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader title="Histórico de Alimentações" description="Erro ao carregar dados" />
            <EmptyState title="Erro" description={error} icon={AlertTriangle} />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
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

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4 pb-24">
          <PageHeader
            title="Histórico de Alimentações"
            description="Veja todos os registros de alimentação dos seus gatos"
            actionLabel={currentUser?.householdId ? "Registrar" : undefined}
            actionHref={currentUser?.householdId ? "/feedings/new" : undefined}
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
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              title={sortOrder === "desc" ? "Ordenar ascendente" : "Ordenar descendente"}
            >
              <SortDesc className={`h-4 w-4 transform transition-transform ${sortOrder === "asc" ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          {filteredAndSortedLogs.length === 0 && !isLoading ? (
            <EmptyState
              icon={Utensils}
              title="Nenhum registro encontrado"
              description={searchTerm 
                ? "Nenhum registro corresponde à sua busca."
                : "Nenhum registro de alimentação encontrado para esta residência."}
              actionLabel="Registrar Primeira Alimentação"
              actionHref="/feedings/new"
              className="mt-12"
            />
          ) : (
            <Timeline>
              {Object.entries(groupedLogs).map(([date, logsOnDate]) => (
                <div key={date}>
                  <h2 className="text-lg font-semibold my-4 sticky top-0 bg-background py-2 z-10">
                    {format(new Date(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  {logsOnDate.map((log, index) => {
                    const cat = cats.find(c => String(c.id) === String(log.catId))
                    return (
                      <TimelineItem key={log.id} className="mb-4">
                        <div className="flex items-start gap-4 w-full">
                          <div className="text-right text-sm text-muted-foreground pt-1 w-16 flex-shrink-0">
                            {format(new Date(log.timestamp), "HH:mm")}
                          </div>
                          
                          <Card className="flex-grow shadow-sm">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                 <div className="flex items-center gap-3 flex-grow min-w-0">
                                   <Link href={`/cats/${cat?.id}`} className="flex-shrink-0">
                                     <Avatar className="h-9 w-9">
                                       <AvatarImage src={cat?.photoUrl || undefined} alt={cat?.name} />
                                       <AvatarFallback>{cat?.name?.substring(0, 2).toUpperCase() || "?"}</AvatarFallback>
                                     </Avatar>
                                   </Link>
                                   <div className="min-w-0">
                                     <Link href={`/cats/${cat?.id}`} className="font-medium truncate hover:underline">
                                        {cat?.name || "Gato Desconhecido"}
                                     </Link>
                                      {log.user && (
                                         <p className="text-xs text-muted-foreground truncate">
                                           por {log.user?.name || "Usuário Desconhecido"}
                                         </p>
                                      )}
                                   </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-2 flex-shrink-0">
                                    {log.portionSize != null && (
                                        <Badge variant="outline" className="text-xs">
                                          {log.portionSize} g
                                        </Badge>
                                     )}
                                     {getStatusIcon(log.status)}
                                     {log.status && (
                                         <Badge variant={getStatusVariant(log.status)} className="text-xs">
                                           {getStatusText(log.status)}
                                         </Badge>
                                     )}
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                         variant="ghost" 
                                         size="icon" 
                                         className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                         onClick={() => setLogToDelete(log)}
                                      >
                                         <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                 </div>
                                 
                              </div>
                              {log.notes && (
                                <p className="text-xs text-muted-foreground mt-2 pl-12 italic">
                                  &quot;{log.notes}&quot;
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </TimelineItem>
                    )
                  })}
                </div>
              ))}
            </Timeline>
          )}
        </div>
        
        <AlertDialog open={!!logToDelete} onOpenChange={(open) => {if (!open) setLogToDelete(null)}}> 
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este registro de alimentação?
                {logToDelete && ` (${cats.find(c=>c.id === logToDelete.catId)?.name} em ${format(new Date(logToDelete.timestamp), 'dd/MM HH:mm')})`} 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLogToDelete(null)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeleteFeedingLog(Number(logToDelete?.id))}
                disabled={isDeleting || !logToDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                 {isDeleting ? <Loading text="Excluindo..." size="sm"/> : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BottomNav />
      </div>
    </PageTransition>
  )
} 