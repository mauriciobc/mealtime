"use client"

import { useReducer, useMemo, useTransition, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Loading } from "@/components/ui/loading"
import { PageHeader } from "@/components/page-header"
import { useCats } from "@/lib/context/CatsContext"
import { useFeeding } from "@/lib/context/FeedingContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { FeedingLog } from "@/lib/types"
import { toast } from "sonner"
import { groupLogsByDate } from "@/lib/utils/feedingUtils"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"
import { NewFeedingSheet } from "@/components/feeding/new-feeding-sheet"
import { FeedingsSearchControls, FeedingsTimelineSection } from "./feedings-page-sections"

type FeedingsPageState = {
  searchTerm: string;
  sortOrder: "asc" | "desc";
  logToDelete: FeedingLog | null;
  isDeleting: boolean;
  logToEdit: FeedingLog | null;
};

type FeedingsPageAction =
  | { type: 'SET_SEARCH_TERM'; value: string }
  | { type: 'SET_SORT_ORDER'; value: "asc" | "desc" }
  | { type: 'SET_LOG_TO_DELETE'; value: FeedingLog | null }
  | { type: 'SET_IS_DELETING'; value: boolean }
  | { type: 'SET_LOG_TO_EDIT'; value: FeedingLog | null };

const initialFeedingsPageState: FeedingsPageState = {
  searchTerm: "",
  sortOrder: "desc",
  logToDelete: null,
  isDeleting: false,
  logToEdit: null,
};

function feedingsPageReducer(state: FeedingsPageState, action: FeedingsPageAction): FeedingsPageState {
  switch (action.type) {
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.value };
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.value };
    case 'SET_LOG_TO_DELETE':
      return { ...state, logToDelete: action.value };
    case 'SET_IS_DELETING':
      return { ...state, isDeleting: action.value };
    case 'SET_LOG_TO_EDIT':
      return { ...state, logToEdit: action.value };
    default:
      return state;
  }
}

export default function FeedingsPageContent() {
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

  const [pageState, dispatch] = useReducer(feedingsPageReducer, initialFeedingsPageState)
  const { searchTerm, sortOrder, logToDelete, isDeleting, logToEdit } = pageState

  const userLanguage = userState.currentUser?.preferences?.language;
  const _userLocale = resolveDateFnsLocale(userLanguage);
  
  const [isPending, startTransition] = useTransition()
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const catsMap = useMemo(() => {
    if (!cats) return new Map()
    return new Map(cats.map(cat => [String(cat.id), cat]))
  }, [cats])

  const filteredAndSortedLogs = useMemo(() => {
    if (!feedingLogs || !catsMap) return []

    let logs = [...feedingLogs]

    if (deferredSearchTerm) {
      const lowerSearchTerm = deferredSearchTerm.toLowerCase()
      logs = logs.filter(log => {
          const catName = catsMap.get(String(log.catId))?.name.toLowerCase() || ""
          const notes = log.notes?.toLowerCase() || ""
          const userName = log.user?.name?.toLowerCase() || ""
          return catName.includes(lowerSearchTerm) || notes.includes(lowerSearchTerm) || userName.includes(lowerSearchTerm)
        }
      )
    }

    if (sortOrder === "asc") {
      return logs.slice().reverse();
    }

    return logs
  }, [feedingLogs, catsMap, deferredSearchTerm, sortOrder])

  const groupedLogs = useMemo(() => {
     return groupLogsByDate(filteredAndSortedLogs)
  }, [filteredAndSortedLogs])

  const handleDeleteFeedingLog = async (logId: string | undefined) => {
     if (!logId) {
        toast.warning("ID do registro inválido para exclusão.")
        return
     }
     
     const opId = `delete-feeding-${logId}`
     addLoadingOperation({ id: opId, description: "Excluindo registro..." })
     dispatch({ type: 'SET_IS_DELETING', value: true })
     
     const previousLogs = feedingState.feedingLogs
     const logToDeleteObject = previousLogs.find(log => log.id === logId)

     if (!logToDeleteObject) {
       toast.error("Erro: Registro não encontrado para exclusão.")
       dispatch({ type: 'SET_IS_DELETING', value: false })
       removeLoadingOperation(opId)
       dispatch({ type: 'SET_LOG_TO_DELETE', value: null })
       return
     }
     
     feedingDispatch({ type: "REMOVE_FEEDING", payload: logToDeleteObject })
     dispatch({ type: 'SET_LOG_TO_DELETE', value: null })

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
       })
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({}))
         feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs })
         throw new Error(errorData.error || `Falha ao excluir registro: ${response.statusText}`)
       }
        toast.success("Registro excluído com sucesso!")
      } catch (error: any) {
        toast.error(`Erro ao excluir: ${error.message || "Ocorreu um erro desconhecido"}`)
       if(feedingState.feedingLogs.find(log => log.id === logId) === undefined) {
          feedingDispatch({ type: "FETCH_SUCCESS", payload: previousLogs })
       }
     } finally {
       dispatch({ type: 'SET_IS_DELETING', value: false })
       removeLoadingOperation(opId)
       if (logToDelete?.id === logId) {
          dispatch({ type: 'SET_LOG_TO_DELETE', value: null })
       }
     }
   }

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

  if (!currentUser) {
    toast.error("Autenticação necessária para ver o histórico.");
    router.replace("/login?callbackUrl=/feedings");
    return <Loading text="Redirecionando para login..." />;
  }

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

          <FeedingsSearchControls
            searchTerm={searchTerm}
            sortOrder={sortOrder}
            isPending={isPending}
            onSearchChange={(value) => dispatch({ type: 'SET_SEARCH_TERM', value })}
            onToggleSort={() => startTransition(() => dispatch({ type: 'SET_SORT_ORDER', value: sortOrder === "desc" ? "asc" : "desc" }))}
          />

          <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
            <FeedingsTimelineSection
              groupedLogs={groupedLogs}
              catsMap={catsMap}
              searchTerm={searchTerm}
              isLoading={isLoading}
              logToDelete={logToDelete}
              isDeleting={isDeleting}
              onSetLogToDelete={(log) => dispatch({ type: 'SET_LOG_TO_DELETE', value: log })}
              onSetLogToEdit={(log) => dispatch({ type: 'SET_LOG_TO_EDIT', value: log })}
              onDelete={handleDeleteFeedingLog}
            />
          </div>
        </div>

        <BottomNav />
      </div>

      {logToEdit && (
        <NewFeedingSheet
          isOpen={!!logToEdit}
          onOpenChange={(open) => { if (!open) dispatch({ type: 'SET_LOG_TO_EDIT', value: null }) }}
          initialFeedingLog={logToEdit}
        />
      )}
    </PageTransition>
  )
}
