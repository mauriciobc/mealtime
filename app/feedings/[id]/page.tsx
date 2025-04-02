"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Edit, Trash2, Utensils, AlertTriangle, Ban, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppContext } from "@/lib/context/AppContext"
import { useUserContext } from "@/lib/context/UserContext"
import { useLoading } from "@/lib/context/LoadingContext"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { FeedingLog } from "@/lib/types"

interface FeedingLogDetails extends FeedingLog {
  // Assuming API returns cat and user nested
}

export default function FeedingDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { dispatch: appDispatch } = useAppContext()
  const { state: userState } = useUserContext()
  const { addLoadingOperation, removeLoadingOperation } = useLoading()
  const { data: session, status } = useSession()
  const { currentUser } = userState

  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [feedingLog, setFeedingLog] = useState<FeedingLogDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const logId = resolvedParams.id

  useEffect(() => {
    if (status !== "authenticated" || !currentUser?.id || !currentUser?.householdId) {
      if (status === "authenticated" && currentUser && !currentUser.householdId) {
        setIsLoadingPage(false)
        setError("Nenhuma residência associada.")
      } else if (status !== 'loading') {
        setIsLoadingPage(false)
      }
      return
    }

    if (!logId || isNaN(parseInt(logId))) {
      setIsLoadingPage(false)
      setError("ID do registro inválido.")
      return
    }

    const currentHouseholdId = currentUser.householdId
    setIsLoadingPage(true)
    setError(null)

    const fetchFeedingLog = async () => {
      const opId = `load-feeding-${logId}`
      addLoadingOperation({ id: opId, description: "Carregando registro..." })
      try {
        const response = await fetch(`/api/feedings/${logId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Registro de alimentação não encontrado.")
          } else if (response.status === 403) {
            throw new Error("Você não tem permissão para ver este registro.")
          } else {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Falha ao buscar registro: ${response.statusText}`)
          }
        }
        const data: FeedingLogDetails = await response.json()

        const logHousehold = data.householdId ?? data.cat?.householdId
        if (logHousehold && String(logHousehold) !== String(currentHouseholdId)) {
          throw new Error("Este registro não pertence à sua residência atual.")
        }

        setFeedingLog(data)
      } catch (err: any) {
        console.error("Erro ao carregar registro de alimentação:", err)
        setError(err.message || "Erro ao carregar dados.")
        setFeedingLog(null)
      } finally {
        setIsLoadingPage(false)
        removeLoadingOperation(opId)
      }
    }

    fetchFeedingLog()
  }, [logId, status, currentUser, addLoadingOperation, removeLoadingOperation])

  const handleDelete = async () => {
    if (!feedingLog || !currentUser?.householdId) {
      toast.error("Não é possível excluir: Dados ausentes ou inválidos.")
      return
    }

    const logHousehold = feedingLog.householdId ?? feedingLog.cat?.householdId
    if (logHousehold && String(logHousehold) !== String(currentUser.householdId)) {
      toast.error("Não é possível excluir: Registro não pertence à sua residência.")
      return
    }

    const opId = `delete-feeding-${feedingLog.id}`
    addLoadingOperation({ id: opId, description: "Excluindo registro..." })
    setIsDeleting(true)
    const previousLogId = feedingLog.id

    appDispatch({ type: "DELETE_FEEDING_LOG", payload: { id: String(feedingLog.id) } })

    try {
      const response = await fetch(`/api/feedings/${feedingLog.id}`, { method: "DELETE" })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ao excluir registro (${response.status})`)
      }

      toast.success("Registro excluído com sucesso!")
      router.push("/feedings")
    } catch (error: any) {
      console.error("Erro ao excluir registro:", error)
      toast.error(`Erro ao excluir: ${error.message}`)
    } finally {
      setIsDeleting(false)
      removeLoadingOperation(opId)
    }
  }

  if (status === "loading" || (status === "authenticated" && !currentUser)) {
    return <Loading text="Carregando sessão..." />
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return <Loading text="Redirecionando para login..." />
  }

  let content
  if (isLoadingPage) {
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
              <span>{feedingLog.cat?.name || "Gato Desconhecido"}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  aria-label="Excluir Registro"
                >
                  {isDeleting ? <Loading size="sm" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
            <div className="flex items-center gap-3 pt-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={feedingLog.cat?.photoUrl || undefined} alt={feedingLog.cat?.name || "Gato"} />
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
                {feedingLog.portionSize !== null && feedingLog.portionSize !== undefined
                  ? `${feedingLog.portionSize} g`
                  : <span className="text-muted-foreground italic">Não especificada</span>}
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