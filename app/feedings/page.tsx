"use client"

import React, { useState, useMemo, useTransition, useDeferredValue, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Search, SortDesc, Utensils, AlertTriangle, Users } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { useCats } from "@/lib/context/CatsContext"
import { useFeeding } from "@/lib/context/FeedingContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { FeedingLog } from "@/lib/types"
import { Timeline } from "@/components/ui/timeline"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { groupLogsByDate } from "@/lib/utils/feedingUtils"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"
import { NewFeedingSheet } from "@/components/feeding/new-feeding-sheet"
import FeedingLogItem from "@/components/feeding/feeding-log-item"

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [logToEdit, setLogToEdit] = useState<FeedingLog | null>(null)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

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

  // ⚡ Bolt: Wrap handler in useCallback to prevent re-creating the function on every render.
  // This is crucial for React.memo to work effectively on the FeedingLogItem component,
  // as it ensures that the onDelete prop remains stable.
  const handleDeleteFeedingLog = useCallback(async (logId: string) => {
    if (!logId) {
      toast.warning("ID do registro inválido para exclusão.");
      return;
    }

    setDeletingLogId(logId); // Set which log is being deleted
    const opId = `delete-feeding-${logId}`;
    addLoadingOperation({ id: opId, description: "Excluindo registro..." });
    setIsDeleting(true);

    const previousLogs = feedingState.feedingLogs;
    const logToDeleteObject = previousLogs.find(log => String(log.id) === logId);

    if (!logToDeleteObject) {
      toast.error("Erro: Registro não encontrado para exclusão.");
      setIsDeleting(false);
      removeLoadingOperation(opId);
      setDeletingLogId(null);
      return;
    }

    // Optimistic UI update
    feedingDispatch({ type: "REMOVE_FEEDING", payload: logToDeleteObject });

    try {
      const headers: HeadersInit = {};
      if (currentUser?.id) {
        headers['X-User-ID'] = currentUser.id;
      } else {
        toast.error("Erro de autenticação ao excluir.");
        throw new Error("User ID missing for delete request");
      }

      const response = await fetch(`/api/feedings/${logId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao excluir registro: ${response.statusText}`);
      }
      toast.success("Registro excluído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao deletar registro de alimentação:", error);
      toast.error(`Erro ao excluir: ${error.message || "Ocorreu um erro desconhecido"}`);
      // Revert optimistic update on failure
      feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs });
    } finally {
      setIsDeleting(false);
      removeLoadingOperation(opId);
      setDeletingLogId(null);
    }
  }, [currentUser, feedingDispatch, addLoadingOperation, removeLoadingOperation, feedingState.feedingLogs]);

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
                  {/* ⚡ Bolt: Render memoized component to prevent re-renders */}
                  {/* Using the memoized FeedingLogItem prevents the entire list from re-rendering
                      during searches or sorts. Callbacks are wrapped in useCallback, and props
                      are stable, ensuring maximum performance. */}
                  {logsOnDate.map((log) => (
                    <FeedingLogItem
                      key={log.id}
                      log={log}
                      cat={catsMap.get(String(log.catId))}
                      onEdit={setLogToEdit}
                      onDelete={handleDeleteFeedingLog}
                      isDeleting={isDeleting && deletingLogId === String(log.id)}
                    />
                  ))}
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