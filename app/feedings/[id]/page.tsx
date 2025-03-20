"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGlobalState } from "@/lib/context/global-state"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { Utensils } from "lucide-react"
import PageTransition from "@/components/page-transition"
import BottomNav from "@/components/bottom-nav"

interface FeedingLogDetails {
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

export default function FeedingDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { state, dispatch } = useGlobalState()
  const [isLoading, setIsLoading] = useState(true)
  const [feedingLog, setFeedingLog] = useState<FeedingLogDetails | null>(null)

  useEffect(() => {
    const fetchFeedingLog = async () => {
      try {
        const response = await fetch(`/api/feedings/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error("Registro não encontrado")
        }
        const data = await response.json()
        setFeedingLog(data)
      } catch (error) {
        console.error("Erro ao carregar registro de alimentação:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeedingLog()
  }, [resolvedParams.id])

  const handleDelete = async () => {
    if (!feedingLog) return

    try {
      const response = await fetch(`/api/feedings/${feedingLog.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Erro ao excluir registro")
      }

      dispatch({
        type: "DELETE_FEEDING_LOG",
        payload: { id: feedingLog.id.toString() }
      })

      router.push("/feedings")
    } catch (error) {
      console.error("Erro ao excluir registro:", error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (!feedingLog) {
    return (
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-background">
          <div className="p-4">
            <EmptyState
              icon={Utensils}
              title="Registro não encontrado"
              description="O registro de alimentação que você está procurando não existe ou foi removido."
              actionLabel="Voltar para Histórico"
              actionHref="/feedings"
              variant="feeding"
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
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Detalhes da Alimentação</h1>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Informações do Gato</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => router.push(`/feedings/${feedingLog.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDelete}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={feedingLog.cat.photoUrl || undefined} />
                    <AvatarFallback>
                      {feedingLog.cat.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{feedingLog.cat.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(feedingLog.timestamp), "dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Alimentação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Quantidade</h4>
                  <p className="text-lg">
                    {feedingLog.portionSize ? `${feedingLog.portionSize} xícaras` : "Não especificada"}
                  </p>
                </div>

                {feedingLog.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Observações</h4>
                    <p className="text-lg">{feedingLog.notes}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Registrado por</h4>
                  <p className="text-lg">{feedingLog.user.name}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <BottomNav />
      </div>
    </PageTransition>
  )
} 