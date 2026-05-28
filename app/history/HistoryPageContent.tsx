"use client"

import { useReducer, useEffect, useTransition, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, Calendar, ArrowDown, ArrowUp } from "lucide-react"
import Link from "next/link"
import PageTransition from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import BottomNav from "@/components/bottom-nav"
import { m } from "framer-motion"
import { getFeedingLogs } from "@/lib/data"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCats } from "@/lib/data"
import { useUserContext } from "@/lib/context/UserContext"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"

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

// Definindo a interface para o gato
interface CatType {
  id: number
  name: string
  photoUrl: string | null
}

type HistoryPageState = {
  feedingLogs: FeedingLogType[]
  filteredLogs: FeedingLogType[]
  isLoading: boolean
  searchQuery: string
  selectedCat: string
  sortOrder: "asc" | "desc"
  cats: CatType[]
}

type HistoryPageAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; logs: FeedingLogType[] }
  | { type: 'LOAD_END' }
  | { type: 'SET_FILTERED_LOGS'; logs: FeedingLogType[] }
  | { type: 'SET_SEARCH_QUERY'; value: string }
  | { type: 'SET_SELECTED_CAT'; value: string }
  | { type: 'SET_SORT_ORDER'; value: "asc" | "desc" }

const initialHistoryState: HistoryPageState = {
  feedingLogs: [],
  filteredLogs: [],
  isLoading: true,
  searchQuery: "",
  selectedCat: "all",
  sortOrder: "desc",
  cats: [],
}

function historyPageReducer(state: HistoryPageState, action: HistoryPageAction): HistoryPageState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true }
    case 'LOAD_SUCCESS':
      return { ...state, feedingLogs: action.logs, filteredLogs: action.logs }
    case 'LOAD_END':
      return { ...state, isLoading: false }
    case 'SET_FILTERED_LOGS':
      return { ...state, filteredLogs: action.logs }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.value }
    case 'SET_SELECTED_CAT':
      return { ...state, selectedCat: action.value }
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.value }
    default:
      return state
  }
}

export default function HistoryPageContent() {
  const router = useRouter()
  const [state, dispatch] = useReducer(historyPageReducer, initialHistoryState)
  const { feedingLogs, filteredLogs, isLoading, searchQuery, selectedCat, sortOrder, cats } = state
  const { state: userState } = useUserContext();
  const userLanguage = userState.currentUser?.preferences?.language;
  const _userLocale = resolveDateFnsLocale(userLanguage);
  
  // React 19 transitions for better UX
  const [isPending, startTransition] = useTransition()
  const deferredSearchQuery = useDeferredValue(searchQuery)
  
  useEffect(() => {
    async function loadData() {
      try {
        dispatch({ type: 'LOAD_START' })
        
        const logs = await getFeedingLogs()
        dispatch({ type: 'LOAD_SUCCESS', logs })
        
        await getCats()
      } catch (_error) {
      } finally {
        dispatch({ type: 'LOAD_END' })
      }
    }
    
    loadData()
  }, [])
  
  // Filtrar e ordenar os registros com useTransition
  useEffect(() => {
    startTransition(() => {
      let filtered = [...feedingLogs]
      
      // Filtrar por gato
      if (selectedCat !== "all") {
        filtered = filtered.filter(log => log.catId === parseInt(selectedCat))
      }
      
      // Filtrar por termo de busca usando deferred value
      if (deferredSearchQuery) {
        const query = deferredSearchQuery.toLowerCase()
        filtered = filtered.filter(log => 
          log.cat.name.toLowerCase().includes(query) ||
          log.notes?.toLowerCase().includes(query) ||
          log.user.name.toLowerCase().includes(query)
        )
      }
      
      // Ordenar por data
      filtered.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime()
        const dateB = new Date(b.timestamp).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      })
      
      dispatch({ type: 'SET_FILTERED_LOGS', logs: filtered })
    })
  }, [feedingLogs, deferredSearchQuery, selectedCat, sortOrder])
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', value: e.target.value })
  }
  
  const toggleSortOrder = () => {
    startTransition(() => {
      dispatch({ type: 'SET_SORT_ORDER', value: sortOrder === "asc" ? "desc" : "asc" })
    })
  }
  
  const handleCatChange = (catId: string) => {
    startTransition(() => {
      dispatch({ type: 'SET_SELECTED_CAT', value: catId })
    })
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
        <AppHeader title="Histórico" />
        
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Histórico de Alimentações</h1>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar registros..."
                  className="w-full rounded-md border border-input pl-10 py-2 text-sm"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleSortOrder}
              >
                {sortOrder === "desc" ? (
                  <ArrowDown size={18} />
                ) : (
                  <ArrowUp size={18} />
                )}
              </Button>
            </div>
            
            <Select
              value={selectedCat}
              onValueChange={handleCatChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por gato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gatos</SelectItem>
                {cats.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoading || isPending ? (
            <div className="space-y-4">
              {(['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e'] as const).map((skeletonKey) => (
                <Card key={skeletonKey} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-muted"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-muted rounded"></div>
                        <div className="h-3 w-1/2 bg-muted rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                Nenhum registro de alimentação encontrado.
              </p>
              <Link href="/feedings/new">
                <Button>Registrar alimentação</Button>
              </Link>
            </div>
          ) : (
            <m.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredLogs.map((log) => (
                <m.div key={log.id} variants={itemVariants}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
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
                              <p className="text-sm text-muted-foreground">
                                Alimentado por {log.user.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {format(new Date(log.timestamp), "HH:mm", { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          {log.portionSize && (
                            <p className="text-sm mt-2">
                              <span className="font-medium">Quantidade:</span> {log.portionSize}
                            </p>
                          )}
                          {log.notes && (
                            <p className="text-sm mt-1">
                              <span className="font-medium">Observações:</span> {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              ))}
            </m.div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  )
} 