"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Edit, 
  Plus, 
  Calendar, 
  Weight, 
  FileWarning, 
  Clock, 
  Trash2,
  ChevronRight,
  Cat as CatIcon,
  Users,
  PlusCircle
} from "lucide-react"
import Link from "next/link"
import { AnimatedCard } from "@/components/ui/animated-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import BottomNav from "@/components/bottom-nav"
import PageTransition from "@/components/page-transition"
import { motion } from "framer-motion"
import { CatType } from "@/lib/types"
import { getAgeString, getScheduleText } from "@/lib/utils/dateUtils"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AppHeader } from "@/components/app-header"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { CatCard } from "@/components/cat-card"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

export default function CatsPage() {
  const router = useRouter()
  const { state: appState, dispatch: appDispatch } = useAppContext()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { cats } = appState
  const { currentUser } = userState
  const { data: session, status } = useSession()
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (status === "authenticated" && currentUser && cats.length === 0) {
        const fetchCats = async () => {
            const opId = "fetch-cats"
            addLoadingOperation({ id: opId, priority: 1, description: "Loading cats..." })
            try {
                 console.log("Cats might need fetching here or in Provider")
            } catch (error: any) {
                 toast.error("Falha ao carregar gatos")
            } finally {
                 removeLoadingOperation(opId)
            }
        }
    }
  }, [status, currentUser, cats.length, appDispatch, addLoadingOperation, removeLoadingOperation])

  const handleDeleteCat = async (catId: number) => {
    const catIdStr = String(catId)
    const previousCats = cats
    const opId = `delete-cat-${catIdStr}`
    addLoadingOperation({ id: opId, priority: 1, description: `Deleting cat ${catIdStr}...` })
    setIsDeleting(catIdStr)
    
    appDispatch({ type: "DELETE_CAT", payload: catId })

    try {
      const response = await fetch(`/api/cats/${catIdStr}`, { method: 'DELETE' })
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}))
         throw new Error(errorData.error || 'Failed to delete cat')
      }
      toast.success("Gato excluído com sucesso!")
    } catch (error: any) {
      console.error("Erro ao excluir gato:", error)
      toast.error(`Erro ao excluir gato: ${error.message}`)
      appDispatch({ type: "SET_CATS", payload: previousCats })
    } finally {
      setIsDeleting(null)
      removeLoadingOperation(opId)
    }
  }

  if (status === "loading" || (status === "authenticated" && !currentUser)) {
    return <Loading text="Carregando gatos..." />
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return <Loading text="Redirecionando..." />
  }

  if (status === "authenticated" && currentUser && !currentUser.householdId) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
           <div className="flex-1 p-4 pb-24">
              <PageHeader
                title="Meus Gatos"
                description="Gerencie seus gatos e seus perfis"
              />
             <EmptyState
                icon={Users}
                title="Sem Residência Associada"
                description="Você precisa criar ou juntar-se a uma residência para adicionar e gerenciar gatos."
                actionLabel="Ir para Configurações"
                actionHref="/settings"
             />
           </div>
           <BottomNav />
        </div>
      </PageTransition>
    )
  }

  const catsToDisplay = cats

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 p-4 pb-24">
          <PageHeader
            title="Meus Gatos"
            description="Gerencie os perfis dos seus felinos"
            actionLabel="Adicionar Gato"
            actionHref="/cats/new"
          />

          {catsToDisplay.length === 0 ? (
             <div className="mt-6">
               <EmptyState
                 icon={CatIcon}
                 title="Nenhum gato cadastrado"
                 description="Você ainda não adicionou nenhum gato a esta residência. Que tal adicionar o primeiro?"
                 actionLabel="Adicionar Meu Primeiro Gato"
                 actionHref="/cats/new"
                 variant="cat"
               />
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {catsToDisplay.map((cat: CatType) => (
                <CatCard
                  key={cat.id}
                  cat={cat}
                  onView={() => router.push(`/cats/${cat.id}`)}
                  onEdit={() => router.push(`/cats/${cat.id}/edit`)}
                  onDelete={() => handleDeleteCat(cat.id)}
                />
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  )
}
