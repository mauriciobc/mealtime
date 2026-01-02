"use client"

import React, { useState, useMemo, useTransition, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle, Search, SortDesc, Utensils, CheckCircle2, AlertCircle, Ban, AlertTriangle, HelpCircle, Users, Trash2, Edit } from "lucide-react"
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
import { FeedingLog } from "@/lib/types"
import { Timeline, TimelineItem } from "@/components/ui/timeline"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { groupLogsByDate } from "@/lib/utils/feedingUtils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer"
import {
  DrawerTrigger
} from "@/components/ui/drawer"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"
import { NewFeedingSheet } from "@/components/feeding/new-feeding-sheet"

// Helper functions for status display
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
      return null; // Return null if no specific icon needed, or keep Utensils if preferred as default
  }
};

// Only allowed variants: "default" | "secondary" | "destructive" | "outline"
const getStatusVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Normal":
      return "default";
    case "Comeu Pouco":
      return "secondary"; // changed from 'warning' to 'secondary'
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
  return status || "-"; // Simplify: return status directly or '-' if undefined/empty
};

export default function FeedingsPage() {
  const router = useRouter()
  const { state: catsState } = useCats()
  const { state: feedingState, dispatch: feedingDispatch } = useFeeding()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()

  const { currentUser, isLoading: isLoadingUser, error: errorUser } = userState
  const { cats, isLoading: isLoadingCats, error: errorCats } = catsState
  const { feedingLogs, isLoading: isLoadingFeedings, error: errorFeedings } = feedingState

  const isLoading = isLoadingUser || isLoadingCats || isLoadingFeedings
  const error = errorUser || errorCats || errorFeedings

  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [logToDelete, setLogToDelete] = useState<FeedingLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [logToEdit, setLogToEdit] = useState<FeedingLog | null>(null)

  const userLanguage = userState.currentUser?.preferences?.language;
  const _userLocale = resolveDateFnsLocale(userLanguage);
  
  // React 19 transitions for better UX
  const [isPending, startTransition] = useTransition()
  const deferredSearchTerm = useDeferredValue(searchTerm)

  // ⚡ Bolt: Memoize cats into a Map for O(1) lookup instead of O(n) Array.find()
  // This significantly speeds up filtering and rendering, especially with many cats and logs.
  // This improves performance by allowing O(1) access to cat data inside the filter and render loops.
  // Creates a Map for O(1) cat lookups inside the filter, avoiding a nested loop (O(n*m)) and improving performance.
  const catsMap = useMemo(() => {
    if (!cats) return new Map()
    // Ensure cat.id is treated as a string for consistent key access
    return new Map(cats.map(cat => [String(cat.id), cat]))
  }, [cats])

  // Memoized filtering and sorting with useTransition
  const filteredAndSortedLogs = useMemo(() => {
    if (!feedingLogs || !catsMap) return []

    let logs = [...feedingLogs]

    // Apply search filter using deferred value
    if (deferredSearchTerm) {
      const lowerSearchTerm = deferredSearchTerm.toLowerCase()
      logs = logs.filter(log => {
          // ⚡ Bolt: O(1) lookup instead of O(n)
          // Replaced O(m) find with O(1) map lookup.
          const catName = catsMap.get(String(log.catId))?.name.toLowerCase() || ""
          const notes = log.notes?.toLowerCase() || ""
          const userName = log.user?.name?.toLowerCase() || ""
          return catName.includes(lowerSearchTerm) || notes.includes(lowerSearchTerm) || userName.includes(lowerSearchTerm)
        }
      )
    }

    // ⚡ Bolt: Skip redundant sort if order is 'desc' since data is pre-sorted.
    // The `feedingLogs` from context are already sorted descending by timestamp.
    // We only need to reverse the array if the user requests ascending order.
    // This avoids an O(n log n) sort operation on every render for the default case.
    if (sortOrder === "asc") {
      // Return a reversed copy without mutating the original `logs` array
      return logs.slice().reverse();
    }

    return logs
  }, [feedingLogs, catsMap, deferredSearchTerm, sortOrder])

  // Memoized grouping by date
  const groupedLogs = useMemo(() => {
     return groupLogsByDate(filteredAndSortedLogs)
  }, [filteredAndSortedLogs])

  // Delete handler - Update to use string ID
  const handleDeleteFeedingLog = async (logId: string | undefined) => {
     if (!logId) {
        toast.warning("ID do registro inválido para exclusão.")
        return
     }
     
     const opId = `delete-feeding-${logId}`
     addLoadingOperation({ id: opId, description: "Excluindo registro..." })
     setIsDeleting(true)
     
     const previousLogs = feedingState.feedingLogs
     // Find log using string comparison
     const logToDeleteObject = previousLogs.find(log => log.id === logId)

     if (!logToDeleteObject) {
       toast.error("Erro: Registro não encontrado para exclusão.")
       setIsDeleting(false)
       removeLoadingOperation(opId)
       setLogToDelete(null) // Close dialog if log not found
       return
     }
     
     // Optimistic UI update - Pass the full object
     feedingDispatch({ type: "REMOVE_FEEDING", payload: logToDeleteObject })
     setLogToDelete(null) // Close dialog immediately after optimistic update

     try {
       // Add X-User-ID header
       const headers: HeadersInit = {};
       if (currentUser?.id) {
           headers['X-User-ID'] = currentUser.id;
       } else {
           toast.error("Erro de autenticação ao excluir.");
           throw new Error("User ID missing for delete request");
       }
       
       // Use string ID in URL
       const response = await fetch(`/api/feedings/${logId}`, {
         method: 'DELETE',
         headers: headers // Add headers
       })
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({}))
         // Revert optimistic update on failure
         feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs })
         throw new Error(errorData.error || `Falha ao excluir registro: ${response.statusText}`)
       }
       toast.success("Registro excluído com sucesso!")
     } catch (error: any) {
       console.error("Erro ao deletar registro de alimentação:", error)
       toast.error(`Erro ao excluir: ${error.message || "Ocorreu um erro desconhecido"}`)
       // Ensure state is reverted if fetch fails
       if(feedingState.feedingLogs.find(log => log.id === logId) === undefined) {
          feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs })
       }
     } finally {
       setIsDeleting(false)
       removeLoadingOperation(opId)
       // Ensure dialog is closed even if fetch fails but optimistic update happened
       if (logToDelete?.id === logId) {
          setLogToDelete(null)
       }
     }
   }

  // --- Render Logic ---

  // 1. Handle Initial Loading State (NOT including isPending to keep UI responsive)
  if (isLoading) {
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

  // 2. Handle Combined Error State
  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader title="Histórico de Alimentações" description="Erro ao carregar dados" />
            <EmptyState title="Erro ao Carregar" description={error || "Não foi possível buscar os dados."} IconComponent={AlertTriangle} />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  // 3. Handle No Authenticated User Found (after loading/error checks)
  if (!currentUser) {
    toast.error("Autenticação necessária para ver o histórico.");
    router.replace("/login?callbackUrl=/feedings");
    return <Loading text="Redirecionando para login..." />;
  }

  // 4. Handle Authenticated but no household associated
  if (!currentUser.householdId) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4 pb-24">
            <PageHeader
              title="Histórico de Alimentações"
              description="Veja todos os registros"
            />
            <EmptyState
              IconComponent={Users}
              title="Sem Residência Associada"
              description="Você precisa criar ou juntar-se a uma residência para ver e registrar alimentações."
              actionButton={
                <Button asChild>
                  <Link href="/settings">Ir para Configurações</Link>
                </Button>
              }
              className="mt-6"
            />
          </div>
          <BottomNav />
        </div>
      </PageTransition>
    )
  }

  // Main content render
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4 pb-24">
          <PageHeader
            title="Histórico de Alimentações"
            description="Veja todos os registros de alimentação dos seus gatos"
            {...(currentUser?.householdId && {
              actionLabel: "Registrar",
              actionHref: "/feedings/new"
            })}
          />

          {/* Search and Sort Controls */}
          <div className="flex items-center gap-2 mb-6 sticky top-0 bg-background py-3 z-20 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por gato, notas, usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm h-9 focus-visible:ring-primary"
              />
              {/* Subtle loading indicator when isPending */}
              {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => startTransition(() => setSortOrder(prev => prev === "desc" ? "asc" : "desc"))}
              title={sortOrder === "desc" ? "Ordenar: Mais recentes primeiro" : "Ordenar: Mais antigos primeiro"}
            >
              <SortDesc className={`h-4 w-4 transform transition-transform duration-200 ${sortOrder === "asc" ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Timeline or Empty State */}
          <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          {filteredAndSortedLogs.length === 0 && !isLoading ? (
            <EmptyState
              IconComponent={Utensils}
              title="Nenhum registro encontrado"
              description={searchTerm
                ? "Nenhum registro corresponde à sua busca. Tente outros termos."
                : "Ainda não há registros de alimentação. Que tal registrar o primeiro?"}
              actionButton={
                !searchTerm ? (
                  <Button asChild>
                    <Link href="/feedings/new">Registrar Alimentação</Link>
                  </Button>
                ) : undefined
              }
              className="mt-12"
            />
          ) : (
            <Timeline>
              {Object.entries(groupedLogs).map(([date, logsOnDate]) => (
                <React.Fragment key={date}>
                  {/* Date Header */}
                  <h2 className="text-lg font-semibold my-4 sticky top-[68px] bg-background py-2 z-10"> {/* Adjusted sticky top */}
                    {format(new Date(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  {/* Logs for the Date */}
                  {logsOnDate.map((log) => {
                    // ⚡ Bolt: O(1) lookup instead of O(n)
                    // Replaced O(m) find with O(1) map lookup.
                    const cat = catsMap.get(String(log.catId))
                    const displayStatusIcon = getStatusIcon(log.status);
                    const displayStatusVariant = getStatusVariant(log.status);
                    const displayStatusText = getStatusText(log.status);
                    
                    return (
                      // Replace TimelineItem with a custom structure
                      <div key={log.id} className="relative pl-[58px] mb-4 group"> {/* Adjust left padding to make space for the absolute positioned Avatar */}
                        {/* Manual Timeline Dot/Icon (Avatar) */}
                        <div className="absolute left-0 top-0 flex-shrink-0"> {/* Position Avatar absolutely to the left */}
                          {cat?.id ? (
                            <Link href={`/cats/${cat.id}`} aria-label={`Ver perfil de ${cat?.name}`}>
                              <Avatar className="h-10 w-10 border shadow-md"> {/* Match icon size from original TimelineItem */}
                                <AvatarImage src={cat?.photo_url || undefined} alt={cat?.name} />
                                <AvatarFallback>{cat?.name?.substring(0, 1).toUpperCase() || "?"}</AvatarFallback>
                              </Avatar>
                            </Link>
                          ) : (
                            <Avatar className="h-10 w-10 border shadow-md">
                              <AvatarFallback>?</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        {/* Custom content layout */}
                        <div className="flex items-start gap-8 w-full">
                           {/* Time Column */}
                          <div className="text-right text-sm text-muted-foreground pt-1 w-16 flex-shrink-0 tabular-nums -ml-[58px] pl-12"> {/* Use negative margin to pull time back into the padding space */}
                            {format(new Date(log.timestamp), "HH:mm", { locale: ptBR })}
                          </div>

                          {/* Main Content Card (moves to the right of the Avatar/dot) */}
                          <Card className="flex-grow shadow-sm transition-shadow hover:shadow-md ml-2"> {/* Add small margin left for spacing from Avatar */}
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                {/* Cat Name/User (No Avatar needed here anymore) */}
                                <div className="min-w-0">
                                  {cat?.id ? (
                                    <Link href={`/cats/${cat.id}`} className="font-medium truncate hover:underline text-sm sm:text-base">
                                      {cat?.name || "Gato Desconhecido"}
                                    </Link>
                                  ) : (
                                    <span className="font-medium truncate text-sm sm:text-base text-muted-foreground">
                                      {cat?.name || "Gato Desconhecido"}
                                    </span>
                                  )}
                                  {log.user && (
                                    <p className="text-xs text-muted-foreground truncate" title={`Registrado por ${log.user?.name}`}>
                                      por {log.user?.name || "Usuário Desconhecido"}
                                    </p>
                                  )}
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  {log.portionSize != null && log.portionSize > 0 && (
                                    <Badge variant="outline" className="text-xs px-1.5 sm:px-2.5">
                                      {log.portionSize}g
                                    </Badge>
                                  )}
                                  {displayStatusIcon && (
                                      <span title={displayStatusText}>{displayStatusIcon}</span>
                                  )}
                                  {log.status && log.status !== 'Normal' && ( // Optionally hide "Normal" badge for cleaner look
                                    <Badge variant={displayStatusVariant} className="text-xs px-1.5 sm:px-2.5">
                                      {displayStatusText}
                                    </Badge>
                                  )}
                                  {/* Edit Button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={(e) => { e.stopPropagation(); setLogToEdit(log); }}
                                    aria-label="Editar registro"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {/* Delete Button with Drawer (BottomSheet) */}
                                  <Drawer open={logToDelete?.id === log.id} onOpenChange={(open) => { if (!open) setLogToDelete(null) }}>
                                    <DrawerTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-1"
                                        onClick={(e) => { e.stopPropagation(); setLogToDelete(log); }}
                                        aria-label="Excluir registro"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </DrawerTrigger>
                                    <DrawerContent>
                                      <DrawerHeader>
                                        <DrawerTitle>Confirmar Exclusão</DrawerTitle>
                                        <DrawerDescription>
                                          Tem certeza que deseja excluir este registro de alimentação?
                                          {/* ⚡ Bolt: O(1) lookup instead of O(n) */}
                                          {/* Replaced O(m) find with O(1) map lookup. */}
                                          {log && ` (Gato: ${catsMap.get(String(log.catId))?.name || 'Desconhecido'}, Data: ${format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })})`}
                                          <br />
                                          Esta ação não pode ser desfeita.
                                        </DrawerDescription>
                                      </DrawerHeader>
                                      <DrawerFooter>
                                        <DrawerClose asChild>
                                          <Button variant="outline" onClick={() => setLogToDelete(null)} disabled={isDeleting}>
                                            Cancelar
                                          </Button>
                                        </DrawerClose>
                                        <Button
                                          onClick={() => handleDeleteFeedingLog(log.id ? String(log.id) : undefined)}
                                          disabled={isDeleting || !logToDelete || logToDelete.id !== log.id}
                                          className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive text-white"
                                        >
                                          {isDeleting && logToDelete?.id === log.id ? <Loading text="Excluindo..." size="sm" className="text-white"/> : "Excluir"}
                                        </Button>
                                      </DrawerFooter>
                                    </DrawerContent>
                                  </Drawer>
                                </div>
                              </div>
                              {/* Notes */}
                              {log.notes && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  &quot;{log.notes}&quot;
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </Timeline>
          )}
          </div>
        </div>

        <BottomNav />
      </div>

      {/* Drawer de edição de alimentação */}
      {logToEdit && (
        <NewFeedingSheet
          isOpen={!!logToEdit}
          onOpenChange={(open) => { if (!open) setLogToEdit(null) }}
          initialFeedingLog={logToEdit}
        />
      )}
    </PageTransition>
  )
} 