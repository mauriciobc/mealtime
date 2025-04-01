"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Edit, Trash2, Utensils, AlertTriangle, Ban, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGlobalState } from "@/lib/context/global-state"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"

interface FeedingLogDetails {
  id: number
  catId: number
  userId: number
  timestamp: Date | string
  portionSize: number | null
  notes: string | null
  createdAt: Date | string
  householdId?: number
  cat?: {
    id: number
    name: string
    photoUrl: string | null
    householdId: number
  }
  user?: {
    id: number
    name: string
  }
}

export default function FeedingDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [feedingLog, setFeedingLog] = useState<FeedingLogDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const logId = resolvedParams.id

  useEffect(() => {
    if (status !== "authenticated" || !state.currentUser?.id || !state.currentUser?.householdId) {
      if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
        setIsLoading(false)
        setError("Nenhuma residência associada.")
      }
      return
    }

    if (!logId || isNaN(parseInt(logId))) {
      setIsLoading(false)
      setError("ID do registro inválido.")
      return
    }

    const currentHouseholdId = state.currentUser.householdId
    setIsLoading(true)
    setError(null)

    const fetchFeedingLog = async () => {
      try {
        const response = await fetch(`/api/feedings/${logId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Registro de alimentação não encontrado.")
          } else if (response.status === 403) {
            throw new Error("Você não tem permissão para ver este registro.")
          } else {
            throw new Error(`Falha ao buscar registro: ${response.statusText}`)
          }
        }
        const data: FeedingLogDetails = await response.json()

        if (data.householdId && String(data.householdId) !== String(currentHouseholdId)) {
          throw new Error("Este registro não pertence à sua residência atual.")
        } else if (data.cat?.householdId && String(data.cat.householdId) !== String(currentHouseholdId)) {
          throw new Error("Este registro pertence a um gato de outra residência.")
        }

        setFeedingLog(data)
      } catch (err: any) {
        console.error("Erro ao carregar registro de alimentação:", err)
        setError(err.message || "Erro ao carregar dados.")
        setFeedingLog(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeedingLog()
  }, [logId, status, state.currentUser, dispatch])

  const handleDelete = async () => {
    if (!feedingLog || !state.currentUser?.householdId) {
      toast.error("Não é possível excluir: Dados ausentes ou inválidos.")
      return
    }

    if ((feedingLog.householdId && String(feedingLog.householdId) !== String(state.currentUser.householdId)) ||
      (feedingLog.cat?.householdId && String(feedingLog.cat.householdId) !== String(state.currentUser.householdId))) {
      toast.error("Não é possível excluir: Registro não pertence à sua residência.")
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/feedings/${feedingLog.id}`, { method: "DELETE" })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ao excluir registro (${response.status})`)
      }

      dispatch({ type: "DELETE_FEEDING_LOG", payload: { id: feedingLog.id.toString() } })

      toast.success("Registro excluído com sucesso!")
      router.push("/feedings")
    } catch (error: any) {
      console.error("Erro ao excluir registro:", error)
      toast.error(`Erro ao excluir: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === "loading" || (status === "authenticated" && !state.currentUser)) {
    return <Loading text="Carregando..." />
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return <Loading text="Redirecionando..." />
  }

  let content
  if (isLoading) {
    content = <Loading text="Carregando detalhes do registro..." />
  } else if (error) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Erro ao Carregar"
        description={error}
        actionLabel="Voltar para Histórico"
        actionHref="/feedings"
        variant="destructive"
      />
    )
  } else if (!feedingLog) {
    content = (
      <EmptyState
        icon={Ban}
        title="Registro Não Encontrado"
        description="O registro de alimentação não foi encontrado ou você não tem permissão para vê-lo."
        actionLabel="Voltar para Histórico"
        actionHref="/feedings"
      />
    )
  } else {
    content = (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{feedingLog.cat?.name || "Gato desconhecido"}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? <Loading className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
            <div className="flex items-center gap-3 pt-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={feedingLog.cat?.photoUrl || undefined} alt={feedingLog.cat?.name} />
                <AvatarFallback>{feedingLog.cat?.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                Alimentado em: {format(new Date(feedingLog.timestamp), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Alimentação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Quantidade</h4>
              <p className="text-lg font-medium">
                {feedingLog.portionSize !== null ? `${feedingLog.portionSize} g` : <span className="text-muted-foreground italic">Não especificada</span>}
              </p>
            </div>

            {feedingLog.notes && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Observações</h4>
                <p className="text-base whitespace-pre-wrap">{feedingLog.notes}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Registrado por</h4>
              <p className="text-base">{feedingLog.user?.name || <span className="text-muted-foreground italic">Usuário desconhecido</span>}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4 pb-24">
          <PageHeader title="Detalhes da Alimentação" backHref="/feedings" showBackArrow={true} />
          <div className="mt-6">
            {content}
          </div>
        </div>
        <BottomNav />
      </div>
    </PageTransition>
  )
} 